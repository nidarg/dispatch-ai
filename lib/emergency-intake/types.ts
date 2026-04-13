export type EmergencyUseCase = "roadside" | "hotel";

export type RoadsideIntakePayload = {
  message: string;
  useCase: "roadside";
  vehicleType?: string;
  canMove?: string;
  needsTowing?: string;
  needsHeavyRecovery?: string;
};

export type HotelIntakePayload = {
  message: string;
  useCase: "hotel";
  roomNumber?: string;
  issueType?: string;
  urgency?: string;
};

export type EmergencyIntakePayload =
  | RoadsideIntakePayload
  | HotelIntakePayload;

export type EmergencyIntakeSuccessResponse = {
  summary: string;
  detectedLanguage?: string;
  useCase: EmergencyUseCase;
};

export type EmergencyIntakeErrorResponse = {
  error: string;
};