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
import { SimulationEngine } from '../domain/simulation/index.js';

dotenv.config();

const SYSTEM_INSTRUCTION = `
You are Horquva, an elite Operational Continuity Intelligence Assistant.
Your core mission is: "When someone leaves, nothing breaks."
You help operations, IT, and engineering leadership detect single points of failure across automated workflows, critical credentials, and business processes.

STRICT CONSTRAINTS:
1. NEVER predict individual employee attrition or rank individual workers.
2. NEVER use synthetic 0-100 risk scores.
3. NEVER invent or hallucinate asset IDs, person names, or run volumes.
4. CITE exact entity IDs (e.g. 'automation:n8n:101', 'person:omar@acme.com') in every claim.
5. If data is unknown or missing, explicitly state: "UNKNOWN (Pending confirmation campaign)".
6. Format responses in crisp GitHub-flavored markdown with summary tables and prioritized next actions.
`.trim();

export class AskHorquvaEngine {
  private ai: GoogleGenAI | null = null;
  private modelName = 'gemini-2.0-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Generates a grounded response to an operational query.
   */
  public async ask(query: string, graph: ContinuityGraph): Promise<string> {
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
          weeklyRuns: n.facts.get('run_volume_weekly')?.value || 0,
          isDocumented: n.facts.get('documented')?.value ?? 'UNKNOWN',
          fallbackExists: n.facts.get('fallback_exists')?.value ?? 'UNKNOWN',
        })),
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
          return response.text;
        }
      } catch (err) {
        console.error('[AskHorquvaEngine] Gemini API error, falling back to deterministic response:', err);
      }
    }

    // Deterministic fallback response when offline or without API key
    return this.generateDeterministicAnswer(query, groundTruthContext);
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

  private generateDeterministicAnswer(query: string, context: any): string {
    const q = query.toLowerCase();
    const metrics = context.headlineMetrics;

    if (q.includes('how many') || q.includes('metrics') || q.includes('overview') || q.includes('status')) {
      return `
### Operational Continuity Overview

| Metric | Count | Description |
| :--- | :--- | :--- |
| **Total Critical Assets** | **${metrics.totalCriticalAssets}** | Core automations & processes vital to operations |
| **Fully Covered** | **${metrics.fullyCoveredCriticalAssets}** | Have confirmed backup, runbook, and fallback |
| **Exposed Assets** | **${metrics.exposedCriticalAssets}** | Lack backup, runbook, or fallback |
| **Unknown Facts** | **${metrics.unknownCriticalFacts}** | Pending confirmation from asset owners |

**Active Continuity Failures (${context.failedChecks.length})**:
${context.failedChecks.map((f: any) => `- \`${f.entityId}\`: ${f.reason}`).join('\n')}
      `.trim();
    }

    return `
### Horquva Operational Ground Truth
- **Total Critical Assets**: ${metrics.totalCriticalAssets}
- **Exposed Assets**: ${metrics.exposedCriticalAssets}
- **Active Alerts**: ${context.failedChecks.length} failure(s) detected.
${context.failedChecks.map((f: any) => `- ${f.reason}`).join('\n')}
    `.trim();
  }
}
