"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import {
  ZONE_TYPES,
  zoneTypeInfo,
  computeCe,
  detectRbVsZone,
  rbVsZoneInfo,
  rankRejectionBlocks,
  rbRankInfo,
  findActiveRb,
  judgeRejectionBlock,
  premiumDiscountVerdict,
  strengthInfo,
  computeEmaDirection,
  emaInfo,
  emaAlignment,
  checkConditions,
  conditionSummary,
  detectAllRbsFlipped,
  allFlippedInfo,
  checkRbCompleteness,
  detectReversal,
  computeNextOpportunityTrade,
  atrFilter,
  computeRejectionBlockTrade,
  computePips,
  PIP_SIZE_DEFAULT,
} from "@/lib/rejectionBlockEngine";
import PairPicker from "@/components/PairPicker";

function emptyRb() {
  return { id: Math.random().toString(36).slice(2), high: "", low: "" };
}

export default function RejectionBlockPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const visitId = searchParams?.get("visit") || null;
  const isEdit = !!editId;
  const isVisit = !!visitId;
  const isLoadExisting = isEdit || isVisit;

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "H4",
    zoneType: "fvg",
    zoneHigh: "",
    zoneLow: "",
    ema50Price: "",
    ema50Prior: "",
    closePrice: "",
    priorClose: "",
    atrCurrent: "",
    atrPrior: "",
    pipSize: PIP_SIZE_DEFAULT,
    notes: "",
  });

  const [rbs, setRbs] = useState([emptyRb()]);
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

      if (!isLoadExisting) return;

      const lookupId = isEdit ? editId : visitId;
      setLoadingEdit(true);

      const { data: setupData, error: setupErr } = await supabase
        .from("setups")
        .select("*")
        .eq("id", lookupId)
        .single();

      if (setupErr || !setupData) {
        setError(setupErr?.message || "Setup not found.");
        setLoadingEdit(false);
        return;
      }

      const { data: detailData } = await supabase
        .from("rejection_block_setups")
        .select("*")
        .eq("setup_id", lookupId)
        .single();

      setForm((f) => ({
        ...f,
        pair: setupData.pair || f.pair,
        timeframe: detailData?.timeframe || f.timeframe,
        zoneType: detailData?.zone_type || f.zoneType,
        zoneHigh: detailData?.zone_high?.toString() || "",
        zoneLow: detailData?.zone_low?.toString() || "",
        ema50Price: isEdit ? detailData?.ema50_price?.toString() || "" : "",
        ema50Prior: isEdit ? detailData?.ema50_prior?.toString() || "" : "",
        closePrice: isEdit ? detailData?.close_price?.toString() || "" : "",
        priorClose: isEdit ? detailData?.prior_close?.toString() || "" : "",
        atrCurrent: isEdit ? detailData?.atr_current?.toString() || "" : "",
        atrPrior: isEdit ? detailData?.atr_prior?.toString() || "" : "",
        pipSize: detailData?.pip_size || PIP_SIZE_DEFAULT,
        notes: isEdit ? setupData.notes || "" : "",
      }));

      const { data: rbsData } = await supabase
        .from("rejection_block_rbs")
        .select("*")
        .eq("setup_id", lookupId)
        .order("created_at", { ascending: false });

      if (rbsData && rbsData.length > 0) {
        const restored = rbsData.map((rb, idx) => ({
          id: Math.random().toString(36).slice(2),
          high: rb.rb_high?.toString() || "",
          low: rb.rb_low?.toString() || "",
          addedAt:
            rb.created_at || new Date(Date.now() - idx * 1000).toISOString(),
        }));
        setRbs(restored);
      }

      setExistingDetailId(detailData?.id || null);
      setLoadingEdit(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, visitId]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
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

  const zoneCe = computeCe(form.zoneHigh, form.zoneLow);

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

  const activeRbPosition = activeRb
    ? detectRbVsZone({
        zoneHigh: form.zoneHigh,
        zoneLow: form.zoneLow,
        rbHigh: activeRb.high,
        rbLow: activeRb.low,
      })
    : null;
  const activeRbPosInfo = activeRbPosition
    ? rbVsZoneInfo(activeRbPosition)
    : null;

  const negotiation = activeRb
    ? judgeRejectionBlock({
        rbHigh: activeRb.high,
        rbLow: activeRb.low,
        closePrice: form.closePrice,
      })
    : null;
  const verdict = premiumDiscountVerdict(negotiation);
  const strength = negotiation ? strengthInfo(negotiation.strength) : null;

  const ema = computeEmaDirection({
    emaPrice: form.ema50Price,
    emaPrior: form.ema50Prior,
    closePrice: form.closePrice,
  });
  const emaMeta = emaInfo(ema);
  const alignment = negotiation
    ? emaAlignment({
        direction: ema.direction,
        position: ema.position,
        verdict: negotiation.verdict,
      })
    : null;

  const conditions = useMemo(() => {
    if (!activeRb || !negotiation) return { above: [], below: [] };
    return checkConditions({
      activeRb,
      allRbs: rankedRbs,
      closePrice: form.closePrice,
      verdict: negotiation.verdict,
    });
  }, [activeRb, rankedRbs, form.closePrice, negotiation]);

  const condSummary = negotiation
    ? conditionSummary(conditions, negotiation.verdict)
    : null;

  const flipped = useMemo(
    () => detectAllRbsFlipped({ rankedRbs, closePrice: form.closePrice }),
    [rankedRbs, form.closePrice]
  );
  const flippedInfo = allFlippedInfo(flipped);

  const completeness = useMemo(
    () =>
      checkRbCompleteness({
        rankedRbs,
        atr: parseFloat(form.atrCurrent) || 0,
      }),
    [rankedRbs, form.atrCurrent]
  );

  const reversal = useMemo(() => {
    if (!negotiation || negotiation.verdict === "WAIT") return null;
    const list =
      negotiation.verdict === "SELL" ? conditions.below : conditions.above;
    if (!list || list.length === 0) return null;
    return detectReversal({
      verdict: negotiation.verdict,
      conditionRbs: list,
      closePrice: form.closePrice,
      priorClose: form.priorClose,
    });
  }, [negotiation, conditions, form.closePrice, form.priorClose]);

  const nextTrade = reversal
    ? computeNextOpportunityTrade({
        newRb: reversal.newRb,
        newDirection: reversal.newDirection,
        sweepLevel: reversal.sweepLevel,
        accountSize: profile?.account_size || 0,
        riskPercent: profile?.risk_percent || 1,
        atr: parseFloat(form.atrCurrent) || 0,
      })
    : null;

  const atr = atrFilter(form.atrCurrent, form.atrPrior);

  const trade =
    negotiation &&
    (negotiation.verdict === "BUY" || negotiation.verdict === "SELL")
      ? computeRejectionBlockTrade({
          rbHigh: activeRb.high,
          rbLow: activeRb.low,
          verdict: negotiation.verdict,
          accountSize: profile?.account_size || 0,
          riskPercent: profile?.risk_percent || 1,
          atr: parseFloat(form.atrCurrent) || 0,
        })
      : null;

  // Recompute pips with the current pip size (override the default 0.01)
  const pipSize = parseFloat(form.pipSize) || PIP_SIZE_DEFAULT;
  const tradePips = trade
    ? computePips({
        entry: trade.entry,
        sl: trade.sl,
        tp: trade.tp,
        pipSize,
      })
    : null;
  const nextTradePips = nextTrade
    ? computePips({
        entry: nextTrade.entry,
        sl: nextTrade.sl,
        tp: nextTrade.tp,
        pipSize,
      })
    : null;

  const zoneInfo = zoneTypeInfo(form.zoneType);

  async function handleSave() {
    if (!negotiation || !activeRb) {
      setError("Fill in the zone, at least one RB, and close price first.");
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

    // VISIT MODE
    if (isVisit) {
      const { data: parentRbs } = await supabase
        .from("rejection_block_rbs")
        .select("*")
        .eq("setup_id", visitId);

      let activeRbRowId = null;
      if (parentRbs && activeRb) {
        const match = parentRbs.find(
          (r) =>
            parseFloat(r.rb_high) === parseFloat(activeRb.high) &&
            parseFloat(r.rb_low) === parseFloat(activeRb.low)
        );
        activeRbRowId = match?.id || null;
      }

      const visitPayload = {
        user_id: user.id,
        setup_id: visitId,
        rb_id: activeRbRowId,
        rb_high: activeRb.high,
        rb_low: activeRb.low,
        rb_ce: negotiation.ce,
        close_price: form.closePrice ? parseFloat(form.closePrice) : null,
        prior_close: form.priorClose ? parseFloat(form.priorClose) : null,
        verdict: negotiation.verdict,
        strength: negotiation.strength,
        premium_discount: negotiation.side,
        rb_broken: negotiation.rbBroken,
        ema50_direction: ema.direction,
        ema50_position: ema.position,
        ema50_aligned: alignment?.key === "aligned",
        conditions_above: conditions.above,
        conditions_below: conditions.below,
        all_rbs_flipped: flipped.allFlipped,
        all_rbs_flipped_direction: flipped.direction,
        reversal_detected: !!reversal,
        reversal_direction: reversal?.newDirection || null,
        entry: trade?.entry || null,
        sl: trade?.sl || null,
        tp: trade?.tp || null,
        lot_size: trade?.lotSize || null,
        risk_amount: trade?.riskAmount || null,
        pip_size: pipSize,
        sl_pips: tradePips?.slDistance || null,
        tp_pips: tradePips?.tpDistance || null,
        notes: form.notes,
      };

      const { error: visitErr } = await supabase
        .from("rejection_block_visits")
        .insert(visitPayload);

      if (visitErr) {
        setError(visitErr.message);
        setSaving(false);
        return;
      }

      setSaving(false);
      setSaved(true);
      setTimeout(() => router.push(`/setups/${visitId}`), 800);
      return;
    }

    // NEW or EDIT
    const setupPayload = {
      user_id: user.id,
      pair: form.pair,
      setup_type: "rejection_block",
      d1_bias: negotiation.verdict === "BUY" ? "bullish" : "bearish",
      htf_bias: negotiation.verdict === "BUY" ? "bullish" : "bearish",
      ema50_position: ema.position !== "unknown" ? ema.position : "above",
      rejection_block_zone: `${activeRb.low}-${activeRb.high}`,
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
      rb_high: activeRb.high,
      rb_low: activeRb.low,
      rb_ce: negotiation.ce,
      rb_position: activeRbPosition,
      close_price: form.closePrice ? parseFloat(form.closePrice) : null,
      prior_close: form.priorClose ? parseFloat(form.priorClose) : null,
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
      pip_size: pipSize,
      sl_pips: tradePips?.slDistance || null,
      tp_pips: tradePips?.tpDistance || null,
      atr_current: form.atrCurrent ? parseFloat(form.atrCurrent) : null,
      atr_prior: form.atrPrior ? parseFloat(form.atrPrior) : null,
      atr_state: atr.key,
      ema50_price: form.ema50Price ? parseFloat(form.ema50Price) : null,
      ema50_prior: form.ema50Prior ? parseFloat(form.ema50Prior) : null,
      ema50_direction: ema.direction,
      ema50_position_field: ema.position,
      ema50_aligned: alignment?.key === "aligned",
      conditions_above: conditions.above,
      conditions_below: conditions.below,
      all_rbs_flipped: flipped.allFlipped,
      all_rbs_flipped_direction: flipped.direction,
      reversal_detected: !!reversal,
      reversal_direction: reversal?.newDirection || null,
      reversal_rb_high: reversal?.newRb?.high || null,
      reversal_rb_low: reversal?.newRb?.low || null,
      reversal_rb_ce: reversal?.newRb?.ce || null,
      reversal_sweep_level: reversal?.sweepLevel || null,
      reversal_entry: nextTrade?.entry || null,
      reversal_sl: nextTrade?.sl || null,
      reversal_tp: nextTrade?.tp || null,
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

    if (isEdit) {
      await supabase
        .from("rejection_block_rbs")
        .delete()
        .eq("setup_id", setup.id);
    }

    const rbRows = rankedRbs.map((rb) => {
      const pos = detectRbVsZone({
        zoneHigh: form.zoneHigh,
        zoneLow: form.zoneLow,
        rbHigh: rb.high,
        rbLow: rb.low,
      });
      return {
        user_id: user.id,
        setup_id: setup.id,
        pair: form.pair,
        rb_high: rb.high,
        rb_low: rb.low,
        rb_ce: computeCe(rb.high, rb.low),
        rb_position: pos,
        rank: rb.rank,
        is_active: rb.id === activeRb.id,
      };
    });

    const { error: rbErr } = await supabase
      .from("rejection_block_rbs")
      .insert(rbRows);
    if (rbErr) {
      setError(rbErr.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => router.push(`/setups/${setup.id}`), 800);
  }

  function handleSaveAsNewSetup() {
    if (!nextTrade || !reversal) return;
    const params = new URLSearchParams();
    params.set("prefill_pair", form.pair);
    params.set("prefill_timeframe", form.timeframe);
    router.push(`/rejection-block?${params.toString()}`);
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
            {isVisit
              ? "Log Visit — Rejection Block Zone"
              : isEdit
              ? "Edit Rejection Block Setup"
              : "Rejection Block Negotiation"}
          </h1>
          <p className="text-gray-400 text-sm">
            {isVisit
              ? "Same zone, same RBs — new reaction"
              : "Zones hold orders. Rejection Blocks make decisions."}
          </p>
        </div>

        {isVisit && (
          <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-700">
            <p className="text-xs text-purple-200">
              🔄 <strong>Visit mode</strong> — logging a new reaction on the
              existing zone.
            </p>
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
                disabled={isVisit}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm disabled:opacity-50"
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
              disabled={isVisit}
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm disabled:opacity-50"
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
                disabled={isVisit}
                placeholder="e.g. 209400"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm disabled:opacity-50"
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
                disabled={isVisit}
                placeholder="e.g. 209600"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm disabled:opacity-50"
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

        {/* EMA 50 */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            EMA 50 Filter
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                EMA 50 Price (current)
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
                EMA 50 Price (prior)
              </label>
              <input
                type="number"
                step="any"
                value={form.ema50Prior}
                onChange={(e) => update("ema50Prior", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>
          {ema.direction !== "unknown" && (
            <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs">
                <span className="text-gray-400">Direction:</span>{" "}
                <span className={`font-bold ${emaMeta.direction.color}`}>
                  {emaMeta.direction.emoji} {emaMeta.direction.label}
                </span>
              </p>
              <p className="text-xs">
                <span className="text-gray-400">Close position:</span>{" "}
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

        {/* Rejection Blocks */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-blue-400">
                Rejection Blocks (multiple)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                List every RB around the zone — none should be left off.
              </p>
            </div>
            {!isVisit && (
              <button
                type="button"
                onClick={addRb}
                className="text-xs px-3 py-1.5 rounded bg-blue-900/40 text-blue-300 hover:bg-blue-800/40"
              >
                + Add RB
              </button>
            )}
          </div>

          <div className={`p-3 rounded-lg border ${completeness.color}`}>
            <p className="text-xs font-semibold">
              {completeness.emoji} {completeness.label}
            </p>
            <p className="text-xs opacity-90 mt-1">
              {completeness.description}
            </p>
            {completeness.gaps && completeness.gaps.length > 0 && (
              <ul className="text-xs opacity-80 mt-2 list-disc ml-4 space-y-0.5">
                {completeness.gaps.map((g, i) => (
                  <li key={i}>
                    Gap of {g.gap} between {g.from.low}–{g.from.high} and{" "}
                    {g.to.low}–{g.to.high}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            {rbs.map((rb) => {
              const ranked = rankedRbs.find((x) => x.id === rb.id);
              const rank = ranked ? rbRankInfo(ranked.rank) : null;
              const isActive = activeRb && activeRb.id === rb.id;
              const pos =
                rb.high && rb.low
                  ? detectRbVsZone({
                      zoneHigh: form.zoneHigh,
                      zoneLow: form.zoneLow,
                      rbHigh: rb.high,
                      rbLow: rb.low,
                    })
                  : null;
              const posInfo = pos ? rbVsZoneInfo(pos) : null;

              return (
                <div
                  key={rb.id}
                  className={`grid grid-cols-12 gap-2 items-end p-2 rounded border ${
                    isActive
                      ? "bg-green-950/20 border-green-700 ring-1 ring-green-700"
                      : "bg-black border-gray-800"
                  }`}
                >
                  <div className="col-span-3 flex flex-col gap-1">
                    {rank && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full border text-center ${rank.color}`}
                      >
                        {rank.emoji} {rank.label}
                      </span>
                    )}
                    {posInfo && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full border text-center ${posInfo.color}`}
                      >
                        {posInfo.emoji} {posInfo.label}
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
                      disabled={isVisit}
                      className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs disabled:opacity-50"
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
                      disabled={isVisit}
                      className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs disabled:opacity-50"
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    {!isVisit && rbs.length > 1 && (
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

        {/* Close + ATR + Pip */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            The Verdict, Volatility &amp; Pip Size
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Prior Close
              </label>
              <input
                type="number"
                step="any"
                value={form.priorClose}
                onChange={(e) => update("priorClose", e.target.value)}
                placeholder="previous candle close"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
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

          <div className="grid grid-cols-3 gap-3">
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
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Pip size
              </label>
              <select
                value={form.pipSize}
                onChange={(e) => update("pipSize", parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                <option value={0.0001}>0.0001 (FX)</option>
                <option value={0.001}>0.001</option>
                <option value={0.01}>0.01 (VOL / Gold)</option>
                <option value={0.1}>0.1</option>
                <option value={1}>1.0</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Headway VOL pairs: 0.01
              </p>
            </div>
          </div>

          <div className={`p-3 rounded-lg border ${atr.color}`}>
            <p className="text-xs font-semibold">
              {atr.emoji} {atr.label}
            </p>
            <p className="text-xs opacity-90 mt-1">{atr.description}</p>
          </div>
        </div>

        {/* Active RB */}
        {activeRb && activeRbPosInfo && (
          <div
            className={`p-4 rounded-lg border space-y-2 ${activeRbPosInfo.color}`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs opacity-80">
                Active RB — the one price is approaching
              </p>
              <p className="text-xs opacity-80">
                CE {activeRbCe !== null ? formatPrice(activeRbCe) : "—"}
              </p>
            </div>
            <p className="text-lg font-bold">
              {activeRbPosInfo.emoji} {activeRbPosInfo.label}
            </p>
            <p className="text-sm opacity-90">{activeRbPosInfo.meaning}</p>
            <p className="text-xs opacity-80">
              Range: {activeRb.low} – {activeRb.high}
            </p>
          </div>
        )}

        {/* Verdict */}
        {negotiation && (
          <div className={`p-4 rounded-lg border space-y-2 ${verdict.color}`}>
            <p className="text-xs opacity-80">Verdict (active RB)</p>
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
              {flippedInfo && (
                <span
                  className={`text-xs px-2 py-1 rounded-full border font-bold ${flippedInfo.color}`}
                >
                  {flippedInfo.emoji} {flippedInfo.label}
                </span>
              )}
            </div>
            <p className="text-sm opacity-90">{verdict.description}</p>
          </div>
        )}

        {/* Conditions */}
        {negotiation && negotiation.verdict !== "WAIT" && condSummary && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-blue-400">
                Conditions{" "}
                {negotiation.verdict === "BUY" ? "Above" : "Below"}
              </h2>
              <div className="flex items-center gap-2">
                {flippedInfo && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full border font-bold ${flippedInfo.color}`}
                  >
                    {flippedInfo.emoji} {flippedInfo.label}
                  </span>
                )}
                <span
                  className={`text-xs px-2 py-1 rounded-full border font-semibold ${condSummary.color}`}
                >
                  {condSummary.emoji} {condSummary.label}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {flippedInfo
                ? flippedInfo.description
                : condSummary.description}
            </p>
            {(() => {
              const list =
                negotiation.verdict === "BUY"
                  ? conditions.above
                  : conditions.below;
              if (list.length === 0) {
                return (
                  <p className="text-xs text-gray-400 py-2">
                    No adjacent RBs in the path — clear runway.
                  </p>
                );
              }
              return (
                <div className="space-y-2">
                  {list.map((c, i) => (
                    <div
                      key={c.id || i}
                      className={`p-3 rounded-lg border ${c.tier.color}`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm font-bold">
                          {c.tier.emoji} {c.tier.label}
                        </span>
                        <span className="text-xs tabular-nums opacity-90">
                          {c.low} – {c.high} (CE {c.ce})
                        </span>
                      </div>
                      <p className="text-xs opacity-80 mt-1">
                        {c.tier.description}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Next Opportunity */}
        {reversal && nextTrade && (
          <div className="p-4 rounded-lg bg-gray-900 border-2 border-purple-700 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-bold text-purple-300">
                🔄 Next Opportunity — Reversal
              </h2>
              <span
                className={`text-xs px-2 py-1 rounded-full font-bold ${
                  nextTrade.direction === "BUY"
                    ? "bg-green-900/40 text-green-300"
                    : "bg-red-900/40 text-red-300"
                }`}
              >
                {nextTrade.direction}
              </span>
            </div>
            <p className="text-xs text-purple-200">{reversal.reason}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">New RB</p>
                <p className="font-bold tabular-nums">
                  {nextTrade.newRbLow} – {nextTrade.newRbHigh}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">New CE (Entry)</p>
                <p className="font-bold tabular-nums text-yellow-400">
                  {formatPrice(nextTrade.entry)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Stop Loss</p>
                <p className="font-bold tabular-nums text-red-400">
                  {formatPrice(nextTrade.sl)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Take Profit (2R)</p>
                <p className="font-bold tabular-nums text-green-400">
                  {formatPrice(nextTrade.tp)}
                </p>
              </div>
              {nextTradePips && (
                <>
                  <div>
                    <p className="text-xs text-gray-500">SL distance</p>
                    <p className="font-bold tabular-nums text-red-300">
                      {nextTradePips.slDistance} pips
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">TP distance</p>
                    <p className="font-bold tabular-nums text-green-300">
                      {nextTradePips.tpDistance} pips
                    </p>
                  </div>
                </>
              )}
            </div>
            {!isVisit && (
              <button
                type="button"
                onClick={handleSaveAsNewSetup}
                className="w-full py-3 rounded-lg bg-purple-800 hover:bg-purple-700 font-bold"
              >
                🔄 Save as New Setup
              </button>
            )}
          </div>
        )}

        {/* Trade Card */}
        {trade && (
          <div className="p-4 rounded-lg bg-gray-900 border border-blue-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-blue-400">
                Trade Parameters (active RB)
              </h2>
              <div className="flex items-center gap-2">
                {alignment && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-semibold ${alignment.color}`}
                  >
                    {alignment.label}
                  </span>
                )}
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
              {tradePips && (
                <>
                  <div>
                    <p className="text-xs text-gray-500">SL distance</p>
                    <p className="font-bold tabular-nums text-red-300">
                      {tradePips.slDistance} pips
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">TP distance</p>
                    <p className="font-bold tabular-nums text-green-300">
                      {tradePips.tpDistance} pips
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Pip size</p>
                    <p className="font-bold tabular-nums text-gray-300">
                      {tradePips.pipSize}
                    </p>
                  </div>
                </>
              )}
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
            ✅{" "}
            {isVisit ? "Visit logged" : isEdit ? "Updated" : "Saved"} —
            redirecting...
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={
            saving ||
            !negotiation ||
            negotiation.verdict === "WAIT" ||
            !activeRb
          }
          className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${
            isVisit
              ? "bg-purple-800 hover:bg-purple-700"
              : isEdit
              ? "bg-blue-700 hover:bg-blue-600"
              : negotiation?.verdict === "BUY"
              ? "bg-green-700 hover:bg-green-600"
              : negotiation?.verdict === "SELL"
              ? "bg-red-700 hover:bg-red-600"
              : "bg-gray-800"
          }`}
        >
          {saving
            ? "Saving..."
            : isVisit
            ? "📍 Log Visit"
            : isEdit
            ? "✏️ Update Setup"
            : negotiation?.verdict === "BUY"
            ? "✅ Save BUY Setup"
            : negotiation?.verdict === "SELL"
            ? "🔴 Save SELL Setup"
            : "Fill zone + RB + close to enable"}
        </button>
      </div>
    </main>
  );
}