import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUserTenant } from "@/lib/auth/get-user-tenant";

const allowedUseCases = ["roadside", "hotel"] as const;

async function requireAdminApi() {
  const current = await getCurrentUserTenant();

  if (current.status !== "ok" || current.membership.role !== "admin") {
    return null;
  }

  return current;
}

export async function GET() {
  const admin = await requireAdminApi();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("tenant_settings")
    .select(
      "id, company_slug, company_name, whatsapp_number, operator_language, accent_color, use_case, enable_location, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load tenant settings" },
      { status: 500 }
    );
  }

  return NextResponse.json({ tenants: data ?? [] });
}

export async function POST(req: Request) {
  const admin = await requireAdminApi();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();

  const companySlug =
    typeof body.companySlug === "string"
      ? body.companySlug.trim().toLowerCase()
      : "";

  const companyName =
    typeof body.companyName === "string" ? body.companyName.trim() : "";

  const whatsappNumber =
    typeof body.whatsappNumber === "string"
      ? body.whatsappNumber.trim()
      : "";

  const operatorLanguage =
    typeof body.operatorLanguage === "string"
      ? body.operatorLanguage.trim()
      : "English";

  const accentColor =
    typeof body.accentColor === "string" ? body.accentColor.trim() : "";

  const useCase =
    typeof body.useCase === "string" ? body.useCase.trim() : "";

  const enableLocation = Boolean(body.enableLocation);

  if (!companySlug) {
    return NextResponse.json(
      { error: "Company slug is required" },
      { status: 400 }
    );
  }

  if (!companyName) {
    return NextResponse.json(
      { error: "Company name is required" },
      { status: 400 }
    );
  }

  if (!whatsappNumber) {
    return NextResponse.json(
      { error: "WhatsApp number is required" },
      { status: 400 }
    );
  }

  if (!allowedUseCases.includes(useCase as (typeof allowedUseCases)[number])) {
    return NextResponse.json({ error: "Invalid use case" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("tenant_settings")
    .upsert(
      {
        company_slug: companySlug,
        company_name: companyName,
        whatsapp_number: whatsappNumber,
        operator_language: operatorLanguage || "English",
        accent_color: accentColor || null,
        use_case: useCase,
        enable_location: enableLocation,
      },
      {
        onConflict: "company_slug",
      }
    )
    .select(
      "id, company_slug, company_name, whatsapp_number, operator_language, accent_color, use_case, enable_location, created_at"
    )
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to save tenant settings" },
      { status: 500 }
    );
  }

  return NextResponse.json({ tenant: data });
}