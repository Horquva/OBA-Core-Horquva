import type {
  GraphEdge,
  GraphNode,
  VisualizationBaseProps,
} from "../contracts/visualization.types";
import { OrganizationalGraph } from "./OrganizationalGraph";

interface KnowledgeGraphProps extends VisualizationBaseProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  title?: string;
  onNodeSelect?: (node: GraphNode) => void;
}

export function KnowledgeGraph({
  title = "Knowledge Graph",
  accessibleLabel,
  ...graphProps
}: KnowledgeGraphProps) {
  return (
    <OrganizationalGraph
      {...graphProps}
      title={title}
      accessibleLabel={accessibleLabel}
      interactionLabel="knowledge graph"
    />
  );
}
