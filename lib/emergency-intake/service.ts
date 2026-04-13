import { openai } from "@/lib/openai";
import { buildEmergencyPrompt } from "./prompts";
import type {
  EmergencyIntakePayload,
  EmergencyIntakeSuccessResponse,
} from "./types";

export async function generateEmergencySummary(
  payload: EmergencyIntakePayload
): Promise<EmergencyIntakeSuccessResponse> {
  const prompt = buildEmergencyPrompt(payload);

  const completion = await openai.responses.create({
    model: "gpt-5.4-mini",
    input: prompt,
  });

  const summary = completion.output_text.trim();

  return {
    summary,
    useCase: payload.useCase,
  };
}