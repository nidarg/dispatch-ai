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
  enableLocation:false,
},
];

export function getWidgetConfigBySlug(slug: string) {
  return widgetConfigs.find((config) => config.slug === slug);
}