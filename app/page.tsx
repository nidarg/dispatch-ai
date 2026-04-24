import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserTenant } from "@/lib/auth/get-user-tenant";

export default async function HomePage() {
   const result = await getCurrentUserTenant();

  if (result.status === "no-user") {
    redirect("/login");
  }

  if (result.status === "no-membership") {
    redirect("/unauthorized");
  }
    
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
          Dispatch AI
        </p>

        <h1 className="mt-4 text-4xl font-bold">
          Admin / Dev Control Panel
        </h1>

        <p className="mt-4 max-w-2xl text-zinc-600">
          Internal environment for testing widgets, authentication and
          multi-tenant dashboards.
        </p>

        {/* ================= WIDGET ================= */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-zinc-900">
            Widget previews
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Link
              href="/widget/pedrotti"
              className="rounded-2xl border bg-white p-5 hover:bg-zinc-50"
            >
              <div className="font-semibold">Pedrotti</div>
              <div className="text-sm text-zinc-600">
                Roadside assistance widget
              </div>
            </Link>

            <Link
              href="/widget/hotel-lago"
              className="rounded-2xl border bg-white p-5 hover:bg-zinc-50"
            >
              <div className="font-semibold">Hotel Lago</div>
              <div className="text-sm text-zinc-600">
                Hotel support widget
              </div>
            </Link>
          </div>
        </section>

        {/* ================= AUTH ================= */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-zinc-900">
            Authentication
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Link
              href="/login"
              className="rounded-2xl border bg-white p-5 hover:bg-zinc-50"
            >
              <div className="font-semibold">Login</div>
              <div className="text-sm text-zinc-600">
                Magic link authentication
              </div>
            </Link>

            <Link
              href="/unauthorized"
              className="rounded-2xl border bg-white p-5 hover:bg-zinc-50"
            >
              <div className="font-semibold">Unauthorized page</div>
              <div className="text-sm text-zinc-600">
                Access control preview
              </div>
            </Link>
          </div>
        </section>

        {/* ================= DASHBOARDS ================= */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-zinc-900">
            Dashboards
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Link
              href="/dashboard/intakes"
              className="rounded-2xl border bg-white p-5 hover:bg-zinc-50"
            >
              <div className="font-semibold">Admin dashboard</div>
              <div className="text-sm text-zinc-600">
                Global intake list (all tenants)
              </div>
            </Link>

            <Link
              href="/dashboard/pedrotti/intakes"
              className="rounded-2xl border bg-white p-5 hover:bg-zinc-50"
            >
              <div className="font-semibold">Pedrotti dashboard</div>
              <div className="text-sm text-zinc-600">
                Tenant-specific view
              </div>
            </Link>

            <Link
              href="/dashboard/hotel-lago/intakes"
              className="rounded-2xl border bg-white p-5 hover:bg-zinc-50"
            >
              <div className="font-semibold">Hotel Lago dashboard</div>
              <div className="text-sm text-zinc-600">
                Tenant-specific view
              </div>
            </Link>
          </div>
        </section>

        {/* ================= DEBUG ================= */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-zinc-900">
            Debug / Testing
          </h2>

          <div className="mt-4 text-sm text-zinc-600">
            Use this panel to quickly test flows:
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Login flow (magic link)</li>
              <li>Tenant isolation</li>
              <li>Widget → WhatsApp flow</li>
              <li>Database inserts</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}