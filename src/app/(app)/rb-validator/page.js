"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { PAIRS } from "@/lib/setupHelpers";
import { formatPrice, fullPrice } from "@/lib/formatNumbers";
import {
  validateRejectionBlock,
  confidenceLabel,
  DEFAULT_PARAMS,
  TIMEFRAME_PRESETS,
} from "@/lib/rbValidator";

export default function RBValidatorPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "H4",
    direction: "rfz",
    swingPrice: "",
    c1_open: "",
    c1_high: "",
    c1_low: "",
    c1_close: "",
    c2_open: "",
    c2_high: "",
    c2_low: "",
    c2_close: "",
    c3_open: "",
    c3_high: "",
    c3_low: "",
    c3_close: "",
    atr: "",
    wickRatioMin: 2.0,
    displacementMultiplier: 0.6,
    notes: "",
  });

  const [result, setResult] = useState(null);
  const [shotConfirmed, setShotConfirmed] = useState(false);
  const [shotAutoDetected, setShotAutoDetected] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // ============================================================
  // SHOT CANDLE DETECTION
  // ============================================================
  function detectShotCandle() {
    const c3Open = parseFloat(form.c3_open);
    const c3High = parseFloat(form.c3_high);
    const c3Low = parseFloat(form.c3_low);
    const c3Close = parseFloat(form.c3_close);
    const atr = parseFloat(form.atr);

    if (
      isNaN(c3Open) ||
      isNaN(c3High) ||
      isNaN(c3Low) ||
      isNaN(c3Close) ||
      isNaN(atr)
    ) {
      return null;
    }

    const isRFZ = form.direction === "rfz";
    const body = Math.abs(c3Close - c3Open);
    const upperWick = c3High - Math.max(c3Open, c3Close);
    const lowerWick = Math.min(c3Open, c3Close) - c3Low;

    // For RFZ (sell): shot is a bearish candle moving down
    // For SFZ (buy): shot is a bullish candle moving up
    const directionCorrect = isRFZ
      ? c3Close < c3Open
      : c3Close > c3Open;

    const bodySize = body >= atr; // Body must be ≥ 1× ATR
    const opposingWick = isRFZ ? upperWick : lowerWick;
    const wickSmall = opposingWick <= body * 0.1; // ≤ 10% of body

    const isShot = directionCorrect && bodySize && wickSmall;

    return {
      isShot,
      directionCorrect,
      bodySize,
      wickSmall,
      body: Math.round(body * 100) / 100,
      bodyVsATR: atr > 0 ? Math.round((body / atr) * 100) / 100 : 0,
      opposingWick: Math.round(opposingWick * 100) / 100,
      wickPercent:
        body > 0
          ? Math.round((opposingWick / body) * 10000) / 100
          : 100,
    };
  }

  function handleValidate(e) {
    e.preventDefault();
    setError("");
    setSavedId(null);
    setCopied(false);

    const c1 = {
      open: parseFloat(form.c1_open),
      high: parseFloat(form.c1_high),
      low: parseFloat(form.c1_low),
      close: parseFloat(form.c1_close),
    };
    const c2 = {
      open: parseFloat(form.c2_open),
      high: parseFloat(form.c2_high),
      low: parseFloat(form.c2_low),
      close: parseFloat(form.c2_close),
    };
    const c3 = {
      open: parseFloat(form.c3_open),
      high: parseFloat(form.c3_high),
      low: parseFloat(form.c3_low),
      close: parseFloat(form.c3_close),
    };

    const res = validateRejectionBlock({
      direction: form.direction,
      swingPrice: parseFloat(form.swingPrice),
      c1,
      c2,
      c3,
      atr: parseFloat(form.atr),
      wickRatioMin: parseFloat(form.wickRatioMin),
      displacementMultiplier: parseFloat(form.displacementMultiplier),
    });

    setResult(res);

    const shot = detectShotCandle();
    setShotAutoDetected(shot);
    setShotConfirmed(shot ? shot.isShot : false);
  }

  async function handleSave() {
    if (!result) return;

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated.");
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("rb_validations")
      .insert({
        user_id: user.id,
        pair: form.pair,
        timeframe: form.timeframe,
        direction: form.direction,
        swing_lookback: DEFAULT_PARAMS.swingLookback,
        swing_price: parseFloat(form.swingPrice),
        c1_open: parseFloat(form.c1_open),
        c1_high: parseFloat(form.c1_high),
        c1_low: parseFloat(form.c1_low),
        c1_close: parseFloat(form.c1_close),
        c2_open: parseFloat(form.c2_open),
        c2_high: parseFloat(form.c2_high),
        c2_low: parseFloat(form.c2_low),
        c2_close: parseFloat(form.c2_close),
        c3_open: parseFloat(form.c3_open),
        c3_high: parseFloat(form.c3_high),
        c3_low: parseFloat(form.c3_low),
        c3_close: parseFloat(form.c3_close),
        atr: parseFloat(form.atr),
        wick_ratio_min: parseFloat(form.wickRatioMin),
        displacement_multiplier: parseFloat(form.displacementMultiplier),
        wick_size: result.wickSize,
        body_size: result.bodySize,
        wick_body_ratio: result.wickBodyRatio,
        close_inside: result.closeInside,
        sweep_occurred: result.sweepOccurred,
        current_candle_made_wick: result.c2MadeWick,
        previous_candle_made_both: result.previousCandleMadeBoth,
        displacement_ok: result.displacementOk,
        displacement_actual: result.displacementActual,
        is_valid: result.isValid,
        confidence_score: result.confidenceScore,
        zone_high: result.zoneHigh,
        zone_low: result.zoneLow,
        ce_price: result.cePrice,
        invalid_reason: result.invalidReason,
        notes: form.notes,
      })
      .select()
      .single();

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSavedId(data.id);
  }

  function handleCopyEntry() {
    if (!result || !result.isValid) return;

    const isRFZ = form.direction === "rfz";
    const ce = result.cePrice;
    const sl = isRFZ ? result.zoneHigh : result.zoneLow;
    const risk = Math.abs(ce - sl);
    const tp = isRFZ ? ce - risk * 2 : ce + risk * 2;
    const direction = isRFZ ? "SELL" : "BUY";

    const text = `${form.pair} ${form.timeframe} ${direction}
Entry (CE): ${fullPrice(ce)}
Stop Loss:  ${fullPrice(sl)}
Take Profit: ${fullPrice(tp)}
RR Ratio:  1:2.00
Zone: ${fullPrice(result.zoneLow)} - ${fullPrice(result.zoneHigh)}
Shot from CE: ${shotConfirmed ? "CONFIRMED" : "Not confirmed"}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleUseInSetup() {
    if (!result || !result.isValid) return;

    const params = new URLSearchParams({
      rb_zone_low: result.zoneLow,
      rb_zone_high: result.zoneHigh,
      rb_pair: form.pair,
      rb_ce: result.cePrice,
      rb_direction: form.direction,
      rb_confidence: result.confidenceScore,
      rb_shot: shotConfirmed ? "1" : "0",
    });

    router.push(`/setups/new?${params.toString()}`);
  }

  const label = result ? confidenceLabel(result.confidenceScore) : null;
  const isRFZ = form.direction === "rfz";

  // Compute entry/SL/TP for display
  const entryData = result && result.isValid
    ? (() => {
        const ce = result.cePrice;
        const sl = isRFZ ? result.zoneHigh : result.zoneLow;
        const risk = Math.abs(ce - sl);
        const tp = isRFZ ? ce - risk * 2 : ce + risk * 2;
        return {
          ce,
          sl,
          tp,
          risk,
          rr: risk > 0 ? 2 : 0,
          direction: isRFZ ? "SELL" : "BUY",
        };
      })()
    : null;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Rejection Block Validator</h1>
            <p className="text-gray-400 text-sm">
              Verify a 3-candle formation before marking a zone
            </p>
          </div>
          <Link
            href="/rb-validator/history"
            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-600 text-xs"
          >
            History →
          </Link>
        </div>

        <form onSubmit={handleValidate} className="space-y-5">
          {/* Context */}
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <h2 className="text-sm font-semibold text-blue-400">Context</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1 text-gray-400">
                  Pair
                </label>
                <select
                  value={form.pair}
                  onChange={(e) => update("pair", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
                >
                  {PAIRS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-400">
                  Timeframe
                </label>
                <select
                  value={form.timeframe}
                  onChange={(e) => update("timeframe", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
                >
                  {TIMEFRAME_PRESETS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs mb-2 text-gray-400">
                Direction
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => update("direction", "rfz")}
                  className={`py-2 rounded-lg text-sm transition ${
                    form.direction === "rfz"
                      ? "bg-red-900/40 border border-red-600 text-red-200 font-bold"
                      : "bg-black border border-gray-800 text-gray-400"
                  }`}
                >
                  🔴 RFZ (Bearish)
                </button>
                <button
                  type="button"
                  onClick={() => update("direction", "sfz")}
                  className={`py-2 rounded-lg text-sm transition ${
                    form.direction === "sfz"
                      ? "bg-green-900/40 border border-green-600 text-green-200 font-bold"
                      : "bg-black border border-gray-800 text-gray-400"
                  }`}
                >
                  🟢 SFZ (Bullish)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1 text-gray-400">
                  Swing {isRFZ ? "High" : "Low"}
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.swingPrice}
                  onChange={(e) => update("swingPrice", e.target.value)}
                  placeholder="e.g. 209500"
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-400">
                  ATR (14)
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.atr}
                  onChange={(e) => update("atr", e.target.value)}
                  placeholder="e.g. 120"
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Candle inputs */}
          {["c1", "c2", "c3"].map((ck, i) => (
            <div
              key={ck}
              className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3"
            >
              <h2 className="text-sm font-semibold text-blue-400">
                Candle {i + 1}
                {i === 0 && " (previous)"}
                {i === 1 && " (current — must create the wick)"}
                {i === 2 && " (displacement / shot)"}
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {["open", "high", "low", "close"].map((field) => (
                  <div key={field}>
                    <label className="block text-xs mb-1 text-gray-500 uppercase">
                      {field}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={form[`${ck}_${field}`]}
                      onChange={(e) =>
                        update(`${ck}_${field}`, e.target.value)
                      }
                      className="w-full px-2 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm tabular-nums"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Advanced params */}
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <h2 className="text-sm font-semibold text-blue-400">
              Parameters
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1 text-gray-400">
                  Min Wick/Body Ratio
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.wickRatioMin}
                  onChange={(e) => update("wickRatioMin", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-400">
                  Displacement Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.displacementMultiplier}
                  onChange={(e) =>
                    update("displacementMultiplier", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold"
          >
            Validate Rejection Block
          </button>
        </form>

        {/* ============================================================ */}
        {/* RESULT */}
        {/* ============================================================ */}
        {result && (
          <div className="space-y-4">
            {/* Verdict banner */}
            <div
              className={`p-4 rounded-lg border-2 ${
                result.isValid
                  ? "bg-green-950/40 border-green-700"
                  : "bg-red-950/40 border-red-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-2xl">{result.isValid ? "✅" : "❌"}</p>
                <p className={`text-lg font-bold ${label.color}`}>
                  {label.emoji} {label.label}
                </p>
              </div>
              <p className="text-lg font-bold">
                {result.isValid
                  ? `VALID ${form.direction.toUpperCase()}`
                  : `INVALID REJECTION BLOCK`}
              </p>
              {!result.isValid && result.invalidReason && (
                <p className="text-red-300 text-sm mt-2">
                  {result.invalidReason}
                </p>
              )}
              <p className="text-xs opacity-70 mt-2">
                Confidence: {result.confidenceScore}/10
              </p>
            </div>

            {/* ============================================================ */}
            {/* CE ENTRY CARD — the key addition */}
            {/* ============================================================ */}
            {result.isValid && entryData && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-950/60 via-blue-900/40 to-yellow-950/40 border-2 border-yellow-700 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-yellow-300">
                    ⭐ CE ENTRY LEVEL
                  </h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isRFZ
                        ? "bg-red-900/40 text-red-300"
                        : "bg-green-900/40 text-green-300"
                    }`}
                  >
                    {entryData.direction}
                  </span>
                </div>

                {/* Visual Zone Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Zone High</span>
                    <span className="tabular-nums font-bold text-white">
                      {formatPrice(result.zoneHigh)}
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full overflow-hidden bg-gradient-to-r from-red-900/60 via-yellow-700/60 to-green-900/60 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-white drop-shadow">
                        ⭐ CE
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Zone Low</span>
                    <span className="tabular-nums font-bold text-white">
                      {formatPrice(result.zoneLow)}
                    </span>
                  </div>
                </div>

                {/* Entry details */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-yellow-800/40">
                  <div className="p-3 rounded-lg bg-black/40 border border-yellow-700/40">
                    <p className="text-xs text-yellow-400/80 mb-1">
                      ENTRY (CE)
                    </p>
                    <p className="text-lg font-bold tabular-nums text-yellow-300">
                      {formatPrice(entryData.ce)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {fullPrice(entryData.ce)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-red-800/40">
                    <p className="text-xs text-red-400/80 mb-1">
                      STOP LOSS
                    </p>
                    <p className="text-lg font-bold tabular-nums text-red-300">
                      {formatPrice(entryData.sl)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {fullPrice(entryData.sl)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-green-800/40">
                    <p className="text-xs text-green-400/80 mb-1">
                      TAKE PROFIT (2R)
                    </p>
                    <p className="text-lg font-bold tabular-nums text-green-300">
                      {formatPrice(entryData.tp)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {fullPrice(entryData.tp)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-blue-800/40">
                    <p className="text-xs text-blue-400/80 mb-1">RR RATIO</p>
                    <p className="text-lg font-bold tabular-nums text-blue-300">
                      1:2.00
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Risk: {formatPrice(entryData.risk)}
                    </p>
                  </div>
                </div>

                {/* ============================================================ */}
                {/* SHOT CANDLE CHECK */}
                {/* ============================================================ */}
                <div className="pt-3 border-t border-yellow-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-yellow-300">
                      ⚡ Shot Candle Check
                    </h4>
                    {shotAutoDetected && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          shotAutoDetected.isShot
                            ? "bg-green-900/40 text-green-300"
                            : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {shotAutoDetected.isShot
                          ? "Auto-detected ✅"
                          : "Auto-detected ❌"}
                      </span>
                    )}
                  </div>

                  {shotAutoDetected && (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-gray-800">
                        <span className="text-gray-400">
                          Direction correct ({isRFZ ? "bearish" : "bullish"})
                        </span>
                        <span
                          className={
                            shotAutoDetected.directionCorrect
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {shotAutoDetected.directionCorrect ? "✅" : "❌"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-gray-800">
                        <span className="text-gray-400">
                          Body ≥ 1× ATR ({shotAutoDetected.bodyVsATR}×)
                        </span>
                        <span
                          className={
                            shotAutoDetected.bodySize
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {shotAutoDetected.bodySize ? "✅" : "❌"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-gray-800">
                        <span className="text-gray-400">
                          Opposing wick ≤ 10% ({shotAutoDetected.wickPercent}%)
                        </span>
                        <span
                          className={
                            shotAutoDetected.wickSmall
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {shotAutoDetected.wickSmall ? "✅" : "❌"}
                        </span>
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-black/40 border border-yellow-700/40">
                    <input
                      type="checkbox"
                      checked={shotConfirmed}
                      onChange={(e) => setShotConfirmed(e.target.checked)}
                      className="w-5 h-5 accent-yellow-500"
                    />
                    <span className="text-sm font-medium text-yellow-200">
                      ⚡ Confirm: shot candle launched from CE
                    </span>
                  </label>

                  {shotConfirmed && (
                    <div className="p-3 rounded-lg bg-green-950/60 border border-green-700 text-center">
                      <p className="text-sm font-bold text-green-300">
                        ⚡ CE ENTRY + SHOT CONFIRMED
                      </p>
                      <p className="text-xs text-green-400/80 mt-1">
                        Highest-probability setup. Enter at CE on next tap.
                      </p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-yellow-800/40">
                  <button
                    type="button"
                    onClick={handleCopyEntry}
                    className="py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-medium text-sm"
                  >
                    {copied ? "✓ Copied" : "📋 Copy Entry"}
                  </button>
                  <button
                    type="button"
                    onClick={handleUseInSetup}
                    className="py-3 rounded-lg bg-green-700 hover:bg-green-600 font-medium text-sm"
                  >
                    📋 Use in New Setup →
                  </button>
                </div>
              </div>
            )}

            {/* Condition Checks */}
            <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
              <h3 className="text-sm font-semibold text-blue-400 mb-2">
                Condition Checks
              </h3>
              <CheckRow
                label="Current candle made the wick"
                ok={result.c2MadeWick}
                detail={isRFZ ? "higher high" : "lower low"}
              />
              <CheckRow
                label="Previous candle did NOT make the swing"
                ok={!result.c1MadeWick}
              />
              <CheckRow
                label="Previous candle did NOT make both extremes"
                ok={!result.previousCandleMadeBoth}
              />
              <CheckRow label="Sweep occurred" ok={result.sweepOccurred} />
              <CheckRow label="Close back inside" ok={result.closeInside} />
              <CheckRow
                label={`Wick/Body ≥ ${form.wickRatioMin}x`}
                ok={result.wickRatioOk}
                detail={`${result.wickBodyRatio}x actual`}
              />
              <CheckRow
                label={`Displacement ≥ ${form.displacementMultiplier}x ATR`}
                ok={result.displacementOk}
                detail={`${result.displacementActual} vs ${result.displacementThreshold}`}
              />
            </div>

            {/* Notes */}
            <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
              <label className="block text-xs mb-1 text-gray-400">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={2}
                placeholder="Any observations..."
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none resize-none text-sm"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
                {error}
              </div>
            )}

            {savedId && (
              <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">
                ✅ Saved to history.
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !!savedId}
              className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-medium disabled:opacity-50 text-sm"
            >
              {saving ? "Saving..." : savedId ? "✓ Saved" : "💾 Save to History"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function CheckRow({ label, ok, detail }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
      <div className="flex items-center gap-2">
        <span className={ok ? "text-green-400" : "text-red-400"}>
          {ok ? "✅" : "❌"}
        </span>
        <span className="text-sm text-gray-200">{label}</span>
      </div>
      {detail && (
        <span className="text-xs text-gray-500 tabular-nums">{detail}</span>
      )}
    </div>
  );
}