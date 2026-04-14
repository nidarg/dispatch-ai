import { supabaseAdmin } from "@/lib/supabase";
import type {
  EmergencyIntakePayload,
  EmergencyIntakeSuccessResponse,
} from "./types";

type SaveEmergencyIntakeParams = {
  companySlug: string;
  payload: EmergencyIntakePayload;
  result: EmergencyIntakeSuccessResponse;
};

export async function saveEmergencyIntake({
  companySlug,
  payload,
  result,
}: SaveEmergencyIntakeParams) {
  const { data, error } = await supabaseAdmin
    .from("emergency_intakes")
    .insert({
      company_slug: companySlug,
      use_case: payload.useCase,
      original_message: payload.message,
      summary: result.summary,
      detected_language: result.detectedLanguage,
      priority: result.priority,
      payload,
    })
    .select("id, company_slug, use_case, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}