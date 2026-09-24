"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { PAIRS } from "@/lib/setupHelpers";
import {
  validateRejectionBlock,
  confidenceLabel,
  DEFAULT_PARAMS,
  TIMEFRAME_PRESETS,
} from "@/lib/rbValidator";

export default function RBValidatorPage() {
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleValidate(e) {
    e.preventDefault();
    setError("");
    setSaved(false);

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

    const { error: insertError } = await supabase
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
      });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSaved(true);
  }

  const label = result ? confidenceLabel(result.confidenceScore) : null;

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
                  Swing {form.direction === "rfz" ? "High" : "Low"}
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
                {i === 2 && " (displacement)"}
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

        {/* Result */}
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
                <p className="text-2xl">
                  {result.isValid ? "✅" : "❌"}
                </p>
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

            {/* Checklist */}
            <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
              <h3 className="text-sm font-semibold text-blue-400 mb-2">
                Condition Checks
              </h3>
              <CheckRow
                label="Current candle made the wick"
                ok={result.c2MadeWick}
                detail={form.direction === "rfz" ? "higher high" : "lower low"}
              />
              <CheckRow
                label="Previous candle did NOT make the swing"
                ok={!result.c1MadeWick}
              />
              <CheckRow
                label="Previous candle did NOT make both extremes"
                ok={!result.previousCandleMadeBoth}
              />
              <CheckRow
                label="Sweep occurred"
                ok={result.sweepOccurred}
              />
              <CheckRow
                label="Close back inside"
                ok={result.closeInside}
              />
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

            {/* Zone output */}
            {result.isValid && (
              <div className="p-4 rounded-lg bg-blue-950/40 border border-blue-800 space-y-2">
                <h3 className="text-sm font-semibold text-blue-300">
                  Computed Zone
                </h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Zone High</p>
                    <p className="font-bold tabular-nums text-white">
                      {result.zoneHigh.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">CE (50%)</p>
                    <p className="font-bold tabular-nums text-yellow-400">
                      {result.cePrice.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Zone Low</p>
                    <p className="font-bold tabular-nums text-white">
                      {result.zoneLow.toFixed(2)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Use this zone in your Setup → Rejection Block field.
                </p>
              </div>
            )}

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

            {saved && (
              <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">
                ✅ Validation saved to history.
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || saved}
              className="w-full py-3 rounded-lg bg-green-700 hover:bg-green-600 font-medium disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : saved
                ? "✓ Saved"
                : "Save to History"}
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