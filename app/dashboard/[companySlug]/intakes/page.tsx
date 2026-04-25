import Link from "next/link";
import { notFound } from "next/navigation";
import IntakeList from "@/components/dashboard/IntakeList";
import DashboardUserBar from "@/components/dashboard/DashboardUserBar";
import { getIntakesByCompany } from "@/lib/dashboard/intakes";
import { requireTenantAccess } from "@/lib/auth/require-tenant-access";

type AllowedStatus = "new" | "in_progress" | "resolved";
type AllowedPriority = "low" | "normal" | "high";

type PageProps = {
  params: Promise<{
    companySlug: string;
  }>;
  searchParams: Promise<{
  status?: string;
  priority?: string;
  language?: string;
  search?: string;
}>;
};

function isValidStatus(value?: string): value is AllowedStatus {
  return (
    value === "new" ||
    value === "in_progress" ||
    value === "resolved"
  );
}

function isValidPriority(
  value?: string
): value is AllowedPriority {
  return (
    value === "low" ||
    value === "normal" ||
    value === "high"
  );
}

export default async function TenantIntakesPage({
  params,
  searchParams,
}: PageProps) {
  const { companySlug } = await params;
  const { status, priority, language, search } = await searchParams;

  if (!companySlug) {
    notFound();
  }

  const result = await requireTenantAccess(companySlug);

  const isManager = result.membership.role === "manager";

  const canManageStatus =
    result.membership.role === "manager" ||
    result.membership.role === "operator";

  const selectedStatus = isValidStatus(status)
    ? status
    : undefined;

  const selectedPriority = isValidPriority(priority)
  ? priority
  : undefined;

  const selectedLanguage =
  typeof language === "string" && language.trim()
    ? language.trim()
    : undefined;

const selectedSearch =
  typeof search === "string" && search.trim()
    ? search.trim()
    : undefined;

  try {
 const intakes = await getIntakesByCompany(companySlug, {
  limit: 50,
  status: selectedStatus,
  priority: selectedPriority,
  language: selectedLanguage,
  search: selectedSearch,
});

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

          <div className="mt-6">
  <div className="flex flex-wrap gap-2">
    <Link
      href={`/dashboard/${companySlug}/intakes`}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        !selectedStatus
          ? "bg-zinc-900 text-white"
          : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      All
    </Link>

    <Link
      href={`/dashboard/${companySlug}/intakes?status=new`}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        selectedStatus === "new"
          ? "bg-zinc-900 text-white"
          : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      New
    </Link>

    <Link
      href={`/dashboard/${companySlug}/intakes?status=in_progress`}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        selectedStatus === "in_progress"
          ? "bg-zinc-900 text-white"
          : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      In progress
    </Link>

    <Link
      href={`/dashboard/${companySlug}/intakes?status=resolved`}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        selectedStatus === "resolved"
          ? "bg-zinc-900 text-white"
          : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      Resolved
    </Link>
  </div>
</div>

<div className="mt-4">
  <div className="flex flex-wrap gap-2">
    <Link
      href={
        selectedStatus
          ? `/dashboard/${companySlug}/intakes?status=${selectedStatus}`
          : `/dashboard/${companySlug}/intakes`
      }
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        !selectedPriority
          ? "bg-zinc-900 text-white"
          : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      All priorities
    </Link>

    <Link
      href={`/dashboard/${companySlug}/intakes?${
        selectedStatus ? `status=${selectedStatus}&` : ""
      }priority=high`}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        selectedPriority === "high"
          ? "bg-zinc-900 text-white"
          : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      High
    </Link>

    <Link
      href={`/dashboard/${companySlug}/intakes?${
        selectedStatus ? `status=${selectedStatus}&` : ""
      }priority=normal`}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        selectedPriority === "normal"
          ? "bg-zinc-900 text-white"
          : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      Normal
    </Link>

    <Link
      href={`/dashboard/${companySlug}/intakes?${
        selectedStatus ? `status=${selectedStatus}&` : ""
      }priority=low`}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        selectedPriority === "low"
          ? "bg-zinc-900 text-white"
          : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      Low
    </Link>
  </div>
</div>

<form
  action={`/dashboard/${companySlug}/intakes`}
  className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
>
  {selectedStatus ? (
    <input type="hidden" name="status" value={selectedStatus} />
  ) : null}

  {selectedPriority ? (
    <input type="hidden" name="priority" value={selectedPriority} />
  ) : null}

  <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
    <input
      name="search"
      defaultValue={selectedSearch ?? ""}
      placeholder="Search message or summary..."
      className="rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-500"
    />

    <input
      name="language"
      defaultValue={selectedLanguage ?? ""}
      placeholder="Language, e.g. German"
      className="rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-500"
    />

    <button
      type="submit"
      className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
    >
      Apply
    </button>
  </div>

  {(selectedSearch || selectedLanguage) ? (
    <div className="mt-3">
      <Link
        href={`/dashboard/${companySlug}/intakes${
          selectedStatus || selectedPriority
            ? `?${[
                selectedStatus ? `status=${selectedStatus}` : "",
                selectedPriority ? `priority=${selectedPriority}` : "",
              ]
                .filter(Boolean)
                .join("&")}`
            : ""
        }`}
        className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
      >
        Clear search/language
      </Link>
    </div>
  ) : null}
</form>

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