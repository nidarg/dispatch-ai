import { redirect } from "next/navigation";
import IntakeList from "@/components/dashboard/IntakeList";
import DashboardUserBar from "@/components/dashboard/DashboardUserBar";
import { getLatestIntakes } from "@/lib/dashboard/intakes";
import { getCurrentUserTenant } from "@/lib/auth/get-user-tenant";

export default async function DashboardIntakesPage() {
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

  try {
    const intakes = await getLatestIntakes(50);

    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-zinc-900">
            Admin dashboard
          </h1>

          <p className="mt-2 text-zinc-600">
            Latest intake requests from all tenants.
          </p>

          <div className="mt-6">
            <DashboardUserBar
              email={result.user.email ?? "Unknown user"}
              tenantLabel="Platform Admin"
            />
          </div>

          <div className="mt-8">
            <IntakeList intakes={intakes} />
          </div>
        </div>
      </main>
    );
  } catch (error) {
    console.error("Dashboard intakes page failed:", error);

    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-zinc-900">
            Admin dashboard
          </h1>

          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Failed to load intakes.
          </div>
        </div>
      </main>
    );
  }
}