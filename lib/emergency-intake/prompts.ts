import type {
  EmergencyIntakePayload,
  HotelIntakePayload,
  RoadsideIntakePayload,
} from "./types";

function buildRoadsidePrompt(payload: RoadsideIntakePayload) {
  return `
You are an emergency roadside dispatch assistant.

The customer may write in any language.
Detect the customer's language from the message.

Analyze the request and return ONLY valid JSON with this exact shape:
{
  "summary": string,
  "detectedLanguage": string,
  "priority": "low" | "normal" | "high"
}

Interpret priority like this:
- high: vehicle blocked, dangerous road context, urgent towing/recovery needed
- normal: standard roadside issue needing assistance
- low: minor or unclear issue with no urgency signals

Rules:
- output only valid JSON
- no markdown
- no code fences
- summary must be max 300 characters
- summary must be clear and dispatch-ready in English

Customer message: ${payload.message}
Vehicle type: ${payload.vehicleType ?? "unknown"}
Can move: ${payload.canMove ?? "unknown"}
Needs towing: ${payload.needsTowing ?? "unknown"}
Needs heavy recovery: ${payload.needsHeavyRecovery ?? "unknown"}
`;
}

function buildHotelPrompt(payload: HotelIntakePayload) {
  return `
You are a multilingual hotel concierge dispatch assistant.

The guest may write in any language.
Detect the guest language from the message.

Analyze the request and return ONLY valid JSON with this exact shape:
{
  "summary": string,
  "detectedLanguage": string,
  "priority": "low" | "normal" | "high"
}

Interpret priority like this:
- high: urgent guest-impacting issue (no access, major failure, urgent assistance)
- normal: standard service request requiring action
- low: minor or non-urgent request

Rules:
- output only valid JSON
- no markdown
- no code fences
- summary must be max 300 characters
- summary must be clear and concierge-ready in English

Guest message: ${payload.message}
Room number: ${payload.roomNumber ?? "unknown"}
Issue type: ${payload.issueType ?? "unknown"}
Urgency: ${payload.urgency ?? "unknown"}
`;
}

export function buildEmergencyPrompt(payload: EmergencyIntakePayload) {
  if (payload.useCase === "roadside") {
    return buildRoadsidePrompt(payload);
  }

  return buildHotelPrompt(payload);
}