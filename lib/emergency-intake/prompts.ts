import type {
  EmergencyIntakePayload,
  HotelIntakePayload,
  RoadsideIntakePayload,
} from "./types";

function buildRoadsidePrompt(payload: RoadsideIntakePayload) {
  return `
You are an emergency roadside dispatch assistant.

The customer may write in any language.
Automatically detect the customer's language from the message.

Create a short operational dispatch summary in English.

Include:
- detected customer language
- vehicle type
- problem description
- whether the vehicle can move
- whether towing is needed
- whether heavy recovery is needed

Rules:
- output only the summary
- maximum 400 characters
- clear, practical, dispatch-ready
- no markdown
- no bullet points

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
Automatically detect the guest language.

Create a short operational summary in English for the hotel staff.

Include:
- detected guest language
- room number
- issue type
- urgency
- clear guest request summary

Rules:
- output only the summary
- maximum 400 characters
- clear, practical, concierge-ready
- no markdown
- no bullet points

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