import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
          Dispatch AI
        </p>

        <h1 className="mt-4 text-3xl font-bold text-zinc-900">
          Access denied
        </h1>

        <p className="mt-4 text-sm leading-6 text-zinc-600">
          You are signed in, but your account does not have access to this
          dashboard or tenant.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Go to login
          </Link>

          <Link
            href="/"
            className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}