"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { PAIRS } from "@/lib/setupHelpers";
import { parseZone } from "@/lib/zoneHelpers";
import { formatPrice } from "@/lib/formatNumbers";
import { verdictInfo } from "@/lib/rbVerdict";
import { computeAttemptVerdict } from "@/lib/rbVerdict";
import {
  CONFIGURATIONS,
  configurationInfo,
  detectConfiguration,
  computeNegotiation,
  computeNegotiationTrade,
  strengthInfo,
} from "@/lib/negotiationEngine";

export default function NegotiationPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "H4",
    configuration: "rb_inside_mss",
    mssDirection: "bearish",
    mssZoneHigh: "",
    mssZoneLow: "",
    rbZoneHigh: "",
    rbZoneLow: "",
    verdictClose: "",
    attempts: 0,
    nestedRbCount: 0,
    nestedMssInRb: false,
    rbFlipped: false,
    notes: "",
  });

  const [detected, setDetected] = useState(null);
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(data);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Auto-detect configuration
  useEffect(() => {
    if (form.mssZoneHigh && form.mssZoneLow && form.rbZoneHigh && form.rbZoneLow) {
      const result = detectConfiguration({
        mssZoneHigh: form.mssZoneHigh,
        mssZoneLow: form.mssZoneLow,
        rbZoneHigh: form.rbZoneHigh,
        rbZoneLow: form.rbZoneLow,
        nestedRbCount: form.nestedRbCount,
        nestedMssInRb: form.nestedMssInRb,
        rbFlipped: form.rbFlipped,
      });
      setDetected(result);
    } else {
      setDetected(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.mssZoneHigh,
    form.mssZoneLow,
    form.rbZoneHigh,
    form.rbZoneLow,
    form.nestedRbCount,
    form.nestedMssInRb,
    form.rbFlipped,
  ]);

  // Compute negotiation
  const negotiation = computeNegotiation({
    mssDirection: form.mssDirection,
    rbZoneHigh: form.rbZoneHigh,
    rbZoneLow: form.rbZoneLow,
    verdictClose: form.verdictClose,
    attempts: form.attempts,
    verdictFlipped: form.rbFlipped,
  });

  // Compute trade
  const trade = computeNegotiationTrade({
    mssDirection: form.mssDirection,
    rbZoneHigh: form.rbZoneHigh,
    rbZoneLow: form.rbZoneLow,
    accountSize: profile?.account_size || 0,
    riskPercent: profile?.risk_percent || 1,
  });

  const configInfo = configurationInfo(form.configuration);
  const strengthData = configInfo ? strengthInfo(configInfo.strength) : null;

  async function handleSave() {
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

    // Create setup record
    const { data: setup, error: setupError } = await supabase
      .from("setups")
      .insert({
        user_id: user.id,
        pair: form.pair,
        d1_bias: form.mssDirection === "bullish" ? "bullish" : "bearish",
        ema50_position: "above",
        rejection_block_zone: `${form.rbZoneLow}-${form.rbZoneHigh}`,
        ce_price: negotiation.ce,
        use_ce_entry: true,
        rb_verdict: negotiation.verdict,
        rb_verdict_price: form.verdictClose ? parseFloat(form.verdictClose) : null,
        rb_verdict_at: form.verdictClose ? new Date().toISOString() : null,
        rb_attempts: negotiation.attempts,
        rb_verdict_flipped: negotiation.flipped,
        rb_verdict_flipped_at: negotiation.flipped
          ? new Date().toISOString()
          : null,
        notes:
          form.notes ||
          `Negotiation: ${configInfo?.label || form.configuration}`,
      })
      .select()
      .single();

    if (setupError) {
      setError(setupError.message);
      setSaving(false);
      return;
    }

    // Save negotiation record
    const { error: negError } = await supabase.from("negotiations").insert({
      user_id: user.id,
      setup_id: setup.id,
      pair: form.pair,
      timeframe: form.timeframe,
      configuration: form.configuration,
      mss_direction: form.mssDirection,
      mss_zone_high: parseFloat(form.mssZoneHigh),
      mss_zone_low: parseFloat(form.mssZoneLow),
      rb_zone_high: parseFloat(form.rbZoneHigh),
      rb_zone_low: parseFloat(form.rbZoneLow),
      ce_price: negotiation.ce,
      verdict_close: form.verdictClose ? parseFloat(form.verdictClose) : null,
      verdict: negotiation.verdict,
      attempts: negotiation.attempts,
      verdict_flipped: negotiation.flipped,
      strength: configInfo?.strength || null,
      notes: form.notes,
    });

    if (negError) {
      setError(negError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => router.push(`/setups/${setup.id}`), 800);
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Negotiation Setup</h1>
          <p className="text-gray-400 text-sm">
            MSS + RB + CE + Verdict + Flip — one page
          </p>
        </div>

        {/* Configuration Selector */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <label className="block text-xs font-semibold text-blue-400 uppercase tracking-wider">
            Configuration Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {CONFIGURATIONS.map((cfg) => {
              const isSelected = form.configuration === cfg.key;
              return (
                <button
                  key={cfg.key}
                  type="button"
                  onClick={() => update("configuration", cfg.key)}
                  className={`text-left p-3 rounded-lg border transition ${
                    isSelected
                      ? `${cfg.color} border-2`
                      : "bg-black border-gray-800 hover:border-gray-600"
                  }`}
                >
                  <p className="text-sm font-semibold">
                    {cfg.emoji} {cfg.label}
                  </p>
                  <p className="text-xs opacity-70 mt-1">
                    {cfg.description}
                  </p>
                </button>
              );
            })}
          </div>

          {detected?.key && detected.key !== form.configuration && (
            <div className="p-3 rounded-lg bg-yellow-950/40 border border-yellow-700">
              <p className="text-yellow-200 text-xs font-semibold">
                🔍 Auto-detected: {configurationInfo(detected.key)?.label}
              </p>
              <p className="text-yellow-300 text-xs mt-1">
                {detected.reason} — different from your selection
              </p>
              <button
                type="button"
                onClick={() => update("configuration", detected.key)}
                className="mt-2 px-3 py-1 rounded bg-yellow-800 hover:bg-yellow-700 text-xs"
              >
                Use detected →
              </button>
            </div>
          )}

          {detected?.key && detected.key === form.configuration && (
            <div className="p-2 rounded-lg bg-green-950/40 border border-green-800">
              <p className="text-green-300 text-xs">
                ✅ Matches auto-detection: {detected.reason}
              </p>
            </div>
          )}
        </div>

        {/* Context */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Pair</label>
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
                <option value="D1">D1</option>
                <option value="H4">H4</option>
                <option value="H1">H1</option>
                <option value="M30">M30</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-2 text-gray-400">
              MSS Direction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => update("mssDirection", "bullish")}
                className={`py-2 rounded-lg text-sm transition ${
                  form.mssDirection === "bullish"
                    ? "bg-green-900/40 border border-green-600 text-green-200 font-bold"
                    : "bg-black border border-gray-800 text-gray-400"
                }`}
              >
                🟢 Bullish MSS
              </button>
              <button
                type="button"
                onClick={() => update("mssDirection", "bearish")}
                className={`py-2 rounded-lg text-sm transition ${
                  form.mssDirection === "bearish"
                    ? "bg-red-900/40 border border-red-600 text-red-200 font-bold"
                    : "bg-black border border-gray-800 text-gray-400"
                }`}
              >
                🔴 Bearish MSS
              </button>
            </div>
          </div>
        </div>

        {/* MSS Zone */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            Structure (MSS Zone)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                MSS Zone Low
              </label>
              <input
                type="number"
                step="any"
                value={form.mssZoneLow}
                onChange={(e) => update("mssZoneLow", e.target.value)}
                placeholder="e.g. 209500"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                MSS Zone High
              </label>
              <input
                type="number"
                step="any"
                value={form.mssZoneHigh}
                onChange={(e) => update("mssZoneHigh", e.target.value)}
                placeholder="e.g. 210500"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* RB Zone */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            Defense (RB Zone)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                RB Zone Low
              </label>
              <input
                type="number"
                step="any"
                value={form.rbZoneLow}
                onChange={(e) => update("rbZoneLow", e.target.value)}
                placeholder="e.g. 209700"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                RB Zone High
              </label>
              <input
                type="number"
                step="any"
                value={form.rbZoneHigh}
                onChange={(e) => update("rbZoneHigh", e.target.value)}
                placeholder="e.g. 210200"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {/* Nested flags */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Nested RB Count
              </label>
              <input
                type="number"
                value={form.nestedRbCount}
                onChange={(e) =>
                  update("nestedRbCount", parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-5">
              <input
                type="checkbox"
                checked={form.nestedMssInRb}
                onChange={(e) => update("nestedMssInRb", e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-xs">MSS inside RB</span>
            </label>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.rbFlipped}
              onChange={(e) => update("rbFlipped", e.target.checked)}
              className="w-4 h-4 accent-red-500"
            />
            <span className="text-xs text-red-300">
              🔄 RB has flipped
            </span>
          </label>
        </div>

        {/* CE — The Negotiation Line */}
        {negotiation.ce && (
          <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-950/40 to-amber-900/30 border-2 border-yellow-700 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-yellow-300 uppercase tracking-wider">
                ⭐ CE — The Negotiation Line
              </h2>
            </div>
            <p className="text-3xl font-bold tabular-nums text-yellow-200">
              {formatPrice(negotiation.ce)}
            </p>
            <p className="text-xs text-yellow-200/70">
              The single reference point. Close below CE repeatedly = defending
              side losing.
            </p>
          </div>
        )}

        {/* Verdict */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            The Verdict
          </h2>

          <div>
            <label className="block text-xs mb-1 text-gray-400">
              Verdict Candle Close
            </label>
            <input
              type="number"
              step="any"
              value={form.verdictClose}
              onChange={(e) => update("verdictClose", e.target.value)}
              placeholder="e.g. 209400"
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            />
          </div>

          {negotiation.verdict !== "unknown" && (
            <div
              className={`p-3 rounded-lg border ${
                verdictInfo(negotiation.verdict)?.color || ""
              }`}
            >
              <p className="text-sm font-bold">
                {verdictInfo(negotiation.verdict)?.emoji}{" "}
                {verdictInfo(negotiation.verdict)?.label}
              </p>
              <p className="text-xs opacity-90 mt-1">{negotiation.reason}</p>
            </div>
          )}

          {/* Two-Attempt Rule */}
          <div className="pt-3 border-t border-gray-800 space-y-2">
            <p className="text-xs font-semibold text-blue-400">
              Two-Attempt Rule
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  update("attempts", Math.max(0, form.attempts - 1))
                }
                className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
              >
                −
              </button>
              <span className="text-lg font-bold tabular-nums min-w-[2ch] text-center">
                {form.attempts}
              </span>
              <button
                type="button"
                onClick={() => update("attempts", form.attempts + 1)}
                className="w-8 h-8 rounded-lg bg-blue-700 hover:bg-blue-600 text-sm font-bold"
              >
                +
              </button>
              <span className="text-xs text-gray-500">
                attempts by the defending side
              </span>
            </div>

            {form.attempts >= 2 && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-700">
                <p className="text-sm font-bold text-red-200">
                  🔄 VERDICT FLIPPED
                </p>
                <p className="text-xs text-red-300">
                  Two attempts failed. Flip the direction.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Trade Output */}
        {trade && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <h2 className="text-sm font-semibold text-blue-400">
              Trade Parameters
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Direction</p>
                <p className="font-bold text-white">{trade.direction}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Entry (CE)</p>
                <p className="font-bold tabular-nums text-yellow-400">
                  {formatPrice(trade.entry)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Stop Loss</p>
                <p className="font-bold tabular-nums text-red-400">
                  {formatPrice(trade.sl)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Take Profit (2R)</p>
                <p className="font-bold tabular-nums text-green-400">
                  {formatPrice(trade.tp)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Risk</p>
                <p className="font-bold tabular-nums text-white">
                  {trade.risk.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">RR</p>
                <p className="font-bold tabular-nums text-white">1:2</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Lot Size</p>
                <p className="font-bold tabular-nums text-white">
                  {trade.lotSize.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Risk ($)</p>
                <p className="font-bold tabular-nums text-yellow-400">
                  ${trade.riskAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <label className="block text-xs mb-1 text-gray-400">Notes</label>
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
            ✅ Saved — redirecting to setup...
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !negotiation.ce}
          className="w-full py-4 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold disabled:opacity-50"
        >
          {saving ? "Saving..." : "💾 Save Negotiation Setup"}
        </button>

        {/* Info card */}
        <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-900/50">
          <h3 className="text-xs font-semibold text-blue-300 mb-2">
            💡 How the Negotiation Works
          </h3>
          <ul className="text-xs text-gray-300 space-y-1 ml-4 list-disc">
            <li>
              <strong>MSS</strong> = structure. Where control shifted.
            </li>
            <li>
              <strong>RB</strong> = defense. Where the level is protected.
            </li>
            <li>
              <strong>CE</strong> = negotiation line. 50% midpoint. Your entry.
            </li>
            <li>
              <strong>Close beyond RB</strong> = verdict reached
            </li>
            <li>
              <strong>Two failed attempts</strong> = verdict flips
            </li>
            <li>
              <strong>Flip</strong> = new trade in the opposite direction
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}