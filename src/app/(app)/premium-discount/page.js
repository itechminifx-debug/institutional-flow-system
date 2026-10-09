"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import { createTradeFromSetup } from "@/lib/journalEngine";
import {
  computeCe,
  detectSideOfCe,
  detectZonePosition,
  judgeNegotiation,
  premiumDiscountVerdict,
  strengthInfo,
} from "@/lib/premiumDiscountEngine";
import {
  computeTrade,
  validateTrade,
} from "@/lib/tradeCalculator";
import {
  computeEmaDirection,
  emaInfo,
  emaAlignment,
  enrichVerdict,
  computeWarningReasons,
  HTF_BIAS_OPTIONS,
  SWEEP_DIRECTION_OPTIONS,
} from "@/lib/verdictEngine";
import PairPicker from "@/components/PairPicker";
import TradeCard from "@/components/TradeCard";
import WarningModal from "@/components/WarningModal";

export default function PremiumDiscountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "H4",
    zoneType: "resistance",
    zoneName: "Rejection Block",
    zoneHigh: "",
    zoneLow: "",
    priorPrice: "",
    closePrice: "",
    ema50Price: "",
    htfBiasInput: "auto",
    sweepDirection: "none",
    atrCurrent: "",
    pipSize: 1,
    notes: "",
  });

  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [existingDetailId, setExistingDetailId] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);

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
        .from("premium_discount_setups")
        .select("*")
        .eq("setup_id", editId)
        .single();

      setForm((f) => ({
        ...f,
        pair: setupData.pair || f.pair,
        timeframe: detailData?.timeframe || f.timeframe,
        zoneType: detailData?.zone_type || f.zoneType,
        zoneName: detailData?.zone_name || f.zoneName,
        zoneHigh: detailData?.zone_high?.toString() || "",
        zoneLow: detailData?.zone_low?.toString() || "",
        priorPrice: detailData?.prior_price?.toString() || "",
        closePrice: detailData?.close_price?.toString() || "",
        ema50Price: setupData.ema50_price?.toString() || "",
        htfBiasInput: setupData.htf_bias_override || "auto",
        sweepDirection: setupData.sweep_direction || "none",
        atrCurrent: detailData?.atr_current?.toString() || "",
        pipSize: detailData?.pip_size || 1,
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

  // CE + side
  const ce = computeCe(form.zoneHigh, form.zoneLow);
  const sideOfCe = ce !== null ? detectSideOfCe(form.closePrice, ce) : null;
  const zonePosition = detectZonePosition(
    form.closePrice,
    form.zoneHigh,
    form.zoneLow
  );

  // Base verdict from premium/discount engine
  const baseResult = judgeNegotiation({
    zoneType: form.zoneType,
    zoneHigh: form.zoneHigh,
    zoneLow: form.zoneLow,
    priorPrice: form.priorPrice,
    closePrice: form.closePrice,
  });

  // EMA
  const ema = computeEmaDirection({
    emaPrice: form.ema50Price,
    closePrice: form.closePrice,
  });
  const emaMeta = emaInfo(ema);

  // Enrich verdict with EMA + HTF + Sweep
  const enrichedVerdict = useMemo(() => {
    if (!baseResult) return null;
    const base = {
      verdict: baseResult.verdict,
      strength: baseResult.strength || "normal",
      reason: baseResult.reason || "",
    };
    return enrichVerdict({
      verdict: base,
      ema,
      htfBiasInput: form.htfBiasInput,
      sweepDirection: form.sweepDirection,
    });
  }, [baseResult, ema, form.htfBiasInput, form.sweepDirection]);

  const alignment = enrichedVerdict?.emaAlignment;

  // Shared trade calculator
  const trade = useMemo(() => {
    if (!enrichedVerdict) return null;
    const v = enrichedVerdict.verdict;
    if (v !== "BUY" && v !== "SELL") return null;
    if (!form.zoneHigh || !form.zoneLow) return null;
    const zoneHigh = parseFloat(form.zoneHigh);
    const zoneLow = parseFloat(form.zoneLow);
    if (isNaN(zoneHigh) || isNaN(zoneLow)) return null;
    const ceVal = Math.round(((zoneHigh + zoneLow) / 2) * 100) / 100;
    const slRef = v === "BUY" ? zoneLow : zoneHigh;
    return computeTrade({
      direction: v,
      entry: ceVal,
      slReference: slRef,
      atr: parseFloat(form.atrCurrent) || 0,
      accountSize: profile?.account_size || 0,
      riskPercent: profile?.risk_percent || 1,
      pipSize: parseFloat(form.pipSize) || 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enrichedVerdict,
    form.zoneHigh,
    form.zoneLow,
    form.atrCurrent,
    form.pipSize,
    profile?.account_size,
    profile?.risk_percent,
  ]);

  // Trade validation
  const tradeValidation = useMemo(
    () =>
      validateTrade({
        trade,
        verdict: enrichedVerdict?.verdict,
      }),
    [trade, enrichedVerdict]
  );

  // Warnings
  const warningReasons = useMemo(
    () =>
      computeWarningReasons({
        verdict: enrichedVerdict,
        alignment,
        pathDanger: null,
        blockerBadge: null,
      }),
    [enrichedVerdict, alignment]
  );
  const hasWarnings = warningReasons.length > 0;

  const verdict = premiumDiscountVerdict(enrichedVerdict || baseResult);

  async function handleSave(force = false) {
    if (!enrichedVerdict || !trade) {
      setError("Fill in the zone and close first to compute a trade.");
      return;
    }

    if (hasWarnings && !force) {
      setShowWarningModal(true);
      return;
    }
    setShowWarningModal(false);

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
      setup_type: "premium_discount",
      d1_bias: enrichedVerdict.verdict === "BUY" ? "bullish" : "bearish",
      htf_bias: enrichedVerdict.verdict === "BUY" ? "bullish" : "bearish",
      ema50_position: ema.position !== "unknown" ? ema.position : "above",
      rejection_block_zone: `${form.zoneLow}-${form.zoneHigh}`,
      ce_price: trade.entry,
      use_ce_entry: true,
      checklist_score: 0,
      checklist_passed: false,
      htf_bias_override: form.htfBiasInput,
      sweep_direction: form.sweepDirection,
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
      zone_name: form.zoneName,
      zone_high: form.zoneHigh ? parseFloat(form.zoneHigh) : null,
      zone_low: form.zoneLow ? parseFloat(form.zoneLow) : null,
      ce_price: trade.entry,
      prior_price: form.priorPrice ? parseFloat(form.priorPrice) : null,
      close_price: form.closePrice ? parseFloat(form.closePrice) : null,
      premium_discount: baseResult?.premiumDiscount || sideOfCe,
      zone_position: baseResult?.zonePosition || zonePosition,
      verdict: enrichedVerdict.verdict,
      strength: enrichedVerdict.strength,
      reason: enrichedVerdict.reason,
      entry: trade.entry,
      sl: trade.sl,
      tp: trade.tp,
      lot_size: trade.lotSize,
      risk_amount: trade.riskAmount,
      pip_size: trade.pipSize,
      sl_pips: trade.slPips,
      tp_pips: trade.tpPips,
      atr_current: form.atrCurrent ? parseFloat(form.atrCurrent) : null,
      ema50_price: form.ema50Price ? parseFloat(form.ema50Price) : null,
      ema50_direction: ema.direction,
      ema50_position: ema.position,
      ema50_aligned: alignment?.key === "aligned",
      htf_bias_override: form.htfBiasInput,
      sweep_direction: form.sweepDirection,
      htf_conflict: enrichedVerdict.hasHtfConflict || false,
      sweep_override: enrichedVerdict.hasSweepOverride || false,
      warning_acknowledged: hasWarnings,
      warning_reasons: warningReasons.map((r) => r.key),
      notes: form.notes,
    };

    if (isEdit && existingDetailId) {
      const { error: updErr } = await supabase
        .from("premium_discount_setups")
        .update(detailPayload)
        .eq("id", existingDetailId);
      if (updErr) {
        setError(updErr.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insErr } = await supabase
        .from("premium_discount_setups")
        .insert(detailPayload);
      if (insErr) {
        setError(insErr.message);
        setSaving(false);
        return;
      }
    }

    if (!isEdit) {
      await createTradeFromSetup({
        supabase,
        userId: user.id,
        setupId: setup.id,
        pair: form.pair,
        direction: trade.direction === "BUY" ? "buy" : "sell",
        entry: trade.entry,
        sl: trade.sl,
        tp: trade.tp,
        lotSize: trade.lotSize,
        riskPercent: profile?.risk_percent || 1,
        rr: 2,
        extra: {
          ce_price: trade.entry,
          used_ce_entry: true,
        },
      });
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
              ? "Edit Premium / Discount Setup"
              : "Premium / Discount Negotiation"}
          </h1>
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
              Zone Name
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
                Prior Price
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
                Close Price (verdict)
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
            </div>
          )}
        </div>

        {/* EMA 50 · HTF Bias · Sweep Direction · ATR · Pip */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            EMA 50 · HTF Bias · Sweep Direction · ATR
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                HTF Bias
              </label>
              <select
                value={form.htfBiasInput}
                onChange={(e) => update("htfBiasInput", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                {HTF_BIAS_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.emoji} {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Sweep Direction
              </label>
              <select
                value={form.sweepDirection}
                onChange={(e) => update("sweepDirection", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                {SWEEP_DIRECTION_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.emoji} {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                EMA 50 (current)
              </label>
              <input
                type="number"
                step="any"
                value={form.ema50Price}
                onChange={(e) => update("ema50Price", e.target.value)}
                placeholder="e.g. 209550"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                ATR (current)
              </label>
              <input
                type="number"
                step="any"
                value={form.atrCurrent}
                onChange={(e) => update("atrCurrent", e.target.value)}
                placeholder="e.g. 120"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Pip size
              </label>
              <select
                value={form.pipSize}
                onChange={(e) =>
                  update("pipSize", parseFloat(e.target.value))
                }
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                <option value={0.0001}>0.0001</option>
                <option value={0.001}>0.001</option>
                <option value={0.01}>0.01</option>
                <option value={0.1}>0.1</option>
                <option value={1}>1.0 (VOL)</option>
              </select>
            </div>
          </div>

          {ema.valid && (
            <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs">
                <span className="text-gray-400">EMA bias:</span>{" "}
                <span className={`font-bold ${emaMeta.direction.color}`}>
                  {emaMeta.direction.emoji} {emaMeta.direction.label}
                </span>
              </p>
              <p className="text-xs">
                <span className="text-gray-400">Price position:</span>{" "}
                <span className={`font-bold ${emaMeta.position.color}`}>
                  {emaMeta.position.label}
                </span>
              </p>
              {alignment && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${alignment.color}`}
                >
                  {alignment.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Enriched Verdict */}
        {enrichedVerdict && (
          <div
            className={`p-4 rounded-lg border space-y-2 ${verdict.color}`}
          >
            <p className="text-xs opacity-80">Verdict</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-2xl font-bold">
                {verdict.emoji} {verdict.label}
              </p>
              {enrichedVerdict.strength && (
                <span
                  className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    enrichedVerdict.strength === "strong"
                      ? "bg-green-900/40 text-green-300"
                      : enrichedVerdict.strength === "weak"
                      ? "bg-yellow-900/40 text-yellow-300"
                      : "bg-blue-900/40 text-blue-300"
                  }`}
                >
                  {enrichedVerdict.strength}
                </span>
              )}
              {alignment && (
                <span
                  className={`text-xs px-2 py-1 rounded-full font-semibold ${alignment.color}`}
                >
                  {alignment.label}
                </span>
              )}
            </div>
            <p className="text-sm opacity-90">{verdict.description}</p>
          </div>
        )}

        {/* HTF Conflict Banner */}
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

        {/* Sweep Override Banner */}
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

        {/* Trade Card — SHARED COMPONENT */}
        {trade && (
          <TradeCard
            trade={trade}
            badges={[
              alignment && {
                label: alignment.label,
                className: alignment.color,
              },
            ].filter(Boolean)}
          />
        )}

        {/* Trade validation errors */}
        {!tradeValidation.ok && tradeValidation.errors.length > 0 && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm space-y-1">
            {tradeValidation.errors.map((e, i) => (
              <p key={i}>⚠️ {e}</p>
            ))}
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

        {hasWarnings && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-700 text-red-200 text-xs">
            ⚠️ <strong>Warning:</strong> {warningReasons.length} danger signal
            {warningReasons.length === 1 ? "" : "s"} detected.
          </div>
        )}

        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={saving || !trade}
          className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${
            isEdit
              ? "bg-blue-700 hover:bg-blue-600"
              : enrichedVerdict?.verdict === "BUY"
              ? "bg-green-700 hover:bg-green-600"
              : enrichedVerdict?.verdict === "SELL"
              ? "bg-red-700 hover:bg-red-600"
              : "bg-gray-800"
          }`}
        >
          {saving
            ? "Saving..."
            : isEdit
            ? "✏️ Update Setup"
            : enrichedVerdict?.verdict === "BUY"
            ? "✅ Save BUY Setup"
            : enrichedVerdict?.verdict === "SELL"
            ? "🔴 Save SELL Setup"
            : "Fill zone + close to enable"}
        </button>
      </div>

      {/* WARNING MODAL — SHARED COMPONENT */}
      <WarningModal
        open={showWarningModal}
        warningReasons={warningReasons}
        onCancel={() => setShowWarningModal(false)}
        onConfirm={() => handleSave(true)}
        saving={saving}
      />
    </main>
  );
}