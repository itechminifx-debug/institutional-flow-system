"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
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
import PairPicker from "@/components/PairPicker";

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
    atrCurrent: "",
    atrPrior: "",
    notes: "",
  });

  const [candles, setCandles] = useState([emptyCandle(), emptyCandle()]);
  const [rbs, setRbs] = useState([emptyRb()]);

  const [manualAnswers, setManualAnswers] = useState({});
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Edit mode bookkeeping
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [existingZoneId, setExistingZoneId] = useState(null);
  const [existingZoneInfo, setExistingZoneInfo] = useState(null);

  // Load profile + (if editing) existing records
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

      // Load setup
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

      // Load zone detail
      const { data: zoneData } = await supabase
        .from("liquidity_zones")
        .select("*")
        .eq("setup_id", editId)
        .single();

      // Load RBs
      const { data: rbData } = await supabase
        .from("liquidity_zone_rbs")
        .select("*")
        .eq("zone_id", zoneData?.id)
        .order("created_at", { ascending: false });

      // Pre-fill form
      setForm((f) => ({
        ...f,
        pair: setupData.pair || f.pair,
        timeframe: zoneData?.timeframe || f.timeframe,
        zoneKind: zoneData?.zone_kind || f.zoneKind,
        closePrice: zoneData?.close_price?.toString() || "",
        atrCurrent: zoneData?.atr_current?.toString() || "",
        atrPrior: zoneData?.atr_prior?.toString() || "",
        notes: setupData.notes || "",
      }));

      // Pre-fill RBs (newest first = highest created_at)
      if (rbData && rbData.length > 0) {
        const restoredRbs = rbData.map((rb, idx) => ({
          id: Math.random().toString(36).slice(2),
          high: rb.rb_high?.toString() || "",
          low: rb.rb_low?.toString() || "",
          addedAt: rb.created_at || new Date(Date.now() - idx * 1000).toISOString(),
        }));
        setRbs(restoredRbs);
      }

      // Restore manual answers if saved
      if (zoneData?.checklist_answers) {
        const saved = zoneData.checklist_answers;
        const manual = {};
        Object.keys(saved).forEach((k) => {
          if (saved[k] === true) manual[k] = true;
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

  const negotiation = activeRb
    ? judgeZoneNegotiation({ activeRb, closePrice: form.closePrice })
    : null;
  const verdict = premiumDiscountVerdict(negotiation);

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
    close_clear: !!negotiation && negotiation.verdict !== "WAIT",
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

  // In edit mode, RBs alone are enough to compute (no candles needed)
  const canSave = isEdit
    ? !!activeRb && !!negotiation
    : !!zone && !!activeRb && !!negotiation;

  async function handleSave() {
    if (!canSave) {
      setError(
        isEdit
          ? "Fill in the RBs and close price first."
          : "Fill in the zone, RBs, and close price first."
      );
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
      setup_type: "liquidity_zone",
      d1_bias: negotiation.verdict === "BUY" ? "bullish" : "bearish",
      htf_bias: negotiation.verdict === "BUY" ? "bullish" : "bearish",
      ema50_position: "above",
      rejection_block_zone: `${activeRb.low}-${activeRb.high}`,
      ce_price: negotiation.ce,
      use_ce_entry: true,
      checklist_score: score,
      checklist_passed: checklistVerdict.passed,
      notes: form.notes,
    };

    let setup;

    if (isEdit) {
      // UPDATE setups
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
      // INSERT setups
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
      active_rb_ce: negotiation.ce,
      premium_discount: negotiation.side,
      verdict: negotiation.verdict,
      atr_current: form.atrCurrent ? parseFloat(form.atrCurrent) : null,
      atr_prior: form.atrPrior ? parseFloat(form.atrPrior) : null,
      atr_state: atr.key,
      checklist_score: score,
      checklist_passed: checklistVerdict.passed,
      checklist_answers: combinedAnswers,
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

      // Delete old RBs and re-insert (simplest reliable approach)
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

    // Insert RBs
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
            {isEdit ? "Edit Liquidity Zone" : "Liquidity Zone Negotiation"}
          </h1>
          <p className="text-gray-400 text-sm">
            {isEdit
              ? "Update the saved setup and re-save"
              : "A stack of rejected wicks — multiple RBs, one CE, one verdict"}
          </p>
        </div>

        {/* In edit mode: show the stored zone info as read-only reference */}
        {isEdit && existingZoneInfo && (
          <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900">
            <p className="text-xs text-blue-300 font-semibold mb-1">
              Stored zone (from original save)
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
            <p className="text-xs text-gray-500 mt-1">
              Candles aren't stored — re-enter them below if you want to
              rebuild the zone.
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
              <p className="text-xs text-gray-500">
                Built from {zone.count} candle{zone.count === 1 ? "" : "s"}
              </p>
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

          {rankedRbs.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-gray-800">
              {rankedRbs.map((rb) => {
                const info = rbRankInfo(rb.rank);
                const ce = computeCe(rb.high, rb.low);
                return (
                  <div
                    key={rb.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded border ${info.color}`}
                    >
                      {info.emoji} {info.label}
                    </span>
                    <span className="text-gray-400 tabular-nums">
                      {rb.low} – {rb.high} (CE {ce})
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Price + ATR */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">Negotiation</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Close Price
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

          {activeRb && activeRbCe !== null && (
            <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900">
              <p className="text-xs text-blue-300 font-semibold">
                Active RB — CE (negotiation line)
              </p>
              <p className="text-lg font-bold tabular-nums text-blue-200">
                {formatPrice(activeRbCe)}
              </p>
            </div>
          )}
        </div>

        {/* Verdict */}
        {negotiation && (
          <div className={`p-4 rounded-lg border space-y-2 ${verdict.color}`}>
            <p className="text-xs opacity-80">Verdict</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-2xl font-bold">
                {verdict.emoji} {verdict.label}
              </p>
              {negotiation.rbBroken === "up" && (
                <span className="text-xs px-2 py-1 rounded-full font-semibold bg-green-900/40 text-green-300">
                  RB broken ↑
                </span>
              )}
              {negotiation.rbBroken === "down" && (
                <span className="text-xs px-2 py-1 rounded-full font-semibold bg-red-900/40 text-red-300">
                  RB broken ↓
                </span>
              )}
            </div>
            <p className="text-sm opacity-90">{verdict.description}</p>
          </div>
        )}

        {/* Checklist */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-blue-400">
                The 10-Question Checklist
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Auto-detected where possible. Tap to override.
              </p>
            </div>
            <p
              className={`text-xl font-bold ${
                checklistVerdict.passed
                  ? "text-green-400"
                  : "text-yellow-400"
              }`}
            >
              {score}/10
            </p>
          </div>

          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                checklistVerdict.passed ? "bg-green-500" : "bg-yellow-500"
              }`}
              style={{ width: `${(score / 10) * 100}%` }}
            />
          </div>

          <div className={`p-3 rounded-lg border ${checklistVerdict.color}`}>
            <p className="text-sm font-bold">
              {checklistVerdict.emoji} {checklistVerdict.label}
            </p>
            <p className="text-xs opacity-90 mt-1">
              {checklistVerdict.description}
            </p>
          </div>

          <div className="space-y-2 pt-2">
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

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !canSave}
          className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${
            checklistVerdict.passed
              ? "bg-green-700 hover:bg-green-600"
              : "bg-yellow-800 hover:bg-yellow-700"
          }`}
        >
          {saving
            ? isEdit
              ? "Updating..."
              : "Saving..."
            : isEdit
            ? `✏️ Update Setup (${score}/10)`
            : checklistVerdict.passed
            ? `✅ Save & Trade (${score}/10)`
            : `💾 Save (${score}/10 — Needs ${
                LIQUIDITY_ZONE_PASS_THRESHOLD - score
              } More)`}
        </button>

        {/* Info card */}
        <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-900/50">
          <h3 className="text-xs font-semibold text-blue-300 mb-2">
            💡 How the Liquidity Zone Works
          </h3>
          <ul className="text-xs text-gray-300 space-y-1 ml-4 list-disc">
            <li>
              <strong>Zone</strong> — a stack of rejected wicks
            </li>
            <li>
              <strong>Multiple RBs</strong> — each wick is a target
            </li>
            <li>
              <strong>Current RB</strong> — first target (freshest orders)
            </li>
            <li>
              <strong>CE</strong> — 50% of the active RB = negotiation line
            </li>
            <li>
              <strong>Close above RB high</strong> — BUY (strong, RB broken ↑)
            </li>
            <li>
              <strong>Close below RB low</strong> — SELL (strong, RB broken ↓)
            </li>
            <li>
              <strong>Close in premium (inside RB)</strong> — SELL (normal)
            </li>
            <li>
              <strong>Close in discount (inside RB)</strong> — BUY (normal)
            </li>
            <li>
              <strong>ATR rising</strong> — trade. Falling — wait.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}