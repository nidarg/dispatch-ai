import MembershipsAdmin from "@/components/admin/MembershipsAdmin";
import DashboardUserBar from "@/components/dashboard/DashboardUserBar";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";

export default async function TenantMembershipsAdminPage() {
  const result = await requirePlatformAdmin();

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-zinc-900">
          Tenant memberships
        </h1>

        <p className="mt-2 text-zinc-600">
          Add users to tenants and assign roles.
        </p>

        <div className="mt-6">
          <DashboardUserBar
            email={result.user.email ?? "Unknown user"}
            tenantLabel="Platform Admin"
          />
        </div>

        <div className="mt-8">
          <MembershipsAdmin />
        </div>
      </div>
    </main>
  );
}