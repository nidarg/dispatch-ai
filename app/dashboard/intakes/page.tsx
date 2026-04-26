import Link from "next/link";
import IntakeList from "@/components/dashboard/IntakeList";
import DashboardUserBar from "@/components/dashboard/DashboardUserBar";
import {
  getLatestIntakes,
  getTenantOptions,
} from "@/lib/dashboard/intakes";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";

type PageProps = {
  searchParams: Promise<{
    company?: string;
  }>;
};

export default async function DashboardIntakesPage({
  searchParams,
}: PageProps) {
  const admin = await requirePlatformAdmin();

  const { company } = await searchParams;

  const selectedCompany =
    typeof company === "string" && company.trim()
      ? company.trim()
      : undefined;

  try {
    const [intakes, tenants] = await Promise.all([
      getLatestIntakes({
        limit: 100,
        companySlug: selectedCompany,
      }),
      getTenantOptions(),
    ]);

    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-zinc-900">
            Platform Admin Dashboard
          </h1>

          <p className="mt-2 text-zinc-600">
            Global intake list across all tenants.
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

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-900">
              Company filter
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/dashboard/intakes"
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  !selectedCompany
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                All companies
              </Link>

              {tenants.map((tenant) => (
                <Link
                  key={tenant.company_slug}
                  href={`/dashboard/intakes?company=${tenant.company_slug}`}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    selectedCompany === tenant.company_slug
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {tenant.company_name}
                </Link>
              ))}
            </div>
          </section>

          <div className="mt-8">
            <IntakeList
              intakes={intakes}
              emptyMessage="No intakes yet."
              canManageStatus={true}
            />
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