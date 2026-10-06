// =============================================================================
// Horquva Continuity Platform — In-Memory Dependency Graph
// =============================================================================
// Powered by Graphology MultiDirectedGraph.
// Models all enterprise relationships: ownership, backups, workflow dependencies,
// credential bindings, and model calls.
// Provides reachability walks, downstream impact analysis, and cycle detection.
// =============================================================================

import { MultiDirectedGraph } from 'graphology';
import { CanonicalEntity, CanonicalEdge, CanonicalFact, FactAttribute } from '@horquva/types';

export interface GraphNodeAttributes {
  entity: CanonicalEntity;
  facts: Map<FactAttribute, CanonicalFact>;
}

export interface GraphEdgeAttributes {
  edge: CanonicalEdge;
}

export class ContinuityGraph {
  private graph: MultiDirectedGraph<GraphNodeAttributes, GraphEdgeAttributes>;

  constructor() {
    this.graph = new MultiDirectedGraph<GraphNodeAttributes, GraphEdgeAttributes>();
  }

  /**
   * Adds or updates an entity node in the graph.
   */
  public addEntity(entity: CanonicalEntity, facts: CanonicalFact[] = []): void {
    const factMap = new Map<FactAttribute, CanonicalFact>();
    for (const f of facts) {
      if (!f.validTo) {
        factMap.set(f.attribute, f);
      }
    }

    if (this.graph.hasNode(entity.id)) {
      this.graph.setNodeAttribute(entity.id, 'entity', entity);
      this.graph.setNodeAttribute(entity.id, 'facts', factMap);
    } else {
      this.graph.addNode(entity.id, {
        entity,
        facts: factMap,
      });
    }
  }

  /**
   * Adds an active canonical edge between two existing nodes.
   */
  public addEdge(edge: CanonicalEdge): void {
    if (!this.graph.hasNode(edge.fromId) || !this.graph.hasNode(edge.toId)) {
      return; // Skip orphan edges where nodes don't exist
    }

    this.graph.addEdge(edge.fromId, edge.toId, { edge });
  }

  /** Makes `fact` the current value of its attribute on that entity (no-op for unknown entities). */
  public setFact(fact: CanonicalFact): void {
    if (!this.graph.hasNode(fact.entityId)) return;
    this.graph.getNodeAttribute(fact.entityId, 'facts').set(fact.attribute, fact);
  }

  /**
   * Ends every active edge matching `predicate` (sets validTo, removes it from the
   * live graph) and returns the closed edges, so callers can audit what changed.
   */
  public closeEdges(predicate: (edge: CanonicalEdge) => boolean, at: Date = new Date()): CanonicalEdge[] {
    const closed: CanonicalEdge[] = [];
    for (const key of this.graph.edges()) {
      const edge = this.graph.getEdgeAttributes(key).edge;
      if (!edge.validTo && predicate(edge)) {
        closed.push({ ...edge, validTo: at });
        this.graph.dropEdge(key);
      }
    }
    return closed;
  }

  /**
   * Populates the entire graph from raw arrays of entities, edges, and facts.
   */
  public static fromSnapshot(
    entities: CanonicalEntity[],
    edges: CanonicalEdge[],
    facts: CanonicalFact[]
  ): ContinuityGraph {
    const cg = new ContinuityGraph();

    // Group active facts by entityId
    const factsByEntity = new Map<string, CanonicalFact[]>();
    for (const fact of facts) {
      if (!fact.validTo) {
        if (!factsByEntity.has(fact.entityId)) {
          factsByEntity.set(fact.entityId, []);
        }
        factsByEntity.get(fact.entityId)!.push(fact);
      }
    }

    for (const entity of entities) {
      cg.addEntity(entity, factsByEntity.get(entity.id) || []);
    }

    for (const edge of edges) {
      if (!edge.validTo) {
        cg.addEdge(edge);
      }
    }

    return cg;
  }

  public getNode(id: string): GraphNodeAttributes | undefined {
    return this.graph.hasNode(id) ? this.graph.getNodeAttributes(id) : undefined;
  }

  public getAllNodes(): GraphNodeAttributes[] {
    return this.graph.nodes().map((nodeKey) => this.graph.getNodeAttributes(nodeKey));
  }

  public getAllEdges(): CanonicalEdge[] {
    return this.graph.edges().map((edgeKey) => this.graph.getEdgeAttributes(edgeKey).edge);
  }

  /**
   * Returns all edges pointing to or originating from an entity.
   */
  public getEdgesForEntity(entityId: string): CanonicalEdge[] {
    if (!this.graph.hasNode(entityId)) return [];
    return this.graph.edges(entityId).map((eKey) => this.graph.getEdgeAttributes(eKey).edge);
  }

  /**
   * Returns owners of an asset (people pointing to asset with 'owns').
   */
  public getOwners(assetId: string): CanonicalEntity[] {
    if (!this.graph.hasNode(assetId)) return [];
    const owners: CanonicalEntity[] = [];

    this.graph.forEachInEdge(assetId, (_edge, attributes, source) => {
      if (attributes.edge.type === 'owns') {
        const sourceNode = this.graph.getNodeAttributes(source);
        if (sourceNode?.entity) {
          owners.push(sourceNode.entity);
        }
      }
    });

    return owners;
  }

  /**
   * Returns backups of an asset (people pointing to asset with 'backs_up').
   */
  public getBackups(assetId: string): CanonicalEntity[] {
    if (!this.graph.hasNode(assetId)) return [];
    const backups: CanonicalEntity[] = [];

    this.graph.forEachInEdge(assetId, (_edge, attributes, source) => {
      if (attributes.edge.type === 'backs_up') {
        const sourceNode = this.graph.getNodeAttributes(source);
        if (sourceNode?.entity) {
          backups.push(sourceNode.entity);
        }
      }
    });

    return backups;
  }

  /**
   * Returns assets owned by a person.
   */
  public getOwnedAssets(personId: string): CanonicalEntity[] {
    if (!this.graph.hasNode(personId)) return [];
    const assets: CanonicalEntity[] = [];

    this.graph.forEachOutEdge(personId, (_edge, attributes, _source, target) => {
      if (attributes.edge.type === 'owns') {
        const targetNode = this.graph.getNodeAttributes(target);
        if (targetNode?.entity) {
          assets.push(targetNode.entity);
        }
      }
    });

    return assets;
  }

  /**
   * Everything that stops working if `startNodeId` fails or leaves — its blast radius.
   *
   * Dependency edges point from the dependant to what it needs
   * (`A depends_on B`, `A calls_model M`, `A runs_on_credentials_of P`), so the
   * things affected by a failure are found by walking those edges *backwards*.
   * (Before D10 this walked them forwards, which returned what the node needs
   * — e.g. "GPT-4o going down affects nothing", "workflow 105 failing stops David".)
   */
  public getDownstreamImpact(startNodeId: string): string[] {
    return this.walkDependencies(startNodeId, 'inbound');
  }

  /** Everything `startNodeId` relies on, transitively (models, apps, credentials' holders). */
  public getDependencies(startNodeId: string): string[] {
    return this.walkDependencies(startNodeId, 'outbound');
  }

  private walkDependencies(startNodeId: string, direction: 'inbound' | 'outbound'): string[] {
    if (!this.graph.hasNode(startNodeId)) return [];
    const visited = new Set<string>();
    const queue: string[] = [startNodeId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const visit = (_edge: string, attributes: GraphEdgeAttributes, source: string, target: string) => {
        const type = attributes.edge.type;
        if (type !== 'depends_on' && type !== 'calls_model' && type !== 'runs_on_credentials_of') return;
        const next = direction === 'inbound' ? source : target;
        if (!visited.has(next) && next !== startNodeId) {
          visited.add(next);
          queue.push(next);
        }
      };
      if (direction === 'inbound') this.graph.forEachInboundEdge(current, visit);
      else this.graph.forEachOutboundEdge(current, visit);
    }

    return Array.from(visited);
  }

  /**
   * Checks if any cycle exists in the automation dependency sub-graph.
   */
  public detectCycles(): string[][] {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (curr: string, path: string[]) => {
      visited.add(curr);
      recStack.add(curr);
      path.push(curr);

      this.graph.forEachOutboundEdge(curr, (_edge, attributes, _source, neighbor) => {
        if (attributes.edge.type === 'depends_on') {
          if (!visited.has(neighbor)) {
            dfs(neighbor, [...path]);
          } else if (recStack.has(neighbor)) {
            const cycleStart = path.indexOf(neighbor);
            if (cycleStart !== -1) {
              cycles.push(path.slice(cycleStart).concat(neighbor));
            }
          }
        }
      });

      recStack.delete(curr);
    };

    for (const node of this.graph.nodes()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }
}
