"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import { createTradeFromSetup } from "@/lib/journalEngine";
import {
  SEQUENCE_TYPES,
  evaluateLiquiditySequence,
  checkRbAlignment,
  checkFVG,
} from "@/lib/liquiditySequenceEngine";
import {
  computeCe,
  rankRejectionBlocks,
  rbRankInfo,
  findActiveRb,
  judgeZoneNegotiation,
  atrFilter,
} from "@/lib/liquidityZoneEngine";
import {
  computeEmaDirection,
  emaInfo,
  emaAlignment,
  enrichVerdict,
  computeWarningReasons,
  HTF_BIAS_OPTIONS,
  SWEEP_DIRECTION_OPTIONS,
} from "@/lib/verdictEngine";
import { computeTrade, validateTrade } from "@/lib/tradeCalculator";
import { computeIrlErl } from "@/lib/irlErlEngine";
import PairPicker from "@/components/PairPicker";
import WarningModal from "@/components/WarningModal";
import LiquiditySequenceCard from "@/components/LiquiditySequenceCard";

function emptyCandle() {
  return { open: "", high: "", low: "", close: "" };
}
function emptyRb() {
  return { id: Math.random().toString(36).slice(2), high: "", low: "" };
}

export default function LiquiditySequencePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "H4",
    sequenceType: "support",
    liquidityZoneHigh: "",
    liquidityZoneLow: "",
    mssReference: "",
    fvgHigh: "",
    fvgLow: "",
    nextLiquidityLevel: "",
    closePrice: "",
    ema50Price: "",
    htfBiasInput: "auto",
    sweepDirection: "none",
    atrCurrent: "",
    atrPrior: "",
    pipSize: 1,
    notes: "",
  });

  const [sweepCandle, setSweepCandle] = useState(emptyCandle());
  const [closeCandle, setCloseCandle] = useState(emptyCandle());
  const [rbs, setRbs] = useState([emptyRb()]);

  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [existingSequenceId, setExistingSequenceId] = useState(null);
  const [existingSetupId, setExistingSetupId] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // ----------------------------------------------------------
  // LOAD
  // ----------------------------------------------------------
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

      const { data: seqData } = await supabase
        .from("liquidity_sequence_setups")
        .select("*")
        .eq("setup_id", editId)
        .single();

      const { data: rbData } = await supabase
        .from("liquidity_sequence_rbs")
        .select("*")
        .eq("sequence_id", seqData?.id)
        .order("created_at", { ascending: false });

      setForm((f) => ({
        ...f,
        pair: setupData.pair || f.pair,
        timeframe: seqData?.timeframe || f.timeframe,
        sequenceType: seqData?.sequence_type || f.sequenceType,
        liquidityZoneHigh:
          seqData?.liquidity_zone_high?.toString() || "",
        liquidityZoneLow: seqData?.liquidity_zone_low?.toString() || "",
        mssReference: seqData?.mss_reference?.toString() || "",
        fvgHigh: seqData?.fvg_high?.toString() || "",
        fvgLow: seqData?.fvg_low?.toString() || "",
        nextLiquidityLevel:
          seqData?.next_liquidity_level?.toString() || "",
        closePrice: seqData?.current_close?.toString() || "",
        ema50Price: setupData.ema50_price?.toString() || "",
        htfBiasInput: seqData?.htf_bias_override || "auto",
        sweepDirection: seqData?.sweep_direction || "none",
        atrCurrent: seqData?.atr_current?.toString() || "",
        atrPrior: seqData?.atr_prior?.toString() || "",
        pipSize: seqData?.pip_size || 1,
        notes: setupData.notes || "",
      }));

      if (seqData?.sweep_candle) {
        setSweepCandle({
          open: seqData.sweep_candle.open?.toString() || "",
          high: seqData.sweep_candle.high?.toString() || "",
          low: seqData.sweep_candle.low?.toString() || "",
          close: seqData.sweep_candle.close?.toString() || "",
        });
      }
      if (seqData?.close_candle) {
        setCloseCandle({
          open: seqData.close_candle.open?.toString() || "",
          high: seqData.close_candle.high?.toString() || "",
          low: seqData.close_candle.low?.toString() || "",
          close: seqData.close_candle.close?.toString() || "",
        });
      }

      if (rbData && rbData.length > 0) {
        setRbs(
          rbData.map((rb, idx) => ({
            id: Math.random().toString(36).slice(2),
            high: rb.rb_high?.toString() || "",
            low: rb.rb_low?.toString() || "",
            addedAt:
              rb.created_at ||
              new Date(Date.now() - idx * 1000).toISOString(),
          }))
        );
      }

      setExistingSequenceId(seqData?.id || null);
      setExistingSetupId(setupData.id);
      setLoadingEdit(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // ----------------------------------------------------------
  // UPDATERS
  // ----------------------------------------------------------
  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function updateCandle(setter) {
    return (field, value) => setter((c) => ({ ...c, [field]: value }));
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

  // ----------------------------------------------------------
  // RANKED RBS + ACTIVE RB
  // ----------------------------------------------------------
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

  // Use the ACTIVE RB for the RB alignment + close checks
  const rbHigh = activeRb?.high ?? null;
  const rbLow = activeRb?.low ?? null;

  // ----------------------------------------------------------
  // SEQUENCE EVALUATION
  // ----------------------------------------------------------
  const sequence = useMemo(() => {
    return evaluateLiquiditySequence({
      sequenceType: form.sequenceType,
      liquidityZoneHigh: form.liquidityZoneHigh,
      liquidityZoneLow: form.liquidityZoneLow,
      sweepCandle,
      currentClose: form.closePrice,
      mssReference: form.mssReference,
      fvgHigh: form.fvgHigh,
      fvgLow: form.fvgLow,
      rbHigh,
      rbLow,
      closeCandle,
      atrCurrent: form.atrCurrent,
      atrPrior: form.atrPrior,
    });
  }, [
    form.sequenceType,
    form.liquidityZoneHigh,
    form.liquidityZoneLow,
    form.mssReference,
    form.fvgHigh,
    form.fvgLow,
    form.closePrice,
    form.atrCurrent,
    form.atrPrior,
    sweepCandle,
    closeCandle,
    rbHigh,
    rbLow,
  ]);

  // ----------------------------------------------------------
  // EMA + ENRICHED VERDICT (HTF + sweep layer)
  // ----------------------------------------------------------
  const ema = computeEmaDirection({
    emaPrice: form.ema50Price,
    closePrice: form.closePrice,
  });
  const emaMeta = emaInfo(ema);

  const baseNegotiation = useMemo(() => {
    if (!activeRb || !form.closePrice) return null;
    return judgeZoneNegotiation({
      activeRb,
      closePrice: form.closePrice,
    });
  }, [activeRb, form.closePrice]);

  const enrichedVerdict = useMemo(() => {
    if (!baseNegotiation || !sequence.allPassed) return null;
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
  }, [
    baseNegotiation,
    sequence.allPassed,
    ema,
    form.htfBiasInput,
    form.sweepDirection,
  ]);

  const alignment = enrichedVerdict?.emaAlignment;
  const atr = sequence.atr;

  // ----------------------------------------------------------
  // TRADE COMPUTATION (only if sequence passes + verdict is BUY/SELL)
  // ----------------------------------------------------------
  const trade = useMemo(() => {
    if (!sequence.allPassed) return null;
    if (!enrichedVerdict) return null;
    const v = enrichedVerdict.verdict;
    if (v !== "BUY" && v !== "SELL") return null;
    if (!activeRb) return null;

    const rHigh = parseFloat(activeRb.high);
    const rLow = parseFloat(activeRb.low);
    if (isNaN(rHigh) || isNaN(rLow)) return null;

    const ceVal = Math.round(((rHigh + rLow) / 2) * 100) / 100;
    const slRef = v === "BUY" ? rLow : rHigh;

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
    sequence.allPassed,
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

  // ----------------------------------------------------------
  // IRL / ERL
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // WARNINGS
  // ----------------------------------------------------------
  const warningReasons = useMemo(
    () =>
      computeWarningReasons({
        verdict: enrichedVerdict,
        alignment,
        pathDanger: null,
        blockerBadge: null,
        extraReasons: !sequence.allPassed
          ? [
              {
                key: "sequence_incomplete",
                label: "Sequence incomplete",
                detail: `${Object.values(sequence.steps).filter((s) => !s.pass).length} step(s) failing.`,
              },
            ]
          : [],
      }),
    [enrichedVerdict, alignment, sequence]
  );
  const hasWarnings = warningReasons.length > 0;

  // ----------------------------------------------------------
  // SAVE
  // ----------------------------------------------------------
  async function handleSave(force = false) {
    if (!sequence.allPassed) {
      setError("Complete all 6 steps before saving.");
      return;
    }
    if (!enrichedVerdict || !trade || !activeRb) {
      setError("Fill in the sequence, at least one RB, and close price first.");
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

    // ---- 1. setups row ----
    const setupPayload = {
      user_id: user.id,
      pair: form.pair,
      setup_type: "liquidity_sequence",
      d1_bias: enrichedVerdict.verdict === "BUY" ? "bullish" : "bearish",
      htf_bias: enrichedVerdict.verdict === "BUY" ? "bullish" : "bearish",
      ema50_position: ema.position !== "unknown" ? ema.position : "above",
      rejection_block_zone: `${activeRb.low}-${activeRb.high}`,
      ce_price: trade.entry,
      use_ce_entry: true,
      checklist_score: sequence.allPassed ? 6 : 0,
      checklist_passed: sequence.allPassed,
      htf_bias_override: form.htfBiasInput,
      sweep_direction: form.sweepDirection,
      notes: form.notes,
    };

    let setup;
    if (isEdit && existingSetupId) {
      const { data, error: updErr } = await supabase
        .from("setups")
        .update(setupPayload)
        .eq("id", existingSetupId)
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

    // ---- 2. liquidity_sequence_setups row ----
    const seqPayload = {
      user_id: user.id,
      setup_id: setup.id,
      pair: form.pair,
      timeframe: form.timeframe,
      sequence_type: form.sequenceType,

      liquidity_zone_high: form.liquidityZoneHigh
        ? parseFloat(form.liquidityZoneHigh)
        : null,
      liquidity_zone_low: form.liquidityZoneLow
        ? parseFloat(form.liquidityZoneLow)
        : null,
      sweep_candle: {
        open: parseFloat(sweepCandle.open) || null,
        high: parseFloat(sweepCandle.high) || null,
        low: parseFloat(sweepCandle.low) || null,
        close: parseFloat(sweepCandle.close) || null,
      },
      mss_reference: form.mssReference
        ? parseFloat(form.mssReference)
        : null,
      fvg_high: form.fvgHigh ? parseFloat(form.fvgHigh) : null,
      fvg_low: form.fvgLow ? parseFloat(form.fvgLow) : null,
      next_liquidity_level: form.nextLiquidityLevel
        ? parseFloat(form.nextLiquidityLevel)
        : null,
      current_close: form.closePrice ? parseFloat(form.closePrice) : null,
      close_candle: {
        open: parseFloat(closeCandle.open) || null,
        high: parseFloat(closeCandle.high) || null,
        low: parseFloat(closeCandle.low) || null,
        close: parseFloat(closeCandle.close) || null,
      },

      active_rb_high: activeRb.high,
      active_rb_low: activeRb.low,
      active_rb_ce: trade.entry,
      rb_high: activeRb.high,
      rb_low: activeRb.low,
      rb_ce: trade.entry,

      rb_fvg_alignment:
        sequence.steps.rb.data?.position || null,
      rb_fvg_overlap: sequence.steps.rb.data?.overlap || null,

      premium_discount: baseNegotiation?.side || null,
      verdict: enrichedVerdict.verdict,
      entry: trade.entry,
      sl: trade.sl,
      tp: trade.tp,
      rr: trade.rr,
      lot_size: trade.lotSize,
      risk_amount: trade.riskAmount,
      pip_size: trade.pipSize,
      sl_pips: trade.slPips,
      tp_pips: trade.tpPips,

      atr_current: form.atrCurrent ? parseFloat(form.atrCurrent) : null,
      atr_prior: form.atrPrior ? parseFloat(form.atrPrior) : null,

      ema50_price: form.ema50Price ? parseFloat(form.ema50Price) : null,
      ema50_direction: ema.direction,
      ema50_position: ema.position,
      ema50_aligned: alignment?.key === "aligned",

      htf_bias_override: form.htfBiasInput,
      sweep_direction: form.sweepDirection,
      htf_conflict: enrichedVerdict.hasHtfConflict || false,
      sweep_override: enrichedVerdict.hasSweepOverride || false,

      checklist_score: sequence.allPassed ? 6 : 0,
      checklist_passed: sequence.allPassed,
      checklist_answers: {
        liquidity: sequence.steps.liquidity.pass,
        sweep: sequence.steps.sweep.pass,
        mss: sequence.steps.mss.pass,
        fvg: sequence.steps.fvg.pass,
        rb: sequence.steps.rb.pass,
        close: sequence.steps.close.pass,
      },

      steps_passed: {
        liquidity: sequence.steps.liquidity.pass,
        sweep: sequence.steps.sweep.pass,
        mss: sequence.steps.mss.pass,
        fvg: sequence.steps.fvg.pass,
        rb: sequence.steps.rb.pass,
        close: sequence.steps.close.pass,
      },
      reasons: sequence.reasons,

      warning_acknowledged: hasWarnings,
      warning_reasons: warningReasons.map((r) => r.key),

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

    let seqRow;
    if (isEdit && existingSequenceId) {
      const { data, error: updErr } = await supabase
        .from("liquidity_sequence_setups")
        .update(seqPayload)
        .eq("id", existingSequenceId)
        .select()
        .single();
      if (updErr) {
        setError(updErr.message);
        setSaving(false);
        return;
      }
      seqRow = data;
      await supabase
        .from("liquidity_sequence_rbs")
        .delete()
        .eq("sequence_id", existingSequenceId);
    } else {
      const { data, error: insErr } = await supabase
        .from("liquidity_sequence_setups")
        .insert(seqPayload)
        .select()
        .single();
      if (insErr) {
        setError(insErr.message);
        setSaving(false);
        return;
      }
      seqRow = data;
    }

    // ---- 3. child RBs ----
    const rbRows = rankedRbs.map((rb) => ({
      user_id: user.id,
      sequence_id: seqRow.id,
      pair: form.pair,
      rb_high: rb.high,
      rb_low: rb.low,
      rb_ce: computeCe(rb.high, rb.low),
      rank: rb.rank,
      is_active: rb.id === activeRb.id,
    }));

    const { error: rbError } = await supabase
      .from("liquidity_sequence_rbs")
      .insert(rbRows);

    if (rbError) {
      setError(rbError.message);
      setSaving(false);
      return;
    }

    // ---- 4. journal trade ----
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
          sequence_type: form.sequenceType,
        },
      });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => router.push(`/setups/${setup.id}`), 800);
  }

  // ----------------------------------------------------------
  // LOADING STATE
  // ----------------------------------------------------------
  if (loadingEdit) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-gray-400">
          Loading sequence...
        </div>
      </main>
    );
  }

  const hasAnyInput =
    form.liquidityZoneHigh ||
    form.liquidityZoneLow ||
    form.mssReference ||
    form.fvgHigh ||
    form.fvgLow ||
    form.closePrice ||
    sweepCandle.high ||
    sweepCandle.low ||
    closeCandle.close;

  const seqInfo = SEQUENCE_TYPES.find((s) => s.key === form.sequenceType);

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit
              ? "Edit Liquidity Sequence"
              : "Liquidity Sequence Negotiation"}
          </h1>
          <p className="text-gray-400 text-sm">
            Five systems collaborate — Liquidity, Sweep, MSS, FVG, RB — to
            print one entry.
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

          <div>
            <label className="block text-xs mb-1 text-gray-400">
              Sequence Type
            </label>
            <select
              value={form.sequenceType}
              onChange={(e) => update("sequenceType", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            >
              {SEQUENCE_TYPES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.emoji} {s.label}
                </option>
              ))}
            </select>
            {seqInfo && (
              <p className="text-xs text-gray-500 mt-1">{seqInfo.hint}</p>
            )}
          </div>
        </div>

        {/* SYSTEM 1 — Liquidity Zone */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            🎯 System 1 — Liquidity Zone
          </h2>
          <p className="text-xs text-gray-500">
            Mark the pool of stops. For support: swing low. For resistance:
            swing high.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Zone High
              </label>
              <input
                type="number"
                step="any"
                value={form.liquidityZoneHigh}
                onChange={(e) =>
                  update("liquidityZoneHigh", e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Zone Low
              </label>
              <input
                type="number"
                step="any"
                value={form.liquidityZoneLow}
                onChange={(e) => update("liquidityZoneLow", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* SYSTEM 2 — Sweep */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            🌊 System 2 — Liquidity Sweep
          </h2>
          <p className="text-xs text-gray-500">
            The candle that poked through the zone. Enter its OHLC.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["open", "high", "low", "close"].map((f) => (
              <div key={f}>
                <label className="block text-xs mb-1 text-gray-400">
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </label>
                <input
                  type="number"
                  step="any"
                  value={sweepCandle[f]}
                  onChange={(e) =>
                    updateCandle(setSweepCandle)(f, e.target.value)
                  }
                  className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs"
                />
              </div>
            ))}
          </div>
        </div>

        {/* SYSTEM 3 — MSS */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            🔀 System 3 — Market Structure Shift
          </h2>
          <p className="text-xs text-gray-500">
            The price level that must break to confirm the shift. Support:
            swing high. Resistance: swing low.
          </p>
          <div>
            <label className="block text-xs mb-1 text-gray-400">
              MSS Reference
            </label>
            <input
              type="number"
              step="any"
              value={form.mssReference}
              onChange={(e) => update("mssReference", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            />
          </div>
        </div>

        {/* SYSTEM 4 — FVG */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            📊 System 4 — Fair Value Gap
          </h2>
          <p className="text-xs text-gray-500">
            Mark the FVG high + low. The gap left behind by the displacement.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                FVG High
              </label>
              <input
                type="number"
                step="any"
                value={form.fvgHigh}
                onChange={(e) => update("fvgHigh", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                FVG Low
              </label>
              <input
                type="number"
                step="any"
                value={form.fvgLow}
                onChange={(e) => update("fvgLow", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* SYSTEM 5 — Rejection Blocks */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-blue-400">
                🧱 System 5 — Rejection Blocks
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Every RB in the zone. The active one (containing price) is
                used for the verdict.
              </p>
            </div>
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
                      onChange={(e) =>
                        updateRb(rb.id, "low", e.target.value)
                      }
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
                      onChange={(e) =>
                        updateRb(rb.id, "high", e.target.value)
                      }
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

        {/* TRIGGER — Close in RB */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            🎯 Trigger — Close in RB
          </h2>
          <p className="text-xs text-gray-500">
            The candle that closes inside the RB. This is the trigger.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["open", "high", "low", "close"].map((f) => (
              <div key={f}>
                <label className="block text-xs mb-1 text-gray-400">
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </label>
                <input                  type="number"
                  step="any"
                  value={closeCandle[f]}
                  onChange={(e) =>
                    updateCandle(setCloseCandle)(f, e.target.value)
                  }
                  className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Target + EMA + HTF + ATR */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            Target · EMA 50 · HTF · ATR
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Next Liquidity Target
              </label>
              <input
                type="number"
                step="any"
                value={form.nextLiquidityLevel}
                onChange={(e) =>
                  update("nextLiquidityLevel", e.target.value)
                }
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
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>

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

        {/* HTF Conflict / Sweep Override banners */}
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

        {/* THE CARD */}
        {hasAnyInput && (
          <LiquiditySequenceCard
            data={sequence}
            trade={trade}
            irlErl={irlErl}
            warnings={warningReasons}
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
            ⚠️ <strong>Warning:</strong> {warningReasons.length} danger
            signal{warningReasons.length === 1 ? "" : "s"} detected.
          </div>
        )}

        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={saving || !sequence.allPassed || !trade}
          className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${
            sequence.allPassed
              ? "bg-green-700 hover:bg-green-600"
              : "bg-yellow-800 hover:bg-yellow-700"
          }`}
        >
          {saving
            ? "Saving..."
            : isEdit
            ? "✏️ Update Sequence"
            : sequence.allPassed
            ? `✅ Save ${enrichedVerdict?.verdict || ""} Sequence`
            : "💾 Complete all 6 steps to save"}
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