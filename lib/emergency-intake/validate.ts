import type { EmergencyIntakePayload } from "./types";

type ValidationResult =
  | { ok: true; data: EmergencyIntakePayload }
  | { ok: false; error: string };

export function validateEmergencyIntakePayload(
  input: unknown
): ValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const body = input as Record<string, unknown>;

  if (typeof body.message !== "string" || !body.message.trim()) {
    return { ok: false, error: "Message is required." };
  }

  if (body.useCase !== "roadside" && body.useCase !== "hotel") {
    return { ok: false, error: "Invalid use case." };
  }

  if (body.useCase === "roadside") {
    return {
      ok: true,
      data: {
        message: body.message.trim(),
        useCase: "roadside",
        vehicleType:
          typeof body.vehicleType === "string" ? body.vehicleType : undefined,
        canMove: typeof body.canMove === "string" ? body.canMove : undefined,
        needsTowing:
          typeof body.needsTowing === "string" ? body.needsTowing : undefined,
        needsHeavyRecovery:
          typeof body.needsHeavyRecovery === "string"
            ? body.needsHeavyRecovery
            : undefined,
      },
    };
  }

  return {
    ok: true,
    data: {
      message: body.message.trim(),
      useCase: "hotel",
      roomNumber:
        typeof body.roomNumber === "string" ? body.roomNumber.trim() : undefined,
      issueType:
        typeof body.issueType === "string" ? body.issueType : undefined,
      urgency: typeof body.urgency === "string" ? body.urgency : undefined,
    },
  };
}