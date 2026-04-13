"use client";

import { useState } from "react";
import {
  MapPinned,
  MessageCircle,
  Truck,
  Car,
  Bike,
  X,
} from "lucide-react";
import type { WidgetConfig } from "@/lib/widget-config";

type IntakeResponse = {
  summary: string;
};

type EmergencyIntakeWidgetProps = {
  config: WidgetConfig;
  onClose?: () => void;
};

const vehicleOptions = [
  { value: "car", label: "Car", icon: Car },
  { value: "van", label: "Van", icon: Truck },
  { value: "truck", label: "Truck", icon: Truck },
  { value: "motorcycle", label: "Motorcycle", icon: Bike },
  { value: "camper", label: "Camper", icon: Truck },
] as const;

export default function EmergencyIntakeWidget({
  config,
  onClose,
}: EmergencyIntakeWidgetProps) {
  const { whatsappNumber, companyName, useCase, enableLocation } = config;
  const accentColor = config.accentColor ?? "#dc2626";

  const badgeStyle = {
    backgroundColor: `${accentColor}14`,
    color: accentColor,
  };

  const primaryButtonStyle = {
    backgroundColor: accentColor,
  };

  const [message, setMessage] = useState("");

  const [vehicleType, setVehicleType] = useState("car");
  const [canMove, setCanMove] = useState("no");
  const [needsTowing, setNeedsTowing] = useState("yes");
  const [needsHeavyRecovery, setNeedsHeavyRecovery] = useState("no");

  const [roomNumber, setRoomNumber] = useState("");
  const [issueType, setIssueType] = useState("maintenance");
  const [urgency, setUrgency] = useState("normal");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!message.trim()) {
      setError("Please describe the problem.");
      return;
    }

    setLoading(true);
    setError("");

    const isMobile =
      typeof navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    try {
      const res = await fetch("/api/emergency-intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          useCase,
          vehicleType: useCase === "roadside" ? vehicleType : undefined,
          canMove: useCase === "roadside" ? canMove : undefined,
          needsTowing: useCase === "roadside" ? needsTowing : undefined,
          needsHeavyRecovery:
            useCase === "roadside" ? needsHeavyRecovery : undefined,
          roomNumber: useCase === "hotel" ? roomNumber : undefined,
          issueType: useCase === "hotel" ? issueType : undefined,
          urgency: useCase === "hotel" ? urgency : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      const data: IntakeResponse = await res.json();

      const openWhatsapp = (finalMessage: string) => {
        const encodedMessage = encodeURIComponent(finalMessage);
        const waWebLink = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
        const waAppLink = `whatsapp://send?phone=${whatsappNumber}&text=${encodedMessage}`;

        if (isMobile) {
          window.location.href = waAppLink;

          setTimeout(() => {
            window.location.href = waWebLink;
          }, 1200);

          return;
        }

        window.open(waWebLink, "_blank", "noreferrer");
      };

      if (!enableLocation) {
        openWhatsapp(data.summary);
        return;
      }

      if (!navigator.geolocation) {
        openWhatsapp(data.summary);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          const accuracy = position.coords.accuracy;

          const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

          const locationText =
            accuracy <= 80
              ? `GPS location: ${mapsLink}`
              : `Approximate GPS location: ${mapsLink}
Estimated accuracy: ${Math.round(accuracy)} meters.
If possible, also share your location manually on WhatsApp.`;

          const finalMessage = `${data.summary}

${locationText}`;

          openWhatsapp(finalMessage);
        },
        () => {
          openWhatsapp(
            `${data.summary}

Precise GPS location could not be detected. If possible, please share your location manually on WhatsApp.`
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    } catch (err) {
      console.error("Emergency intake submit failed:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const badgeLabel =
    useCase === "roadside"
      ? "International roadside assistance"
      : "Multilingual guest support";

  const title =
    useCase === "roadside"
      ? "Describe the problem in any language"
      : "Describe your request in any language";

  const description =
    useCase === "roadside"
      ? `Your message will be summarized automatically and sent to ${companyName} on WhatsApp, with GPS location if allowed.`
      : `Your request will be summarized automatically and sent to ${companyName} on WhatsApp.`;

  const placeholder =
    useCase === "roadside"
      ? "Example: My vehicle stopped on the highway and cannot move."
      : "Example: The air conditioning in room 302 is not working.";

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div
            className="inline-flex rounded-full px-3 py-1 text-sm font-semibold"
            style={badgeStyle}
          >
            {badgeLabel}
          </div>

          <h2 className="mt-4 text-2xl font-bold text-zinc-900 sm:text-3xl">
            {title}
          </h2>

          <p className="mt-3 text-base leading-7 text-zinc-600">
            {description}
          </p>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-600 transition hover:bg-zinc-100"
            aria-label="Close widget"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label
            htmlFor="message"
            className="mb-2 block text-sm font-semibold text-zinc-900"
          >
            {useCase === "roadside" ? "What happened?" : "What do you need?"}
          </label>

          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            rows={5}
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
            required
          />
        </div>

        {useCase === "roadside" ? (
          <>
            <div>
              <p className="mb-3 text-sm font-semibold text-zinc-900">
                Vehicle type
              </p>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {vehicleOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = vehicleType === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVehicleType(option.value)}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-zinc-900 bg-zinc-50 text-zinc-900"
                          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-sm font-medium">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label
                  htmlFor="canMove"
                  className="mb-2 block text-sm font-semibold text-zinc-900"
                >
                  Can the vehicle move?
                </label>
                <select
                  id="canMove"
                  value={canMove}
                  onChange={(e) => setCanMove(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="unknown">Not sure</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="needsTowing"
                  className="mb-2 block text-sm font-semibold text-zinc-900"
                >
                  Need towing?
                </label>
                <select
                  id="needsTowing"
                  value={needsTowing}
                  onChange={(e) => setNeedsTowing(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="unknown">Not sure</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="needsHeavyRecovery"
                  className="mb-2 block text-sm font-semibold text-zinc-900"
                >
                  Heavy recovery needed?
                </label>
                <select
                  id="needsHeavyRecovery"
                  value={needsHeavyRecovery}
                  onChange={(e) => setNeedsHeavyRecovery(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                  <option value="unknown">Not sure</option>
                </select>
              </div>
            </div>
          </>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="roomNumber"
                className="mb-2 block text-sm font-semibold text-zinc-900"
              >
                Room number
              </label>
              <input
                id="roomNumber"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                placeholder="302"
              />
            </div>

            <div>
              <label
                htmlFor="issueType"
                className="mb-2 block text-sm font-semibold text-zinc-900"
              >
                Issue type
              </label>
              <select
                id="issueType"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              >
                <option value="maintenance">Maintenance</option>
                <option value="cleaning">Cleaning</option>
                <option value="room-service">Room service</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="urgency"
                className="mb-2 block text-sm font-semibold text-zinc-900"
              >
                Urgency
              </label>
              <select
                id="urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={loading}
            style={primaryButtonStyle}
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MessageCircle size={20} />
            {loading ? "Preparing WhatsApp request..." : "Send with AI + WhatsApp"}
          </button>

          {enableLocation ? (
            <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-4 text-sm text-zinc-600">
              <MapPinned size={18} style={{ color: accentColor }} />
              GPS location will be attached if allowed
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </form>
    </div>
  );
}