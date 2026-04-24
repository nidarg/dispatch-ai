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

          <div className="mt-8">
            <IntakeList
              intakes={intakes}
              emptyMessage="No requests yet for this company."
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