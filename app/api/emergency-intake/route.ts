import { NextResponse } from "next/server";
import { generateEmergencySummary } from "@/lib/emergency-intake/service";
import { validateEmergencyIntakePayload } from "@/lib/emergency-intake/validate";
import { saveEmergencyIntake } from "@/lib/emergency-intake/repository";
import type { EmergencyIntakeErrorResponse } from "@/lib/emergency-intake/types";

export async function POST(req: Request) {
  try {
    const rawBody: unknown = await req.json();
    const validation = validateEmergencyIntakePayload(rawBody);

    if (!validation.ok) {
      const errorResponse: EmergencyIntakeErrorResponse = {
        error: validation.error,
      };

      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { companySlug, payload } = validation.data;

    const result = await generateEmergencySummary(payload);

    await saveEmergencyIntake({
      companySlug,
      payload,
      result,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Emergency intake route failed:", error);

    const errorResponse: EmergencyIntakeErrorResponse = {
      error: "Failed to generate summary",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}