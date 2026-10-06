// =============================================================================
// Horquva Continuity Platform — Ask Horquva & Grounded Gemini Engine
// =============================================================================
// Powered by Google Gemini (@google/genai) using gemini-2.0-flash.
// Architecture Decision AD-8: Strictly grounded in deterministic graph facts.
// Strict Guardrails:
// - NEVER hallucinates asset names or scores individuals
// - Every statement cites exact asset IDs, person IDs, or check IDs
// - Answers in crisp, executive markdown tables and actionable bullets
// =============================================================================

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { ContinuityGraph } from '../domain/graph/index.js';
import { calculateHeadlineMetrics, evaluateAllChecks } from '../domain/checks/index.js';
import { answerFromGraph } from './graphAnswers.js';

dotenv.config();

const SYSTEM_INSTRUCTION = `
You are Horquva, an elite Operational Continuity Intelligence Assistant.
Your core mission is: "When someone leaves, nothing breaks."
You help operations, IT, and engineering leadership detect single points of failure across automated workflows, critical credentials, and business processes.

STRICT CONSTRAINTS:
1. NEVER predict individual employee attrition or rank individual workers.
2. NEVER use synthetic 0-100 risk scores.
3. NEVER invent or hallucinate asset IDs, person names, or run volumes.
4. Cite every asset or person as [[<entity id>]], e.g. [[automation:n8n:101]] or [[person:omar@acme.com]]. Never write a name without its [[id]].
5. If data is unknown or missing (null in the ground truth), say it is unknown. Never treat unknown as no or 0.
6. Answer in short plain sentences and "- " bullet lists. No tables, no headings, no bold.
7. Only answer from the ground truth. If it doesn't contain the answer, say so.
`.trim();

export class AskHorquvaEngine {
  private ai: GoogleGenAI | null = null;
  // GEMINI_MODEL overrides the default; Google retires models over time (2.0-flash now returns 404).
  private modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Generates a grounded response to an operational query.
   */
  /** Answer text only (kept for existing callers). */
  public async ask(query: string, graph: ContinuityGraph): Promise<string> {
    return (await this.askDetailed(query, graph)).answer;
  }

  /** `answeredBy`: 'ai' when the model answered, 'graph' when computed directly from the graph. */
  public async askDetailed(query: string, graph: ContinuityGraph): Promise<{ answer: string; answeredBy: 'ai' | 'graph' }> {
    const metrics = calculateHeadlineMetrics(graph);
    const checks = evaluateAllChecks(graph);
    const nodes = graph.getAllNodes();

    // Compact grounded context summary
    const groundTruthContext = {
      headlineMetrics: metrics,
      failedChecks: checks.filter((c) => c.status === 'FAIL'),
      unknownChecks: checks.filter((c) => c.status === 'UNKNOWN'),
      criticalAssets: nodes
        .filter((n) => {
          const c = n.facts.get('criticality')?.value;
          return c === 'critical' || c === 'high';
        })
        .map((n) => ({
          id: n.entity.id,
          name: n.entity.name,
          owners: graph.getOwners(n.entity.id).map((o) => o.name),
          backups: graph.getBackups(n.entity.id).map((b) => b.name),
          weeklyRuns: typeof n.facts.get('run_volume_weekly')?.value === 'number' ? n.facts.get('run_volume_weekly')!.value : null,
          isDocumented: n.facts.get('documented')?.value ?? 'UNKNOWN',
          fallbackExists: n.facts.get('fallback_exists')?.value ?? 'UNKNOWN',
        })),
      personalCredentialAutomations: graph
        .getAllEdges()
        .filter((e) => e.type === 'runs_on_credentials_of' && !e.validTo)
        .map((e) => ({ automation: e.fromId, credentialOwner: e.toId })),
      people: nodes
        .filter((n) => n.entity.kind === 'person')
        .map((n) => ({ id: n.entity.id, name: n.entity.name, status: n.facts.get('status')?.value ?? null })),
    };

    // If Gemini API Key is available, use Gemini 2.0 Flash
    if (this.ai) {
      try {
        const prompt = `
CURRENT OPERATIONAL GROUND TRUTH:
${JSON.stringify(groundTruthContext, null, 2)}

USER QUESTION:
"${query}"

Provide a direct, factual answer strictly grounded in the ground truth above.
        `.trim();

        const response = await this.ai.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.2, // Low temperature for high factual accuracy
          },
        });

        if (response.text) {
          return { answer: response.text, answeredBy: 'ai' };
        }
      } catch (err) {
        console.error('[AskHorquvaEngine] Gemini API error, falling back to deterministic response:', err);
      }
    }

    // No model configured (or it failed): answer directly from the graph.
    return { answer: answerFromGraph(query, graph), answeredBy: 'graph' };
  }

  /**
   * Generates a Weekly Operational Continuity Executive Briefing.
   */
  public async generateWeeklyBriefing(graph: ContinuityGraph): Promise<string> {
    const metrics = calculateHeadlineMetrics(graph);
    const checks = evaluateAllChecks(graph);
    const failedChecks = checks.filter((c) => c.status === 'FAIL');

    if (this.ai) {
      try {
        const prompt = `
Generate a 3-paragraph Weekly Executive Continuity Briefing based on the following data:
- Total Critical Assets: ${metrics.totalCriticalAssets}
- Fully Covered: ${metrics.fullyCoveredCriticalAssets}
- Exposed Assets: ${metrics.exposedCriticalAssets}
- Unknown Facts: ${metrics.unknownCriticalFacts}
- Active Failures: ${failedChecks.length} failures (${failedChecks.map((f) => f.reason).join('; ')})

Focus on:
1. Executive continuity posture summary
2. Top single points of failure requiring immediate attention
3. Attestation campaign status and recommended action items
        `.trim();

        const response = await this.ai.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.2,
          },
        });

        if (response.text) {
          return response.text;
        }
      } catch (err) {
        console.error('[AskHorquvaEngine] Gemini API briefing error, using template:', err);
      }
    }

    // High quality deterministic fallback briefing
    return `
# Weekly Operational Continuity Briefing

### 1. Executive Summary
The organization is currently tracking **${metrics.totalCriticalAssets} critical operational assets**. Of these, **${metrics.fullyCoveredCriticalAssets} are fully protected** with confirmed human backups, verified runbooks, and active fallback plans. **${metrics.exposedCriticalAssets} assets are currently exposed** to operational discontinuity if their primary owners are unavailable.

### 2. Critical Exposure Summary
Currently, there are **${failedChecks.length} active continuity issues** requiring intervention:
${failedChecks.map((f) => `- **${f.checkId}**: ${f.reason} (Asset: \`${f.entityId}\`)`).join('\n')}

### 3. Immediate Recommended Actions
1. **Launch Confirmation Campaign**: ${metrics.unknownCriticalFacts} facts remain unverified. Dispatch access-review magic links to asset owners.
2. **Assign Backups**: Assign cross-trained backups to exposed critical automations immediately.
    `.trim();
  }
}
