import { supabaseAdmin } from "@/lib/supabase";

type AnalyticsSummary = {
  totalIntakes: number;
  newCount: number;
  inProgressCount: number;
  resolvedCount: number;
  highPriorityCount: number;
  totalTenants: number;
};

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const [
    totalIntakesResult,
    newResult,
    inProgressResult,
    resolvedResult,
    highPriorityResult,
    tenantsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("emergency_intakes")
      .select("*", { count: "exact", head: true }),

    supabaseAdmin
      .from("emergency_intakes")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),

    supabaseAdmin
      .from("emergency_intakes")
      .select("*", { count: "exact", head: true })
      .eq("status", "in_progress"),

    supabaseAdmin
      .from("emergency_intakes")
      .select("*", { count: "exact", head: true })
      .eq("status", "resolved"),

    supabaseAdmin
      .from("emergency_intakes")
      .select("*", { count: "exact", head: true })
      .eq("priority", "high"),

    supabaseAdmin
      .from("tenant_settings")
      .select("*", { count: "exact", head: true }),
  ]);

  return {
    totalIntakes: totalIntakesResult.count ?? 0,
    newCount: newResult.count ?? 0,
    inProgressCount: inProgressResult.count ?? 0,
    resolvedCount: resolvedResult.count ?? 0,
    highPriorityCount: highPriorityResult.count ?? 0,
    totalTenants: tenantsResult.count ?? 0,
  };
}