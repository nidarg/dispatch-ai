import { supabaseAdmin } from "@/lib/supabase";

export type IntakeStatus = "new" | "in_progress" | "resolved";
export type IntakePriority = "low" | "normal" | "high";

export type IntakeRow = {
  id: number;
  company_slug: string;
  use_case: "roadside" | "hotel";
  original_message: string;
  summary: string;
  detected_language: string;
  priority: IntakePriority;
  status: IntakeStatus;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;

  // Assignment system
  assigned_to: string | null;
  assigned_at: string | null;
};

export type TenantOption = {
  company_slug: string;
  company_name: string;
};

type IntakeFilters = {
  limit?: number;
  status?: IntakeStatus;
  priority?: IntakePriority;
  language?: string;
  search?: string;
};

type GlobalIntakeFilters = IntakeFilters & {
  companySlug?: string;
};

export async function getLatestIntakes(
  options?: GlobalIntakeFilters
): Promise<IntakeRow[]> {
  const limit = options?.limit ?? 50;

  let query = supabaseAdmin
    .from("emergency_intakes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.companySlug) {
    query = query.eq("company_slug", options.companySlug);
  }

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.priority) {
    query = query.eq("priority", options.priority);
  }

  if (options?.language) {
    query = query.eq("detected_language", options.language);
  }

  const search = options?.search?.trim();

  if (search) {
    query = query.or(
      `summary.ilike.%${search}%,original_message.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as IntakeRow[];
}

export async function getIntakesByCompany(
  companySlug: string,
  options?: IntakeFilters
): Promise<IntakeRow[]> {
  const limit = options?.limit ?? 50;

  let query = supabaseAdmin
    .from("emergency_intakes")
    .select("*")
    .eq("company_slug", companySlug)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.priority) {
    query = query.eq("priority", options.priority);
  }

  if (options?.language) {
    query = query.eq("detected_language", options.language);
  }

  const search = options?.search?.trim();

  if (search) {
    query = query.or(
      `summary.ilike.%${search}%,original_message.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as IntakeRow[];
}

export async function getTenantOptions(): Promise<TenantOption[]> {
  const { data, error } = await supabaseAdmin
    .from("tenant_settings")
    .select("company_slug, company_name")
    .order("company_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as TenantOption[];
}