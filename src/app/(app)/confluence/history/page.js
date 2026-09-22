import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/setupHelpers";

export default async function ConfluenceHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: analyses } = await supabase
    .from("confluence_analyses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const safe = analyses || [];

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link
            href="/confluence"
            className="text-blue-400 text-sm hover:underline"
          >
            ← New Analysis
          </Link>
          <h1 className="text-2xl font-bold mt-2">Confluence History</h1>
          <p className="text-gray-400 text-sm">
            {safe.length} analyses saved
          </p>
        </div>

        {safe.length === 0 ? (
          <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-gray-400 mb-4">No analyses yet.</p>
            <Link
              href="/confluence"
              className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
            >
              Run your first analysis
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {safe.map((a) => (
              <div
                key={a.id}
                className="p-4 rounded-lg bg-gray-900 border border-gray-800"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{a.pair}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          a.bias === "bullish"
                            ? "bg-green-900/40 text-green-300"
                            : "bg-red-900/40 text-red-300"
                        }`}
                      >
                        {a.bias}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">
                        {a.verdict}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">
                      {formatDate(a.created_at)} · Score: {a.confluence_score}/100
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs mt-3 pt-3 border-t border-gray-800">
                  <div>
                    <p className="text-gray-500">Entry</p>
                    <p className="text-white tabular-nums">
                      {a.suggested_entry_low?.toFixed(2)} -{" "}
                      {a.suggested_entry_high?.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">SL</p>
                    <p className="text-red-400 tabular-nums">
                      {a.suggested_sl?.toFixed(2) || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">TP</p>
                    <p className="text-green-400 tabular-nums">
                      {a.suggested_tp?.toFixed(2) || "—"}
                    </p>
                  </div>
                </div>

                {a.notes && (
                  <p className="text-gray-400 text-xs mt-3 pt-3 border-t border-gray-800">
                    {a.notes}
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