"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import {
  SLD_TYPES,
  DOL_RANK_OPTIONS,
  POI_ZONE_TYPES,
  SLD_SESSIONS,
  evaluateSld,
} from "@/lib/sldEngine";
import { computeCe } from "@/lib/liquidityZoneEngine";
import PairPicker from "@/components/PairPicker";
import SldCard from "@/components/SldCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

function emptyCandle() { return { open: "", high: "", low: "", close: "" }; }
function emptyDol() {
  return {
    id: Math.random().toString(36).slice(2),
    type: "bsl",
    price: "",
    rank: "eqh_eql",
    note: "",
  };
}
function emptyPoi() {
  return {
    id: Math.random().toString(36).slice(2),
    type: "fvg",
    high: "",
    low: "",
    note: "",
  };
}

export default function SldPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "H4",
    sequenceType: "bullish",
    session: "london",
    // Layer 1
    d1Bias: "bullish",
    structureVerdict: "HH_HL",
    chochDetected: false,
    chochNote: "",
    quarterlyAligned: false,
    // Dealing range
    rangeHigh: "",
    rangeLow: "",
    currentPrice: "",
    // Layer 2
    sweepHappened: false,
    sweepLevel: "",
    bosConfirmed: false,
    bosLevel: "",
    pathClear: true,
    // Layer 3
    priceTapped: false,
    ltfChoch: false,
    ltfFvgEntry: false,
    // Layer 4
    partial2RTaken: false,
    breakevenSet: false,
    trailActive: false,
    trailLevel: "",
    tradeStatus: "pending",
    exitPrice: "",
    exitNote: "",
    // Layer 5
    nextDol: "",
    nextDolType: "bsl",
    reentryPossible: false,
    reentryNote: "",
    structureFlipped: false,
    // Trade
    pipSize: 1,
    notes: "",
  });

  const [sweepCandle, setSweepCandle] = useState(emptyCandle());
  const [bosCandle, setBosCandle] = useState(emptyCandle());
  const [triggerCandle, setTriggerCandle] = useState(emptyCandle());
  const [dolLevels, setDolLevels] = useState([emptyDol()]);
  const [poiZones, setPoiZones] = useState([emptyPoi()]);
  const [events, setEvents] = useState([]);

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

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: prof } = await supabase.from("profiles").select("account_size, risk_percent").eq("id", user.id).single();
      if (prof) {
        setAccountSize(prof.account_size || 0);
        setRiskPercent(prof.risk_percent || 1);
      }

      if (!isEdit) {
        const { count } = await supabase.from("sld_setups").select("*", { count: "exact", head: true }).eq("status", "draft");
        setDraftCount(count || 0);
        return;
      }

      setLoadingEdit(true);
      const { data: setupData, error: setupErr } = await supabase.from("sld_setups").select("*").eq("id", editId).maybeSingle();
      if (setupErr || !setupData) {
        setError(setupErr?.message || "SLD setup not found.");
        setLoadingEdit(false);
        return;
      }

      const { data: dolData } = await supabase.from("sld_dol_levels").select("*").eq("setup_id", setupData.id).order("created_at");
      const { data: poiData } = await supabase.from("sld_poi_zones").select("*").eq("setup_id", setupData.id).order("created_at");
      const { data: evData } = await supabase.from("sld_events").select("*").eq("setup_id", setupData.id).order("sequence_number");
      const { data: shotsData } = await supabase.from("sld_screenshots").select("*").eq("setup_id", setupData.id).order("created_at");

      setScreenshots(shotsData || []);

      setForm((f) => ({
        ...f,
        pair: setupData.pair || f.pair,
        timeframe: setupData.timeframe || f.timeframe,
        sequenceType: setupData.sequence_type || f.sequenceType,
        session: setupData.session || f.session,
        d1Bias: setupData.d1_bias || f.d1Bias,
        structureVerdict: setupData.structure_verdict || f.structureVerdict,
        chochDetected: setupData.choch_detected || false,
        chochNote: setupData.choch_note || "",
        quarterlyAligned: setupData.quarterly_aligned || false,
        rangeHigh: setupData.range_high?.toString?.() || "",
        rangeLow: setupData.range_low?.toString?.() || "",
        currentPrice: setupData.current_close?.toString?.() || "",
        sweepHappened: setupData.sweep_happened || false,
        sweepLevel: setupData.sweep_level?.toString?.() || "",
        bosConfirmed: setupData.bos_confirmed || false,
        bosLevel: setupData.bos_level?.toString?.() || "",
        pathClear: setupData.path_clear ?? true,
        priceTapped: setupData.price_tapped_poi || false,
        ltfChoch: setupData.ltf_choch_confirmed || false,
        ltfFvgEntry: setupData.ltf_fvg_entry || false,
        partial2RTaken: setupData.partial_2r_taken || false,
        breakevenSet: setupData.breakeven_set || false,
        trailActive: setupData.trail_active || false,
        trailLevel: setupData.trail_level?.toString?.() || "",
        tradeStatus: setupData.trade_status || "pending",
        exitPrice: setupData.exit_price?.toString?.() || "",
        exitNote: setupData.exit_note || "",
        nextDol: setupData.next_dol?.toString?.() || "",
        nextDolType: setupData.next_dol_type || "bsl",
        reentryPossible: setupData.reentry_possible || false,
        reentryNote: setupData.reentry_note || "",
        structureFlipped: false,
        pipSize: setupData.pip_size || 1,
        notes: setupData.notes || "",
      }));

      if (setupData.sweep_candle) {
        setSweepCandle({
          open: setupData.sweep_candle.open?.toString?.() || "",
          high: setupData.sweep_candle.high?.toString?.() || "",
          low: setupData.sweep_candle.low?.toString?.() || "",
          close: setupData.sweep_candle.close?.toString?.() || "",
        });
      }
      if (setupData.bos_candle) {
        setBosCandle({
          open: setupData.bos_candle.open?.toString?.() || "",
          high: setupData.bos_candle.high?.toString?.() || "",
          low: setupData.bos_candle.low?.toString?.() || "",
          close: setupData.bos_candle.close?.toString?.() || "",
        });
      }
      if (setupData.trigger_candle) {
        setTriggerCandle({
          open: setupData.trigger_candle.open?.toString?.() || "",
          high: setupData.trigger_candle.high?.toString?.() || "",
          low: setupData.trigger_candle.low?.toString?.() || "",
          close: setupData.trigger_candle.close?.toString?.() || "",
        });
      }

      if (dolData && dolData.length > 0) {
        setDolLevels(dolData.map((d) => ({
          id: Math.random().toString(36).slice(2),
          type: d.dol_type || "bsl",
          price: d.price?.toString?.() || "",
          rank: d.rank || "swing",
          note: d.note || "",
        })));
      }
      if (poiData && poiData.length > 0) {
        setPoiZones(poiData.map((p) => ({
          id: Math.random().toString(36).slice(2),
          type: p.zone_type || "fvg",
          high: p.zone_high?.toString?.() || "",
          low: p.zone_low?.toString?.() || "",
          note: p.note || "",
        })));
      }
      if (evData) setEvents(evData);

      setExistingSetupId(setupData.id);
      setLoadingEdit(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }
  function updateCandle(setter) { return (field, value) => setter((c) => ({ ...c, [field]: value })); }
  function updateDol(id, field, value) {
    setDolLevels((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  }
  function addDol() { setDolLevels((prev) => [...prev, emptyDol()]); }
  function removeDol(id) { setDolLevels((prev) => prev.filter((d) => d.id !== id)); }
  function updatePoi(id, field, value) {
    setPoiZones((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }
  function addPoi() { setPoiZones((prev) => [...prev, emptyPoi()]); }
  function removePoi(id) { setPoiZones((prev) => prev.filter((p) => p.id !== id)); }

  // Active DOL (first with a price)
  const activeDol = useMemo(() => {
    const withPrice = dolLevels.filter((d) => parseFloat(d.price) > 0);
    return withPrice[0] || null;
  }, [dolLevels]);

  const activePoi = useMemo(() => {
    const withRange = poiZones.filter((p) => parseFloat(p.high) > 0 && parseFloat(p.low) > 0);
    return withRange[0] || null;
  }, [poiZones]);

  const evaluation = useMemo(() => {
    return evaluateSld({
      sequenceType: form.sequenceType,
      pair: form.pair,
      timeframe: form.timeframe,
      // Layer 1
      d1Bias: form.d1Bias,
      structureVerdict: form.structureVerdict,
      chochDetected: form.chochDetected,
      quarterlyAligned: form.quarterlyAligned,
      dolType: activeDol?.type,
      dolPrice: activeDol?.price,
      dolRank: activeDol?.rank,
      currentPrice: form.currentPrice,
      // Layer 2
      sweepHappened: form.sweepHappened,
      sweepLevel: form.sweepLevel,
      bosConfirmed: form.bosConfirmed,
      bosLevel: form.bosLevel,
      poiZone: activePoi
        ? {
            type: activePoi.type,
            high: activePoi.high,
            low: activePoi.low,
          }
        : null,
      dealingRange: {
        high: form.rangeHigh,
        low: form.rangeLow,
      },
      pathClear: form.pathClear,
      // Layer 3
      priceTapped: form.priceTapped,
      ltfChoch: form.ltfChoch,
      ltfFvgEntry: form.ltfFvgEntry,
      // Layer 4
      partial2RTaken: form.partial2RTaken,
      breakevenSet: form.breakevenSet,
      trailActive: form.trailActive,
      trailLevel: form.trailLevel,
      tradeStatus: form.tradeStatus,
      // Layer 5
      nextDol: form.nextDol,
      nextDolType: form.nextDolType,
      structureFlipped: form.structureFlipped,
      // Trade
      pipSize: parseFloat(form.pipSize) || 1,
      accountSize,
      riskPercent,
    });
  }, [
    form, activeDol, activePoi, accountSize, riskPercent,
  ]);

  const warnings = useMemo(() => {
    const list = [];
    if (form.chochDetected) {
      list.push({
        key: "choch",
        label: "CHoCH detected",
        detail: "Structure may be flipping. Confirm bias before entering.",
      });
    }
    if (evaluation.trade && evaluation.trade.rr < 3) {
      list.push({
        key: "weak_rr",
        label: "RR below 3:1",
        detail: `SLD requires RR ≥ 3:1. Current RR: 1:${evaluation.trade.rr.toFixed(2)}.`,
      });
    }
    if (!form.pathClear) {
      list.push({
        key: "path_blocked",
        label: "Path to DOL blocked",
        detail: "An opposing PD array sits before the DOL. Price may stall there.",
      });
    }
    return list;
  }, [form, evaluation]);

  const hasAnyInput =
    form.d1Bias || activeDol || activePoi ||
    form.sweepHappened || form.bosConfirmed || form.priceTapped;

  async function saveSld({ isDraft }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); return null; }

    const trade = evaluation.trade;

    const payload = {
      user_id: user.id,
      pair: form.pair,
      timeframe: form.timeframe,
      sequence_type: form.sequenceType,
      status: isDraft ? "draft" : "complete",
      session: form.session || null,

      d1_bias: form.d1Bias || null,
      structure_verdict: form.structureVerdict || null,
      choch_detected: form.chochDetected,
      choch_note: form.chochNote || null,
      quarterly_aligned: form.quarterlyAligned,
      dol_type: activeDol?.type || null,
      dol_price: activeDol?.price ? parseFloat(activeDol.price) : null,
      dol_rank: activeDol?.rank || null,
      dol_strength: evaluation.dol?.dol?.strength || null,

      sweep_happened: form.sweepHappened,
      sweep_level: form.sweepLevel ? parseFloat(form.sweepLevel) : null,
      sweep_candle: {
        open: parseFloat(sweepCandle.open) || null,
        high: parseFloat(sweepCandle.high) || null,
        low: parseFloat(sweepCandle.low) || null,
        close: parseFloat(sweepCandle.close) || null,
      },
      bos_confirmed: form.bosConfirmed,
      bos_level: form.bosLevel ? parseFloat(form.bosLevel) : null,
      bos_candle: {
        open: parseFloat(bosCandle.open) || null,
        high: parseFloat(bosCandle.high) || null,
        low: parseFloat(bosCandle.low) || null,
        close: parseFloat(bosCandle.close) || null,
      },
      poi_zone_type: activePoi?.type || null,
      poi_zone_high: activePoi?.high ? parseFloat(activePoi.high) : null,
      poi_zone_low: activePoi?.low ? parseFloat(activePoi.low) : null,
      poi_zone_ce:
        activePoi?.high && activePoi?.low
          ? computeCe(parseFloat(activePoi.high), parseFloat(activePoi.low))
          : null,
      poi_in_correct_zone: evaluation.layer2?.gates?.find((g) => g.key === "zone")?.pass ?? null,
      path_clear: form.pathClear,

      price_tapped_poi: form.priceTapped,
      ltf_choch_confirmed: form.ltfChoch,
      ltf_fvg_entry: form.ltfFvgEntry,
      trigger_candle: {
        open: parseFloat(triggerCandle.open) || null,
        high: parseFloat(triggerCandle.high) || null,
        low: parseFloat(triggerCandle.low) || null,
        close: parseFloat(triggerCandle.close) || null,
      },

      entry: trade?.entry ?? null,
      sl: trade?.sl ?? null,
      tp: trade?.tp ?? null,
      rr: trade?.rr ?? null,
      lot_size: trade?.lotSize ?? null,
      risk_amount: trade?.riskAmount ?? null,
      pip_size: trade?.pipSize ?? (parseFloat(form.pipSize) || 1),
      sl_pips: trade?.slPips ?? null,
      tp_pips: trade?.tpPips ?? null,

      partial_2r_taken: form.partial2RTaken,
      breakeven_set: form.breakevenSet,
      trail_active: form.trailActive,
      trail_level: form.trailLevel ? parseFloat(form.trailLevel) : null,
      trade_status: form.tradeStatus || "pending",
      exit_price: form.exitPrice ? parseFloat(form.exitPrice) : null,
      exit_note: form.exitNote || null,

      next_dol: form.nextDol ? parseFloat(form.nextDol) : null,
      next_dol_type: form.nextDolType || null,
      reentry_possible: form.reentryPossible,
      reentry_note: form.reentryNote || null,

      notes: form.notes,
    };

    let setupRow;
    if (isEdit && existingSetupId) {
      const { data, error: updErr } = await supabase.from("sld_setups").update(payload).eq("id", existingSetupId).select().single();
      if (updErr) { setError(updErr.message); return null; }
      setupRow = data;
      await supabase.from("sld_dol_levels").delete().eq("setup_id", existingSetupId);
      await supabase.from("sld_poi_zones").delete().eq("setup_id", existingSetupId);
    } else {
      const { data, error: insErr } = await supabase.from("sld_setups").insert(payload).select().single();
      if (insErr) { setError(insErr.message); return null; }
      setupRow = data;
      setExistingSetupId(data.id);
    }

    // Save DOL levels
    const cleanDols = dolLevels
      .map((d) => ({
        type: d.type,
        price: parseFloat(d.price),
        rank: d.rank,
        note: d.note,
      }))
      .filter((d) => !isNaN(d.price));

    if (cleanDols.length > 0) {
      const rows = cleanDols.map((d, i) => ({
        user_id: user.id,
        setup_id: setupRow.id,
        pair: form.pair,
        dol_type: d.type,
        price: d.price,
        rank: d.rank,
        note: d.note,
        is_active: i === 0,
      }));
      const { error: dolErr } = await supabase.from("sld_dol_levels").insert(rows);
      if (dolErr) { setError(dolErr.message); return null; }
    }

    // Save POI zones
    const cleanPois = poiZones
      .map((p) => ({
        type: p.type,
        high: parseFloat(p.high),
        low: parseFloat(p.low),
        note: p.note,
      }))
      .filter((p) => !isNaN(p.high) && !isNaN(p.low) && p.high > p.low);

    if (cleanPois.length > 0) {
      const rows = cleanPois.map((p, i) => ({
        user_id: user.id,
        setup_id: setupRow.id,
        pair: form.pair,
        zone_type: p.type,
        zone_high: p.high,
        zone_low: p.low,
        zone_ce: computeCe(p.high, p.low),
        is_active: i === 0,
        note: p.note,
      }));
      const { error: poiErr } = await supabase.from("sld_poi_zones").insert(rows);
      if (poiErr) { setError(poiErr.message); return null; }
    }

    return setupRow;
  }

  async function handleSaveDraft() {
    if (!hasAnyInput) { setError("Fill something in first."); return; }
    setSavingDraft(true); setError("");
    const row = await saveSld({ isDraft: true });
    setSavingDraft(false);
    if (!row) return;
    setDraftSavedAt(new Date());
    setSaved(false);
  }

  async function handleSaveFinal() {
    if (!evaluation.preEntryReady) {
      setError("Layers 1–3 must all pass before saving as final.");
      return;
    }
    if (!evaluation.trade) { setError("Trade could not be computed."); return; }
    setSaving(true); setError("");
    const row = await saveSld({ isDraft: false });
    setSaving(false);
    if (!row) return;
    setDraftSavedAt(null);
    setSaved(true);
    setTimeout(() => router.push(`/sld/${row.id}`), 800);
  }

  if (loadingEdit && isEdit) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-gray-400">Loading SLD setup...</div>
      </main>
    );
  }

  const typeInfo = SLD_TYPES.find((t) => t.key === form.sequenceType);
  const canSaveFinal = evaluation.preEntryReady && evaluation.trade;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit ? "Edit SLD Setup" : "SLD — Structure → Liquidity → Delivery"}
          </h1>
          <p className="text-gray-400 text-sm">
            5-layer workflow. Bias → DOL → POI → Trigger → Manage.
          </p>
        </div>

        {!isEdit && draftCount > 0 && (
          <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-800 flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-yellow-200">
              📝 {draftCount} draft{draftCount === 1 ? "" : "s"} waiting.
            </p>
            <button type="button" onClick={() => router.push("/sld/journal")}
              className="text-xs px-3 py-1.5 rounded-lg bg-yellow-800 hover:bg-yellow-700 font-semibold">Open Journal</button>
          </div>
        )}

        {/* Context */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <PairPicker value={form.pair} onChange={(p) => update("pair", p)} label="Pair" />
            <div>
              <label className="block text-xs mb-1 text-gray-400">Timeframe</label>
              <select value={form.timeframe} onChange={(e) => update("timeframe", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="D1">D1</option><option value="H4">H4</option>
                <option value="H1">H1</option><option value="M30">M30</option>
                <option value="M15">M15</option><option value="M5">M5</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Type</label>
              <select value={form.sequenceType} onChange={(e) => update("sequenceType", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {SLD_TYPES.map((t) => (<option key={t.key} value={t.key}>{t.emoji} {t.label}</option>))}
              </select>
              {typeInfo && <p className="text-xs text-gray-500 mt-1">{typeInfo.hint}</p>}
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Session</label>
              <select value={form.session} onChange={(e) => update("session", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {SLD_SESSIONS.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
              </select>
            </div>
          </div>
        </div>

        {/* LAYER 1 */}
        <div className="p-4 rounded-lg bg-gray-900 border border-blue-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-blue-300">🌍 Layer 1 — Bias & DOL</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Daily Bias</label>
              <select value={form.d1Bias} onChange={(e) => update("d1Bias", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="bullish">🟢 Bullish</option>
                <option value="bearish">🔴 Bearish</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Structure</label>
              <select value={form.structureVerdict} onChange={(e) => update("structureVerdict", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="HH_HL">HH + HL (Bullish)</option>
                <option value="LH_LL">LH + LL (Bearish)</option>
                <option value="mixed">Mixed</option>
                <option value="choch">CHoCH</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Range High (Dealing Range)</label>
              <input type="number" step="any" value={form.rangeHigh} onChange={(e) => update("rangeHigh", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Range Low</label>
              <input type="number" step="any" value={form.rangeLow} onChange={(e) => update("rangeLow", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1 text-gray-400">Current Price</label>
            <input type="number" step="any" value={form.currentPrice} onChange={(e) => update("currentPrice", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
          </div>

          {/* CHoCH toggle */}
          <button type="button" onClick={() => update("chochDetected", !form.chochDetected)}
            className={`w-full text-left p-3 rounded-lg border transition ${
              form.chochDetected ? "bg-yellow-900/40 border-yellow-700" : "bg-black border-gray-800 hover:border-gray-600"}`}>
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                form.chochDetected ? "bg-yellow-500 border-yellow-500" : "border-gray-600"}`}>
                {form.chochDetected && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${form.chochDetected ? "text-yellow-200" : "text-white"}`}>
                  CHoCH detected
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Structure may be flipping — bias check needed</p>
              </div>
            </div>
          </button>

          {/* Quarterly alignment */}
          <button type="button" onClick={() => update("quarterlyAligned", !form.quarterlyAligned)}
            className={`w-full text-left p-3 rounded-lg border transition ${
              form.quarterlyAligned ? "bg-green-900/40 border-green-700" : "bg-black border-gray-800 hover:border-gray-600"}`}>
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                form.quarterlyAligned ? "bg-green-500 border-green-500" : "border-gray-600"}`}>
                {form.quarterlyAligned && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${form.quarterlyAligned ? "text-green-200" : "text-white"}`}>
                  Quarterly / HTF aligned (bonus)
                </p>
                <p className="text-xs text-gray-500 mt-0.5">DOL with the higher timeframe bias</p>
              </div>
            </div>
          </button>

          {/* DOL LEVELS */}
          <div className="space-y-2 pt-2 border-t border-blue-800/40">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-300">DOL Levels (BSL / SSL)</p>
              <button type="button" onClick={addDol}
                className="text-xs px-2 py-1 rounded bg-blue-900/40 text-blue-300 hover:bg-blue-800/40">+ Add DOL</button>
            </div>

            {dolLevels.map((d, i) => {
              const isActive = i === 0;
              return (
                <div key={d.id} className={`grid grid-cols-12 gap-2 items-end p-2 rounded border ${
                  isActive ? "bg-blue-950/20 border-blue-700 ring-1 ring-blue-700" : "bg-black border-gray-800"}`}>
                  <div className="col-span-3">
                    <label className="block text-xs mb-1 text-gray-500">Type</label>
                    <select value={d.type} onChange={(e) => updateDol(d.id, "type", e.target.value)}
                      className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs">
                      <option value="bsl">🔵 BSL</option>
                      <option value="ssl">🟠 SSL</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs mb-1 text-gray-500">Price</label>
                    <input type="number" step="any" value={d.price} onChange={(e) => updateDol(d.id, "price", e.target.value)}
                      className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs" />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs mb-1 text-gray-500">Rank</label>
                    <select value={d.rank} onChange={(e) => updateDol(d.id, "rank", e.target.value)}
                      className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs">
                      {DOL_RANK_OPTIONS.map((r) => (<option key={r.key} value={r.key}>{r.emoji} {r.label}</option>))}
                    </select>
                  </div>
                  <div className="col-span-2 text-right">
                    {dolLevels.length > 1 && (
                      <button type="button" onClick={() => removeDol(d.id)}
                        className="text-red-400 text-xs">✕</button>
                    )}
                    {isActive && <span className="block text-xs text-blue-300 font-semibold mt-1">active</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LAYER 2 */}
        <div className="p-4 rounded-lg bg-gray-900 border border-purple-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-purple-300">🎯 Layer 2 — POI (Entry Zone)</h2>

          {/* Sweep toggle */}
          <button type="button" onClick={() => update("sweepHappened", !form.sweepHappened)}
            className={`w-full text-left p-3 rounded-lg border transition ${
              form.sweepHappened ? "bg-purple-900/40 border-purple-700" : "bg-black border-gray-800"}`}>
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                form.sweepHappened ? "bg-purple-500 border-purple-500" : "border-gray-600"}`}>
                {form.sweepHappened && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${form.sweepHappened ? "text-purple-200" : "text-white"}`}>
                  Opposing liquidity swept
                </p>
              </div>
            </div>
          </button>

          {form.sweepHappened && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1 text-gray-400">Sweep Level</label>
                <input type="number" step="any" value={form.sweepLevel} onChange={(e) => update("sweepLevel", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
              </div>
            </div>
          )}

          {/* BOS toggle */}
          <button type="button" onClick={() => update("bosConfirmed", !form.bosConfirmed)}
            className={`w-full text-left p-3 rounded-lg border transition ${
              form.bosConfirmed ? "bg-purple-900/40 border-purple-700" : "bg-black border-gray-800"}`}>
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                form.bosConfirmed ? "bg-purple-500 border-purple-500" : "border-gray-600"}`}>
                {form.bosConfirmed && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${form.bosConfirmed ? "text-purple-200" : "text-white"}`}>
                  BOS confirmed in bias direction
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Close through structure, not just a wick</p>
              </div>
            </div>
          </button>

          {form.bosConfirmed && (
            <div>
              <label className="block text-xs mb-1 text-gray-400">BOS Level</label>
              <input type="number" step="any" value={form.bosLevel} onChange={(e) => update("bosLevel", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          )}

          {/* Path clear toggle */}
          <button type="button" onClick={() => update("pathClear", !form.pathClear)}
            className={`w-full text-left p-3 rounded-lg border transition ${
              form.pathClear ? "bg-green-900/30 border-green-700" : "bg-red-900/30 border-red-700"}`}>
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                form.pathClear ? "bg-green-500 border-green-500" : "border-red-500"}`}>
                {form.pathClear && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${form.pathClear ? "text-green-200" : "text-red-200"}`}>
                  Path to DOL is clear
                </p>
                <p className="text-xs text-gray-500 mt-0.5">No unmitigated opposing PD arrays in the way</p>
              </div>
            </div>
          </button>

          {/* POI ZONES */}
          <div className="space-y-2 pt-2 border-t border-purple-800/40">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-300">POI Zones (FVG / OB / Breaker)</p>
              <button type="button" onClick={addPoi}
                className="text-xs px-2 py-1 rounded bg-purple-900/40 text-purple-300 hover:bg-purple-800/40">+ Add POI</button>
            </div>

            {poiZones.map((p, i) => {
              const isActive = i === 0;
              return (
                <div key={p.id} className={`grid grid-cols-12 gap-2 items-end p-2 rounded border ${
                  isActive ? "bg-purple-950/20 border-purple-700 ring-1 ring-purple-700" : "bg-black border-gray-800"}`}>
                  <div className="col-span-3">
                    <label className="block text-xs mb-1 text-gray-500">Type</label>
                    <select value={p.type} onChange={(e) => updatePoi(p.id, "type", e.target.value)}
                      className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs">
                      {POI_ZONE_TYPES.map((t) => (<option key={t.key} value={t.key}>{t.emoji} {t.label}</option>))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs mb-1 text-gray-500">Low</label>
                    <input type="number" step="any" value={p.low} onChange={(e) => updatePoi(p.id, "low", e.target.value)}
                      className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs mb-1 text-gray-500">High</label>
                    <input type="number" step="any" value={p.high} onChange={(e) => updatePoi(p.id, "high", e.target.value)}
                      className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs" />
                  </div>
                  <div className="col-span-3 text-right">
                    {poiZones.length > 1 && (
                      <button type="button" onClick={() => removePoi(p.id)}
                        className="text-red-400 text-xs">✕</button>
                    )}
                    {isActive && <span className="block text-xs text-purple-300 font-semibold mt-1">active</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LAYER 3 */}
        <div className="p-4 rounded-lg bg-gray-900 border border-emerald-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-300">⚡ Layer 3 — Entry Trigger</h2>

          {[
            { key: "priceTapped", label: "Price tapped the POI" },
            { key: "ltfChoch", label: "Lower-TF CHoCH confirmed (5M)" },
            { key: "ltfFvgEntry", label: "Entry on LTF FVG/OB" },
          ].map((row) => (
            <button key={row.key} type="button"
              onClick={() => update(row.key, !form[row.key])}
              className={`w-full text-left p-3 rounded-lg border transition ${
                form[row.key] ? "bg-emerald-900/40 border-emerald-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                  form[row.key] ? "bg-emerald-500 border-emerald-500" : "border-gray-600"}`}>
                  {form[row.key] && <span className="text-black text-xs font-bold">✓</span>}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${form[row.key] ? "text-emerald-200" : "text-white"}`}>
                    {row.label}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* LAYER 4 — MANAGEMENT */}
        <div className="p-4 rounded-lg bg-gray-900 border border-cyan-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-cyan-300">🛠️ Layer 4 — Trade Management</h2>

          <div>
            <label className="block text-xs mb-1 text-gray-400">Trade Status</label>
            <select value={form.tradeStatus} onChange={(e) => update("tradeStatus", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="partial">Partial taken</option>
              <option value="closed_win">Closed — Win</option>
              <option value="closed_loss">Closed — Loss</option>
              <option value="invalidated">Invalidated</option>
            </select>
          </div>

          {[
            { key: "partial2RTaken", label: "50% partial taken at 2R" },
            { key: "breakevenSet", label: "Stop moved to break-even" },
            { key: "trailActive", label: "Trailing stop active" },
          ].map((row) => (
            <button key={row.key} type="button"
              onClick={() => update(row.key, !form[row.key])}
              className={`w-full text-left p-3 rounded-lg border transition ${
                form[row.key] ? "bg-cyan-900/40 border-cyan-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                  form[row.key] ? "bg-cyan-500 border-cyan-500" : "border-gray-600"}`}>
                  {form[row.key] && <span className="text-black text-xs font-bold">✓</span>}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${form[row.key] ? "text-cyan-200" : "text-white"}`}>
                    {row.label}
                  </p>
                </div>
              </div>
            </button>
          ))}

          {form.trailActive && (
            <div>
              <label className="block text-xs mb-1 text-gray-400">Trail Level</label>
              <input type="number" step="any" value={form.trailLevel} onChange={(e) => update("trailLevel", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          )}

          {form.tradeStatus.startsWith("closed") && (
            <div>
              <label className="block text-xs mb-1 text-gray-400">Exit Price</label>
              <input type="number" step="any" value={form.exitPrice} onChange={(e) => update("exitPrice", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          )}

          <div>
            <label className="block text-xs mb-1 text-gray-400">Exit Note</label>
            <input type="text" value={form.exitNote} onChange={(e) => update("exitNote", e.target.value)}
              placeholder="Why did you exit?" className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
          </div>
        </div>

        {/* LAYER 5 — DOL UPDATES */}
        <div className="p-4 rounded-lg bg-gray-900 border border-purple-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-purple-300">🔄 Layer 5 — DOL Updates</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Next DOL Price</label>
              <input type="number" step="any" value={form.nextDol} onChange={(e) => update("nextDol", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Next DOL Type</label>
              <select value={form.nextDolType} onChange={(e) => update("nextDolType", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="bsl">🔵 BSL</option>
                <option value="ssl">🟠 SSL</option>
              </select>
            </div>
          </div>

          <button type="button" onClick={() => update("structureFlipped", !form.structureFlipped)}
            className={`w-full text-left p-3 rounded-lg border transition ${
              form.structureFlipped ? "bg-red-900/40 border-red-700" : "bg-black border-gray-800"}`}>
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                form.structureFlipped ? "bg-red-500 border-red-500" : "border-gray-600"}`}>
                {form.structureFlipped && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${form.structureFlipped ? "text-red-200" : "text-white"}`}>
                  Structure flipped (no re-entry)
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Trade settings */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">Trade Settings</h2>
          <div>
            <label className="block text-xs mb-1 text-gray-400">Pip size</label>
            <select value={form.pipSize} onChange={(e) => update("pipSize", parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
              <option value={0.0001}>0.0001</option><option value={0.001}>0.001</option>
              <option value={0.01}>0.01</option><option value={0.1}>0.1</option>
              <option value={1}>1.0 (VOL)</option>
            </select>
          </div>
        </div>

        {/* CARD */}
        {hasAnyInput && <SldCard data={evaluation} warnings={warnings} />}

        {/* Screenshots */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-blue-400">📸 Chart Screenshots</h2>
            <p className="text-xs text-gray-500 mt-0.5">Attach chart images.</p>
          </div>
          <ScreenshotUploader setupId={existingSetupId} userId={userId} screenshots={screenshots} onChange={setScreenshots} />
          <ScreenshotGallery screenshots={screenshots} onDelete={(id) => setScreenshots((prev) => prev.filter((s) => s.id !== id))} />
        </div>

        {/* Notes */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <label className="block text-xs mb-1 text-gray-400">Notes</label>
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3}
            placeholder="Any observations..."
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 resize-none text-sm" />
        </div>

        {error && (<div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>)}

        {draftSavedAt && (
          <div className="p-3 rounded-lg bg-yellow-900/40 border border-yellow-700 text-yellow-100 text-sm">
            📝 Draft saved · {draftSavedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}

        {saved && (
          <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">
            ✅ Saved — redirecting...
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button type="button" onClick={handleSaveDraft} disabled={savingDraft || saving || !hasAnyInput}
            className="w-full py-4 rounded-lg font-bold disabled:opacity-50 bg-yellow-800 hover:bg-yellow-700 text-white">
            {savingDraft ? "Saving draft..." : "📝 Save Draft"}
          </button>
          <button type="button" onClick={handleSaveFinal} disabled={saving || savingDraft || !canSaveFinal}
            className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${canSaveFinal ? "bg-emerald-700 hover:bg-emerald-600" : "bg-gray-800"}`}>
            {saving ? "Saving..." : canSaveFinal ? "✅ Save as Final" : "💾 Layers 1–3 must pass"}
          </button>
        </div>
      </div>
    </main>
  );
}