"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import { createTradeFromSetup } from "@/lib/journalEngine";
import { verdictInfo } from "@/lib/rbVerdict";
import {
  CONFIGURATIONS,
  configurationInfo,
  detectConfiguration,
  computeBattleZone,
  computeNegotiationTrade,
  computeNextRBAlignment,
  strengthInfo,
} from "@/lib/negotiationEngine";
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
  resolveHtfBias,
  HTF_BIAS_OPTIONS,
  SWEEP_DIRECTION_OPTIONS,
} from "@/lib/verdictEngine";
import PairPicker from "@/components/PairPicker";
import TradeCard from "@/components/TradeCard";
import WarningModal from "@/components/WarningModal";

export default function NegotiationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "H4",
    configuration: "rb_inside_mss",
    mssDirection: "bullish",
    mssZoneHigh: "",
    mssZoneLow: "",
    rbZoneHigh: "",
    rbZoneLow: "",
    verdictClose: "",
    attempts: 0,
    nestedRbCount: 0,
    nestedMssInRb: false,
    rbFlipped: false,
    nextRbHigh: "",
    nextRbLow: "",
    ema50Price: "",
    htfBiasInput: "auto",
    sweepDirection: "none",
    atrCurrent: "",
    pipSize: 0.01,
    notes: "",
  });

  const [detected, setDetected] = useState(null);
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [existingNegId, setExistingNegId] = useState(null);
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

      const { data: negData } = await supabase
        .from("negotiations")
        .select("*")
        .eq("setup_id", editId)
        .single();

      setForm((f) => ({
        ...f,
        pair: setupData.pair || f.pair,
        timeframe: negData?.timeframe || f.timeframe,
        configuration: negData?.configuration || f.configuration,
        mssDirection: negData?.mss_direction || f.mssDirection,
        mssZoneHigh: negData?.mss_zone_high?.toString() || "",
        mssZoneLow: negData?.mss_zone_low?.toString() || "",
        rbZoneHigh: negData?.rb_zone_high?.toString() || "",
        rbZoneLow: negData?.rb_zone_low?.toString() || "",
        verdictClose: negData?.verdict_close?.toString() || "",
        attempts: negData?.attempts || 0,
        nestedRbCount: negData?.nested_rb_count || 0,
        nestedMssInRb: negData?.nested_mss_in_rb || false,
        rbFlipped: negData?.rb_flipped || false,
        nextRbHigh: negData?.next_rb_high?.toString() || "",
        nextRbLow: negData?.next_rb_low?.toString() || "",
        ema50Price: setupData.ema50_price?.toString() || "",
        htfBiasInput: setupData.htf_bias_override || "auto",
        sweepDirection: setupData.sweep_direction || "none",
        atrCurrent: negData?.atr_current?.toString() || "",
        pipSize: negData?.pip_size || 0.01,
        notes: setupData.notes || "",
      }));

      setExistingNegId(negData?.id || null);
      setLoadingEdit(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  useEffect(() => {
    if (
      form.mssZoneHigh &&
      form.mssZoneLow &&
      form.rbZoneHigh &&
      form.rbZoneLow
    ) {
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

  const battle = computeBattleZone({
    mssZoneHigh: form.mssZoneHigh,
    mssZoneLow: form.mssZoneLow,
    rbZoneHigh: form.rbZoneHigh,
    rbZoneLow: form.rbZoneLow,
    verdictClose: form.verdictClose,
    attempts: form.attempts,
  });

  const tradeDirection =
    battle.state === "bullish_confirmed"
      ? "BUY"
      : battle.state === "bearish_confirmed"
      ? "SELL"
      : null;

  // EMA
  const ema = computeEmaDirection({
    emaPrice: form.ema50Price,
    closePrice: form.verdictClose,
  });
  const emaMeta = emaInfo(ema);

  // Base negotiation trade (from the negotiation engine)
  const baseTrade = computeNegotiationTrade({
    direction: tradeDirection,
    mssDirection: form.mssDirection,
    rbZoneHigh: form.rbZoneHigh,
    rbZoneLow: form.rbZoneLow,
    mssZoneHigh: form.mssZoneHigh,
    mssZoneLow: form.mssZoneLow,
    accountSize: profile?.account_size || 0,
    riskPercent: profile?.risk_percent || 1,
  });

  // Shared trade calculator — consistent output
  const sharedTrade = useMemo(() => {
    if (!tradeDirection || !form.rbZoneHigh || !form.rbZoneLow) return null;
    const rbHigh = parseFloat(form.rbZoneHigh);
    const rbLow = parseFloat(form.rbZoneLow);
    if (isNaN(rbHigh) || isNaN(rbLow)) return null;
    const ce = Math.round(((rbHigh + rbLow) / 2) * 100) / 100;
    const slRef = tradeDirection === "BUY" ? rbLow : rbHigh;
    return computeTrade({
      direction: tradeDirection,
      entry: ce,
      slReference: slRef,
      atr: parseFloat(form.atrCurrent) || 0,
      accountSize: profile?.account_size || 0,
      riskPercent: profile?.risk_percent || 1,
      pipSize: parseFloat(form.pipSize) || 0.01,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tradeDirection,
    form.rbZoneHigh,
    form.rbZoneLow,
    form.atrCurrent,
    form.pipSize,
    profile?.account_size,
    profile?.risk_percent,
  ]);

  const trade = sharedTrade || baseTrade;

  // Base verdict from battle state
  const baseVerdict = useMemo(() => {
    if (!trade) return null;
    const verdictStr =
      trade.direction === "BUY"
        ? "BUY"
        : trade.direction === "SELL"
        ? "SELL"
        : null;
    if (!verdictStr) return null;
    return {
      verdict: verdictStr,
      strength: "normal",
      reason: battle.description || "Battle Zone confirmed.",
    };
  }, [trade, battle]);

  // Enrich with EMA + HTF + Sweep
  const enrichedVerdict = useMemo(
    () =>
      enrichVerdict({
        verdict: baseVerdict,
        ema,
        htfBiasInput: form.htfBiasInput,
        sweepDirection: form.sweepDirection,
      }),
    [baseVerdict, ema, form.htfBiasInput, form.sweepDirection]
  );

  const alignment = enrichedVerdict?.emaAlignment;
  const strength = enrichedVerdict
    ? strengthInfo(enrichedVerdict.strength)
    : null;

  // Trade validation
  const tradeValidation = useMemo(
    () =>
      validateTrade({
        trade,
        verdict: enrichedVerdict?.verdict,
      }),
    [trade, enrichedVerdict]
  );

  // Warning reasons
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

  const nextRbAlignment = trade
    ? computeNextRBAlignment({
        direction: trade.direction,
        takeProfit: trade.tp,
        nextRbHigh: form.nextRbHigh,
        nextRbLow: form.nextRbLow,
      })
    : null;

  const configInfo = configurationInfo(form.configuration);

  const canEnter =
    battle.state === "bullish_confirmed" ||
    battle.state === "bearish_confirmed";

  async function handleSave(force = false) {
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

    const direction =
      tradeDirection ||
      (form.mssDirection === "bullish" ? "bullish" : "bearish");

    const setupPayload = {
      user_id: user.id,
      pair: form.pair,
      setup_type: "negotiation",
      d1_bias: direction === "SELL" ? "bearish" : "bullish",
      htf_bias: direction === "SELL" ? "bearish" : "bullish",
      ema50_position: ema.position !== "unknown" ? ema.position : "above",
      rejection_block_zone: `${form.rbZoneLow}-${form.rbZoneHigh}`,
      ce_price: trade?.entry || null,
      use_ce_entry: true,
      rb_verdict: battle.state,
      rb_verdict_price: form.verdictClose
        ? parseFloat(form.verdictClose)
        : null,
      rb_verdict_at: form.verdictClose ? new Date().toISOString() : null,
      rb_attempts: form.attempts,
      next_rb_high: form.nextRbHigh ? parseFloat(form.nextRbHigh) : null,
      next_rb_low: form.nextRbLow ? parseFloat(form.nextRbLow) : null,
      next_rb_alignment: nextRbAlignment?.state || null,
      htf_bias_override: form.htfBiasInput,
      sweep_direction: form.sweepDirection,
      notes:
        form.notes ||
        `Battle Zone: ${configInfo?.label || form.configuration}`,
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

    const negPayload = {
      user_id: user.id,
      setup_id: setup.id,
      pair: form.pair,
      timeframe: form.timeframe,
      configuration: form.configuration,
      mss_direction: form.mssDirection,
      mss_zone_high: form.mssZoneHigh ? parseFloat(form.mssZoneHigh) : null,
      mss_zone_low: form.mssZoneLow ? parseFloat(form.mssZoneLow) : null,
      rb_zone_high: form.rbZoneHigh ? parseFloat(form.rbZoneHigh) : null,
      rb_zone_low: form.rbZoneLow ? parseFloat(form.rbZoneLow) : null,
      ce_price: trade?.entry || null,
      verdict_close: form.verdictClose
        ? parseFloat(form.verdictClose)
        : null,
      verdict: battle.state,
      attempts: form.attempts,
      verdict_flipped: battle.state === "bearish_confirmed",
      strength: enrichedVerdict?.strength || null,
      next_rb_high: form.nextRbHigh ? parseFloat(form.nextRbHigh) : null,
      next_rb_low: form.nextRbLow ? parseFloat(form.nextRbLow) : null,
      next_rb_alignment: nextRbAlignment?.state || null,
      entry: trade?.entry || null,
      sl: trade?.sl || null,
      tp: trade?.tp || null,
      lot_size: trade?.lotSize || null,
      risk_amount: trade?.riskAmount || null,
      pip_size: trade?.pipSize || null,
      sl_pips: trade?.slPips || null,
      tp_pips: trade?.tpPips || null,
      atr_current: form.atrCurrent ? parseFloat(form.atrCurrent) : null,
      ema50_price: form.ema50Price ? parseFloat(form.ema50Price) : null,
      ema50_direction: ema.direction,
      ema50_position: ema.position,
      ema50_aligned: alignment?.key === "aligned",
      htf_bias_override: form.htfBiasInput,
      sweep_direction: form.sweepDirection,
      htf_conflict: enrichedVerdict?.hasHtfConflict || false,
      sweep_override: enrichedVerdict?.hasSweepOverride || false,
      warning_acknowledged: hasWarnings,
      warning_reasons: warningReasons.map((r) => r.key),
      notes: form.notes,
    };

    if (isEdit && existingNegId) {
      const { error: updErr } = await supabase
        .from("negotiations")
        .update(negPayload)
        .eq("id", existingNegId);
      if (updErr) {
        setError(updErr.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insErr } = await supabase
        .from("negotiations")
        .insert(negPayload);
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
        direction: trade?.direction === "BUY" ? "buy" : "sell",
        entry: trade?.entry,
        sl: trade?.sl,
        tp: trade?.tp,
        lotSize: trade?.lotSize,
        riskPercent: profile?.risk_percent || 1,
        rr: 2,
        extra: {
          ce_price: trade?.entry || null,
          used_ce_entry: true,
          rb_verdict: battle.state,
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
            {isEdit ? "Edit Negotiation Setup" : "Negotiation Setup"}
          </h1>
          <p className="text-gray-400 text-sm">
            The Battle Zone — MSS vs RB, close decides the verdict
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
                ✅ Matches auto-detection
              </p>
            </div>
          )}
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
            MSS Zone (Bulls' Stronghold)
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
            RB Zone (Bears' Stronghold)
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
        </div>

        {/* Battle Zone Visual */}
        {form.mssZoneHigh &&
          form.mssZoneLow &&
          form.rbZoneHigh &&
          form.rbZoneLow && (
            <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
              <h2 className="text-sm font-semibold text-blue-400">
                ⚔️ The Battle Zone
              </h2>
              <div className={`p-3 rounded-lg border-2 ${battle.color}`}>
                <p className="text-sm font-bold">
                  {battle.emoji} {battle.label}
                </p>
                <p className="text-xs opacity-90 mt-1">
                  {battle.description}
                </p>
              </div>
            </div>
          )}

        {/* CE Display */}
        {form.rbZoneHigh && form.rbZoneLow && (
          <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-950/40 to-amber-900/30 border-2 border-yellow-700 space-y-2">
            <h2 className="text-sm font-semibold text-yellow-300 uppercase tracking-wider">
              ⭐ CE — The Negotiation Line
            </h2>
            <p className="text-3xl font-bold tabular-nums text-yellow-200">
              {formatPrice(
                (parseFloat(form.rbZoneHigh) +
                  parseFloat(form.rbZoneLow)) /
                  2
              )}
            </p>
          </div>
        )}

        {/* Verdict Close Input */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            The Verdict Close
          </h2>
          <input
            type="number"
            step="any"
            value={form.verdictClose}
            onChange={(e) => update("verdictClose", e.target.value)}
            placeholder="e.g. 209400"
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
          />

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
                attempts by the defender
              </span>
            </div>
          </div>
        </div>

        {/* EMA 50 · HTF Bias · Sweep Direction */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            EMA 50 · HTF Bias · Sweep Direction
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
            className={`p-4 rounded-lg border space-y-2 ${
              enrichedVerdict.verdict === "BUY"
                ? "bg-green-950/50 border-green-600 text-green-200"
                : enrichedVerdict.verdict === "SELL"
                ? "bg-red-950/50 border-red-600 text-red-200"
                : "bg-yellow-950/40 border-yellow-700 text-yellow-200"
            }`}
          >
            <p className="text-xs opacity-80">Verdict</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-2xl font-bold">
                {enrichedVerdict.verdict === "BUY" ? "🟢" : "🔴"}{" "}
                {enrichedVerdict.verdict}
              </p>
              {strength && (
                <span
                  className={`text-xs px-2 py-1 rounded-full font-semibold ${strength.color}`}
                >
                  {strength.emoji} {strength.label}
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
            <p className="text-sm opacity-90">{enrichedVerdict.reason}</p>
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

        {/* Next RB Alignment */}
        {trade && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <h2 className="text-sm font-semibold text-blue-400">
              Next RB Target
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1 text-gray-400">
                  Next RB Low
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.nextRbLow}
                  onChange={(e) => update("nextRbLow", e.target.value)}
                  placeholder="e.g. 194000"
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-400">
                  Next RB High
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.nextRbHigh}
                  onChange={(e) => update("nextRbHigh", e.target.value)}
                  placeholder="e.g. 194500"
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
                />
              </div>
            </div>

            {nextRbAlignment && nextRbAlignment.state !== "none" && (
              <div
                className={`p-3 rounded-lg border-2 ${nextRbAlignment.color}`}
              >
                <p className="text-sm font-bold">
                  {nextRbAlignment.emoji} {nextRbAlignment.label}
                </p>
                <p className="text-xs opacity-90 mt-1">
                  {nextRbAlignment.description}
                </p>
              </div>
            )}
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
            {warningReasons.length === 1 ? "" : "s"} detected. The Save button
            will show a confirmation.
          </div>
        )}

        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={saving || !trade}
          className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${
            canEnter
              ? "bg-green-700 hover:bg-green-600"
              : "bg-yellow-800 hover:bg-yellow-700"
          }`}
        >
          {saving
            ? "Saving..."
            : isEdit
            ? "✏️ Update Setup"
            : canEnter
            ? "✅ Save & Trade"
            : "💾 Save (Battle In Progress)"}
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