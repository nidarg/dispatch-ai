import { supabaseAdmin } from "@/lib/supabase";

export type IntakeRow = {
  id: number;
  company_slug: string;
  use_case: "roadside" | "hotel";
  original_message: string;
  summary: string;
  detected_language: string;
  priority: "low" | "normal" | "high";
  payload: Record<string, unknown>;
  created_at: string;
  status: "new" | "in_progress" | "resolved";
  updated_at: string | null;
  resolved_at: string | null;
};

export async function getLatestIntakes(limit = 50): Promise<IntakeRow[]> {
  const { data, error } = await supabaseAdmin
    .from("emergency_intakes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as IntakeRow[];
}
export async function getIntakesByCompany(
  companySlug: string,
  limit = 50
): Promise<IntakeRow[]> {
  const { data, error } = await supabaseAdmin
    .from("emergency_intakes")
    .select("*")
    .eq("company_slug", companySlug)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as IntakeRow[];
}