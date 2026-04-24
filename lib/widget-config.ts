import { supabaseAdmin } from "@/lib/supabase";

export type WidgetUseCase = "roadside" | "hotel";

export type WidgetConfig = {
  slug: string;
  companyName: string;
  whatsappNumber: string;
  operatorLanguage: string;
  accentColor?: string;
  useCase: WidgetUseCase;
  enableLocation: boolean;
};

type TenantSettingsRow = {
  company_slug: string;
  company_name: string;
  whatsapp_number: string;
  operator_language: string;
  accent_color: string | null;
  use_case: WidgetUseCase;
  enable_location: boolean;
};

export const widgetConfigs: WidgetConfig[] = [
  {
    slug: "pedrotti",
    companyName: "Pedrotti",
    whatsappNumber: "40755741335",
    operatorLanguage: "Italian",
    accentColor: "#dc2626",
    useCase: "roadside",
    enableLocation: true,
  },
  {
    slug: "hotel-lago",
    companyName: "Hotel Lago",
    whatsappNumber: "40755741335",
    operatorLanguage: "Italian",
    accentColor: "#2563eb",
    useCase: "hotel",
    enableLocation: false,
  },
];

function mapTenantSettingsToWidgetConfig(
  row: TenantSettingsRow
): WidgetConfig {
  return {
    slug: row.company_slug,
    companyName: row.company_name,
    whatsappNumber: row.whatsapp_number,
    operatorLanguage: row.operator_language,
    accentColor: row.accent_color ?? undefined,
    useCase: row.use_case,
    enableLocation: row.enable_location,
  };
}

export async function getWidgetConfigBySlug(
  slug: string
): Promise<WidgetConfig | undefined> {
  const cleanSlug = slug.trim();

  const { data, error } = await supabaseAdmin
    .from("tenant_settings")
    .select(
      "company_slug, company_name, whatsapp_number, operator_language, accent_color, use_case, enable_location"
    )
    .eq("company_slug", cleanSlug)
    .maybeSingle();

  if (error) {
    console.error("Failed to load tenant settings:", error);
  }

  if (data) {
    return mapTenantSettingsToWidgetConfig(data as TenantSettingsRow);
  }

  return widgetConfigs.find((config) => config.slug === cleanSlug);
}