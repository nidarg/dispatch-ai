"use client";

import { useEffect, useState } from "react";

type TenantSetting = {
  id: number;
  company_slug: string;
  company_name: string;
  whatsapp_number: string;
  operator_language: string;
  accent_color: string | null;
  use_case: "roadside" | "hotel";
  enable_location: boolean;
  created_at: string;
};

export default function TenantSettingsAdmin() {
  const [tenants, setTenants] = useState<TenantSetting[]>([]);
  const [companySlug, setCompanySlug] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [operatorLanguage, setOperatorLanguage] = useState("Italian");
  const [accentColor, setAccentColor] = useState("#dc2626");
  const [useCase, setUseCase] = useState<"roadside" | "hotel">("roadside");
  const [enableLocation, setEnableLocation] = useState(true);

  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadTenants() {
    setLoadingList(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/tenant-settings");

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load tenant settings.");
      }

      setTenants(data.tenants ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load tenant settings."
      );
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadTenants();
  }, []);

  function editTenant(tenant: TenantSetting) {
    setCompanySlug(tenant.company_slug);
    setCompanyName(tenant.company_name);
    setWhatsappNumber(tenant.whatsapp_number);
    setOperatorLanguage(tenant.operator_language);
    setAccentColor(tenant.accent_color ?? "#dc2626");
    setUseCase(tenant.use_case);
    setEnableLocation(tenant.enable_location);
    setSuccessMessage("");
    setErrorMessage("");
  }

  function resetForm() {
    setCompanySlug("");
    setCompanyName("");
    setWhatsappNumber("");
    setOperatorLanguage("Italian");
    setAccentColor("#dc2626");
    setUseCase("roadside");
    setEnableLocation(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/admin/tenant-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companySlug,
          companyName,
          whatsappNumber,
          operatorLanguage,
          accentColor,
          useCase,
          enableLocation,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save tenant settings.");
      }

      setSuccessMessage("Tenant settings saved.");
      await loadTenants();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save tenant settings."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-lg font-bold text-zinc-900">
          Create / update tenant
        </h2>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-900">
              Company slug
            </label>
            <input
              value={companySlug}
              onChange={(e) => setCompanySlug(e.target.value)}
              placeholder="pedrotti"
className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500"              required
            />
            <p className="mt-2 text-xs text-zinc-500">
              Used in /widget/[slug] and data-company.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-900">
              Company name
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Pedrotti"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-900">
              WhatsApp number
            </label>
            <input
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="40755741335"
className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500"              required
            />
            <p className="mt-2 text-xs text-zinc-500">
              Use international format, without +.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-900">
              Operator language
            </label>
            <input
              value={operatorLanguage}
              onChange={(e) => setOperatorLanguage(e.target.value)}
              placeholder="Italian"
className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500"            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-900">
              Accent color
            </label>
            <input
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              placeholder="#dc2626"
className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500"            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-900">
              Use case
            </label>
            <select
              value={useCase}
              onChange={(e) =>
                setUseCase(e.target.value as "roadside" | "hotel")
              }
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500"
            >
              <option value="roadside">roadside</option>
              <option value="hotel">hotel</option>
            </select>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={enableLocation}
              onChange={(e) => setEnableLocation(e.target.checked)}
            />
            Enable geolocation
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save tenant"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Reset
            </button>
          </div>
        </div>

        {successMessage ? (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900">
          Current tenant settings
        </h2>

        {loadingList ? (
          <p className="mt-4 text-sm text-zinc-500">Loading...</p>
        ) : tenants.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No tenant settings yet.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {tenants.map((tenant) => (
              <button
                key={tenant.id}
                type="button"
                onClick={() => editTenant(tenant)}
className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500"              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-900">
                      {tenant.company_name}
                    </p>
                    <p className="mt-1 font-mono text-xs text-zinc-500">
                      {tenant.company_slug}
                    </p>
                  </div>

                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                    {tenant.use_case}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-zinc-600 sm:grid-cols-2">
                  <div>WhatsApp: {tenant.whatsapp_number}</div>
                  <div>Language: {tenant.operator_language}</div>
                  <div>Color: {tenant.accent_color ?? "default"}</div>
                  <div>
                    Location: {tenant.enable_location ? "enabled" : "disabled"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}