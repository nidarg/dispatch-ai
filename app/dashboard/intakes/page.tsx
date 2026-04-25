import Link from "next/link";
import IntakeList from "@/components/dashboard/IntakeList";
import DashboardUserBar from "@/components/dashboard/DashboardUserBar";
import { getLatestIntakes } from "@/lib/dashboard/intakes";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";

export default async function DashboardIntakesPage() {
  const result = await requirePlatformAdmin();

  try {
    const intakes = await getLatestIntakes(50);

    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-zinc-900">
            Platform Admin Dashboard
          </h1>

          <p className="mt-2 text-zinc-600">
            Latest intake requests from all tenants.
          </p>

          <div className="mt-6">
            <DashboardUserBar
              email={result.user.email ?? "Unknown user"}
              tenantLabel={`Platform ${result.platformAdmin.role}`}
            />
          </div>

          {/* ================= ADMIN TOOLS ================= */}

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-900">
              Admin tools
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Link
                href="/dashboard/admin/memberships"
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:bg-zinc-50"
              >
                <div className="font-semibold text-zinc-900">
                  Manage memberships
                </div>

                <div className="mt-2 text-sm text-zinc-600">
                  Create tenant memberships and assign roles to users.
                </div>
              </Link>

              <Link
                href="/dashboard/admin/tenant-settings"
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:bg-zinc-50"
              >
                <div className="font-semibold text-zinc-900">
                  Tenant settings
                </div>

                <div className="mt-2 text-sm text-zinc-600">
                  Configure widget behavior, WhatsApp, colors and use cases.
                </div>
              </Link>
            </div>
          </section>

          {/* ================= GLOBAL INTAKES ================= */}

          <div className="mt-10">
            <IntakeList intakes={intakes} />
          </div>
        </div>
      </main>
    );
  } catch (error) {
    console.error("Platform dashboard failed:", error);

    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-zinc-900">
            Platform Admin Dashboard
          </h1>

          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Failed to load platform data.
          </div>
        </div>
      </main>
    );
  }
}