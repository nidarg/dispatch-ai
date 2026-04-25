import { redirect } from "next/navigation";
import { getCurrentPlatformAdmin } from "./get-platform-admin";

export async function requirePlatformAdmin() {
  const result = await getCurrentPlatformAdmin();

  if (result.status === "no-user") {
    redirect("/login");
  }

  if (result.status === "not-platform-admin") {
    redirect("/unauthorized");
  }

  return result;
}