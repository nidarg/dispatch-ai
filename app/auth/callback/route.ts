import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 🔥 ia userul
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 🔥 ia tenantul
  const { data } = await supabaseAdmin
    .from("tenant_memberships")
    .select("company_slug, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!data) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (data.role === "admin") {
  return NextResponse.redirect(new URL("/dashboard/intakes", req.url));
}

  // 🔥 redirect direct în tenant
  return NextResponse.redirect(
    new URL(`/dashboard/${data.company_slug}/intakes`, req.url)
  );
}