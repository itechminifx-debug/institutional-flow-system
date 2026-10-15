"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import {
  LAYERS_TYPES,
  SESSIONS,
  evaluateLayers,
} from "@/lib/layersEngine";
import { computeCe } from "@/lib/liquidityZoneEngine";
import { computeEmaDirection } from "@/lib/verdictEngine";
import { computeIrlErl } from "@/lib/irlErlEngine";
import PairPicker from "@/components/PairPicker";
import LayersCard from "@/components/LayersCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

function emptyCandle() {
  return { open: "", high: "", low: "", close: "" };
}
function emptyZone() {
  return {
    id: Math.random().toString(36).slice(2),
    type: "fvg",
    high: "",
    low: "",
  };
}

export default function LayersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "H4",
    sequenceType: "bullish",
    // Layer 1
    dailyBias: "bullish",
    dealingRangeHigh: "",
    dealingRangeLow: "",
    currentClose: "",
    drawOnLiquidity: "bsl",
    drawPrice: "",
    // Layer 2
    sweepLevel: "",
    mssReference: "",
    // Layer 3
    session: "ny_am",
    // Trade
    pipSize: 1,
    notes: "",
  });

  const [sweepCandle, setSweepCandle] = useState(emptyCandle());
  const [displacementCandle, setDisplacementCandle] = useState(emptyCandle());
  const [entryCandle, setEntryCandle] = useState(emptyCandle());
  const [zones, setZones] = useState([emptyZone()]);

  const [accountSize, setAccountSize] = useState(0);
  const [riskPercent, setRiskPercent] = useState(1);
  const [userId, setUserId] = useState(null);
  const [screenshots, setScreenshots] = useState([]);

  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [error, setError] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [existingSetupId, setExistingSetupId] = useState(null);
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
      setUserId(user.id);

      const { data: prof } = await supabase
        .from("profiles")
        .select("account_size, risk_percent")
        .eq("id", user.id)
        .single();
      if (prof) {
        setAccountSize(prof.account_size || 0);
        setRiskPercent(prof.risk_percent || 1);
      }

      if (!isEdit) {
        const { count } = await supabase
          .from("layers_setups")
          .select("*", { count: "exact", head: true })
          .eq("status", "draft");
        setDraftCount(count || 0);
        return;
      }

      setLoadingEdit(true);

      const { data: setupData, error: setupErr } = await supabase
        .from("layers_setups")
        .select("*")
        .eq("id", editId)
        .maybeSingle();

      if (setupErr || !setupData) {
        setError(setupErr?.message || "Layers setup not found.");
        setLoadingEdit(false);
        return;
      }

      const { data: zoneData } = await supabase
        .from("layers_zones")
        .select("*")
        .eq("setup_id", setupData.id)
        .order("created_at", { ascending: true });

      const { data: shotsData } = await supabase
        .from("layers_screenshots")
        .select("*")
        .eq("setup_id", setupData.id)
        .order("created_at", { ascending: true });

      setScreenshots(shotsData || []);

      setForm((f) => ({
        ...f,
        pair: setupData.pair || f.pair,
        timeframe: setupData.timeframe || f.timeframe,
        sequenceType: setupData.sequence_type || f.sequenceType,
        dailyBias: setupData.daily_bias || f.dailyBias,
        dealingRangeHigh: setupData.dealing_range_high?.toString() || "",
        dealingRangeLow: setupData.dealing_range_low?.toString() || "",
        currentClose: setupData.sweep_candle?.close?.toString() || "",
        drawOnLiquidity: setupData.draw_on_liquidity || f.drawOnLiquidity,
        drawPrice: setupData.draw_price?.toString() || "",
        sweepLevel: setupData.sweep_level?.toString() || "",
        mssReference: setupData.mss_reference?.toString() || "",
        session: setupData.session || f.session,
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
      if (setupData.displacement_candle) {
        setDisplacementCandle({
          open: setupData.displacement_candle.open?.toString() || "",
          high: setupData.displacement_candle.high?.toString() || "",
          low: setupData.displacement_candle.low?.toString() || "",
          close: setupData.displacement_candle.close?.toString() || "",
        });
      }
      if (setupData.entry_candle) {
        setEntryCandle({
          open: setupData.entry_candle.open?.toString() || "",
          high: setupData.entry_candle.high?.toString() || "",
          low: setupData.entry_candle.low?.toString() || "",
          close: setupData.entry_candle.close?.toString() || "",
        });
      }

      if (zoneData && zoneData.length > 0) {
        setZones(
          zoneData.map((z) => ({
            id: Math.random().toString(36).slice(2),
            type: z.zone_type || "fvg",
            high: z.zone_high?.toString() || "",
            low: z.zone_low?.toString() || "",
          }))
        );
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
  function updateZone(id, field, value) {
    setZones((prev) =>
      prev.map((z) => (z.id === id ? { ...z, [field]: value } : z))
    );
  }
  function addZone() {
    setZones((prev) => [...prev, emptyZone()]);
  }
  function removeZone(id) {
    setZones((prev) => prev.filter((z) => z.id !== id));
  }

  // ----------------------------------------------------------
  // EVALUATION
  // ----------------------------------------------------------
  const evaluation = useMemo(() => {
    return evaluateLayers({
      sequenceType: form.sequenceType,
      pair: form.pair,
      timeframe: form.timeframe,
      // Layer 1
      dailyBias: form.dailyBias,
      dealingRangeHigh: form.dealingRangeHigh,
      dealingRangeLow: form.dealingRangeLow,
      currentClose: form.currentClose,
      drawOnLiquidity: form.drawOnLiquidity,
      drawPrice: form.drawPrice,
      // Layer 2
      sweepLevel: form.sweepLevel,
      sweepCandle,
      displacementCandle,
      mssReference: form.mssReference,
      zones,
      // Layer 3
      entryCandle,
      session: form.session,
      // Trade
      pipSize: parseFloat(form.pipSize) || 1,
      accountSize,
      riskPercent,
    });
  }, [
    form.sequenceType,
    form.pair,
    form.timeframe,
    form.dailyBias,
    form.dealingRangeHigh,
    form.dealingRangeLow,
    form.currentClose,
    form.drawOnLiquidity,
    form.drawPrice,
    form.sweepLevel,
    form.mssReference,
    form.session,
    form.pipSize,
    sweepCandle,
    displacementCandle,
    entryCandle,
    zones,
    accountSize,
    riskPercent,
  ]);

  const warnings = useMemo(() => {
    const list = [];

    // 1. Bias conflict with setup direction
    if (
      form.dailyBias &&
      form.dailyBias !== form.sequenceType
    ) {
      list.push({
        key: "bias_conflict",
        label: "Daily bias conflicts with setup",
        detail: `Bias is ${form.dailyBias}, setup is ${form.sequenceType}.`,
      });
    }

    // 2. Draw on liquidity doesn't match direction
    if (
      form.drawOnLiquidity &&
      ((form.sequenceType === "bullish" && form.drawOnLiquidity !== "bsl") ||
        (form.sequenceType === "bearish" && form.drawOnLiquidity !== "ssl"))
    ) {
      list.push({
        key: "draw_mismatch",
        label: "Draw on liquidity direction mismatch",
        detail: `${form.sequenceType} setups target ${
          form.sequenceType === "bullish" ? "BSL" : "SSL"
        }.`,
      });
    }

    // 3. Weak RR
    if (evaluation.trade && evaluation.trade.rr < 2) {
      list.push({
        key: "weak_rr",
        label: "Reward-to-risk below 2:1",
        detail: `RR is 1:${evaluation.trade.rr.toFixed(2)} — thin reward.`,
      });
    }

    return list;
  }, [form, evaluation]);

  const hasAnyInput =
    form.dailyBias ||
    form.dealingRangeHigh ||
    form.dealingRangeLow ||
    form.currentClose ||
    form.drawPrice ||
    form.sweepLevel ||
    form.mssReference ||
    sweepCandle.open ||
    sweepCandle.high ||
    sweepCandle.low ||
    sweepCandle.close ||
    displacementCandle.open ||
    displacementCandle.high ||
    displacementCandle.low ||
    displacementCandle.close ||
    entryCandle.open ||
    entryCandle.high ||
    entryCandle.low ||
    entryCandle.close ||
    zones.some((z) => z.high || z.low);

  // ----------------------------------------------------------
  // SAVE
  // ----------------------------------------------------------
  async function saveLayers({ isDraft }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated.");
      return null;
    }

    const trade = evaluation.trade;

    const payload = {
      user_id: user.id,
      pair: form.pair,
      timeframe: form.timeframe,
      sequence_type: form.sequenceType,
      status: isDraft ? "draft" : "complete",

      daily_bias: form.dailyBias || null,
      dealing_range_high: form.dealingRangeHigh
        ? parseFloat(form.dealingRangeHigh)
        : null,
      dealing_range_low: form.dealingRangeLow
        ? parseFloat(form.dealingRangeLow)
        : null,
      draw_on_liquidity: form.drawOnLiquidity || null,
      draw_price: form.drawPrice ? parseFloat(form.drawPrice) : null,

      sweep_level: form.sweepLevel ? parseFloat(form.sweepLevel) : null,
      sweep_candle: {
        open: parseFloat(sweepCandle.open) || null,
        high: parseFloat(sweepCandle.high) || null,
        low: parseFloat(sweepCandle.low) || null,
        close: parseFloat(sweepCandle.close) || null,
      },
      displacement_candle: {
        open: parseFloat(displacementCandle.open) || null,
        high: parseFloat(displacementCandle.high) || null,
        low: parseFloat(displacementCandle.low) || null,
        close: parseFloat(displacementCandle.close) || null,
      },
      mss_reference: form.mssReference
        ? parseFloat(form.mssReference)
        : null,

      entry_candle: {
        open: parseFloat(entryCandle.open) || null,
        high: parseFloat(entryCandle.high) || null,
        low: parseFloat(entryCandle.low) || null,
        close: parseFloat(entryCandle.close) || null,
      },
      session: form.session || null,
      reached_zone: evaluation.trigger.activeZone
        ? evaluation.trigger.activeZone.type || "fvg"
        : null,

      context_ready: evaluation.context.ready,
      setup_ready: evaluation.setup.ready,
      trigger_ready: evaluation.trigger.ready,
      verdict: evaluation.verdict,
      entry: trade?.entry ?? null,
      sl: trade?.sl ?? null,
      tp: trade?.tp ?? null,
      rr: trade?.rr ?? null,
      lot_size: trade?.lotSize ?? null,
      risk_amount: trade?.riskAmount ?? null,
      pip_size: trade?.pipSize ?? (parseFloat(form.pipSize) || 1),
      sl_pips: trade?.slPips ?? null,
      tp_pips: trade?.tpPips ?? null,

      context_score: evaluation.context.score,
      setup_score: evaluation.setup.score,
      trigger_score: evaluation.trigger.score,

      notes: form.notes,
    };

    let setupRow;
    if (isEdit && existingSetupId) {
      const { data, error: updErr } = await supabase
        .from("layers_setups")
        .update(payload)
        .eq("id", existingSetupId)
        .select()
        .single();
      if (updErr) {
        setError(updErr.message);
        return null;
      }
      setupRow = data;
      await supabase.from("layers_zones").delete().eq("setup_id", existingSetupId);
    } else {
      const { data, error: insErr } = await supabase
        .from("layers_setups")
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

    // Save zones
    const cleanZones = zones
      .map((z) => ({
        type: z.type || "fvg",
        high: parseFloat(z.high),
        low: parseFloat(z.low),
      }))
      .filter((z) => !isNaN(z.high) && !isNaN(z.low) && z.high > z.low);

    if (cleanZones.length > 0) {
      const zoneRows = cleanZones.map((z) => ({
        user_id: user.id,
        setup_id: setupRow.id,
        pair: form.pair,
        zone_type: z.type,
        zone_high: z.high,
        zone_low: z.low,
        zone_ce: computeCe(z.high, z.low),
        is_active: false,
      }));
      const { error: zoneErr } = await supabase
        .from("layers_zones")
        .insert(zoneRows);
      if (zoneErr) {
        setError(zoneErr.message);
        return null;
      }
    }

    return setupRow;
  }

  async function handleSaveDraft() {
    if (!hasAnyInput) {
      setError("Fill something in first before saving a draft.");
      return;
    }
    setSavingDraft(true);
    setError("");
    const row = await saveLayers({ isDraft: true });
    setSavingDraft(false);
    if (!row) return;
    setDraftSavedAt(new Date());
    setSaved(false);
  }

  async function handleSaveFinal() {
    if (!evaluation.allReady) {
      setError("All three layers must be green before saving as final.");
      return;
    }
    if (!evaluation.trade) {
      setError("Trade could not be computed.");
      return;
    }

    setSaving(true);
    setError("");

    const row = await saveLayers({ isDraft: false });

    setSaving(false);
    if (!row) return;

    setDraftSavedAt(null);
    setSaved(true);
    setTimeout(() => router.push(`/layers/${row.id}`), 800);
  }

  if (loadingEdit && isEdit) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-gray-400">
          Loading Layers setup...
        </div>
      </main>
    );
  }

  const typeInfo = LAYERS_TYPES.find((t) => t.key === form.sequenceType);
  const canSaveFinal = evaluation.allReady && evaluation.trade;

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit ? "Edit Layers Setup" : "Layers System"}
          </h1>
          <p className="text-gray-400 text-sm">
            Context → Setup → Trigger. Decide whether to trade — one layer at
            a time.
          </p>
        </div>

        {!isEdit && draftCount > 0 && (
          <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-800 flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-yellow-200">
              📝 You have <strong>{draftCount}</strong> draft
              {draftCount === 1 ? "" : "s"} waiting.
            </p>
            <button
              type="button"
              onClick={() => router.push("/layers/journal")}
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
                <option value="M5">M5</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1 text-gray-400">
              Direction
            </label>
            <select
              value={form.sequenceType}
              onChange={(e) => update("sequenceType", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            >
              {LAYERS_TYPES.map((t) => (
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

        {/* ================= LAYER 1 — CONTEXT ================= */}
        <div className="p-4 rounded-lg bg-gray-900 border-2 border-blue-800/60 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-blue-300">
              🌍 Layer 1 — Context
            </h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                evaluation.context.ready
                  ? "bg-green-900/40 text-green-300"
                  : "bg-yellow-900/40 text-yellow-300"
              }`}
            >
              {evaluation.context.ready ? "READY" : "WAIT"} ·{" "}
              {evaluation.context.score}%
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Where am I? — Bias, zone, draw on liquidity.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Daily Bias
              </label>
              <select
                value={form.dailyBias}
                onChange={(e) => update("dailyBias", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                <option value="bullish">🟢 Bullish</option>
                <option value="bearish">🔴 Bearish</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Current Close
              </label>
              <input
                type="number"
                step="any"
                value={form.currentClose}
                onChange={(e) => update("currentClose", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Dealing Range High
              </label>
              <input
                type="number"
                step="any"
                value={form.dealingRangeHigh}
                onChange={(e) => update("dealingRangeHigh", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Dealing Range Low
              </label>
              <input
                type="number"
                step="any"
                value={form.dealingRangeLow}
                onChange={(e) => update("dealingRangeLow", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Draw on Liquidity
              </label>
              <select
                value={form.drawOnLiquidity}
                onChange={(e) => update("drawOnLiquidity", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                <option value="bsl">🟢 Buy-Side (BSL)</option>
                <option value="ssl">🔴 Sell-Side (SSL)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Draw Price (target)
              </label>
              <input
                type="number"
                step="any"
                value={form.drawPrice}
                onChange={(e) => update("drawPrice", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* ================= LAYER 2 — SETUP ================= */}
        <div className="p-4 rounded-lg bg-gray-900 border-2 border-purple-800/60 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-purple-300">
              🎯 Layer 2 — Setup
            </h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                evaluation.setup.ready
                  ? "bg-green-900/40 text-green-300"
                  : "bg-yellow-900/40 text-yellow-300"
              }`}
            >
              {evaluation.setup.ready ? "READY" : "WAIT"} ·{" "}
              {evaluation.setup.score}%
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Where is the trap? — Sweep, displacement, zone.
          </p>

          <div>
            <label className="block text-xs mb-1 text-gray-400">
              Sweep Level (the level that was swept)
            </label>
            <input
              type="number"
              step="any"
              value={form.sweepLevel}
              onChange={(e) => update("sweepLevel", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-300 mb-2">
              Sweep Candle
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

          <div>
            <p className="text-xs font-semibold text-gray-300 mb-2">
              Displacement Candle (strong body after the sweep)
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
                    value={displacementCandle[f]}
                    onChange={(e) =>
                      updateCandle(setDisplacementCandle)(f, e.target.value)
                    }
                    className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1 text-gray-400">
              MSS Reference (optional)
            </label>
            <input
              type="number"
              step="any"
              value={form.mssReference}
              onChange={(e) => update("mssReference", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            />
          </div>

          {/* Zones */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-300">
                  Zones (FVG / RB / OB)
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Mark every zone where price may react.
                </p>
              </div>
              <button
                type="button"
                onClick={addZone}
                className="text-xs px-2 py-1 rounded bg-blue-900/40 text-blue-300 hover:bg-blue-800/40"
              >
                + Add Zone
              </button>
            </div>

            {zones.map((z, i) => (
              <div
                key={z.id}
                className="grid grid-cols-12 gap-2 items-end p-2 rounded border bg-black border-gray-800"
              >
                <div className="col-span-3">
                  <label className="block text-xs mb-1 text-gray-500">
                    Type
                  </label>
                  <select
                    value={z.type}
                    onChange={(e) =>
                      updateZone(z.id, "type", e.target.value)
                    }
                    className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs"
                  >
                    <option value="fvg">FVG</option>
                    <option value="rb">RB</option>
                    <option value="ob">OB</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-xs mb-1 text-gray-500">
                    Low
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={z.low}
                    onChange={(e) =>
                      updateZone(z.id, "low", e.target.value)
                    }
                    className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs mb-1 text-gray-500">
                    High
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={z.high}
                    onChange={(e) =>
                      updateZone(z.id, "high", e.target.value)
                    }
                    className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-gray-500">
                    Zone {i + 1}
                  </span>
                </div>
                <div className="col-span-1 text-right">
                  {zones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeZone(z.id)}
                      className="text-red-400 text-xs hover:text-red-300"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= LAYER 3 — TRIGGER ================= */}
        <div className="p-4 rounded-lg bg-gray-900 border-2 border-green-800/60 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-green-300">
              ⚡ Layer 3 — Trigger
            </h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                evaluation.trigger.ready
                  ? "bg-green-900/40 text-green-300"
                  : "bg-yellow-900/40 text-yellow-300"
              }`}
            >
              {evaluation.trigger.ready ? "ENTER" : "WAIT"} ·{" "}
              {evaluation.trigger.score}%
            </span>
          </div>
          <p className="text-xs text-gray-500">
            When do I enter? — Zone retest, close confirmation, session.
          </p>

          <div>
            <label className="block text-xs mb-1 text-gray-400">
              Session
            </label>
            <select
              value={form.session}
              onChange={(e) => update("session", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            >
              {SESSIONS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.emoji} {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-300 mb-2">
              Entry Candle (the triggering close)
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
                    value={entryCandle[f]}
                    onChange={(e) =>
                      updateCandle(setEntryCandle)(f, e.target.value)
                    }
                    className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Context — pip size */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            Trade Settings
          </h2>

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

        {/* THE CARD */}
        {hasAnyInput && (
          <LayersCard data={evaluation} warnings={warnings} />
        )}

        {/* Screenshots */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-blue-400">
              📸 Chart Screenshots
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Attach chart images to this Layers setup. Max 10 per setup.
            </p>
          </div>

          <ScreenshotUploader
            setupId={existingSetupId}
            userId={userId}
            screenshots={screenshots}
            onChange={setScreenshots}
          />

          <ScreenshotGallery
            screenshots={screenshots}
            onDelete={(id) =>
              setScreenshots((prev) => prev.filter((s) => s.id !== id))
            }
          />
        </div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || saving || !hasAnyInput}
            className="w-full py-4 rounded-lg font-bold disabled:opacity-50 bg-yellow-800 hover:bg-yellow-700 text-white"
          >
            {savingDraft ? "Saving draft..." : "📝 Save Draft"}
          </button>

          <button
            type="button"
            onClick={handleSaveFinal}
            disabled={saving || savingDraft || !canSaveFinal}
            className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${
              canSaveFinal
                ? "bg-green-700 hover:bg-green-600"
                : "bg-gray-800"
            }`}
          >
            {saving
              ? "Saving..."
              : canSaveFinal
              ? "✅ Save as Final"
              : "💾 All 3 layers must be green"}
          </button>
        </div>

        {!canSaveFinal && hasAnyInput && (
          <p className="text-xs text-yellow-300 text-center">
            Not complete yet — use <strong>Save Draft</strong> to keep your
            work. Come back anytime.
          </p>
        )}
      </div>
    </main>
  );
}