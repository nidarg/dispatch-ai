import LogoutButton from "./LogoutButton";

type DashboardUserBarProps = {
  email: string;
  tenantLabel?: string;
};

export default function DashboardUserBar({
  email,
  tenantLabel,
}: DashboardUserBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-zinc-900">{email}</p>
        {tenantLabel ? (
          <p className="mt-1 text-xs text-zinc-500">
            Tenant: <span className="font-medium text-zinc-700">{tenantLabel}</span>
          </p>
        ) : (
          <p className="mt-1 text-xs text-zinc-500">Platform admin view</p>
        )}
      </div>

      <LogoutButton />
    </div>
  );
}