import { openai } from "@/lib/openai";
import { buildEmergencyPrompt } from "./prompts";
import type {
  EmergencyIntakePayload,
  EmergencyIntakeSuccessResponse,
  EmergencyPriority,
} from "./types";

type ModelStructuredOutput = {
  summary?: unknown;
  detectedLanguage?: unknown;
  priority?: unknown;
};

function normalizePriority(value: unknown): EmergencyPriority {
  if (value === "low" || value === "normal" || value === "high") {
    return value;
  }

  return "normal";
}

function normalizeDetectedLanguage(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return "Unknown";
  }

  const normalized = value.trim().toLowerCase();

  const languageMap: Record<string, string> = {
    en: "English",
    english: "English",
    de: "German",
    german: "German",
    it: "Italian",
    italian: "Italian",
    ro: "Romanian",
    romanian: "Romanian",
    pl: "Polish",
    polish: "Polish",
    nl: "Dutch",
    dutch: "Dutch",
    fr: "French",
    french: "French",
    es: "Spanish",
    spanish: "Spanish",
  };

  return languageMap[normalized] ?? value.trim();
}

function safeParseStructuredOutput(text: string): ModelStructuredOutput | null {
  try {
    return JSON.parse(text) as ModelStructuredOutput;
  } catch {
    return null;
  }
}

export async function generateEmergencySummary(
  payload: EmergencyIntakePayload
): Promise<EmergencyIntakeSuccessResponse> {
  const prompt = buildEmergencyPrompt(payload);

  const completion = await openai.responses.create({
    model: "gpt-5.4-mini",
    input: prompt,
  });

  const rawText = completion.output_text.trim();
  const parsed = safeParseStructuredOutput(rawText);

  if (!parsed || typeof parsed.summary !== "string") {
    return {
      summary: rawText,
      detectedLanguage: "Unknown",
      priority: "normal",
      useCase: payload.useCase,
    };
  }

  return {
    summary: parsed.summary.trim(),
    detectedLanguage: normalizeDetectedLanguage(parsed.detectedLanguage),
    priority: normalizePriority(parsed.priority),
    useCase: payload.useCase,
  };
}