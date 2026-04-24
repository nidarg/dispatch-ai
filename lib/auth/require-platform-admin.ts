import { redirect } from "next/navigation";
import { getCurrentUserTenant } from "./get-user-tenant";

export async function requirePlatformAdmin() {
  const result = await getCurrentUserTenant();

  if (result.status === "no-user") {
    redirect("/login");
  }

  if (result.status === "no-membership") {
    redirect("/unauthorized");
  }

  if (result.membership.role !== "admin") {
    redirect("/unauthorized");
  }

  return result;
}