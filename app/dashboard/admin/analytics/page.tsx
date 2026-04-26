import Link from "next/link";
import DashboardUserBar from "@/components/dashboard/DashboardUserBar";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { getAnalyticsSummary } from "@/lib/dashboard/analytics";

export default async function AnalyticsPage() {
  const admin = await requirePlatformAdmin();
  const summary = await getAnalyticsSummary();

  const cards = [
    {
      label: "Total intakes",
      value: summary.totalIntakes,
    },
    {
      label: "New",
      value: summary.newCount,
    },
    {
      label: "In progress",
      value: summary.inProgressCount,
    },
    {
      label: "Resolved",
      value: summary.resolvedCount,
    },
    {
      label: "High priority",
      value: summary.highPriorityCount,
    },
    {
      label: "Active tenants",
      value: summary.totalTenants,
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-zinc-900">
          Platform Analytics
        </h1>

        <p className="mt-2 text-zinc-600">
          Global operational overview across all tenants.
        </p>

        <div className="mt-6">
          <DashboardUserBar
            email={admin.user.email ?? "Unknown user"}
            tenantLabel={`Platform ${admin.platformAdmin.role}`}
          />
        </div>

        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            ← Back home
          </Link>
        </div>

        <section className="mt-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <p className="text-sm font-medium text-zinc-500">
                  {card.label}
                </p>

                <p className="mt-3 text-3xl font-bold text-zinc-900">
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}