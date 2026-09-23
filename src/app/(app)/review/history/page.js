import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { formatWeekLabel } from "@/lib/weekHelpers";

export default async function ReviewHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reviews } = await supabase
    .from("weekly_reviews")
    .select("*")
    .order("week_start", { ascending: false })
    .limit(52);

  const safe = reviews || [];

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link
            href="/review"
            className="text-blue-400 text-sm hover:underline"
          >
            ← This Week
          </Link>
          <h1 className="text-2xl font-bold mt-2">Review History</h1>
          <p className="text-gray-400 text-sm">
            {safe.length} weeks recorded
          </p>
        </div>

        {safe.length === 0 ? (
          <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-gray-400 mb-4">No reviews yet.</p>
            <Link
              href="/review"
              className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
            >
              Start your first review
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {safe.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-lg bg-gray-900 border border-gray-800"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">
                      Week of {formatWeekLabel(r.week_start)}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {r.total_trades} trades · {r.wins}W · {r.losses}L ·{" "}
                      {r.breakeven}BE
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-xl font-bold tabular-nums ${
                        r.win_rate >= 50
                          ? "text-green-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {r.win_rate?.toFixed(0) || 0}%
                    </p>
                    <p className="text-xs text-gray-500">win rate</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs pt-3 border-t border-gray-800">
                  <div>
                    <p className="text-gray-500">Pips</p>
                    <p
                      className={`tabular-nums font-bold ${
                        r.total_pips >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {r.total_pips >= 0 ? "+" : ""}
                      {r.total_pips?.toFixed(0) || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Quality</p>
                    <p className="tabular-nums font-bold text-white">
                      {r.avg_quality_score?.toFixed(1) || "—"}/10
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Adherence</p>
                    <p className="tabular-nums font-bold text-white">
                      {r.rule_adherence?.toFixed(0) || 0}%
                    </p>
                  </div>
                </div>

                {r.did_well && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <p className="text-xs text-green-400 mb-1">✅ Did well</p>
                    <p className="text-xs text-gray-300">{r.did_well}</p>
                  </div>
                )}

                {r.will_change && (
                  <div className="mt-2">
                    <p className="text-xs text-blue-400 mb-1">
                      🔄 Will change
                    </p>
                    <p className="text-xs text-gray-300">{r.will_change}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}