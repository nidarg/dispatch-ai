export type EmergencyUseCase = "roadside" | "hotel";

export type EmergencyPriority = "low" | "normal" | "high";

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
  detectedLanguage: string;
  priority: EmergencyPriority;
  useCase: EmergencyUseCase;
};

export type EmergencyIntakeErrorResponse = {
  error: string;
};
export type EmergencyIntakeRequestBody = EmergencyIntakePayload & {
  companySlug: string;
};