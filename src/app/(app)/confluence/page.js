"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { PAIRS } from "@/lib/setupHelpers";
import { computeConfluence, verdictColor } from "@/lib/confluenceEngine";

export default function ConfluencePage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    pair: "Volatility 80",
    bias: "bearish",
    current_price: "",
    // D1
    d1_direction: "downtrend",
    d1_rejection_block: false,
    d1_zone_low: "",
    d1_zone_high: "",
    d1_liquidity: false,
    // H4
    h4_direction: "downtrend",
    h4_rejection_block: false,
    h4_zone_low: "",
    h4_zone_high: "",
    h4_liquidity: false,
    // H1
    h1_direction: "downtrend",
    h1_rejection_block: false,
    h1_zone_low: "",
    h1_zone_high: "",
    h1_liquidity: false,
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Clean payload for calculation
  const calcPayload = {
    bias: form.bias,
    d1_direction: form.d1_direction,
    d1_rejection_block: form.d1_rejection_block,
    d1_zone_low: parseFloat(form.d1_zone_low) || null,
    d1_zone_high: parseFloat(form.d1_zone_high) || null,
    d1_liquidity: form.d1_liquidity,
    h4_direction: form.h4_direction,
    h4_rejection_block: form.h4_rejection_block,
    h4_zone_low: parseFloat(form.h4_zone_low) || null,
    h4_zone_high: parseFloat(form.h4_zone_high) || null,
    h4_liquidity: form.h4_liquidity,
    h1_direction: form.h1_direction,
    h1_rejection_block: form.h1_rejection_block,
    h1_zone_low: parseFloat(form.h1_zone_low) || null,
    h1_zone_high: parseFloat(form.h1_zone_high) || null,
    h1_liquidity: form.h1_liquidity,
  };

  const result = computeConfluence(calcPayload);
  const colors = verdictColor(result.verdict);

  async function handleSave() {
    setError("");
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("confluence_analyses")
      .insert({
        user_id: user.id,
        pair: form.pair,
        bias: form.bias,
        current_price: parseFloat(form.current_price) || null,
        d1_direction: form.d1_direction,
        d1_rejection_block: form.d1_rejection_block,
        d1_zone_low: parseFloat(form.d1_zone_low) || null,
        d1_zone_high: parseFloat(form.d1_zone_high) || null,
        d1_liquidity: form.d1_liquidity,
        h4_direction: form.h4_direction,
        h4_rejection_block: form.h4_rejection_block,
        h4_zone_low: parseFloat(form.h4_zone_low) || null,
        h4_zone_high: parseFloat(form.h4_zone_high) || null,
        h4_liquidity: form.h4_liquidity,
        h1_direction: form.h1_direction,
        h1_rejection_block: form.h1_rejection_block,
        h1_zone_low: parseFloat(form.h1_zone_low) || null,
        h1_zone_high: parseFloat(form.h1_zone_high) || null,
        h1_liquidity: form.h1_liquidity,
        confluence_score: result.score,
        verdict: result.verdict,
        suggested_entry_low: result.suggestedEntryLow,
        suggested_entry_high: result.suggestedEntryHigh,
        suggested_sl: result.suggestedSl,
        suggested_tp: result.suggestedTp,
        rr_ratio: result.rrRatio,
        notes: form.notes,
      });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push("/confluence/history");
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-blue-400 text-sm hover:underline"
            >
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold mt-2">Confluence Analyzer</h1>
            <p className="text-gray-400 text-sm">
              Multi-timeframe alignment check
            </p>
          </div>
          <Link
            href="/confluence/history"
            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-600 text-xs"
          >
            History →
          </Link>
        </div>

        {/* Pair + Bias */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-2 text-gray-300">Pair</label>
              <select
                value={form.pair}
                onChange={(e) => update("pair", e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                {PAIRS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2 text-gray-300">Bias</label>
              <select
                value={form.bias}
                onChange={(e) => update("bias", e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                <option value="bearish">Bearish</option>
                <option value="bullish">Bullish</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm mb-2 text-gray-300">Current Price</label>
            <input
              type="number"
              step="any"
              value={form.current_price}
              onChange={(e) => update("current_price", e.target.value)}
              placeholder="e.g. 209250"
              className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            />
          </div>
        </div>

        {/* D1 */}
        <TimeframeSection
          label="D1 (Daily)"
          direction={form.d1_direction}
          onDirection={(v) => update("d1_direction", v)}
          rejectionBlock={form.d1_rejection_block}
          onRejectionBlock={(v) => update("d1_rejection_block", v)}
          zoneLow={form.d1_zone_low}
          onZoneLow={(v) => update("d1_zone_low", v)}
          zoneHigh={form.d1_zone_high}
          onZoneHigh={(v) => update("d1_zone_high", v)}
          liquidity={form.d1_liquidity}
          onLiquidity={(v) => update("d1_liquidity", v)}
        />

        {/* H4 */}
        <TimeframeSection
          label="H4 (4 Hours)"
          direction={form.h4_direction}
          onDirection={(v) => update("h4_direction", v)}
          rejectionBlock={form.h4_rejection_block}
          onRejectionBlock={(v) => update("h4_rejection_block", v)}
          zoneLow={form.h4_zone_low}
          onZoneLow={(v) => update("h4_zone_low", v)}
          zoneHigh={form.h4_zone_high}
          onZoneHigh={(v) => update("h4_zone_high", v)}
          liquidity={form.h4_liquidity}
          onLiquidity={(v) => update("h4_liquidity", v)}
        />

        {/* H1 */}
        <TimeframeSection
          label="H1 (1 Hour)"
          direction={form.h1_direction}
          onDirection={(v) => update("h1_direction", v)}
          rejectionBlock={form.h1_rejection_block}
          onRejectionBlock={(v) => update("h1_rejection_block", v)}
          zoneLow={form.h1_zone_low}
          onZoneLow={(v) => update("h1_zone_low", v)}
          zoneHigh={form.h1_zone_high}
          onZoneHigh={(v) => update("h1_zone_high", v)}
          liquidity={form.h1_liquidity}
          onLiquidity={(v) => update("h1_liquidity", v)}
        />

        {/* Result */}
        <div className={`p-5 rounded-lg border-2 mb-4 ${colors}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Confluence Score</span>
            <span className="text-2xl font-bold">{result.score}/100</span>
          </div>
          <p className="text-2xl font-bold text-center mb-2">
            {result.emoji} {result.verdict}
          </p>

          {result.overlap && (
            <p className="text-center text-sm mt-2">
              Overlap: {result.overlap.low.toFixed(2)} -{" "}
              {result.overlap.high.toFixed(2)}
            </p>
          )}
        </div>

        {/* Suggested Trade */}
        {result.score >= 45 && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 mb-4">
            <h3 className="text-sm font-semibold text-blue-400 mb-3">
              Suggested Trade
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Entry Zone</p>
                <p className="font-bold tabular-nums text-white">
                  {result.suggestedEntryLow?.toFixed(2)} -{" "}
                  {result.suggestedEntryHigh?.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Stop Loss</p>
                <p className="font-bold tabular-nums text-red-400">
                  {result.suggestedSl?.toFixed(2) || "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Take Profit</p>
                <p className="font-bold tabular-nums text-green-400">
                  {result.suggestedTp?.toFixed(2) || "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">RR</p>
                <p className="font-bold tabular-nums text-white">
                  {result.rrRatio > 0 ? `1:${result.rrRatio}` : "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Breakdown */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 mb-4">
          <h3 className="text-sm font-semibold text-blue-400 mb-3">
            Breakdown
          </h3>
          <div className="space-y-1 text-sm">
            {result.breakdown.map((line, i) => (
              <p key={i} className="text-gray-300">{line}</p>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 mb-4">
          <label className="block text-sm mb-2 text-gray-300">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            placeholder="Any observations..."
            className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none resize-none text-sm"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm mb-4">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Analysis"}
        </button>
      </div>
    </main>
  );
}

function TimeframeSection({
  label,
  direction,
  onDirection,
  rejectionBlock,
  onRejectionBlock,
  zoneLow,
  onZoneLow,
  zoneHigh,
  onZoneHigh,
  liquidity,
  onLiquidity,
}) {
  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 mb-4 space-y-3">
      <h3 className="text-md font-semibold text-blue-400">{label}</h3>

      <div>
        <label className="block text-xs mb-2 text-gray-400">Direction</label>
        <div className="grid grid-cols-3 gap-2">
          {["uptrend", "downtrend", "sideways"].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDirection(d)}
              className={`py-2 rounded-lg text-xs transition ${
                direction === d
                  ? "bg-blue-600 text-white font-medium"
                  : "bg-black border border-gray-700 text-gray-400"
              }`}
            >
              {d === "uptrend" ? "⬆️ Up" : d === "downtrend" ? "⬇️ Down" : "↔️ Side"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={rejectionBlock}
            onChange={(e) => onRejectionBlock(e.target.checked)}
            className="w-4 h-4 accent-blue-500"
          />
          <span className="text-xs">Rejection Block</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={liquidity}
            onChange={(e) => onLiquidity(e.target.checked)}
            className="w-4 h-4 accent-yellow-500"
          />
          <span className="text-xs">Liquidity</span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1 text-gray-400">Zone Low</label>
          <input
            type="number"
            step="any"
            value={zoneLow}
            onChange={(e) => onZoneLow(e.target.value)}
            placeholder="209000"
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-xs mb-1 text-gray-400">Zone High</label>
          <input
            type="number"
            step="any"
            value={zoneHigh}
            onChange={(e) => onZoneHigh(e.target.value)}
            placeholder="209500"
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
          />
        </div>
      </div>
    </div>
  );
}