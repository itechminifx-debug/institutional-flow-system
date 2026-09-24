import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/setupHelpers";
import { confidenceLabel } from "@/lib/rbValidator";
import { formatPrice } from "@/lib/formatNumbers";
import DeleteValidationButton from "@/components/DeleteValidationButton";

export default async function RBValidatorHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: validations } = await supabase
    .from("rb_validations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const safe = validations || [];

  const totalValid = safe.filter((v) => v.is_valid).length;
  const avgConfidence =
    safe.length > 0
      ? safe.reduce((s, v) => s + (v.confidence_score || 0), 0) / safe.length
      : 0;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link
            href="/rb-validator"
            className="text-blue-400 text-sm hover:underline"
          >
            ← New Validation
          </Link>
          <h1 className="text-2xl font-bold mt-2">Validator History</h1>
          <p className="text-gray-400 text-sm">
            {safe.length} validations · {totalValid} valid · avg confidence{" "}
            {avgConfidence.toFixed(1)}/10
          </p>
        </div>

        {safe.length === 0 ? (
          <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-gray-400 mb-4">No validations yet.</p>
            <Link
              href="/rb-validator"
              className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
            >
              Run your first validation
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {safe.map((v) => {
              const label = confidenceLabel(v.confidence_score);
              return (
                <div
                  key={v.id}
                  className={`p-4 rounded-lg border ${
                    v.is_valid
                      ? "bg-green-950/30 border-green-800"
                      : "bg-red-950/30 border-red-800"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          v.direction === "rfz"
                            ? "bg-red-900/40 text-red-300"
                            : "bg-green-900/40 text-green-300"
                        }`}
                      >
                        {v.direction.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium">{v.pair}</span>
                      <span className="text-xs text-gray-500">
                        {v.timeframe}
                      </span>
                      <span className={`text-xs ${label.color}`}>
                        {label.emoji} {label.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {v.confidence_score}/10
                      </span>
                      <DeleteValidationButton id={v.id} />
                    </div>
                  </div>

                  {/* Condition checks */}
                  <div className="grid grid-cols-2 gap-1 text-xs mt-3 pt-3 border-t border-current/20">
                    <CheckLine label="Current made wick" ok={v.current_candle_made_wick} />
                    <CheckLine label="No prev wick" ok={v.current_candle_made_wick && !v.previous_candle_made_both} />
                    <CheckLine label="Sweep" ok={v.sweep_occurred} />
                    <CheckLine label="Close inside" ok={v.close_inside} />
                    <CheckLine
                      label={`Wick ${v.wick_body_ratio?.toFixed(1)}x`}
                      ok={(v.wick_body_ratio || 0) >= (v.wick_ratio_min || 2)}
                    />
                    <CheckLine
                      label={`Disp ${v.displacement_actual?.toFixed(0)}`}
                      ok={v.displacement_ok}
                    />
                  </div>

                  {/* Zone */}
                  <div className="grid grid-cols-3 gap-3 text-xs mt-3 pt-3 border-t border-current/20">
                    <div>
                      <p className="text-gray-500">Zone High</p>
                      <p className="tabular-nums text-white font-bold">
                        {formatPrice(v.zone_high)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">CE (50%)</p>
                      <p className="tabular-nums text-yellow-400 font-bold">
                        {formatPrice(v.ce_price)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Zone Low</p>
                      <p className="tabular-nums text-white font-bold">
                        {formatPrice(v.zone_low)}
                      </p>
                    </div>
                  </div>

                  {v.notes && (
                    <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-current/20">
                      {v.notes}
                    </p>
                  )}

                  {/* Actions */}
                  {v.is_valid && (
                    <Link
                      href={`/setups/new?rb_zone_low=${v.zone_low}&rb_zone_high=${v.zone_high}&rb_pair=${encodeURIComponent(
                        v.pair
                      )}&rb_ce=${v.ce_price}&rb_direction=${v.direction}&rb_confidence=${v.confidence_score}`}
                      className="block mt-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-center text-xs font-medium"
                    >
                      📋 Use this zone in a New Setup →
                    </Link>
                  )}

                  <p className="text-xs text-gray-600 mt-3">
                    {formatDate(v.created_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function CheckLine({ label, ok }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={ok ? "text-green-400" : "text-red-400"}>
        {ok ? "✅" : "❌"}
      </span>
      <span className="text-gray-300">{label}</span>
    </div>
  );
}