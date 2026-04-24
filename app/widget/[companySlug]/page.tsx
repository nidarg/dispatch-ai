import EmergencyIntakeWidget from "@/components/widget/EmergencyIntakeWidget";
import { getWidgetConfigBySlug } from "@/lib/widget-config";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type WidgetCompanyPageProps = {
  params: Promise<{
    companySlug: string;
  }>;
  searchParams: Promise<{
    embed?: string;
  }>;
};

export default async function WidgetCompanyPage({
  params,
  searchParams,
}: WidgetCompanyPageProps) {
  const { companySlug } = await params;
  const { embed } = await searchParams;

  const config = await getWidgetConfigBySlug(companySlug);

  if (!config) {
    notFound();
  }

  const isEmbed = embed === "true";

  if (isEmbed) {
    return (
      <main className="min-h-screen bg-white p-0 text-zinc-900">
        <EmergencyIntakeWidget config={config} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
          Widget
        </p>

        <h1 className="mt-4 text-3xl font-bold">
          {config.companyName} multilingual intake
        </h1>

        <p className="mt-4 max-w-2xl text-zinc-600">
          Dynamic widget route loaded from the company configuration.
        </p>

        <div className="mt-10">
          <EmergencyIntakeWidget config={config} />
        </div>
      </div>
    </main>
  );
}