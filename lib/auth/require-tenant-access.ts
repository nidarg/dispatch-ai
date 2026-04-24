import { redirect } from "next/navigation";
import { getCurrentUserTenant } from "./get-user-tenant";

export async function requireTenantAccess(companySlug: string) {
  const result = await getCurrentUserTenant();

  if (result.status === "no-user") {
    redirect("/login");
  }

  if (result.status === "no-membership") {
    redirect("/unauthorized");
  }

  if (result.membership.company_slug !== companySlug) {
    redirect("/unauthorized");
  }

  return result;
}