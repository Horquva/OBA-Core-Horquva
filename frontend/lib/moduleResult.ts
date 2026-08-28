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
  payload: TPayload;
  recommendations: string[];
  dataSource: unknown;
  generatedAt: string;
}
