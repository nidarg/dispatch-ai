import MembershipsAdmin from "@/components/admin/MembershipsAdmin";
import DashboardUserBar from "@/components/dashboard/DashboardUserBar";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { Link } from "lucide-react";

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
              <div className="mt-6">
  <Link
    href="/"
    className="inline-flex rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
  >
    ← Back home
  </Link>
</div>

        <div className="mt-8">
          <MembershipsAdmin />
        </div>
      </div>
    </main>
  );
}