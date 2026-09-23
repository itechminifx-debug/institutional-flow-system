import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { computeStats } from "@/lib/statsEngine";

export default async function StatsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .order("opened_at", { ascending: false });

  const stats = computeStats(trades);

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Stats</h1>
          <p className="text-gray-400 text-sm">
            Performance & rule adherence
          </p>
        </div>

        {stats.totalTrades === 0 ? (
          <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-gray-400">
              No trades yet — stats will appear once you log trades.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Big KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI
                label="Win Rate"
                value={`${stats.winRate.toFixed(1)}%`}
                accent={
                  stats.winRate >= 50
                    ? "text-green-400"
                    : stats.winRate >= 40
                    ? "text-yellow-400"
                    : "text-red-400"
                }
              />
              <KPI
                label="Avg RR"
                value={stats.avgRR > 0 ? `1:${stats.avgRR.toFixed(2)}` : "—"}
                accent="text-blue-400"
              />
              <KPI
                label="Total Pips"
                value={
                  stats.totalPips >= 0
                    ? `+${stats.totalPips.toFixed(1)}`
                    : stats.totalPips.toFixed(1)
                }
                accent={
                  stats.totalPips >= 0 ? "text-green-400" : "text-red-400"
                }
              />
              <KPI
                label="Total %"
                value={
                  stats.totalPercent >= 0
                    ? `+${stats.totalPercent.toFixed(2)}%`
                    : `${stats.totalPercent.toFixed(2)}%`
                }
                accent={
                  stats.totalPercent >= 0 ? "text-green-400" : "text-red-400"
                }
              />
            </div>

            {/* Trades breakdown */}
            <Section title="Trades">
              <div className="grid grid-cols-4 gap-3">
                <Mini label="Total" value={stats.totalTrades} />
                <Mini
                  label="Won"
                  value={stats.won}
                  accent="text-green-400"
                />
                <Mini
                  label="Lost"
                  value={stats.lost}
                  accent="text-red-400"
                />
                <Mini label="BE" value={stats.be} accent="text-gray-400" />
              </div>
            </Section>

            {/* Rejection Block Quality */}
            {stats.scoredTradesCount > 0 && (
              <Section title="Rejection Block Quality">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="p-3 rounded-lg bg-green-950/40 border border-green-800">
                    <p className="text-green-400 text-xs mb-1">
                      High Quality (8+)
                    </p>
                    <p className="text-xl font-bold text-green-300">
                      {stats.highQualityCount > 0
                        ? `${stats.highQualityWinRate.toFixed(0)}%`
                        : "—"}
                    </p>
                    <p className="text-xs text-green-500/70 mt-1">
                      {stats.highQualityCount} trade
                      {stats.highQualityCount === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-yellow-950/40 border border-yellow-800">
                    <p className="text-yellow-400 text-xs mb-1">
                      Medium (6-7)
                    </p>
                    <p className="text-xl font-bold text-yellow-300">
                      {stats.mediumQualityCount > 0
                        ? `${stats.mediumQualityWinRate.toFixed(0)}%`
                        : "—"}
                    </p>
                    <p className="text-xs text-yellow-500/70 mt-1">
                      {stats.mediumQualityCount} trade
                      {stats.mediumQualityCount === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-800">
                    <p className="text-red-400 text-xs mb-1">
                      Low (&lt; 6)
                    </p>
                    <p className="text-xl font-bold text-red-300">
                      {stats.lowQualityCount > 0
                        ? `${stats.lowQualityWinRate.toFixed(0)}%`
                        : "—"}
                    </p>
                    <p className="text-xs text-red-500/70 mt-1">
                      {stats.lowQualityCount} trade
                      {stats.lowQualityCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-black border border-gray-800">
                  <span className="text-xs text-gray-400">
                    Average Quality Score
                  </span>
                  <span className="text-sm font-bold tabular-nums text-white">
                    {stats.avgQualityScore.toFixed(1)}/10
                  </span>
                </div>

                {stats.highQualityCount > 0 &&
                  stats.lowQualityCount > 0 &&
                  stats.highQualityWinRate > stats.lowQualityWinRate && (
                    <div className="mt-3 p-3 rounded-lg bg-green-950/40 border border-green-800">
                      <p className="text-green-300 text-xs">
                        ✅ Your high-quality setups outperform low-quality by{" "}
                        <strong>
                          {(
                            stats.highQualityWinRate - stats.lowQualityWinRate
                          ).toFixed(0)}
                          %
                        </strong>{" "}
                        — the filter works. Keep enforcing it.
                      </p>
                    </div>
                  )}

                {stats.highQualityCount > 0 &&
                  stats.lowQualityCount > 0 &&
                  stats.highQualityWinRate <= stats.lowQualityWinRate && (
                    <div className="mt-3 p-3 rounded-lg bg-yellow-950/40 border border-yellow-800">
                      <p className="text-yellow-300 text-xs">
                        ⚠️ Low-quality setups are performing as well as your
                        high-quality ones. Review your scoring criteria, or
                        collect more data.
                      </p>
                    </div>
                  )}
              </Section>
            )}

            {/* Rule adherence */}
            <Section title="Rule Adherence (Step 12)">
              <div className="space-y-3">
                <Progress
                  label="Partial @ 1:1"
                  value={stats.partialCount}
                  total={stats.closedCount}
                  accent="bg-yellow-500"
                />
                <Progress
                  label="SL moved to BE"
                  value={stats.beCount}
                  total={stats.closedCount}
                  accent="bg-blue-500"
                />
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">
                      Overall adherence
                    </span>
                    <span className="text-sm font-bold text-white">
                      {stats.ruleAdherence.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        stats.ruleAdherence >= 80
                          ? "bg-green-500"
                          : stats.ruleAdherence >= 50
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${stats.ruleAdherence}%` }}
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* By pair */}
            {Object.keys(stats.byPair).length > 0 && (
              <Section title="By Pair">
                <div className="space-y-2">
                  {Object.entries(stats.byPair).map(([pair, data]) => (
                    <div
                      key={pair}
                      className="flex items-center justify-between p-3 rounded-lg bg-black border border-gray-800"
                    >
                      <div>
                        <p className="font-medium text-sm">{pair}</p>
                        <p className="text-gray-500 text-xs">
                          {data.total} trades
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 text-sm font-bold">
                          {data.won}W
                        </p>
                        <p className="text-red-400 text-xs">{data.lost}L</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Best & Worst */}
            {(stats.bestPair || stats.worstPair) && (
              <div className="grid grid-cols-2 gap-3">
                {stats.bestPair && (
                  <div className="p-4 rounded-lg bg-green-900/30 border border-green-800">
                    <p className="text-green-400 text-xs mb-1">Best Pair</p>
                    <p className="font-bold text-sm">{stats.bestPair.pair}</p>
                    <p className="text-green-300 text-xs mt-1">
                      {stats.bestPair.rate}% win
                    </p>
                  </div>
                )}
                {stats.worstPair && (
                  <div className="p-4 rounded-lg bg-red-900/30 border border-red-800">
                    <p className="text-red-400 text-xs mb-1">Worst Pair</p>
                    <p className="font-bold text-sm">
                      {stats.worstPair.pair}
                    </p>
                    <p className="text-red-300 text-xs mt-1">
                      {stats.worstPair.rate}% win
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* By emotion */}
            {Object.keys(stats.byEmotion).length > 0 && (
              <Section title="By Emotion (Step 14)">
                <div className="space-y-2">
                  {Object.entries(stats.byEmotion).map(([emotion, data]) => {
                    const rate =
                      data.total > 0
                        ? Math.round((data.won / data.total) * 100)
                        : 0;
                    return (
                      <div
                        key={emotion}
                        className="flex items-center justify-between p-3 rounded-lg bg-black border border-gray-800"
                      >
                        <div>
                          <p className="font-medium text-sm">{emotion}</p>
                          <p className="text-gray-500 text-xs">
                            {data.total} trades
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">
                            {rate}% win
                          </span>
                          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                rate >= 50 ? "bg-green-500" : "bg-red-500"
                              }`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function KPI({ label, value, accent }) {
  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${accent || "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
      <h2 className="text-sm font-semibold text-blue-400 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Mini({ label, value, accent }) {
  return (
    <div className="text-center">
      <p className="text-gray-500 text-xs">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${accent || "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function Progress({ label, value, total, accent }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-xs text-gray-500">
          {value}/{total} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${accent}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}