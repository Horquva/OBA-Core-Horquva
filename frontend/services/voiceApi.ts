import { authHeader } from "../lib/authFetch";

const API_ROOT =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
const API_BASE = `${API_ROOT}/api/voice`;

export interface VoiceResponse {
  query: string;
  detectedIntent: string;
  resolvedEntity: string | null;
  entityType: string | null;
  answer: string;
  confidence: string;
}

export interface DailySummary {
  summary: string;
}

export interface VoiceIntent {
  intent_name: string;
  example_query: string;
}

export interface VoiceHistory {
  query: string;
  answer: string;
  detected_intent: string;
  created_at: string;
}

// Ask OBA a question
export async function askOBA(question: string): Promise<VoiceResponse> {
  const response = await fetch(
    `${API_BASE}/ask?q=${encodeURIComponent(question)}`,
    { headers: authHeader() }
  );

  if (!response.ok) {
    throw new Error("Failed to get response from OBA.");
  }

  return response.json();
}

// Daily briefing
export async function getDailySummary() {
  const response = await fetch(`${API_BASE}/daily-summary`, { headers: authHeader() });

  if (!response.ok) {
    throw new Error("Failed to load daily summary.");
  }

  return response.json();
}

// Suggested prompts
export async function getVoiceIntents() {
  const response = await fetch(`${API_BASE}/intents`, { headers: authHeader() });

  if (!response.ok) {
    throw new Error("Failed to load voice intents.");
  }

  return response.json();
}

// Conversation history
export async function getVoiceHistory() {
  const response = await fetch(`${API_BASE}/history`, { headers: authHeader() });

  if (!response.ok) {
    throw new Error("Failed to load history.");
  }

  return response.json();
}

export async function executeVoiceCommand(text: string) {
  const response = await fetch(`${API_BASE}/command`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error("Voice command failed.");
  }

  return response.json();
}