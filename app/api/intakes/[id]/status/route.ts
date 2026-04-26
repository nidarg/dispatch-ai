import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentPlatformAdmin } from "@/lib/auth/get-platform-admin";
import { getCurrentUserTenant } from "@/lib/auth/get-user-tenant";

const allowedStatuses = ["new", "in_progress", "resolved"] as const;

type IntakeStatus = (typeof allowedStatuses)[number];

function isValidStatus(value: unknown): value is IntakeStatus {
  return (
    typeof value === "string" &&
    allowedStatuses.includes(value as IntakeStatus)
  );
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const status = body.status;

  if (!isValidStatus(status)) {
    return NextResponse.json(
      { error: "Invalid status" },
      { status: 400 }
    );
  }

  const intakeId = Number(id);

  if (!Number.isInteger(intakeId)) {
    return NextResponse.json(
      { error: "Invalid intake id" },
      { status: 400 }
    );
  }

  const platformAdmin = await getCurrentPlatformAdmin();
  const tenantResult = await getCurrentUserTenant();

  const { data: intake, error: intakeError } = await supabaseAdmin
    .from("emergency_intakes")
    .select("id, company_slug, assigned_to")
    .eq("id", intakeId)
    .maybeSingle();

  if (intakeError) {
    return NextResponse.json(
      { error: "Failed to load intake" },
      { status: 500 }
    );
  }

  if (!intake) {
    return NextResponse.json(
      { error: "Intake not found" },
      { status: 404 }
    );
  }

  const isPlatformAdmin = platformAdmin.status === "ok";

  const canTenantUserUpdate =
    tenantResult.status === "ok" &&
    tenantResult.membership.company_slug === intake.company_slug &&
    (
      tenantResult.membership.role === "manager" ||
      tenantResult.membership.role === "operator"
    );

  if (!isPlatformAdmin && !canTenantUserUpdate) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  /**
   * MARK NEW
   * reset everything
   */
  if (status === "new") {
    update.assigned_to = null;
    update.assigned_at = null;
    update.resolved_at = null;
  }

  /**
   * START WORK
   * auto assign current user
   */
  if (status === "in_progress") {
    if (tenantResult.status === "ok") {
      update.assigned_to = tenantResult.user.id;
      update.assigned_at = new Date().toISOString();
    }

    update.resolved_at = null;
  }

  /**
   * RESOLVED
   * keep assigned_to for history
   */
  if (status === "resolved") {
    update.resolved_at = new Date().toISOString();

    if (!intake.assigned_to && tenantResult.status === "ok") {
      update.assigned_to = tenantResult.user.id;
      update.assigned_at = new Date().toISOString();
    }
  }

  const { error } = await supabaseAdmin
    .from("emergency_intakes")
    .update(update)
    .eq("id", intakeId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
  });
}