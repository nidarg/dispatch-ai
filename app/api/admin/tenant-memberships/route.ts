import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentPlatformAdmin } from "@/lib/auth/get-platform-admin";

const allowedRoles = ["admin", "operator", "manager", "readonly"] as const;
  async function requireAdminApi() {
  const current = await getCurrentPlatformAdmin();

  if (current.status !== "ok") {
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
    .from("tenant_memberships")
    .select("id, user_id, company_slug, role, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load memberships" },
      { status: 500 }
    );
  }

  return NextResponse.json({ memberships: data ?? [] });
}

export async function POST(req: Request) {
  const admin = await requireAdminApi();

if (!admin) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

  const body = await req.json();

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const companySlug =
    typeof body.companySlug === "string" ? body.companySlug.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!companySlug) {
    return NextResponse.json(
      { error: "Company slug is required" },
      { status: 400 }
    );
  }

  if (!allowedRoles.includes(role as (typeof allowedRoles)[number])) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { data: usersData, error: usersError } =
    await supabaseAdmin.auth.admin.listUsers();

  if (usersError) {
    return NextResponse.json(
      { error: "Failed to load auth users" },
      { status: 500 }
    );
  }

  const authUser = usersData.users.find(
    (user) => user.email?.toLowerCase() === email
  );

  if (!authUser) {
    return NextResponse.json(
      { error: "No auth user found with this email. The user must log in once first." },
      { status: 404 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("tenant_memberships")
    .upsert(
      {
        user_id: authUser.id,
        company_slug: companySlug,
        role,
      },
      {
        onConflict: "user_id,company_slug",
      }
    )
    .select("id, user_id, company_slug, role, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to save membership" },
      { status: 500 }
    );
  }

  return NextResponse.json({ membership: data });
}