"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import { createTradeFromSetup } from "@/lib/journalEngine";
import {
  computeUpperWickZone,
  computeLowerWickZone,
  computeCe,
  rankRejectionBlocks,
  rbRankInfo,
  findActiveRb,
  judgeZoneNegotiation,
  premiumDiscountVerdict,
  atrFilter,
  LIQUIDITY_ZONE_CHECKLIST,
  LIQUIDITY_ZONE_PASS_THRESHOLD,
  computeChecklistScore,
  zoneChecklistVerdict,
} from "@/lib/liquidityZoneEngine";
import { computeTrade, validateTrade } from "@/lib/tradeCalculator";
import {
  computeEmaDirection,
  emaInfo,
  emaAlignment,
  enrichVerdict,
  computeWarningReasons,
  HTF_BIAS_OPTIONS,
  SWEEP_DIRECTION_OPTIONS,
} from "@/lib/verdictEngine";
import { computeIrlErl } from "@/lib/irlErlEngine";
import PairPicker from "@/components/PairPicker";
import TradeCard from "@/components/TradeCard";
import WarningModal from "@/components/WarningModal";
import DealingRangeCard from "@/components/DealingRangeCard";

function emptyCandle() {
  return { type: "green", open: "", close: "", wickTip: "" };
}
function emptyRb() {
  return { id: Math.random().toString(36).slice(2), high: "", low: "" };
}

export default function LiquidityZonePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "H4",
    zoneKind: "upper",
    closePrice: "",
    ema50Price: "",
    htfBiasInput: "auto",
    sweepDirection: "none",
    atrCurrent: "",
    atrPrior: "",
    pipSize: 1,
    notes: "",
  });

  const [candles, setCandles] = useState([emptyCandle(), emptyCandle()]);
  const [rbs, setRbs] = useState([emptyRb()]);
  const [manualAnswers, setManualAnswers] = useState({});
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [existingZoneId, setExistingZoneId] = useState(null);
  const [existingZoneInfo, setExistingZoneInfo] = useState(null);
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

      const { data: zoneData } = await supabase
        .from("liquidity_zones")
        .select("*")
        .eq("setup_id", editId)
        .single();

      const { data: rbData } = await supabase
        .from("liquidity_zone_rbs")
        .select("*")
        .eq("zone_id", zoneData?.id)
        .order("created_at", { ascending: false });

      setForm((f) => ({
        ...f,
        pair: setupData.pair || f.pair,
        timeframe: zoneData?.timeframe || f.timeframe,
        zoneKind: zoneData?.zone_kind || f.zoneKind,
        closePrice: zoneData?.close_price?.toString() || "",
        ema50Price: setupData.ema50_price?.toString() || "",
        htfBiasInput: setupData.htf_bias_override || "auto",
        sweepDirection: setupData.sweep_direction || "none",
        atrCurrent: zoneData?.atr_current?.toString() || "",
        atrPrior: zoneData?.atr_prior?.toString() || "",
        pipSize: zoneData?.pip_size || 1,
        notes: setupData.notes || "",
      }));

      if (rbData && rbData.length > 0) {
        const restoredRbs = rbData.map((rb, idx) => ({
          id: Math.random().toString(36).slice(2),
          high: rb.rb_high?.toString() || "",
          low: rb.rb_low?.toString() || "",
          addedAt:
            rb.created_at || new Date(Date.now() - idx * 1000).toISOString(),
        }));
        setRbs(restoredRbs);
      }

      if (zoneData?.checklist_answers) {
        const savedAns = zoneData.checklist_answers;
        const manual = {};
        Object.keys(savedAns).forEach((k) => {
          if (savedAns[k] === true) manual[k] = true;
        });
        setManualAnswers(manual);
      }

      setExistingZoneId(zoneData?.id || null);
      setExistingZoneInfo({
        zone_high: zoneData?.zone_high,
        zone_low: zoneData?.zone_low,
        zone_ce: zoneData?.zone_ce,
        candle_count: zoneData?.candle_count,
      });
      setLoadingEdit(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function updateCandle(index, field, value) {
    setCandles((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }
  function addCandle() {
    setCandles((prev) => [...prev, emptyCandle()]);
  }
  function removeCandle(index) {
    setCandles((prev) => prev.filter((_, i) => i !== index));
  }
  function updateRb(id, field, value) {
    setRbs((prev) =>
      prev.map((rb) => (rb.id === id ? { ...rb, [field]: value } : rb))
    );
  }
  function addRb() {
    setRbs((prev) => [...prev, emptyRb()]);
  }
  function removeRb(id) {
    setRbs((prev) => prev.filter((rb) => rb.id !== id));
  }

  const zone = useMemo(() => {
    return form.zoneKind === "upper"
      ? computeUpperWickZone(candles)
      : computeLowerWickZone(candles);
  }, [candles, form.zoneKind]);

  const zoneCe = zone ? computeCe(zone.zoneHigh, zone.zoneLow) : null;

  const rankedRbs = useMemo(() => {
    const cleaned = rbs
      .map((rb) => ({
        id: rb.id,
        high: parseFloat(rb.high),
        low: parseFloat(rb.low),
        addedAt: rb.addedAt || new Date().toISOString(),
      }))
      .filter((rb) => !isNaN(rb.high) && !isNaN(rb.low));
    return rankRejectionBlocks(cleaned);
  }, [rbs]);

  const activeRb = useMemo(() => {
    if (!form.closePrice) return rankedRbs[0] || null;
    return findActiveRb(rankedRbs, form.closePrice);
  }, [rankedRbs, form.closePrice]);

  const activeRbCe = activeRb ? computeCe(activeRb.high, activeRb.low) : null;

  const baseNegotiation = activeRb
    ? judgeZoneNegotiation({ activeRb, closePrice: form.closePrice })
    : null;

  const ema = computeEmaDirection({
    emaPrice: form.ema50Price,
    closePrice: form.closePrice,
  });
  const emaMeta = emaInfo(ema);

  const enrichedVerdict = useMemo(() => {
    if (!baseNegotiation) return null;
    const base = {
      verdict: baseNegotiation.verdict,
      strength: baseNegotiation.strength || "normal",
      reason: baseNegotiation.reason || "",
    };
    return enrichVerdict({
      verdict: base,
      ema,
      htfBiasInput: form.htfBiasInput,
      sweepDirection: form.sweepDirection,
    });
  }, [baseNegotiation, ema, form.htfBiasInput, form.sweepDirection]);

  const alignment = enrichedVerdict?.emaAlignment;

  const atr = atrFilter(form.atrCurrent, form.atrPrior);

  const autoAnswers = {
    zone_present: !!zone,
    rbs_marked: rankedRbs.length > 0,
    current_rb_prioritized: rankedRbs.length > 0,
    ce_calculated: activeRbCe !== null,
    atr_ok: atr.tradeable,
    price_entered: !!form.closePrice,
    price_at_rb_ce: !!activeRbCe && !!form.closePrice,
    body_closed: !!form.closePrice,
    close_clear:
      !!enrichedVerdict && enrichedVerdict.verdict !== "WAIT",
    risk_ok: false,
  };

  const combinedAnswers = {};
  LIQUIDITY_ZONE_CHECKLIST.forEach((q) => {
    combinedAnswers[q.key] =
      manualAnswers[q.key] !== undefined
        ? manualAnswers[q.key]
        : autoAnswers[q.key] || false;
  });

  const score = computeChecklistScore(combinedAnswers);
  const checklistVerdict = zoneChecklistVerdict(score);

  function toggleManual(key) {
    setManualAnswers((prev) => ({
      ...prev,
      [key]: !combinedAnswers[key],
    }));
  }

  const trade = useMemo(() => {
    if (!enrichedVerdict || !activeRb) return null;
    const v = enrichedVerdict.verdict;
    if (v !== "BUY" && v !== "SELL") return null;
    const rbHigh = parseFloat(activeRb.high);
    const rbLow = parseFloat(activeRb.low);
    if (isNaN(rbHigh) || isNaN(rbLow)) return null;
    const ceVal = Math.round(((rbHigh + rbLow) / 2) * 100) / 100;
    const slRef = v === "BUY" ? rbLow : rbHigh;
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
    activeRb,
    form.atrCurrent,
    form.pipSize,
    profile?.account_size,
    profile?.risk_percent,
  ]);

  const tradeValidation = useMemo(
    () =>
      validateTrade({
        trade,
        verdict: enrichedVerdict?.verdict,
      }),
    [trade, enrichedVerdict]
  );

  const warningReasons = useMemo(
    () =>
      computeWarningReasons({
        verdict: enrichedVerdict,
        alignment,
        pathDanger: null,
        blockerBadge: null,
        extraReasons:
          !checklistVerdict.passed && score < LIQUIDITY_ZONE_PASS_THRESHOLD
            ? [
                {
                  key: "checklist_fail",
                  label: `Checklist failed (${score}/10)`,
                  detail: `Need at least ${LIQUIDITY_ZONE_PASS_THRESHOLD} checks — currently ${score}.`,
                },
              ]
            : [],
      }),
    [enrichedVerdict, alignment, checklistVerdict, score]
  );
  const hasWarnings = warningReasons.length > 0;

  const irlErl = useMemo(() => {
    if (!trade || !form.closePrice || !activeRb) return null;
    return computeIrlErl({
      currentZone: {
        high: activeRb.high,
        low: activeRb.low,
        label: "Active RB",
      },
      nextZone: null,
      closePrice: form.closePrice,
      trade,
    });
  }, [trade, form.closePrice, activeRb]);

  async function handleSave(force = false) {
    if (!enrichedVerdict || !trade || !activeRb) {
      setError("Fill in the zone, at least one RB, and close price first.");
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
      setup_type: "liquidity_zone",
      d1_bias: enrichedVerdict.verdict === "BUY" ? "bullish" : "bearish",
      htf_bias: enrichedVerdict.verdict === "BUY" ? "bullish" : "bearish",
      ema50_position: ema.position !== "unknown" ? ema.position : "above",
      rejection_block_zone: `${activeRb.low}-${activeRb.high}`,
      ce_price: trade.entry,
      use_ce_entry: true,
      checklist_score: score,
      checklist_passed: checklistVerdict.passed,
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

    const zonePayload = {
      user_id: user.id,
      setup_id: setup.id,
      pair: form.pair,
      timeframe: form.timeframe,
      zone_kind: form.zoneKind,
      zone_high: zone?.zoneHigh || existingZoneInfo?.zone_high || null,
      zone_low: zone?.zoneLow || existingZoneInfo?.zone_low || null,
      zone_ce: zoneCe ?? existingZoneInfo?.zone_ce ?? null,
      candle_count: zone?.count || existingZoneInfo?.candle_count || 0,
      close_price: form.closePrice ? parseFloat(form.closePrice) : null,
      active_rb_high: activeRb.high,
      active_rb_low: activeRb.low,
      active_rb_ce: trade.entry,
      premium_discount: baseNegotiation?.side || null,
      verdict: enrichedVerdict.verdict,
      entry: trade.entry,
      sl: trade.sl,
      tp: trade.tp,
      lot_size: trade.lotSize,
      risk_amount: trade.riskAmount,
      pip_size: trade.pipSize,
      sl_pips: trade.slPips,
      tp_pips: trade.tpPips,
      atr_current: form.atrCurrent ? parseFloat(form.atrCurrent) : null,
      atr_prior: form.atrPrior ? parseFloat(form.atrPrior) : null,
      atr_state:
        atr.key === "unknown" || atr.key === "invalid" ? "unknown" : atr.key,
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
      checklist_score: score,
      checklist_passed: checklistVerdict.passed,
      checklist_answers: combinedAnswers,
      dealing_high: irlErl?.range?.dealingHigh || null,
      dealing_low: irlErl?.range?.dealingLow || null,
      dealing_ce: irlErl?.range?.dealingCe || null,
      irl_high: irlErl?.irl?.high || null,
      irl_low: irlErl?.irl?.low || null,
      irl_ce: irlErl?.irl?.ce || null,
      erl_price: irlErl?.erl?.price || null,
      irl_erl_aligned: irlErl?.aligned || false,
      notes: form.notes,
    };

    let zoneRow;
    if (isEdit && existingZoneId) {
      const { data, error: updErr } = await supabase
        .from("liquidity_zones")
        .update(zonePayload)
        .eq("id", existingZoneId)
        .select()
        .single();
      if (updErr) {
        setError(updErr.message);
        setSaving(false);
        return;
      }
      zoneRow = data;
      await supabase
        .from("liquidity_zone_rbs")
        .delete()
        .eq("zone_id", existingZoneId);
    } else {
      const { data, error: insErr } = await supabase
        .from("liquidity_zones")
        .insert(zonePayload)
        .select()
        .single();
      if (insErr) {
        setError(insErr.message);
        setSaving(false);
        return;
      }
      zoneRow = data;
    }

    const rbRows = rankedRbs.map((rb) => ({
      user_id: user.id,
      zone_id: zoneRow.id,
      pair: form.pair,
      rb_high: rb.high,
      rb_low: rb.low,
      rb_ce: computeCe(rb.high, rb.low),
      rank: rb.rank,
      is_active: rb.id === activeRb.id,
    }));

    const { error: rbError } = await supabase
      .from("liquidity_zone_rbs")
      .insert(rbRows);

    if (rbError) {
      setError(rbError.message);
      setSaving(false);
      return;
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
              ? "Edit Liquidity Zone"
              : "Liquidity Zone Negotiation"}
          </h1>
          <p className="text-gray-400 text-sm">
            A stack of rejected wicks — multiple RBs, one CE, one verdict
          </p>
        </div>

        {isEdit && existingZoneInfo && (
          <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900">
            <p className="text-xs text-blue-300 font-semibold mb-1">
              Stored zone
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-gray-500">Zone High</p>
                <p className="font-bold tabular-nums text-purple-300">
                  {existingZoneInfo.zone_high ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Zone Low</p>
                <p className="font-bold tabular-nums text-orange-300">
                  {existingZoneInfo.zone_low ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Zone CE</p>
                <p className="font-bold tabular-nums text-blue-300">
                  {existingZoneInfo.zone_ce ?? "—"}
                </p>
              </div>
            </div>
          </div>
        )}

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

          <div>
            <label className="block text-xs mb-2 text-gray-400">
              Zone Kind
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => update("zoneKind", "upper")}
                className={`py-2 rounded-lg text-sm transition ${
                  form.zoneKind === "upper"
                    ? "bg-purple-900/40 border border-purple-600 text-purple-200 font-bold"
                    : "bg-black border border-gray-800 text-gray-400"
                }`}
              >
                🔺 Upper Wick Zone
              </button>
              <button
                type="button"
                onClick={() => update("zoneKind", "lower")}
                className={`py-2 rounded-lg text-sm transition ${
                  form.zoneKind === "lower"
                    ? "bg-orange-900/40 border border-orange-600 text-orange-200 font-bold"
                    : "bg-black border border-gray-800 text-gray-400"
                }`}
              >
                🔻 Lower Wick Zone
              </button>
            </div>
          </div>
        </div>

        {/* Candles */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-blue-400">
              Candles (building the zone)
            </h2>
            <button
              type="button"
              onClick={addCandle}
              className="text-xs px-2 py-1 rounded bg-blue-900/40 text-blue-300 hover:bg-blue-800/40"
            >
              + Add candle
            </button>
          </div>

          <div className="space-y-2">
            {candles.map((c, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-2 items-end bg-black p-2 rounded border border-gray-800"
              >
                <div className="col-span-2">
                  <label className="block text-xs mb-1 text-gray-500">
                    Type
                  </label>
                  <select
                    value={c.type}
                    onChange={(e) => updateCandle(i, "type", e.target.value)}
                    className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs"
                  >
                    <option value="green">🟢 Green</option>
                    <option value="red">🔴 Red</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-xs mb-1 text-gray-500">
                    Open
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={c.open}
                    onChange={(e) => updateCandle(i, "open", e.target.value)}
                    className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs mb-1 text-gray-500">
                    Close
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={c.close}
                    onChange={(e) => updateCandle(i, "close", e.target.value)}
                    className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs mb-1 text-gray-500">
                    {form.zoneKind === "upper"
                      ? "Upper Wick Tip"
                      : "Lower Wick Tip"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={c.wickTip}
                    onChange={(e) => updateCandle(i, "wickTip", e.target.value)}
                    className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs"
                  />
                </div>
                <div className="col-span-1 text-right">
                  {candles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCandle(i)}
                      className="text-red-400 text-xs hover:text-red-300"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {zone && (
            <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900 space-y-1">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Zone High</p>
                  <p className="font-bold tabular-nums text-purple-300">
                    {formatPrice(zone.zoneHigh)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Zone Low</p>
                  <p className="font-bold tabular-nums text-orange-300">
                    {formatPrice(zone.zoneLow)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Zone CE</p>
                  <p className="font-bold tabular-nums text-blue-300">
                    {zoneCe !== null ? formatPrice(zoneCe) : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rejection Blocks */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-blue-400">
              Rejection Blocks (ranked)
            </h2>
            <button
              type="button"
              onClick={addRb}
              className="text-xs px-2 py-1 rounded bg-blue-900/40 text-blue-300 hover:bg-blue-800/40"
            >
              + Add RB
            </button>
          </div>

          <div className="space-y-2">
            {rbs.map((rb) => {
              const ranked = rankedRbs.find((x) => x.id === rb.id);
              const rank = ranked ? rbRankInfo(ranked.rank) : null;
              const isActive = activeRb && activeRb.id === rb.id;

              return (
                <div
                  key={rb.id}
                  className={`grid grid-cols-12 gap-2 items-end p-2 rounded border ${
                    isActive
                      ? "bg-green-950/20 border-green-700 ring-1 ring-green-700"
                      : "bg-black border-gray-800"
                  }`}
                >
                  <div className="col-span-2">
                    {rank && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full border ${rank.color}`}
                      >
                        {rank.emoji}
                      </span>
                    )}
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs mb-1 text-gray-500">
                      RB Low
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={rb.low}
                      onChange={(e) => updateRb(rb.id, "low", e.target.value)}
                      className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs mb-1 text-gray-500">
                      RB High
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={rb.high}
                      onChange={(e) => updateRb(rb.id, "high", e.target.value)}
                      className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs"
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    {rbs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRb(rb.id)}
                        className="text-red-400 text-xs hover:text-red-300"
                      >
                        ✕
                      </button>
                    )}
                    {isActive && (
                      <span className="block text-xs text-green-400 font-semibold mt-1">
                        active
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* EMA + HTF + Sweep + Close + ATR */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            EMA 50 · HTF Bias · Sweep · Negotiation
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Close Price (verdict)
              </label>
              <input
                type="number"
                step="any"
                value={form.closePrice}
                onChange={(e) => update("closePrice", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
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
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                ATR current
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
                ATR prior
              </label>
              <input
                type="number"
                step="any"
                value={form.atrPrior}
                onChange={(e) => update("atrPrior", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Pip size
              </label>
              <select
                value={form.pipSize}
                onChange={(e) => update("pipSize", parseFloat(e.target.value))}
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
                {enrichedVerdict.verdict === "BUY"
                  ? "🟢"
                  : enrichedVerdict.verdict === "SELL"
                  ? "🔴"
                  : "⚠️"}{" "}
                {enrichedVerdict.verdict}
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
              <span
                className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  checklistVerdict.passed
                    ? "bg-green-900/40 text-green-300"
                    : "bg-yellow-900/40 text-yellow-300"
                }`}
              >
                Checklist {score}/10
              </span>
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

        {/* Trade Card */}
        {trade && (
          <TradeCard
            trade={trade}
            badges={[
              alignment && { label: alignment.label, className: alignment.color },
            ].filter(Boolean)}
          />
        )}

        {/* IRL / ERL Dealing Range Card */}
        {irlErl && <DealingRangeCard data={irlErl} />}

        {/* Trade validation errors */}
        {!tradeValidation.ok && tradeValidation.errors.length > 0 && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm space-y-1">
            {tradeValidation.errors.map((e, i) => (
              <p key={i}>⚠️ {e}</p>
            ))}
          </div>
        )}

        {/* Checklist */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-blue-400">
              The 10-Question Checklist
            </h2>
            <p
              className={`text-xl font-bold ${
                checklistVerdict.passed ? "text-green-400" : "text-yellow-400"
              }`}
            >
              {score}/10
            </p>
          </div>

          <div className="space-y-2">
            {LIQUIDITY_ZONE_CHECKLIST.map((q) => {
              const isOn = combinedAnswers[q.key];
              const isAuto = autoAnswers[q.key];
              const isManual = manualAnswers[q.key] !== undefined;

              return (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => toggleManual(q.key)}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    isOn
                      ? "bg-green-900/40 border-green-700"
                      : "bg-black border-gray-800 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                        isOn
                          ? "bg-green-500 border-green-500"
                          : "border-gray-600"
                      }`}
                    >
                      {isOn && (
                        <span className="text-black text-xs font-bold">✓</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={`text-sm font-medium ${
                            isOn ? "text-green-200" : "text-white"
                          }`}
                        >
                          {q.number}. {q.label}
                        </p>
                        {isAuto && !isManual && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300">
                            auto
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{q.hint}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

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
            checklistVerdict.passed
              ? "bg-green-700 hover:bg-green-600"
              : "bg-yellow-800 hover:bg-yellow-700"
          }`}
        >
          {saving
            ? "Saving..."
            : isEdit
            ? `✏️ Update Setup (${score}/10)`
            : checklistVerdict.passed
            ? `✅ Save & Trade (${score}/10)`
            : `💾 Save (${score}/10 — Needs ${
                LIQUIDITY_ZONE_PASS_THRESHOLD - score
              } More)`}
        </button>
      </div>

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