"use client";

import { useEffect, useState } from "react";

type Membership = {
  id: number;
  user_id: string;
  company_slug: string;
  role: string;
  created_at: string;
};

export default function MembershipsAdmin() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [email, setEmail] = useState("");
  const [companySlug, setCompanySlug] = useState("pedrotti");
  const [role, setRole] = useState("operator");
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadMemberships() {
    setLoadingList(true);

    try {
      const res = await fetch("/api/admin/tenant-memberships");

      if (!res.ok) {
        throw new Error("Failed to load memberships.");
      }

      const data = await res.json();
      setMemberships(data.memberships ?? []);
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to load memberships.");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadMemberships();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/admin/tenant-memberships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          companySlug,
          role,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save membership.");
      }

      setSuccessMessage("Membership saved.");
      setEmail("");
      await loadMemberships();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save membership."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-lg font-bold text-zinc-900">Add membership</h2>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-900">
              User email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@company.com"
className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500"              required
            />
            <p className="mt-2 text-xs text-zinc-500">
              The user must have logged in at least once.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-900">
              Company slug
            </label>
            <input
              value={companySlug}
              onChange={(e) => setCompanySlug(e.target.value)}
              placeholder="pedrotti"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-900">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500"            >
              <option value="admin">admin</option>
              <option value="operator">operator</option>
              <option value="manager">manager</option>
              <option value="readonly">readonly</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save membership"}
          </button>
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
        <h2 className="text-lg font-bold text-zinc-900">Current memberships</h2>

        {loadingList ? (
          <p className="mt-4 text-sm text-zinc-500">Loading...</p>
        ) : memberships.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No memberships yet.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-zinc-500">
                <tr>
                  <th className="py-3 pr-4">User ID</th>
                  <th className="py-3 pr-4">Company</th>
                  <th className="py-3 pr-4">Role</th>
                  <th className="py-3 pr-4">Created</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {memberships.map((membership) => (
                  <tr key={membership.id}>
                    <td className="max-w-[260px] truncate py-3 pr-4 font-mono text-xs text-zinc-600">
                      {membership.user_id}
                    </td>
                    <td className="py-3 pr-4 font-medium text-zinc-900">
                      {membership.company_slug}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                        {membership.role}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-zinc-500">
                      {new Date(membership.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}