import type {
  EmergencyIntakePayload,
  EmergencyIntakeRequestBody,
} from "./types";

type ValidationResult =
  | {
      ok: true;
      data: {
        companySlug: string;
        payload: EmergencyIntakePayload;
      };
    }
  | { ok: false; error: string };

export function validateEmergencyIntakePayload(
  input: unknown
): ValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const body = input as Record<string, unknown>;

  if (typeof body.companySlug !== "string" || !body.companySlug.trim()) {
    return { ok: false, error: "Company slug is required." };
  }

  if (typeof body.message !== "string" || !body.message.trim()) {
    return { ok: false, error: "Message is required." };
  }

  if (body.useCase !== "roadside" && body.useCase !== "hotel") {
    return { ok: false, error: "Invalid use case." };
  }

  const companySlug = body.companySlug.trim();

  if (body.useCase === "roadside") {
    const payload: EmergencyIntakeRequestBody = {
      companySlug,
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
    };

    const { companySlug: _, ...cleanPayload } = payload;

    return {
      ok: true,
      data: {
        companySlug,
        payload: cleanPayload,
      },
    };
  }

  const payload: EmergencyIntakeRequestBody = {
    companySlug,
    message: body.message.trim(),
    useCase: "hotel",
    roomNumber:
      typeof body.roomNumber === "string" ? body.roomNumber.trim() : undefined,
    issueType: typeof body.issueType === "string" ? body.issueType : undefined,
    urgency: typeof body.urgency === "string" ? body.urgency : undefined,
  };

  const { companySlug: _, ...cleanPayload } = payload;

  return {
    ok: true,
    data: {
      companySlug,
      payload: cleanPayload,
    },
  };
}