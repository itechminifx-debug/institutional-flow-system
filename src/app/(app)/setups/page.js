import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/setupHelpers";

export default async function SetupsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: setups, error } = await supabase
    .from("setups")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Setups</h1>
            <p className="text-gray-400 text-sm">
              Pre-market planner (Steps 1 to 4)
            </p>
          </div>
          <Link
            href="/setups/new"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium"
          >
            + New Setup
          </Link>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm mb-4">
            {error.message}
          </div>
        )}

        {!setups || setups.length === 0 ? (
          <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-gray-400 mb-4">No setups saved yet.</p>
            <Link
              href="/setups/new"
              className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium"
            >
              Create your first setup
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {setups.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-lg bg-gray-900 border border-gray-800"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-lg">{s.pair}</h2>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          s.d1_bias === "bullish"
                            ? "bg-green-900/40 text-green-300"
                            : "bg-red-900/40 text-red-300"
                        }`}
                      >
                        {s.d1_bias}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">
                      {formatDate(s.created_at)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">EMA 50</p>
                    <p className="text-gray-200">{s.ema50_position || "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Block Breaker</p>
                    <p className="text-gray-200">
                      {s.block_breaker_level ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Liquidity</p>
                    <p className="text-gray-200">
                      {s.aligned_liquidity ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Rejection Zone</p>
                    <p className="text-gray-200">
                      {s.rejection_block_zone || "—"}
                    </p>
                  </div>
                </div>

                {s.notes && (
                  <p className="text-gray-400 text-sm mt-3 pt-3 border-t border-gray-800">
                    {s.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}