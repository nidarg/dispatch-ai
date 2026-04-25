import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireTenantAccess } from "@/lib/auth/require-tenant-access";

const allowedRoles = ["operator", "readonly"] as const;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  const { companySlug } = await params;

  const result = await requireTenantAccess(companySlug);

  if (result.membership.role !== "manager") {
    return NextResponse.json(
      { error: "Only managers can manage users" },
      { status: 403 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("tenant_memberships")
    .select("id, user_id, company_slug, role, created_at")
    .eq("company_slug", companySlug)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load tenant users" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    memberships: data ?? [],
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  const { companySlug } = await params;

  const result = await requireTenantAccess(companySlug);

  if (result.membership.role !== "manager") {
    return NextResponse.json(
      { error: "Only managers can manage users" },
      { status: 403 }
    );
  }

  const body = await req.json();

  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  const role =
    typeof body.role === "string"
      ? body.role.trim()
      : "";

  if (!email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  if (
    !allowedRoles.includes(
      role as (typeof allowedRoles)[number]
    )
  ) {
    return NextResponse.json(
      { error: "Invalid role" },
      { status: 400 }
    );
  }

  const { data: usersData, error: usersError } =
    await supabaseAdmin.auth.admin.listUsers();

  if (usersError) {
    return NextResponse.json(
      { error: "Failed to load auth users" },
      { status: 500 }
    );
  }

  let authUser = usersData.users.find(
    (user) => user.email?.toLowerCase() === email
  );

  if (!authUser) {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://multilingual-dispatch-flow.vercel.app";

    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${appUrl}/auth/callback`,
      });

    if (inviteError) {
      return NextResponse.json(
        { error: inviteError.message },
        { status: 500 }
      );
    }

    authUser = inviteData.user ?? undefined;
  }

  if (!authUser) {
    return NextResponse.json(
      { error: "Could not create user" },
      { status: 500 }
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

  return NextResponse.json({
    membership: data,
  });
}