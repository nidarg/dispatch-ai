import { getCurrentUser } from "./get-user";
import { supabaseAdmin } from "@/lib/supabase";

export async function getCurrentUserTenant() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "no-user" as const,
    };
  }

  const { data, error } = await supabaseAdmin
    .from("tenant_memberships")
    .select("company_slug, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return {
      status: "no-membership" as const,
      user,
    };
  }

  return {
    status: "ok" as const,
    user,
    membership: data,
  };
}