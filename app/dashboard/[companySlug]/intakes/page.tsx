import Link from "next/link";
import IntakeList from "@/components/dashboard/IntakeList";
import DashboardUserBar from "@/components/dashboard/DashboardUserBar";
import { getIntakesByCompany } from "@/lib/dashboard/intakes";
import { requireTenantAccess } from "@/lib/auth/require-tenant-access";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{
    companySlug: string;
  }>;
};

export default async function TenantIntakesPage({ params }: PageProps) {

  const { companySlug } = await params;

  if (!companySlug) {
    notFound();
  }

  const result = await requireTenantAccess(companySlug);
  const isManager = result.membership.role === "manager";
    const canManageStatus =
  result.membership.role === "manager" ||
  result.membership.role === "operator";

  try {
    const intakes = await getIntakesByCompany(companySlug, 50);

    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-zinc-900">
            {companySlug} dashboard
          </h1>

          <p className="mt-2 text-zinc-600">
            Latest intake requests for this tenant.
          </p>

          <div className="mt-6">
            <DashboardUserBar
              email={result.user.email ?? "Unknown user"}
              tenantLabel={result.membership.company_slug}
            />
          </div>
          {isManager ? (
  <div className="mt-6">
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">
        Tenant tools
      </h2>

      <p className="mt-2 text-sm text-zinc-600">
        Manage users and permissions for this tenant.
      </p>

      <div className="mt-4">
        <Link
          href={`/dashboard/${companySlug}/users`}
          className="inline-flex rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Manage users
        </Link>
      </div>
    </div>
  </div>
) : null}

          <div className="mt-8">
            <IntakeList
              intakes={intakes}
              emptyMessage="No requests yet for this company."
              canManageStatus={canManageStatus}
            />
          </div>
        </div>
      </main>
    );
  } catch (error) {
    console.error("Tenant dashboard failed:", error);

    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-zinc-900">
            {companySlug} dashboard
          </h1>

          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Failed to load data.
          </div>
        </div>
      </main>
    );
  }
}