export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-16 text-zinc-900">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
          Dashboard
        </p>

        <h1 className="mt-4 text-3xl font-bold">
          Operator inbox
        </h1>

        <p className="mt-4 max-w-2xl text-zinc-600">
          Aici va fi interfața internă pentru operator: conversații, traduceri,
          răspunsuri și statusuri.
        </p>
      </div>
    </main>
  );
}