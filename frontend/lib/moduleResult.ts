// Shared shape of backend/routes/intelligence/prediction.js's moduleEndpoint()
// responses -- { module, analysis, type, confidence, payload, ... }. confidence
// is 0-1, from the brain module's own evidence-weighted computation (see
// backend/brain/modules/analytics.js's confidence()), not a locally-invented
// number. `payload` varies per module; callers destructure what they need.
export interface ModuleResult<TPayload = Record<string, unknown>> {
  module: string;
  analysis: string;
  type: string;
  confidence: number; // 0-1
  /** F-9: true only for a module whose headline number is built from
   *  invented weights/thresholds (M03, M18, M43, M45) rather than a
   *  measured structural fact -- see backend/brain/knowledge/
   *  intelligenceExchange.js's createIntelligence(). */
  authored?: boolean;
  /** Section 06: one sentence naming exactly what population/computation
   *  this module's headline number covers -- render with DefinitionInfo. */
  definition?: string;
  payload: TPayload;
  recommendations: string[];
  dataSource: unknown;
  generatedAt: string;
}
