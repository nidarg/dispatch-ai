import { getCurrentUser } from "./get-user";
import { supabaseAdmin } from "@/lib/supabase";

export async function getCurrentPlatformAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "no-user" as const,
    };
  }

  const { data, error } = await supabaseAdmin
    .from("platform_admins")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return {
      status: "not-platform-admin" as const,
      user,
    };
  }

  return {
    status: "ok" as const,
    user,
    platformAdmin: data,
  };
}