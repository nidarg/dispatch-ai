import IntakeList from "@/components/dashboard/IntakeList";
import { getLatestIntakes } from "@/lib/dashboard/intakes";

export default async function DashboardIntakesPage() {
  try {
    const intakes = await getLatestIntakes(50);

    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-zinc-900">
            Admin dashboard
          </h1>

          <p className="mt-2 text-zinc-600">
            Latest intake requests from all tenants.
          </p>

          <div className="mt-8">
            <IntakeList intakes={intakes} />
          </div>
        </div>
      </main>
    );
  } catch (error) {
    console.error("Dashboard intakes page failed:", error);

    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-zinc-900">
            Admin dashboard
          </h1>

          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Failed to load intakes.
          </div>
        </div>
      </main>
    );
  }
}