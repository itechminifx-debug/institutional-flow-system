"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import {
  ZONE_TYPES,
  zoneTypeInfo,
  computeCe,
  detectRbVsZone,
  rbVsZoneInfo,
  judgeRejectionBlock,
  premiumDiscountVerdict,
  strengthInfo,
  atrFilter,
  computeRejectionBlockTrade,
} from "@/lib/rejectionBlockEngine";
import PairPicker from "@/components/PairPicker";

export default function RejectionBlockPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "H4",
    zoneType: "fvg",
    zoneHigh: "",
    zoneLow: "",
    rbHigh: "",
    rbLow: "",
    closePrice: "",
    atrCurrent: "",
    atrPrior: "",
    notes: "",
  });

  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [existingDetailId, setExistingDetailId] = useState(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(prof);

      if (!isEdit) return;

      setLoadingEdit(true);
      const { data: setupData, error: setupErr } = await supabase
        .from("setups")
        .select("*")
        .eq("id", editId)
        .single();

      if (setupErr || !setupData) {
        setError(setupErr?.message || "Setup not found.");
        setLoadingEdit(false);
        return;
      }

      const { data: detailData } = await supabase
        .from("rejection_block_setups")
        .select("*")
        .eq("setup_id", editId)
        .single();

      setForm((f) => ({
        ...f,
        pair: setupData.pair || f.pair,
        timeframe: detailData?.timeframe || f.timeframe,
        zoneType: detailData?.zone_type || f.zoneType,
        zoneHigh: detailData?.zone_high?.toString() || "",
        zoneLow: detailData?.zone_low?.toString() || "",
        rbHigh: detailData?.rb_high?.toString() || "",
        rbLow: detailData?.rb_low?.toString() || "",
        closePrice: detailData?.close_price?.toString() || "",
        atrCurrent: detailData?.atr_current?.toString() || "",
        atrPrior: detailData?.atr_prior?.toString() || "",
        notes: setupData.notes || "",
      }));

      setExistingDetailId(detailData?.id || null);
      setLoadingEdit(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const zoneCe = computeCe(form.zoneHigh, form.zoneLow);
  const rbCe = computeCe(form.rbHigh, form.rbLow);

  const rbPosition = detectRbVsZone({
    zoneHigh: form.zoneHigh,
    zoneLow: form.zoneLow,
    rbHigh: form.rbHigh,
    rbLow: form.rbLow,
  });
  const rbPosInfo = rbPosition ? rbVsZoneInfo(rbPosition) : null;

  const negotiation = judgeRejectionBlock({
    rbHigh: form.rbHigh,
    rbLow: form.rbLow,
    closePrice: form.closePrice,
  });
  const verdict = premiumDiscountVerdict(negotiation);
  const strength = negotiation ? strengthInfo(negotiation.strength) : null;

  const atr = atrFilter(form.atrCurrent, form.atrPrior);

  const trade =
    negotiation &&
    (negotiation.verdict === "BUY" || negotiation.verdict === "SELL")
      ? computeRejectionBlockTrade({
          rbHigh: form.rbHigh,
          rbLow: form.rbLow,
          verdict: negotiation.verdict,
          accountSize: profile?.account_size || 0,
          riskPercent: profile?.risk_percent || 1,
          atr: parseFloat(form.atr) || parseFloat(form.atrCurrent) || 0,
        })
      : null;

  const zoneInfo = zoneTypeInfo(form.zoneType);

  async function handleSave() {
    if (!negotiation || !rbPosition) {
      setError("Fill in the zone, RB, and close price first.");
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

    const setupPayload = {
      user_id: user.id,
      pair: form.pair,
      setup_type: "rejection_block",
      d1_bias: negotiation.verdict === "BUY" ? "bullish" : "bearish",
      htf_bias: negotiation.verdict === "BUY" ? "bullish" : "bearish",
      ema50_position: "above",
      rejection_block_zone: `${form.rbLow}-${form.rbHigh}`,
      ce_price: negotiation.ce,
      use_ce_entry: true,
      checklist_score: 0,
      checklist_passed: false,
      notes: form.notes,
    };

    let setup;
    if (isEdit) {
      const { data, error: updErr } = await supabase
        .from("setups")
        .update(setupPayload)
        .eq("id", editId)
        .select()
        .single();

      if (updErr) {
        setError(updErr.message);
        setSaving(false);
        return;
      }
      setup = data;
    } else {
      const { data, error: insErr } = await supabase
        .from("setups")
        .insert(setupPayload)
        .select()
        .single();

      if (insErr) {
        setError(insErr.message);
        setSaving(false);
        return;
      }
      setup = data;
    }

    const detailPayload = {
      user_id: user.id,
      setup_id: setup.id,
      pair: form.pair,
      timeframe: form.timeframe,
      zone_type: form.zoneType,
      zone_high: form.zoneHigh ? parseFloat(form.zoneHigh) : null,
      zone_low: form.zoneLow ? parseFloat(form.zoneLow) : null,
      zone_ce: zoneCe,
      rb_high: form.rbHigh ? parseFloat(form.rbHigh) : null,
      rb_low: form.rbLow ? parseFloat(form.rbLow) : null,
      rb_ce: negotiation.ce,
      rb_position: rbPosition,
      close_price: form.closePrice ? parseFloat(form.closePrice) : null,
      premium_discount: negotiation.side,
      verdict: negotiation.verdict,
      strength: negotiation.strength,
      rb_broken: negotiation.rbBroken,
      reason: negotiation.reason,
      entry: trade?.entry || null,
      sl: trade?.sl || null,
      tp: trade?.tp || null,
      lot_size: trade?.lotSize || null,
      risk_amount: trade?.riskAmount || null,
      atr_current: form.atrCurrent ? parseFloat(form.atrCurrent) : null,
      atr_prior: form.atrPrior ? parseFloat(form.atrPrior) : null,
      atr_state: atr.key,
      notes: form.notes,
    };

    if (isEdit && existingDetailId) {
      const { error: updErr } = await supabase
        .from("rejection_block_setups")
        .update(detailPayload)
        .eq("id", existingDetailId);

      if (updErr) {
        setError(updErr.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insErr } = await supabase
        .from("rejection_block_setups")
        .insert(detailPayload);

      if (insErr) {
        setError(insErr.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => router.push(`/setups/${setup.id}`), 800);
  }

  if (loadingEdit) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-gray-400">
          Loading setup...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit
              ? "Edit Rejection Block Setup"
              : "Rejection Block Negotiation"}
          </h1>
          <p className="text-gray-400 text-sm">
            Zones hold orders. Rejection Blocks make decisions.
          </p>
        </div>

        {/* Context */}
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
        </div>

        {/* Zone */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            Zone (where orders sit)
          </h2>

          <div>
            <label className="block text-xs mb-1 text-gray-400">
              Zone Type
            </label>
            <select
              value={form.zoneType}
              onChange={(e) => update("zoneType", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            >
              {ZONE_TYPES.map((z) => (
                <option key={z.key} value={z.key}>
                  {z.emoji} {z.label}
                </option>
              ))}
            </select>
          </div>

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
                placeholder="e.g. 209400"
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
                placeholder="e.g. 209600"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {zoneCe !== null && (
            <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900">
              <p className="text-xs text-blue-300 font-semibold">Zone CE</p>
              <p className="text-lg font-bold tabular-nums text-blue-200">
                {formatPrice(zoneCe)}
              </p>
            </div>
          )}
        </div>

        {/* Rejection Block */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-blue-400">
              Rejection Block (where the decision happens)
            </h2>
            {rbPosInfo && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${rbPosInfo.color}`}
              >
                {rbPosInfo.emoji} {rbPosInfo.label}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                RB Low
              </label>
              <input
                type="number"
                step="any"
                value={form.rbLow}
                onChange={(e) => update("rbLow", e.target.value)}
                placeholder="e.g. 209500"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                RB High
              </label>
              <input
                type="number"
                step="any"
                value={form.rbHigh}
                onChange={(e) => update("rbHigh", e.target.value)}
                placeholder="e.g. 209700"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {rbCe !== null && (
            <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900">
              <p className="text-xs text-blue-300 font-semibold">
                RB CE — negotiation line
              </p>
              <p className="text-lg font-bold tabular-nums text-blue-200">
                {formatPrice(rbCe)}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs mb-1 text-gray-400">
              Close Price (the verdict)
            </label>
            <input
              type="number"
              step="any"
              value={form.closePrice}
              onChange={(e) => update("closePrice", e.target.value)}
              placeholder="e.g. 209680"
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            />
          </div>
        </div>

        {/* Meaning Card */}
        {rbPosInfo && (
          <div className={`p-4 rounded-lg border space-y-2 ${rbPosInfo.color}`}>
            <p className="text-xs opacity-80">RB Position vs Zone</p>
            <p className="text-lg font-bold">
              {rbPosInfo.emoji} {rbPosInfo.label}
            </p>
            <p className="text-sm opacity-90">{rbPosInfo.meaning}</p>
          </div>
        )}

        {/* Verdict Card */}
        {negotiation && (
          <div className={`p-4 rounded-lg border space-y-2 ${verdict.color}`}>
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

        {/* ATR */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">ATR Filter</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                ATR (current)
              </label>
              <input
                type="number"
                step="any"
                value={form.atrCurrent}
                onChange={(e) => update("atrCurrent", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                ATR (prior)
              </label>
              <input
                type="number"
                step="any"
                value={form.atrPrior}
                onChange={(e) => update("atrPrior", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>
          <div className={`p-3 rounded-lg border ${atr.color}`}>
            <p className="text-xs font-semibold">
              {atr.emoji} {atr.label}
            </p>
            <p className="text-xs opacity-90 mt-1">{atr.description}</p>
          </div>
        </div>

        {/* TRADE CARD */}
        {trade && (
          <div className="p-4 rounded-lg bg-gray-900 border border-blue-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-blue-400">
                Trade Parameters
              </h2>
              <span
                className={`text-xs px-2 py-1 rounded-full font-bold ${
                  trade.direction === "BUY"
                    ? "bg-green-900/40 text-green-300"
                    : "bg-red-900/40 text-red-300"
                }`}
              >
                {trade.direction}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
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
                <p className="text-xs text-gray-500 mt-0.5">
                  {trade.slSource === "wick+buffer"
                    ? "wick + buffer"
                    : "wick only"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Take Profit (2R)</p>
                <p className="font-bold tabular-nums text-green-400">
                  {formatPrice(trade.tp)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">RR</p>
                <p className="font-bold tabular-nums text-white">1:2</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Risk</p>
                <p className="font-bold tabular-nums text-white">
                  {trade.risk.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Reward</p>
                <p className="font-bold tabular-nums text-white">
                  {trade.reward.toFixed(2)}
                </p>
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
            ✅ {isEdit ? "Updated" : "Saved"} — redirecting to setup...
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={
            saving ||
            !negotiation ||
            negotiation.verdict === "WAIT" ||
            !rbPosition
          }
          className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${
            isEdit
              ? "bg-blue-700 hover:bg-blue-600"
              : negotiation?.verdict === "BUY"
              ? "bg-green-700 hover:bg-green-600"
              : negotiation?.verdict === "SELL"
              ? "bg-red-700 hover:bg-red-600"
              : "bg-gray-800"
          }`}
        >
          {saving
            ? isEdit
              ? "Updating..."
              : "Saving..."
            : isEdit
            ? "✏️ Update Setup"
            : negotiation?.verdict === "BUY"
            ? "✅ Save BUY Setup"
            : negotiation?.verdict === "SELL"
            ? "🔴 Save SELL Setup"
            : "Fill zone + RB + close to enable"}
        </button>

        {/* Info card */}
        <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-900/50">
          <h3 className="text-xs font-semibold text-blue-300 mb-2">
            💡 How the Rejection Block Works
          </h3>
          <ul className="text-xs text-gray-300 space-y-1 ml-4 list-disc">
            <li>
              <strong>Zones hold orders</strong> — FVG, OB, Liquidity, MSS, BOS
            </li>
            <li>
              <strong>Price enters a zone</strong> to fill those orders
            </li>
            <li>
              <strong>The RB makes the decision</strong> after orders are
              filled
            </li>
            <li>
              <strong>RB inside the zone</strong> — negotiation happens inside
            </li>
            <li>
              <strong>RB above the zone</strong> — negotiation happens above
            </li>
            <li>
              <strong>RB below the zone</strong> — negotiation happens below
            </li>
            <li>
              <strong>Entry</strong> — CE of the RB (50%)
            </li>
            <li>
              <strong>SL</strong> — beyond the RB wick + ATR buffer
            </li>
            <li>
              <strong>TP</strong> — 2R from entry
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}