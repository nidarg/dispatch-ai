"use client";

import { useEffect, useState } from "react";

type MembershipRow = {
  id: number;
  user_id: string;
  company_slug: string;
  role: "operator" | "readonly";
  created_at: string;
};

type TenantUsersAdminProps = {
  companySlug: string;
};

export default function TenantUsersAdmin({
  companySlug,
}: TenantUsersAdminProps) {
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"operator" | "readonly">("operator");

  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function loadMemberships() {
    try {
      setLoadingList(true);

      const res = await fetch(
        `/api/tenant/${companySlug}/memberships`
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Failed to load users"
        );
      }

      setMemberships(data.memberships ?? []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load users"
      );
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadMemberships();
  }, []);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);
    setSuccess("");
    setError("");

    try {
      const res = await fetch(
        `/api/tenant/${companySlug}/memberships`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            role,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Failed to save user"
        );
      }

      setSuccess("User added successfully.");
      setEmail("");
      setRole("operator");

      await loadMemberships();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save user"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">
          Add tenant user
        </h2>

        <p className="mt-2 text-sm text-zinc-600">
          Add operators or read-only users for this tenant.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              User email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="operator@company.com"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Role
            </label>

            <select
              value={role}
              onChange={(e) =>
                setRole(
                  e.target.value as
                    | "operator"
                    | "readonly"
                )
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm"
            >
              <option value="operator">
                Operator
              </option>

              <option value="readonly">
                Read-only
              </option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white"
          >
            {loading
              ? "Saving..."
              : "Save user"}
          </button>
        </form>

        {success ? (
          <p className="mt-4 text-sm text-green-600">
            {success}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">
          Current tenant users
        </h2>

        {loadingList ? (
          <p className="mt-4 text-sm text-zinc-500">
            Loading...
          </p>
        ) : memberships.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No users yet.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {memberships.map((member) => (
              <div
                key={member.id}
                className="rounded-xl border border-zinc-200 p-4"
              >
                <div className="text-sm font-medium text-zinc-900">
                  {member.user_id}
                </div>

                <div className="mt-1 text-xs text-zinc-500">
                  Role: {member.role}
                </div>

                <div className="mt-1 text-xs text-zinc-400">
                  {new Date(
                    member.created_at
                  ).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}