"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import {
  evaluateLiquiditySequence,
  sequenceTypeInfo,
} from "@/lib/liquiditySequenceEngine";
import {
  judgeZoneNegotiation,
} from "@/lib/liquidityZoneEngine";
import {
  computeEmaDirection,
  emaAlignment,
  enrichVerdict,
  computeWarningReasons,
} from "@/lib/verdictEngine";
import { computeIrlErl } from "@/lib/irlErlEngine";
import LiquiditySequenceCard from "@/components/LiquiditySequenceCard";

function reconstructCandle(c) {
  if (!c) return { open: "", high: "", low: "", close: "" };
  return {
    open: c.open?.toString() || "",
    high: c.high?.toString() || "",
    low: c.low?.toString() || "",
    close: c.close?.toString() || "",
  };
}

export default function LiquiditySequenceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params?.id;

  const [row, setRow] = useState(null);
  const [rbs, setRbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ----------------------------------------------------------
  // LOAD
  // ----------------------------------------------------------
  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);

      const { data: seqData, error: seqErr } = await supabase
        .from("liquidity_sequence_setups")
        .select("*")
        .eq("id", id)
        .single();

      if (seqErr || !seqData) {
        setError(seqErr?.message || "Sequence not found.");
        setLoading(false);
        return;
      }

      const { data: rbData } = await supabase
        .from("liquidity_sequence_rbs")
        .select("*")
        .eq("sequence_id", id)
        .order("created_at", { ascending: false });

      setRow(seqData);
      setRbs(rbData || []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ----------------------------------------------------------
  // RE-EVALUATE
  // ----------------------------------------------------------
  const sequence = useMemo(() => {
    if (!row) return null;

    // Active RB = the one stored (for consistency with save time)
    const activeRb = rbs.find((rb) => rb.is_active) || rbs[0] || null;
    const rbHigh = activeRb?.rb_high ?? row.rb_high ?? null;
    const rbLow = activeRb?.rb_low ?? row.rb_low ?? null;

    return evaluateLiquiditySequence({
      sequenceType: row.sequence_type,
      liquidityZoneHigh: row.liquidity_zone_high,
      liquidityZoneLow: row.liquidity_zone_low,
      sweepCandle: row.sweep_candle,
      currentClose: row.current_close,
      mssReference: row.mss_reference,
      fvgHigh: row.fvg_high,
      fvgLow: row.fvg_low,
      rbHigh,
      rbLow,
      closeCandle: row.close_candle,
      atrCurrent: row.atr_current,
      atrPrior: row.atr_prior,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, rbs]);

  // ----------------------------------------------------------
  // REBUILD ENRICHED VERDICT + TRADE PROPS
  // ----------------------------------------------------------
  const enrichedVerdict = useMemo(() => {
    if (!row) return null;
    const base = judgeZoneNegotiation({
      activeRb: { high: row.rb_high, low: row.rb_low },
      closePrice: row.current_close,
    });
    if (!base) return null;

    const ema = computeEmaDirection({
      emaPrice: row.ema50_price,
      closePrice: row.current_close,
    });

    return enrichVerdict({
      verdict: {
        verdict: base.verdict,
        strength: base.strength || "normal",
        reason: base.reason || "",
      },
      ema,
      htfBiasInput: row.htf_bias_override || "auto",
      sweepDirection: row.sweep_direction || "none",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row]);

  const alignment = enrichedVerdict?.emaAlignment;

  // Rebuild the trade object from stored fields (so the card can render it)
  const trade = useMemo(() => {
    if (!row?.entry || !row?.sl || !row?.tp) return null;
    return {
      direction: row.verdict,
      entry: row.entry,
      sl: row.sl,
      tp: row.tp,
      rr: row.rr,
      pipSize: row.pip_size,
      slPips: row.sl_pips,
      tpPips: row.tp_pips,
      lotSize: row.lot_size,
      riskAmount: row.risk_amount,
    };
  }, [row]);

  // Rebuild IRL/ERL
  const irlErl = useMemo(() => {
    if (!row) return null;
    if (!row.dealing_high && !row.irl_high && !row.erl_price) return null;
    return {
      range: {
        dealingHigh: row.dealing_high,
        dealingLow: row.dealing_low,
        dealingCe: row.dealing_ce,
      },
      irl: {
        high: row.irl_high,
        low: row.irl_low,
        ce: row.irl_ce,
      },
      erl: { price: row.erl_price },
      aligned: row.irl_erl_aligned,
    };
  }, [row]);

  // Rebuild warnings
  const warningReasons = useMemo(() => {
    if (!row) return [];
    return computeWarningReasons({
      verdict: enrichedVerdict,
      alignment,
      pathDanger: null,
      blockerBadge: null,
      extraReasons: [],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrichedVerdict, alignment]);

  // ----------------------------------------------------------
  // LOADING / ERROR STATES
  // ----------------------------------------------------------
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

  const seqInfo = sequenceTypeInfo(row.sequence_type);

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              {seqInfo.emoji} Liquidity Sequence
            </h1>
            <p className="text-gray-400 text-sm">
              {row.pair} · {row.timeframe} ·{" "}
              {row.sequence_type === "support" ? "Support" : "Resistance"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Saved {new Date(row.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {row.setup_id && (
              <button
                type="button"
                onClick={() => router.push(`/setups/${row.setup_id}`)}
                className="text-xs px-3 py-2 rounded-lg bg-purple-900/40 text-purple-300 hover:bg-purple-800/40 font-semibold"
              >
                📋 Open Setup
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                router.push(`/liquidity-sequence?edit=${row.setup_id || row.id}`)
              }
              className="text-xs px-3 py-2 rounded-lg bg-blue-900/40 text-blue-300 hover:bg-blue-800/40 font-semibold"
            >
              ✏️ Edit
            </button>
          </div>
        </div>

        {/* HTF/Sweep banners */}
        {enrichedVerdict?.hasHtfConflict && (
          <div className="p-4 rounded-lg border-2 border-red-700 bg-red-950/40 space-y-2">
            <p className="text-sm font-bold text-red-200">
              🚨 Counter-Trend Trade
            </p>
            {enrichedVerdict.htfConflict.map((c, i) => (
              <div key={i}>
                <p className="text-xs font-semibold text-red-200">
                  {c.label}
                </p>
                <p className="text-xs text-red-300 mt-0.5">{c.detail}</p>
              </div>
            ))}
          </div>
        )}

        {enrichedVerdict?.hasSweepOverride && (
          <div className="p-4 rounded-lg border-2 border-purple-700 bg-purple-950/40 space-y-2">
            <p className="text-sm font-bold text-purple-200">
              🔄 Sweep Override
            </p>
            <p className="text-xs text-purple-200">
              {enrichedVerdict.sweepOverride.label}
            </p>
            <p className="text-xs text-purple-300 mt-1">
              {enrichedVerdict.sweepOverride.detail}
            </p>
          </div>
        )}

        {/* THE CARD — same as the input page */}
        {sequence && (
          <LiquiditySequenceCard
            data={sequence}
            trade={trade}
            irlErl={irlErl}
            warnings={warningReasons}
          />
        )}

        {/* Raw inputs */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            Raw Inputs
          </h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Liquidity Zone High</p>
              <p className="font-bold tabular-nums">
                {row.liquidity_zone_high !== null
                  ? formatPrice(row.liquidity_zone_high)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Liquidity Zone Low</p>
              <p className="font-bold tabular-nums">
                {row.liquidity_zone_low !== null
                  ? formatPrice(row.liquidity_zone_low)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">MSS Reference</p>
              <p className="font-bold tabular-nums">
                {row.mss_reference !== null
                  ? formatPrice(row.mss_reference)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">FVG High</p>
              <p className="font-bold tabular-nums">
                {row.fvg_high !== null ? formatPrice(row.fvg_high) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">FVG Low</p>
              <p className="font-bold tabular-nums">
                {row.fvg_low !== null ? formatPrice(row.fvg_low) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Next Liquidity Target</p>
              <p className="font-bold tabular-nums">
                {row.next_liquidity_level !== null
                  ? formatPrice(row.next_liquidity_level)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Current Close</p>
              <p className="font-bold tabular-nums">
                {row.current_close !== null
                  ? formatPrice(row.current_close)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Pip size</p>
              <p className="font-bold tabular-nums">{row.pip_size ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Candles */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            Candles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: "Sweep Candle", c: row.sweep_candle },
              { label: "Close Candle (Trigger)", c: row.close_candle },
            ].map(({ label, c }) => (
              <div
                key={label}
                className="p-3 rounded-lg bg-black border border-gray-800 space-y-1 text-xs"
              >
                <p className="font-semibold text-gray-400">{label}</p>
                <p>
                  O: <span className="tabular-nums">{c?.open ?? "—"}</span>
                </p>
                <p>
                  H: <span className="tabular-nums">{c?.high ?? "—"}</span>
                </p>
                <p>
                  L: <span className="tabular-nums">{c?.low ?? "—"}</span>
                </p>
                <p>
                  C: <span className="tabular-nums">{c?.close ?? "—"}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Rejection Blocks (stored) */}
        {rbs.length > 0 && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <h2 className="text-sm font-semibold text-blue-400">
              Rejection Blocks ({rbs.length})
            </h2>
            <div className="space-y-2">
              {rbs.map((rb) => (
                <div
                  key={rb.id}
                  className={`p-2 rounded border flex items-center justify-between gap-2 text-xs ${
                    rb.is_active
                      ? "bg-green-950/20 border-green-700"
                      : "bg-black border-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-300">
                      {rb.rank}
                    </span>
                    <span className="tabular-nums">
                      {formatPrice(rb.rb_low)} – {formatPrice(rb.rb_high)}
                    </span>
                    <span className="text-gray-500">
                      CE {formatPrice(rb.rb_ce)}
                    </span>
                  </div>
                  {rb.is_active && (
                    <span className="text-xs text-green-400 font-semibold">
                      active
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* Back */}
        <button
          type="button"
          onClick={() => router.push("/liquidity-sequence/history")}
          className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold"
        >
          ← Back to Sequence History
        </button>
      </div>
    </main>
  );
}