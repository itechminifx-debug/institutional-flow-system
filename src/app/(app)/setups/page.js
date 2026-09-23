import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/setupHelpers";
import { cycleInfo } from "@/lib/contextLayers";
import SetupsFilters from "@/components/SetupsFilters";

export default async function SetupsPage({ searchParams }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const pairFilter = params?.pair;
  const biasFilter = params?.bias;
  const sortFilter = params?.sort || "newest";
  const searchQuery = params?.q;

  let query = supabase.from("setups").select("*");

  if (pairFilter && pairFilter !== "all") {
    query = query.eq("pair", pairFilter);
  }
  if (biasFilter && biasFilter !== "all") {
    query = query.eq("d1_bias", biasFilter);
  }

  query = query.order("created_at", {
    ascending: sortFilter === "oldest",
  });

  const { data: setups } = await query;
  let safeSetups = setups || [];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    safeSetups = safeSetups.filter(
      (s) =>
        (s.notes || "").toLowerCase().includes(q) ||
        (s.rejection_block_zone || "").toLowerCase().includes(q) ||
        String(s.block_breaker_level || "").includes(q) ||
        String(s.aligned_liquidity || "").includes(q)
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Setups</h1>
            <p className="text-gray-400 text-sm">
              {safeSetups.length} setup{safeSetups.length === 1 ? "" : "s"}
            </p>
          </div>
          <Link
            href="/setups/new"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium"
          >
            + New Setup
          </Link>
        </div>

        <SetupsFilters />

        {safeSetups.length === 0 ? (
          <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-gray-400 mb-4">
              {pairFilter || biasFilter || searchQuery
                ? "No setups match your filters."
                : "No setups saved yet."}
            </p>
            {pairFilter || biasFilter || searchQuery ? (
              <Link
                href="/setups"
                className="inline-block px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
              >
                Clear filters
              </Link>
            ) : (
              <Link
                href="/setups/new"
                className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium"
              >
                Create your first setup
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {safeSetups.map((s) => {
              const rbScore = s.rb_quality_score || 0;
              const cycle = cycleInfo(s.institutional_cycle);

              return (
                <Link
                  key={s.id}
                  href={`/setups/${s.id}`}
                  className="block p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-600 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
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

                        {rbScore > 0 && (
  <span
    className={`text-xs px-2 py-0.5 rounded-full ${
      rbScore >= 9
        ? "bg-green-900/40 text-green-300"
        : rbScore >= 7
        ? "bg-yellow-900/40 text-yellow-300"
        : "bg-red-900/40 text-red-300"
    }`}
  >
    RB {rbScore}/12
  </span>
)}
                        {cycle && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${cycle.color}`}
                          >
                            {cycle.emoji} {cycle.label}
                          </span>
                        )}

                        {s.fvg_present && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              s.fvg_direction === "bullish"
                                ? "bg-green-900/40 text-green-300"
                                : s.fvg_direction === "bearish"
                                ? "bg-red-900/40 text-red-300"
                                : "bg-gray-800 text-gray-300"
                            }`}
                          >
                            FVG
                          </span>
                        )}

                        {s.ob_present && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              s.ob_type === "bullish"
                                ? "bg-green-900/40 text-green-300"
                                : s.ob_type === "bearish"
                                ? "bg-red-900/40 text-red-300"
                                : "bg-gray-800 text-gray-300"
                            }`}
                          >
                            OB
                          </span>
                        )}

                        {s.twice_blocked && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-300">
                            ⚡ 2× Blocked
                          </span>
                        )}

                        {s.use_ce_entry && s.ce_price && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300">
                            CE
                          </span>
                        )}
                      </div>

                      <p className="text-gray-500 text-xs mt-1">
                        {formatDate(s.created_at)}
                      </p>
                    </div>
                    <span className="text-gray-600 text-xs">Edit →</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">EMA 50</p>
                      <p className="text-gray-200">
                        {s.ema50_position || "—"}
                      </p>
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
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}