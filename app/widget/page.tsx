import Link from "next/link";
import { widgetConfigs } from "@/lib/widget-config";

export default function WidgetIndexPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
          Widget index
        </p>

        <h1 className="mt-4 text-3xl font-bold">
          Available widget configurations
        </h1>

        <div className="mt-8 grid gap-4">
          {widgetConfigs.map((config) => (
            <Link
              key={config.slug}
              href={`/widget/${config.slug}`}
              className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition hover:bg-zinc-50"
            >
              <div className="text-lg font-semibold">{config.companyName}</div>
              <div className="mt-1 text-sm text-zinc-600">
                /widget/{config.slug}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}