export interface DailySummary {
  id?: string;
  summary: string;
  created_at?: string;
}

export interface ChatMessages {
  id: string;
  sender: "user" | "assistant";
  message: string;
  timestamp?: string;
  entities?: Array<{
    mentionedAs: string;
    resolvedTo: string;
    confidence: number;
    type: string;
  }>;
}

export interface VoiceIntent {
  intent_name: string;
  example_query: string;
}

export interface AskResponse {
  query: string;
  detectedIntent: string;
  resolvedEntity: string | null;
  entityType: string | null;
  answer: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
}

export interface VoiceHistory {
  id: string;
  query: string;
  detected_intent: string;
  resolved_entity: string | null;
  entity_type: string | null;
  answer: string;
  confidence: string;
  created_at: string;
}