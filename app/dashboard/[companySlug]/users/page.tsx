import { notFound } from "next/navigation";
import DashboardUserBar from "@/components/dashboard/DashboardUserBar";
import TenantUsersAdmin from "@/components/admin/TenantUsersAdmin";
import { requireTenantAccess } from "@/lib/auth/require-tenant-access";

type PageProps = {
  params: Promise<{
    companySlug: string;
  }>;
};

export default async function TenantUsersPage({
  params,
}: PageProps) {
  const { companySlug } = await params;

  if (!companySlug) {
    notFound();
  }

  const result = await requireTenantAccess(companySlug);

  if (result.membership.role !== "manager") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-zinc-900">
          {companySlug} users
        </h1>

        <p className="mt-2 text-zinc-600">
          Manage operators and read-only users for this tenant.
        </p>

        <div className="mt-6">
          <DashboardUserBar
            email={result.user.email ?? "Unknown user"}
            tenantLabel={result.membership.company_slug}
          />
        </div>

        <div className="mt-8">
          <TenantUsersAdmin companySlug={companySlug} />
        </div>
      </div>
    </main>
  );
}