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
    detectedLanguage:
      typeof parsed.detectedLanguage === "string" &&
      parsed.detectedLanguage.trim()
        ? parsed.detectedLanguage.trim()
        : "Unknown",
    priority: normalizePriority(parsed.priority),
    useCase: payload.useCase,
  };
}