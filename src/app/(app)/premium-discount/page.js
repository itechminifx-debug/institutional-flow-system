"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import {
  computeCe,
  detectSideOfCe,
  detectZonePosition,
  judgeNegotiation,
  premiumDiscountVerdict,
  strengthInfo,
} from "@/lib/premiumDiscountEngine";
import PairPicker from "@/components/PairPicker";

export default function PremiumDiscountPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "H4",
    zoneType: "resistance",
    zoneName: "Rejection Block",
    zoneHigh: "",
    zoneLow: "",
    priorPrice: "",
    closePrice: "",
    notes: "",
  });

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

  const ce = computeCe(form.zoneHigh, form.zoneLow);
  const sideOfCe = ce !== null ? detectSideOfCe(form.closePrice, ce) : null;
  const zonePosition = detectZonePosition(
    form.closePrice,
    form.zoneHigh,
    form.zoneLow
  );

  const result = judgeNegotiation({
    zoneType: form.zoneType,
    zoneHigh: form.zoneHigh,
    zoneLow: form.zoneLow,
    priorPrice: form.priorPrice,
    closePrice: form.closePrice,
  });

  const verdict = premiumDiscountVerdict(result);
  const strength = result ? strengthInfo(result.strength) : null;

  async function handleSave() {
    if (!result) {
      setError("Nothing to save — fill in the zone and close first.");
      return;
    }

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

    const { data: setup, error: setupError } = await supabase
      .from("setups")
      .insert({
        user_id: user.id,
        pair: form.pair,
        setup_type: "premium_discount",
        d1_bias: result.verdict === "BUY" ? "bullish" : "bearish",
        htf_bias: result.verdict === "BUY" ? "bullish" : "bearish",
        ema50_position: "above",
        rejection_block_zone: `${form.zoneLow}-${form.zoneHigh}`,
        ce_price: result.ce,
        use_ce_entry: true,
        checklist_score: 0,
        checklist_passed: false,
        notes: form.notes,
      })
      .select()
      .single();

    if (setupError) {
      setError(setupError.message);
      setSaving(false);
      return;
    }

    const { error: detailError } = await supabase
      .from("premium_discount_setups")
      .insert({
        user_id: user.id,
        setup_id: setup.id,
        pair: form.pair,
        timeframe: form.timeframe,
        zone_type: form.zoneType,
        zone_name: form.zoneName,
        zone_high: form.zoneHigh ? parseFloat(form.zoneHigh) : null,
        zone_low: form.zoneLow ? parseFloat(form.zoneLow) : null,
        ce_price: result.ce,
        prior_price: form.priorPrice ? parseFloat(form.priorPrice) : null,
        close_price: form.closePrice ? parseFloat(form.closePrice) : null,
        premium_discount: result.premiumDiscount,
        zone_position: result.zonePosition,
        verdict: result.verdict,
        strength: result.strength,
        reason: result.reason,
        notes: form.notes,
      });

    if (detailError) {
      setError(detailError.message);
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
          <h1 className="text-2xl font-bold">Premium / Discount Negotiation</h1>
          <p className="text-gray-400 text-sm">
            Where price closes relative to the CE — continuation or reversal
          </p>
        </div>

        {/* Zone Context */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <PairPicker
              value={form.pair}
              onChange={(pair) => update("pair", pair)}
              label="Pair"
            />
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
                <option value="M15">M15</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-2 text-gray-400">
              Zone Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => update("zoneType", "resistance")}
                className={`py-2 rounded-lg text-sm transition ${
                  form.zoneType === "resistance"
                    ? "bg-red-900/40 border border-red-600 text-red-200 font-bold"
                    : "bg-black border border-gray-800 text-gray-400"
                }`}
              >
                🔴 Resistance
              </button>
              <button
                type="button"
                onClick={() => update("zoneType", "support")}
                className={`py-2 rounded-lg text-sm transition ${
                  form.zoneType === "support"
                    ? "bg-green-900/40 border border-green-600 text-green-200 font-bold"
                    : "bg-black border border-gray-800 text-gray-400"
                }`}
              >
                🟢 Support
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1 text-gray-400">
              Zone Name (e.g. Rejection Block, FVG, Order Block)
            </label>
            <input
              type="text"
              value={form.zoneName}
              onChange={(e) => update("zoneName", e.target.value)}
              placeholder="Rejection Block"
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            />
          </div>
        </div>

        {/* Zone Bounds */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">Zone Bounds</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Zone Low
              </label>
              <input
                type="number"
                step="any"
                value={form.zoneLow}
                onChange={(e) => update("zoneLow", e.target.value)}
                placeholder="e.g. 209500"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Zone High
              </label>
              <input
                type="number"
                step="any"
                value={form.zoneHigh}
                onChange={(e) => update("zoneHigh", e.target.value)}
                placeholder="e.g. 209700"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {ce !== null && (
            <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-300 font-semibold">
                    CE — 50% pivot
                  </p>
                  <p className="text-lg font-bold tabular-nums text-blue-200">
                    {formatPrice(ce)}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-purple-300">
                    🔺 Premium above CE = sellers
                  </p>
                  <p className="text-orange-300">
                    🔻 Discount below CE = buyers
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Price Inputs */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            Price Action
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Prior Price (before approaching the zone)
              </label>
              <input
                type="number"
                step="any"
                value={form.priorPrice}
                onChange={(e) => update("priorPrice", e.target.value)}
                placeholder="e.g. 209900"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Close Price (after the negotiation)
              </label>
              <input
                type="number"
                step="any"
                value={form.closePrice}
                onChange={(e) => update("closePrice", e.target.value)}
                placeholder="e.g. 209600"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {sideOfCe && (
            <div
              className={`p-3 rounded-lg border ${
                sideOfCe === "premium"
                  ? "bg-purple-950/40 border-purple-800"
                  : sideOfCe === "discount"
                  ? "bg-orange-950/40 border-orange-800"
                  : "bg-gray-900 border-gray-700"
              }`}
            >
              <p className="text-xs font-semibold">
                {sideOfCe === "premium"
                  ? "🔺 Closed in PREMIUM — sellers' territory"
                  : sideOfCe === "discount"
                  ? "🔻 Closed in DISCOUNT — buyers' territory"
                  : "🎯 Closed at CE"}
              </p>
              {zonePosition && (
                <p className="text-xs text-gray-400 mt-1">
                  Zone position: <strong>{zonePosition}</strong>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Verdict */}
        {result && (
          <div className={`p-4 rounded-lg border space-y-3 ${verdict.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-80">Verdict</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-2xl font-bold">
                    {verdict.emoji} {verdict.label}
                  </p>
                  {verdict.brokenBadge && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${verdict.brokenBadge.color}`}
                    >
                      {verdict.brokenBadge.label}
                    </span>
                  )}
                </div>
              </div>
              {strength && (
                <span
                  className={`text-xs px-2 py-1 rounded-full font-semibold ${strength.color}`}
                >
                  {strength.emoji} {strength.label}
                </span>
              )}
            </div>
            <p className="text-sm opacity-90">{verdict.description}</p>
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
          disabled={saving || !result || result.verdict === "WAIT"}
          className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${
            result?.verdict === "BUY"
              ? "bg-green-700 hover:bg-green-600"
              : result?.verdict === "SELL"
              ? "bg-red-700 hover:bg-red-600"
              : "bg-gray-800"
          }`}
        >
          {saving
            ? "Saving..."
            : result?.verdict === "BUY"
            ? "✅ Save BUY Setup"
            : result?.verdict === "SELL"
            ? "🔴 Save SELL Setup"
            : "Fill zone + close to enable"}
        </button>

        {/* Info card */}
        <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-900/50">
          <h3 className="text-xs font-semibold text-blue-300 mb-2">
            💡 How Premium / Discount Works
          </h3>
          <ul className="text-xs text-gray-300 space-y-1 ml-4 list-disc">
            <li>
              <strong>CE (50%)</strong> — pivot of the zone
            </li>
            <li>
              <strong>Above CE</strong> — Premium (sellers' territory)
            </li>
            <li>
              <strong>Below CE</strong> — Discount (buyers' territory)
            </li>
            <li>
              <strong>Close in premium, inside zone</strong> — SELL
              (sellers defended)
            </li>
            <li>
              <strong>Close in discount, inside zone</strong> — BUY
              (buyers defended)
            </li>
            <li>
              <strong>Close above zone high</strong> — BUY (strong,
              RB broken ↑)
            </li>
            <li>
              <strong>Close below zone low</strong> — SELL (strong,
              RB broken ↓)
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}