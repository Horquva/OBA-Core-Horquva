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
  try {
    const response = await fetch(
      `${API_BASE}/ask?q=${encodeURIComponent(question)}`
    );

    if (!response.ok) {
      throw new Error("Failed to get response from OBA.");
    }

    return response.json();
  } catch (error) {
    console.warn("API Error, falling back to mock response:", error);
    return {
      query: question,
      detectedIntent: "Mock Intent",
      resolvedEntity: "Mock Entity",
      entityType: "Mock Type",
      answer: "I am unable to reach the Organizational Brain backend, but this is a mocked response.",
      confidence: "MEDIUM"
    };
  }
}

// Daily briefing
export async function getDailySummary() {
  try {
    const response = await fetch(`${API_BASE}/daily-summary`);

    if (!response.ok) {
      throw new Error("Failed to load daily summary.");
    }

    return response.json();
  } catch (error) {
    console.warn("API Error, falling back to mock response:", error);
    return { summary: "This is a mocked daily executive briefing since the API is unreachable." };
  }
}

// Suggested prompts
export async function getVoiceIntents() {
  try {
    const response = await fetch(`${API_BASE}/intents`);

    if (!response.ok) {
      throw new Error("Failed to load voice intents.");
    }

    return response.json();
  } catch (error) {
    console.warn("API Error, falling back to mock response:", error);
    return [
      { intent_name: "Check Risk", example_query: "Show me highest active risks" },
      { intent_name: "Check Ownership", example_query: "Who owns the billing service?" }
    ];
  }
}

// Conversation history
export async function getVoiceHistory() {
  try {
    const response = await fetch(`${API_BASE}/history`);

    if (!response.ok) {
      throw new Error("Failed to load history.");
    }

    return response.json();
  } catch (error) {
    console.warn("API Error, falling back to mock response:", error);
    return [];
  }
}
export async function executeVoiceCommand(text: string) {
  try {
    const response = await fetch(`${API_BASE}/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error("Voice command failed.");
    }

    return response.json();
  } catch (error) {
    console.warn("API Error, falling back to mock response:", error);
    return { status: "Feature mocked due to missing API" };
  }
}