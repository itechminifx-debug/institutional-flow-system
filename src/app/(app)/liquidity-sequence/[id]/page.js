"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import LiquiditySequenceCard from "@/components/LiquiditySequenceCard";
import { evaluateLiquiditySequence } from "@/lib/liquiditySequenceEngine";

export default function LiquiditySequenceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params?.id;

  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      const { data, error: loadErr } = await supabase
        .from("liquidity_sequence_setups")
        .select("*")
        .eq("id", id)
        .single();

      if (loadErr || !data) {
        setError(loadErr?.message || "Sequence not found.");
        setLoading(false);
        return;
      }
      setRow(data);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Re-evaluate from stored data so the card shows the same 6-gate breakdown
  const evaluation = useMemo(() => {
    if (!row) return null;
    return evaluateLiquiditySequence({
      sequenceType: row.sequence_type,
      liquidityZoneHigh: row.liquidity_zone_high,
      liquidityZoneLow: row.liquidity_zone_low,
      sweepCandle: row.sweep_candle,
      mssCandle: row.mss_candle,
      mssReference: row.mss_reference,
      fvgHigh: row.fvg_high,
      fvgLow: row.fvg_low,
      rbHigh: row.rb_high,
      rbLow: row.rb_low,
      closeCandle: row.close_candle,
      nextLiquidityLevel: row.next_liquidity_level,
      pipSize: row.pip_size || 1,
    });
  }, [row]);

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-gray-400">
          Loading sequence...
        </div>
      </main>
    );
  }

  if (error || !row) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error || "Sequence not found."}
          </div>
          <button
            type="button"
            onClick={() => router.push("/liquidity-sequence")}
            className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold"
          >
            ← Back to Liquidity Sequence
          </button>
        </div>
      </main>
    );
  }

  // Legacy guard — if this row predates the 5-system migration, show a hint
  const isLegacyRow = !row.liquidity_zone_high && !row.rb_high;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Liquidity Sequence</h1>
            <p className="text-gray-400 text-sm">
              {row.pair} · {row.timeframe} ·{" "}
              {row.sequence_type === "support" ? "Support" : "Resistance"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Saved {new Date(row.created_at).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/liquidity-sequence?edit=${row.id}`)}
            className="text-xs px-3 py-2 rounded-lg bg-blue-900/40 text-blue-300 hover:bg-blue-800/40 font-semibold"
          >
            ✏️ Edit
          </button>
        </div>

        {/* Legacy notice */}
        {isLegacyRow && (
          <div className="p-3 rounded-lg bg-yellow-950/40 border border-yellow-700 text-yellow-200 text-xs">
            ⚠️ This sequence was saved before the 5-system upgrade. Some fields
            may be blank. Edit and re-save to update it to the new format.
          </div>
        )}

        {/* Verdict / card */}
        {evaluation && <LiquiditySequenceCard data={evaluation} />}

        {/* Raw inputs — 5-system breakdown */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            Raw Inputs
          </h2>

          {/* 1 — Liquidity Zone */}
          <div className="p-3 rounded-lg bg-black border border-gray-800 space-y-2">
            <p className="text-xs font-semibold text-gray-400">
              1️⃣ Liquidity Zone
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-500">Zone Low</p>
                <p className="font-bold tabular-nums">
                  {row.liquidity_zone_low !== null &&
                  row.liquidity_zone_low !== undefined
                    ? formatPrice(row.liquidity_zone_low)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Zone High</p>
                <p className="font-bold tabular-nums">
                  {row.liquidity_zone_high !== null &&
                  row.liquidity_zone_high !== undefined
                    ? formatPrice(row.liquidity_zone_high)
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* 2 — Sweep */}
          <div className="p-3 rounded-lg bg-black border border-gray-800 space-y-2">
            <p className="text-xs font-semibold text-gray-400">
              2️⃣ Sweep Candle
            </p>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {["open", "high", "low", "close"].map((f) => (
                <div key={f}>
                  <p className="text-gray-500 uppercase">{f[0]}</p>
                  <p className="font-bold tabular-nums">
                    {row.sweep_candle?.[f] ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 3 — MSS */}
          <div className="p-3 rounded-lg bg-black border border-gray-800 space-y-2">
            <p className="text-xs font-semibold text-gray-400">
              3️⃣ MSS
            </p>
            <p className="text-xs">
              <span className="text-gray-500">Reference:</span>{" "}
              <span className="font-bold tabular-nums">
                {row.mss_reference !== null && row.mss_reference !== undefined
                  ? formatPrice(row.mss_reference)
                  : "—"}
              </span>
            </p>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {["open", "high", "low", "close"].map((f) => (
                <div key={f}>
                  <p className="text-gray-500 uppercase">{f[0]}</p>
                  <p className="font-bold tabular-nums">
                    {row.mss_candle?.[f] ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 4 — FVG */}
          <div className="p-3 rounded-lg bg-black border border-gray-800 space-y-2">
            <p className="text-xs font-semibold text-gray-400">4️⃣ FVG</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-500">FVG Low</p>
                <p className="font-bold tabular-nums">
                  {row.fvg_low !== null && row.fvg_low !== undefined
                    ? formatPrice(row.fvg_low)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">FVG High</p>
                <p className="font-bold tabular-nums">
                  {row.fvg_high !== null && row.fvg_high !== undefined
                    ? formatPrice(row.fvg_high)
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* 5 — RB */}
          <div className="p-3 rounded-lg bg-black border border-gray-800 space-y-2">
            <p className="text-xs font-semibold text-gray-400">
              5️⃣ Rejection Block
            </p>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-gray-500">RB Low</p>
                <p className="font-bold tabular-nums">
                  {row.rb_low !== null && row.rb_low !== undefined
                    ? formatPrice(row.rb_low)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">RB High</p>
                <p className="font-bold tabular-nums">
                  {row.rb_high !== null && row.rb_high !== undefined
                    ? formatPrice(row.rb_high)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">RB CE</p>
                <p className="font-bold tabular-nums text-yellow-400">
                  {row.rb_ce !== null && row.rb_ce !== undefined
                    ? formatPrice(row.rb_ce)
                    : "—"}
                </p>
              </div>
            </div>
            {row.rb_fvg_alignment && (
              <p className="text-xs text-gray-400">
                Alignment with FVG:{" "}
                <span className="font-semibold text-gray-200">
                  {row.rb_fvg_alignment}
                </span>
              </p>
            )}
          </div>

          {/* 6 — Close + Verdict */}
          <div className="p-3 rounded-lg bg-black border border-gray-800 space-y-2">
            <p className="text-xs font-semibold text-gray-400">
              6️⃣ Close Candle
            </p>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {["open", "high", "low", "close"].map((f) => (
                <div key={f}>
                  <p className="text-gray-500 uppercase">{f[0]}</p>
                  <p className="font-bold tabular-nums">
                    {row.close_candle?.[f] ?? "—"}
                  </p>
                </div>
              ))}
            </div>
            {row.premium_discount && (
              <p className="text-xs text-gray-400">
                Premium/Discount:{" "}
                <span className="font-semibold text-gray-200">
                  {row.premium_discount}
                </span>
                {row.close_vs_ce_pips !== null &&
                  row.close_vs_ce_pips !== undefined && (
                    <span className="text-gray-500">
                      {" "}
                      ({row.close_vs_ce_pips} pips from CE)
                    </span>
                  )}
              </p>
            )}
          </div>

          {/* Target & Pip */}
          <div className="p-3 rounded-lg bg-black border border-gray-800 space-y-2">
            <p className="text-xs font-semibold text-gray-400">
              🎯 Target & Pip
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-500">Next Liquidity Target</p>
                <p className="font-bold tabular-nums">
                  {row.next_liquidity_level !== null &&
                  row.next_liquidity_level !== undefined
                    ? formatPrice(row.next_liquidity_level)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Pip size</p>
                <p className="font-bold tabular-nums">{row.pip_size ?? "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {row.notes && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h2 className="text-sm font-semibold text-blue-400 mb-2">
              Notes
            </h2>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">
              {row.notes}
            </p>
          </div>
        )}

        {/* Back button */}
        <button
          type="button"
          onClick={() => router.push("/liquidity-sequence")}
          className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold"
        >
          ← Back to Liquidity Sequence
        </button>
      </div>
    </main>
  );
}