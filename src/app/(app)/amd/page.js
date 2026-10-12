"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { AMD_TYPES, evaluateAmd } from "@/lib/amdEngine";
import {
  computeCe,
  rankRejectionBlocks,
  rbRankInfo,
  findActiveRb,
} from "@/lib/liquidityZoneEngine";
import {
  computeEmaDirection,
  emaInfo,
  enrichVerdict,
  computeWarningReasons,
  HTF_BIAS_OPTIONS,
  SWEEP_DIRECTION_OPTIONS,
} from "@/lib/verdictEngine";
import { computeIrlErl } from "@/lib/irlErlEngine";
import PairPicker from "@/components/PairPicker";
import WarningModal from "@/components/WarningModal";
import AmdCard from "@/components/AmdCard";

function emptyCandle() {
  return { open: "", high: "", low: "", close: "" };
}
function emptyRb() {
  return { id: Math.random().toString(36).slice(2), high: "", low: "" };
}

export default function AmdPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "H4",
    sequenceType: "bullish",
    rangeHigh: "",
    rangeLow: "",
    atrCurrent: "",
    atrPrior: "",
    mssReference: "",
    fvgHigh: "",
    fvgLow: "",
    nextLiquidityLevel: "",
    closePrice: "",
    ema50Price: "",
    htfBiasInput: "auto",
    sweepDirection: "none",
    pipSize: 1,
    notes: "",
  });

  const [sweepCandle, setSweepCandle] = useState(emptyCandle());
  const [closeCandle, setCloseCandle] = useState(emptyCandle());
  const [rbs, setRbs] = useState([emptyRb()]);
  const [manualMindset, setManualMindset] = useState(false);

  const [accountSize, setAccountSize] = useState(0);
  const [riskPercent, setRiskPercent] = useState(1);

  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [error, setError] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [existingSetupId, setExistingSetupId] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Draft awareness
  const [draftCount, setDraftCount] = useState(0);

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
        .select("account_size, risk_percent")
        .eq("id", user.id)
        .single();
      if (prof) {
        setAccountSize(prof.account_size || 0);
        setRiskPercent(prof.risk_percent || 1);
      }

      // Count drafts (for the banner — skip in edit mode)
      if (!isEdit) {
        const { count } = await supabase
          .from("amd_setups")
          .select("*", { count: "exact", head: true })
          .eq("status", "draft");
        setDraftCount(count || 0);
      }

      if (!isEdit) return;
      setLoadingEdit(true);

      const { data: setupData, error: setupErr } = await supabase
        .from("amd_setups")
        .select("*")
        .eq("id", editId)
        .maybeSingle();

      if (setupErr || !setupData) {
        setError(setupErr?.message || "AMD setup not found.");
        setLoadingEdit(false);
        return;
      }

      const { data: rbData } = await supabase
        .from("amd_rbs")
        .select("*")
        .eq("setup_id", setupData.id)
        .order("created_at", { ascending: false });

      setForm((f) => ({
        ...f,
        pair: setupData.pair || f.pair,
        timeframe: setupData.timeframe || f.timeframe,
        sequenceType: setupData.sequence_type || f.sequenceType,
        rangeHigh: setupData.range_high?.toString() || "",
        rangeLow: setupData.range_low?.toString() || "",
        atrCurrent: setupData.atr_current?.toString() || "",
        atrPrior: setupData.atr_prior?.toString() || "",
        mssReference: setupData.mss_reference?.toString() || "",
        fvgHigh: setupData.fvg_high?.toString() || "",
        fvgLow: setupData.fvg_low?.toString() || "",
        nextLiquidityLevel:
          setupData.next_liquidity_level?.toString() || "",
        closePrice: setupData.current_close?.toString() || "",
        ema50Price: setupData.ema50_price?.toString() || "",
        htfBiasInput: setupData.htf_bias_override || "auto",
        sweepDirection: setupData.sweep_direction || "none",
        pipSize: setupData.pip_size || 1,
        notes: setupData.notes || "",
      }));

      if (setupData.sweep_candle) {
        setSweepCandle({
          open: setupData.sweep_candle.open?.toString() || "",
          high: setupData.sweep_candle.high?.toString() || "",
          low: setupData.sweep_candle.low?.toString() || "",
          close: setupData.sweep_candle.close?.toString() || "",
        });
      }
      if (setupData.close_candle) {
        setCloseCandle({
          open: setupData.close_candle.open?.toString() || "",
          high: setupData.close_candle.high?.toString() || "",
          low: setupData.close_candle.low?.toString() || "",
          close: setupData.close_candle.close?.toString() || "",
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

      if (setupData.checklist_answers?.mindset) {
        setManualMindset(true);
      }

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

  const rbHigh = activeRb?.high ?? null;
  const rbLow = activeRb?.low ?? null;

  // ----------------------------------------------------------
  // AMD EVALUATION
  // ----------------------------------------------------------
  const evaluation = useMemo(() => {
    return evaluateAmd({
      sequenceType: form.sequenceType,
      rangeHigh: form.rangeHigh,
      rangeLow: form.rangeLow,
      atrCurrent: form.atrCurrent,
      atrPrior: form.atrPrior,
      sweepCandle,
      currentClose: form.closePrice,
      mssReference: form.mssReference,
      fvgHigh: form.fvgHigh,
      fvgLow: form.fvgLow,
      rbHigh,
      rbLow,
      closeCandle,
      nextLiquidityLevel: form.nextLiquidityLevel,
      pipSize: parseFloat(form.pipSize) || 1,
      manualMindset,
      accountSize,
      riskPercent,
    });
  }, [
    form.sequenceType,
    form.rangeHigh,
    form.rangeLow,
    form.atrCurrent,
    form.atrPrior,
    form.mssReference,
    form.fvgHigh,
    form.fvgLow,
    form.closePrice,
    form.nextLiquidityLevel,
    form.pipSize,
    sweepCandle,
    closeCandle,
    rbHigh,
    rbLow,
    manualMindset,
    accountSize,
    riskPercent,
  ]);

  // ----------------------------------------------------------
  // EMA + enriched verdict
  // ----------------------------------------------------------
  const ema = computeEmaDirection({
    emaPrice: form.ema50Price,
    closePrice: form.closePrice,
  });
  const emaMeta = emaInfo(ema);

  const enrichedVerdict = useMemo(() => {
    if (!evaluation.baseNegotiation) return null;
    if (!evaluation.checklistVerdict.passed) return null;
    const base = {
      verdict: evaluation.baseNegotiation.verdict,
      strength: evaluation.baseNegotiation.strength || "normal",
      reason: evaluation.baseNegotiation.reason || "",
    };
    return enrichVerdict({
      verdict: base,
      ema,
      htfBiasInput: form.htfBiasInput,
      sweepDirection: form.sweepDirection,
    });
  }, [
    evaluation.baseNegotiation,
    evaluation.checklistVerdict,
    ema,
    form.htfBiasInput,
    form.sweepDirection,
  ]);

  const alignment = enrichedVerdict?.emaAlignment;

  // ----------------------------------------------------------
  // IRL / ERL
  // ----------------------------------------------------------
  const irlErl = useMemo(() => {
    if (!evaluation.trade || !form.closePrice || !activeRb) return null;
    return computeIrlErl({
      currentZone: {
        high: activeRb.high,
        low: activeRb.low,
        label: "Active RB",
      },
      nextZone: null,
      closePrice: form.closePrice,
      trade: evaluation.trade,
    });
  }, [evaluation.trade, form.closePrice, activeRb]);

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
        extraReasons: !evaluation.checklistVerdict.passed
          ? [
              {
                key: "amd_incomplete",
                label: "AMD checklist incomplete",
                detail: `${evaluation.score}/10 gates passed — need ${7 - evaluation.score} more.`,
              },
            ]
          : [],
      }),
    [enrichedVerdict, alignment, evaluation]
  );
  const hasWarnings = warningReasons.length > 0;

  // ----------------------------------------------------------
  // HAS ANY INPUT (for enabling Save Draft)
  // ----------------------------------------------------------
  const hasAnyInput =
    form.rangeHigh ||
    form.rangeLow ||
    form.mssReference ||
    form.fvgHigh ||
    form.fvgLow ||
    form.closePrice ||
    sweepCandle.open ||
    sweepCandle.high ||
    sweepCandle.low ||
    sweepCandle.close ||
    closeCandle.open ||
    closeCandle.high ||
    closeCandle.low ||
    closeCandle.close;

  // ----------------------------------------------------------
  // SAVE — shared logic
  // ----------------------------------------------------------
  async function saveAmd({ isDraft }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated.");
      return null;
    }

    const trade = evaluation.trade;
    const verdictToSave = isDraft
      ? evaluation.verdict
      : enrichedVerdict?.verdict || evaluation.verdict || "WAIT";

    const payload = {
      user_id: user.id,
      pair: form.pair,
      timeframe: form.timeframe,
      sequence_type: form.sequenceType,
      status: isDraft ? "draft" : "complete",

      range_high: form.rangeHigh ? parseFloat(form.rangeHigh) : null,
      range_low: form.rangeLow ? parseFloat(form.rangeLow) : null,
      atr_current: form.atrCurrent ? parseFloat(form.atrCurrent) : null,
      atr_prior: form.atrPrior ? parseFloat(form.atrPrior) : null,

      sweep_candle: {
        open: parseFloat(sweepCandle.open) || null,
        high: parseFloat(sweepCandle.high) || null,
        low: parseFloat(sweepCandle.low) || null,
        close: parseFloat(sweepCandle.close) || null,
      },
      sweep_side: evaluation.gates.sweep.data?.side || null,

      mss_reference: form.mssReference
        ? parseFloat(form.mssReference)
        : null,
      fvg_high: form.fvgHigh ? parseFloat(form.fvgHigh) : null,
      fvg_low: form.fvgLow ? parseFloat(form.fvgLow) : null,
      close_candle: {
        open: parseFloat(closeCandle.open) || null,
        high: parseFloat(closeCandle.high) || null,
        low: parseFloat(closeCandle.low) || null,
        close: parseFloat(closeCandle.close) || null,
      },
      next_liquidity_level: form.nextLiquidityLevel
        ? parseFloat(form.nextLiquidityLevel)
        : null,

      active_rb_high: activeRb?.high ?? null,
      active_rb_low: activeRb?.low ?? null,
      active_rb_ce: trade?.entry ?? null,

      current_close: form.closePrice ? parseFloat(form.closePrice) : null,
      premium_discount: evaluation.baseNegotiation?.side || null,
      verdict: verdictToSave,
      entry: trade?.entry ?? null,
      sl: trade?.sl ?? null,
      tp: trade?.tp ?? null,
      rr: trade?.rr ?? null,
      lot_size: trade?.lotSize ?? null,
      risk_amount: trade?.riskAmount ?? null,
      pip_size: trade?.pipSize ?? (parseFloat(form.pipSize) || 1),
      sl_pips: trade?.slPips ?? null,
      tp_pips: trade?.tpPips ?? null,

      ema50_price: form.ema50Price ? parseFloat(form.ema50Price) : null,
      ema50_direction: ema.direction,
      ema50_position: ema.position,
      ema50_aligned: alignment?.key === "aligned" || false,
      htf_bias_override: form.htfBiasInput,
      sweep_direction: form.sweepDirection,
      htf_conflict: enrichedVerdict?.hasHtfConflict || false,
      sweep_override: enrichedVerdict?.hasSweepOverride || false,

      checklist_score: evaluation.score,
      checklist_passed: evaluation.checklistVerdict.passed,
      checklist_answers: evaluation.answers,

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

    let setupRow;
    if (isEdit && existingSetupId) {
      const { data, error: updErr } = await supabase
        .from("amd_setups")
        .update(payload)
        .eq("id", existingSetupId)
        .select()
        .single();
      if (updErr) {
        setError(updErr.message);
        return null;
      }
      setupRow = data;
      await supabase.from("amd_rbs").delete().eq("setup_id", existingSetupId);
    } else {
      const { data, error: insErr } = await supabase
        .from("amd_setups")
        .insert(payload)
        .select()
        .single();
      if (insErr) {
        setError(insErr.message);
        return null;
      }
      setupRow = data;
      setExistingSetupId(data.id);
    }

    // Child RBs — always save (even partial)
    if (rankedRbs.length > 0) {
      const rbRows = rankedRbs.map((rb) => ({
        user_id: user.id,
        setup_id: setupRow.id,
        pair: form.pair,
        rb_high: rb.high,
        rb_low: rb.low,
        rb_ce: computeCe(rb.high, rb.low),
        rank: rb.rank,
        is_active: activeRb ? rb.id === activeRb.id : false,
      }));
      const { error: rbErr } = await supabase.from("amd_rbs").insert(rbRows);
      if (rbErr) {
        setError(rbErr.message);
        return null;
      }
    }

    return setupRow;
  }

  // ----------------------------------------------------------
  // SAVE DRAFT
  // ----------------------------------------------------------
  async function handleSaveDraft() {
    if (!hasAnyInput) {
      setError("Fill something in first before saving a draft.");
      return;
    }

    setSavingDraft(true);
    setError("");

    const row = await saveAmd({ isDraft: true });

    setSavingDraft(false);
    if (!row) return;

    setDraftSavedAt(new Date());
    setSaved(false);
  }

  // ----------------------------------------------------------
  // SAVE FINAL
  // ----------------------------------------------------------
  async function handleSaveFinal(force = false) {
    if (!evaluation.checklistVerdict.passed) {
      setError(
        `AMD checklist needs ${7 - evaluation.score} more pass${
          7 - evaluation.score === 1 ? "" : "es"
        } before saving as final. Use Save Draft to keep your work.`
      );
      return;
    }
    if (!evaluation.trade) {
      setError("Trade could not be computed — check entry and SL.");
      return;
    }
    if (!enrichedVerdict) {
      setError("Verdict not ready.");
      return;
    }

    if (hasWarnings && !force) {
      setShowWarningModal(true);
      return;
    }
    setShowWarningModal(false);

    setSaving(true);
    setError("");

    const row = await saveAmd({ isDraft: false });

    setSaving(false);
    if (!row) return;

    setDraftSavedAt(null);
    setSaved(true);
    setTimeout(() => router.push(`/amd/${row.id}`), 800);
  }

  // ----------------------------------------------------------
  // LOADING
  // ----------------------------------------------------------
  if (loadingEdit) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-gray-400">
          Loading AMD setup...
        </div>
      </main>
    );
  }

  const typeInfo = AMD_TYPES.find((t) => t.key === form.sequenceType);
  const canSaveFinal = evaluation.checklistVerdict.passed && evaluation.trade;

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit ? "Edit AMD Setup" : "AMD — Accumulation → Manipulation → Distribution"}
          </h1>
          <p className="text-gray-400 text-sm">
            Accumulation builds the range. Manipulation traps retail.
            Distribution moves the market.
          </p>
        </div>

        {/* Draft indicator banner */}
        {!isEdit && draftCount > 0 && (
          <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-800 flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-yellow-200">
              📝 You have <strong>{draftCount}</strong> draft
              {draftCount === 1 ? "" : "s"} waiting.
            </p>
            <button
              type="button"
              onClick={() => router.push("/amd/journal")}
              className="text-xs px-3 py-1.5 rounded-lg bg-yellow-800 hover:bg-yellow-700 text-white font-semibold"
            >
              Open Journal
            </button>
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
            <label className="block text-xs mb-1 text-gray-400">
              AMD Type
            </label>
            <select
              value={form.sequenceType}
              onChange={(e) => update("sequenceType", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            >
              {AMD_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.emoji} {t.label}
                </option>
              ))}
            </select>
            {typeInfo && (
              <p className="text-xs text-gray-500 mt-1">{typeInfo.hint}</p>
            )}
          </div>
        </div>

        {/* PHASE A */}
        <div className="p-4 rounded-lg bg-gray-900 border border-blue-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-blue-300">
            🟦 Phase A — Accumulation
          </h2>
          <p className="text-xs text-gray-500">
            The range forms. Volatility contracts. Institutions absorb supply.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Range High
              </label>
              <input
                type="number"
                step="any"
                value={form.rangeHigh}
                onChange={(e) => update("rangeHigh", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Range Low
              </label>
              <input
                type="number"
                step="any"
                value={form.rangeLow}
                onChange={(e) => update("rangeLow", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
        </div>

        {/* PHASE M */}
        <div className="p-4 rounded-lg bg-gray-900 border border-red-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-red-300">
            🟥 Phase M — Manipulation
          </h2>
          <p className="text-xs text-gray-500">
            The sweep. Price breaks the range to trap retail — then closes
            back inside.
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

        {/* PHASE D */}
        <div className="p-4 rounded-lg bg-gray-900 border border-green-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-green-300">
            🟩 Phase D — Distribution
          </h2>
          <p className="text-xs text-gray-500">
            The move. MSS → FVG → RB → retest → entry.
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-300">
                Rejection Blocks
              </p>
              <button
                type="button"
                onClick={addRb}
                className="text-xs px-2 py-1 rounded bg-blue-900/40 text-blue-300 hover:bg-blue-800/40"
              >
                + Add RB
              </button>
            </div>

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

          <div>
            <p className="text-xs font-semibold text-gray-300 mb-2">
              Close Candle (the trigger)
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
        </div>

        {/* Context — EMA / HTF / Close / Pip */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            EMA 50 · HTF · Close · Pip
          </h2>

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

          <button
            type="button"
            onClick={() => setManualMindset((m) => !m)}
            className={`w-full text-left p-3 rounded-lg border transition ${
              manualMindset
                ? "bg-green-900/40 border-green-700"
                : "bg-black border-gray-800 hover:border-gray-600"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                  manualMindset
                    ? "bg-green-500 border-green-500"
                    : "border-gray-600"
                }`}
              >
                {manualMindset && (
                  <span className="text-black text-xs font-bold">✓</span>
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    manualMindset ? "text-green-200" : "text-white"
                  }`}
                >
                  10. Am I calm and disciplined?
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Mindset gate — check before saving
                </p>
              </div>
            </div>
          </button>
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
          <AmdCard
            data={evaluation}
            trade={evaluation.trade}
            irlErl={irlErl}
            warnings={warningReasons}
          />
        )}

        {/* Notes */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <label className="block text-xs mb-1 text-gray-400">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            placeholder="Any observations..."
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none resize-none text-sm"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        {draftSavedAt && (
          <div className="p-3 rounded-lg bg-yellow-900/40 border border-yellow-700 text-yellow-100 text-sm">
            📝 Draft saved ·{" "}
            {draftSavedAt.toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            — keep editing, or Save as Final when ready.
          </div>
        )}

        {saved && (
          <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">
            ✅ {isEdit ? "Updated" : "Saved"} — redirecting...
          </div>
        )}

        {hasWarnings && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-700 text-red-200 text-xs">
            ⚠️ <strong>Warning:</strong> {warningReasons.length} danger
            signal{warningReasons.length === 1 ? "" : "s"} detected.
          </div>
        )}

        {/* TWO BUTTONS — Save Draft + Save as Final */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Save Draft — always enabled when there's input */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || saving || !hasAnyInput}
            className="w-full py-4 rounded-lg font-bold disabled:opacity-50 bg-yellow-800 hover:bg-yellow-700 text-white"
          >
            {savingDraft
              ? "Saving draft..."
              : "📝 Save Draft"}
          </button>

          {/* Save as Final — only when checklist passes */}
          <button
            type="button"
            onClick={() => handleSaveFinal(false)}
            disabled={saving || savingDraft || !canSaveFinal}
            className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${
              canSaveFinal
                ? "bg-green-700 hover:bg-green-600"
                : "bg-gray-800"
            }`}
          >
            {saving
              ? "Saving..."
              : isEdit
              ? `✅ Save as Final (${evaluation.score}/10)`
              : canSaveFinal
              ? `✅ Save as Final (${evaluation.score}/10)`
              : `💾 Need ${7 - evaluation.score} more to finalize`}
          </button>
        </div>

        {/* Hint */}
        {!canSaveFinal && hasAnyInput && (
          <p className="text-xs text-yellow-300 text-center">
            Not complete yet — use <strong>Save Draft</strong> to keep your
            work. Come back anytime.
          </p>
        )}
      </div>

      <WarningModal
        open={showWarningModal}
        warningReasons={warningReasons}
        onCancel={() => setShowWarningModal(false)}
        onConfirm={() => handleSaveFinal(true)}
        saving={saving}
      />
    </main>
  );
}