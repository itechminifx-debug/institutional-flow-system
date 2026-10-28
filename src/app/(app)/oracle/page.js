"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import {
  ORACLE_BIASES,
  ORACLE_STRUCTURES,
  ORACLE_BREAKS,
  ORACLE_SWEEPS,
  ORACLE_KILLZONES,
  evaluateOracle,
} from "@/lib/oracleEngine";
import { SETUP_TABLES, getSetupTableInfo, setupHref } from "@/lib/decksEngine";
import PairPicker from "@/components/PairPicker";
import OracleCard from "@/components/OracleCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

function OraclePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  // Preload link from URL (e.g. from a setup detail page)
  const preloadLinkTable = searchParams?.get("link_table") || null;
  const preloadLinkId = searchParams?.get("link_id") || null;
  const preloadLinkLabel = searchParams?.get("link_label") || null;

  const [form, setForm] = useState({
    pair: "Volatility 80",

    // Linked Setup
    linkedSetupTable: preloadLinkTable || null,
    linkedSetupId: preloadLinkId || null,
    linkedSetupLabel: preloadLinkLabel || null,

    // Weekly
    weeklyHigh: "",
    weeklyLow: "",
    weeklyBias: "bearish",

    // Daily
    dailyHigh: "",
    dailyLow: "",
    dailyBias: "bearish",
    dailyRangeHigh: "",
    dailyRangeLow: "",
    currentPrice: "",

    // 4H
    h4Structure: "LH_LL",
    h4Break: "choch",
    h4Displacement: false,
    h4Sweep: "none",

    // 1H
    h1FvgHigh: "",
    h1FvgLow: "",
    h1ObHigh: "",
    h1ObLow: "",
    h1Killzone: "london",

    // 15M
    m15Sweep: false,
    m15Mss: false,
    m15FvgHigh: "",
    m15FvgLow: "",

    // 5M
    m5Choch: false,
    m5Rejection: false,

    // 1M
    m1Choch: false,
    m1Rejection: false,

    // Execution
    entryPrice: "",
    stopLoss: "",
    tp1Price: "",
    targetPrice: "",

    // Meta
    notes: "",
  });

  const [userId, setUserId] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [existingId, setExistingId] = useState(null);

  // Link picker state
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [linkTable, setLinkTable] = useState(preloadLinkTable || "sld_setups");
  const [linkOptions, setLinkOptions] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      if (!isEdit) return;

      setLoading(true);
      const { data, error: loadErr } = await supabase
        .from("oracle_readings")
        .select("*")
        .eq("id", editId)
        .maybeSingle();

      if (loadErr || !data) {
        setError(loadErr?.message || "Oracle reading not found.");
        setLoading(false);
        return;
      }

      setForm({
        pair: data.pair || "Volatility 80",
        linkedSetupTable: data.linked_setup_table,
        linkedSetupId: data.linked_setup_id,
        linkedSetupLabel: data.linked_setup_label,
        weeklyHigh: data.weekly_high?.toString() || "",
        weeklyLow: data.weekly_low?.toString() || "",
        weeklyBias: data.weekly_bias || "bearish",
        dailyHigh: data.daily_high?.toString() || "",
        dailyLow: data.daily_low?.toString() || "",
        dailyBias: data.daily_bias || "bearish",
        dailyRangeHigh: data.daily_range_high?.toString() || "",
        dailyRangeLow: data.daily_range_low?.toString() || "",
        currentPrice: data.current_price?.toString() || "",
        h4Structure: data.h4_structure || "LH_LL",
        h4Break: data.h4_break || "choch",
        h4Displacement: data.h4_displacement || false,
        h4Sweep: data.h4_sweep || "none",
        h1FvgHigh: data.h1_fvg_high?.toString() || "",
        h1FvgLow: data.h1_fvg_low?.toString() || "",
        h1ObHigh: data.h1_ob_high?.toString() || "",
        h1ObLow: data.h1_ob_low?.toString() || "",
        h1Killzone: data.h1_killzone || "london",
        m15Sweep: data.m15_sweep || false,
        m15Mss: data.m15_mss || false,
        m15FvgHigh: data.m15_fvg_high?.toString() || "",
        m15FvgLow: data.m15_fvg_low?.toString() || "",
        m5Choch: data.m5_choch || false,
        m5Rejection: data.m5_rejection || false,
        m1Choch: data.m1_choch || false,
        m1Rejection: data.m1_rejection || false,
        entryPrice: data.entry_price?.toString() || "",
        stopLoss: data.stop_loss?.toString() || "",
        tp1Price: data.tp1_price?.toString() || "",
        targetPrice: data.target_price?.toString() || "",
        notes: data.notes || "",
      });

      const { data: shotsData } = await supabase
        .from("oracle_screenshots")
        .select("*")
        .eq("reading_id", data.id)
        .order("created_at");
      setScreenshots(shotsData || []);

      setExistingId(data.id);
      setLoading(false);
    }
    load();
  }, [editId, isEdit, supabase]);

  // Load link options
  useEffect(() => {
    async function loadLinks() {
      if (!showLinkPicker) return;
      setLoadingLinks(true);
      const { data } = await supabase
        .from(linkTable)
        .select("id, pair, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      setLinkOptions(data || []);
      setLoadingLinks(false);
    }
    loadLinks();
  }, [linkTable, showLinkPicker, supabase]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function pickLinkedSetup(setup) {
    update("linkedSetupTable", linkTable);
    update("linkedSetupId", setup.id);
    update("linkedSetupLabel", setup.pair || "Setup");
    setShowLinkPicker(false);
  }

  function clearLinkedSetup() {
    update("linkedSetupTable", null);
    update("linkedSetupId", null);
    update("linkedSetupLabel", null);
  }

  const evaluation = useMemo(() => {
    return evaluateOracle({
      weeklyBias: form.weeklyBias,
      dailyBias: form.dailyBias,
      dailyRangeHigh: form.dailyRangeHigh,
      dailyRangeLow: form.dailyRangeLow,
      currentPrice: form.currentPrice,
      h4Structure: form.h4Structure,
      h4Break: form.h4Break,
      h4Displacement: form.h4Displacement,
      h4Sweep: form.h4Sweep,
      h1FvgHigh: form.h1FvgHigh,
      h1FvgLow: form.h1FvgLow,
      h1Killzone: form.h1Killzone,
      m15Sweep: form.m15Sweep,
      m15Mss: form.m15Mss,
      m15FvgHigh: form.m15FvgHigh,
      m15FvgLow: form.m15FvgLow,
      m5Choch: form.m5Choch,
      m5Rejection: form.m5Rejection,
      m1Choch: form.m1Choch,
      m1Rejection: form.m1Rejection,
      entryPrice: form.entryPrice,
      stopLoss: form.stopLoss,
      tp1Price: form.tp1Price,
      targetPrice: form.targetPrice,
    });
  }, [form]);

  // Enrich for card visuals
  const cardData = useMemo(() => {
    return {
      ...evaluation,
      entryPrice: form.entryPrice,
      stopLoss: form.stopLoss,
      tp1Price: form.tp1Price,
      targetPrice: form.targetPrice,
    };
  }, [evaluation, form]);

  async function saveReading({ isDraft }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); return null; }

    const payload = {
      user_id: user.id,
      pair: form.pair,
      status: isDraft ? "draft" : "complete",

      linked_setup_table: form.linkedSetupTable,
      linked_setup_id: form.linkedSetupId,
      linked_setup_label: form.linkedSetupLabel,

      weekly_high: form.weeklyHigh ? parseFloat(form.weeklyHigh) : null,
      weekly_low: form.weeklyLow ? parseFloat(form.weeklyLow) : null,
      weekly_bias: form.weeklyBias,

      daily_high: form.dailyHigh ? parseFloat(form.dailyHigh) : null,
      daily_low: form.dailyLow ? parseFloat(form.dailyLow) : null,
      daily_bias: form.dailyBias,
      daily_range_high: form.dailyRangeHigh ? parseFloat(form.dailyRangeHigh) : null,
      daily_range_low: form.dailyRangeLow ? parseFloat(form.dailyRangeLow) : null,
      current_price: form.currentPrice ? parseFloat(form.currentPrice) : null,
      daily_zone: evaluation.daily.zone,

      h4_structure: form.h4Structure,
      h4_break: form.h4Break,
      h4_displacement: form.h4Displacement,
      h4_sweep: form.h4Sweep,

      h1_fvg_high: form.h1FvgHigh ? parseFloat(form.h1FvgHigh) : null,
      h1_fvg_low: form.h1FvgLow ? parseFloat(form.h1FvgLow) : null,
      h1_ob_high: form.h1ObHigh ? parseFloat(form.h1ObHigh) : null,
      h1_ob_low: form.h1ObLow ? parseFloat(form.h1ObLow) : null,
      h1_killzone: form.h1Killzone,

      m15_sweep: form.m15Sweep,
      m15_mss: form.m15Mss,
      m15_fvg_high: form.m15FvgHigh ? parseFloat(form.m15FvgHigh) : null,
      m15_fvg_low: form.m15FvgLow ? parseFloat(form.m15FvgLow) : null,

      m5_choch: form.m5Choch,
      m5_rejection: form.m5Rejection,

      m1_choch: form.m1Choch,
      m1_rejection: form.m1Rejection,

      entry_price: form.entryPrice ? parseFloat(form.entryPrice) : null,
      stop_loss: form.stopLoss ? parseFloat(form.stopLoss) : null,
      tp1_price: form.tp1Price ? parseFloat(form.tp1Price) : null,
      target_price: form.targetPrice ? parseFloat(form.targetPrice) : null,

      prediction: evaluation.prediction,
      confidence: evaluation.confidence,
      probability: evaluation.probability,
      layer_scores: evaluation.layerScores,
      narrative: evaluation.narrative,
      warnings: evaluation.warnings,
      doctrine_score: evaluation.doctrineScore,
      notes: form.notes,
    };

    let row;
    if (isEdit && existingId) {
      const { data, error: updErr } = await supabase
        .from("oracle_readings")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existingId)
        .select()
        .single();
      if (updErr) { setError(updErr.message); return null; }
      row = data;
    } else {
      const { data, error: insErr } = await supabase
        .from("oracle_readings")
        .insert(payload)
        .select()
        .single();
      if (insErr) { setError(insErr.message); return null; }
      row = data;
      setExistingId(data.id);
    }

    return row;
  }

  async function handleSaveDraft() {
    setSavingDraft(true); setError("");
    const row = await saveReading({ isDraft: true });
    setSavingDraft(false);
    if (!row) return;
    setSaved(true);
    setTimeout(() => router.push(`/oracle/${row.id}`), 800);
  }

  async function handleSaveFinal() {
    if (evaluation.layersPassed < 5) {
      setError("At least 5 of the 8 layers must pass to save as Final.");
      return;
    }
    setSaving(true); setError("");
    const row = await saveReading({ isDraft: false });
    setSaving(false);
    if (!row) return;
    setSaved(true);
    setTimeout(() => router.push(`/oracle/${row.id}`), 800);
  }

  async function ensureSetupSaved() {
    if (existingId) return existingId;
    const row = await saveReading({ isDraft: true });
    if (!row) throw new Error("Failed to save draft before uploading screenshot.");
    return row.id;
  }

  if (loading && isEdit) {
    return <div className="p-6 text-gray-400">Loading Oracle reading...</div>;
  }

  const canSaveFinal = evaluation.layersPassed >= 5;

  const linkedTableInfo = getSetupTableInfo(form.linkedSetupTable);

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? "Edit Oracle Reading" : "🧠 IFS Oracle"}</h1>
          <p className="text-gray-400 text-sm">Read the full chart from Weekly to 1M.</p>
        </div>

        {/* Meta */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <PairPicker value={form.pair} onChange={(p) => update("pair", p)} label="Pair" />

          {/* Linked setup */}
          <div>
            <label className="block text-xs mb-1 text-gray-400">Linked Setup (optional)</label>
            {form.linkedSetupId && linkedTableInfo ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-950/30 border border-amber-800">
                <span className="text-xs text-amber-200 flex-1">
                  🔗 {linkedTableInfo.emoji} {linkedTableInfo.label} · {form.linkedSetupLabel}
                </span>
                <button type="button" onClick={clearLinkedSetup} className="text-xs text-red-400 hover:text-red-300">✕</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLinkPicker(true)}
                className="w-full text-left px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm text-gray-400 hover:border-gray-600"
              >
                + Link to a trading setup
              </button>
            )}
          </div>
        </div>

        {/* Link picker modal */}
        {showLinkPicker && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowLinkPicker(false)}>
            <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-3 border-b border-gray-800 flex items-center justify-between">
                <p className="text-sm font-bold">Link a Setup</p>
                <button type="button" onClick={() => setShowLinkPicker(false)} className="text-gray-400 hover:text-white text-sm">✕</button>
              </div>
              <div className="p-3 border-b border-gray-800">
                <select value={linkTable} onChange={(e) => setLinkTable(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                  {SETUP_TABLES.map(t => (
                    <option key={t.key} value={t.key}>{t.emoji} {t.label} System</option>
                  ))}
                </select>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                {loadingLinks && <p className="text-center text-xs text-gray-500 py-4">Loading...</p>}
                {!loadingLinks && linkOptions.length === 0 && (
                  <p className="text-center text-xs text-gray-500 py-4">No setups in this system yet.</p>
                )}
                {!loadingLinks && linkOptions.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => pickLinkedSetup(opt)}
                    className="w-full text-left p-2 rounded border border-gray-800 hover:border-amber-700 mb-1 text-xs"
                  >
                    <span className="font-bold text-white">{opt.pair || "Untitled"}</span>
                    <span className="text-gray-500 ml-2">· {new Date(opt.created_at).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* LAYER 1 & 2: WEEKLY + DAILY */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-blue-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-blue-300">🌍 Layer 1 & 2 — Weekly & Daily Context</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Weekly Bias</label>
              <select value={form.weeklyBias} onChange={(e) => update("weeklyBias", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {ORACLE_BIASES.map(b => <option key={b.key} value={b.key}>{b.emoji} {b.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Daily Bias</label>
              <select value={form.dailyBias} onChange={(e) => update("dailyBias", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {ORACLE_BIASES.filter(b => b.key !== "range").map(b => <option key={b.key} value={b.key}>{b.emoji} {b.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">Weekly High</label><input type="number" step="any" value={form.weeklyHigh} onChange={(e) => update("weeklyHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">Weekly Low</label><input type="number" step="any" value={form.weeklyLow} onChange={(e) => update("weeklyLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">Daily Range High</label><input type="number" step="any" value={form.dailyRangeHigh} onChange={(e) => update("dailyRangeHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">Daily Range Low</label><input type="number" step="any" value={form.dailyRangeLow} onChange={(e) => update("dailyRangeLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">Current Price</label><input type="number" step="any" value={form.currentPrice} onChange={(e) => update("currentPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* LAYER 3: 4H STRUCTURE */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-purple-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-purple-300">📊 Layer 3 — 4H Structure</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Structure</label>
              <select value={form.h4Structure} onChange={(e) => update("h4Structure", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {ORACLE_STRUCTURES.map(s => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Last Break</label>
              <select value={form.h4Break} onChange={(e) => update("h4Break", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {ORACLE_BREAKS.map(b => <option key={b.key} value={b.key}>{b.emoji} {b.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => update("h4Displacement", !form.h4Displacement)} className={`text-left p-2 rounded-lg border transition ${form.h4Displacement ? "bg-purple-900/40 border-purple-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.h4Displacement ? "bg-purple-500 border-purple-500" : "border-gray-600"}`}>
                  {form.h4Displacement && <span className="text-black text-[10px] font-bold">✓</span>}
                </div>
                <p className={`text-xs font-bold ${form.h4Displacement ? "text-purple-200" : "text-gray-400"}`}>Displacement Present</p>
              </div>
            </button>

            <div>
              <label className="block text-xs mb-1 text-gray-400">4H Sweep</label>
              <select value={form.h4Sweep} onChange={(e) => update("h4Sweep", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {ORACLE_SWEEPS.map(s => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* LAYER 4: 1H FVG & KILLZONE */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-cyan-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-cyan-300">⏱️ Layer 4 — 1H FVG & Killzone</h2>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">1H FVG High</label><input type="number" step="any" value={form.h1FvgHigh} onChange={(e) => update("h1FvgHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">1H FVG Low</label><input type="number" step="any" value={form.h1FvgLow} onChange={(e) => update("h1FvgLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>

          <div>
            <label className="block text-xs mb-1 text-gray-400">Killzone</label>
            <select value={form.h1Killzone} onChange={(e) => update("h1Killzone", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
              {ORACLE_KILLZONES.map(k => <option key={k.key} value={k.key}>{k.emoji} {k.label}</option>)}
            </select>
          </div>
        </div>

        {/* ============================================================ */}
        {/* LAYER 5: 15M TRAP */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-orange-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-orange-300">🪤 Layer 5 — 15M Trap</h2>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => update("m15Sweep", !form.m15Sweep)} className={`text-left p-2 rounded-lg border transition ${form.m15Sweep ? "bg-orange-900/40 border-orange-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.m15Sweep ? "bg-orange-500 border-orange-500" : "border-gray-600"}`}>
                  {form.m15Sweep && <span className="text-black text-[10px] font-bold">✓</span>}
                </div>
                <p className={`text-xs font-bold ${form.m15Sweep ? "text-orange-200" : "text-gray-400"}`}>15M Sweep</p>
              </div>
            </button>
            <button type="button" onClick={() => update("m15Mss", !form.m15Mss)} className={`text-left p-2 rounded-lg border transition ${form.m15Mss ? "bg-orange-900/40 border-orange-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.m15Mss ? "bg-orange-500 border-orange-500" : "border-gray-600"}`}>
                  {form.m15Mss && <span className="text-black text-[10px] font-bold">✓</span>}
                </div>
                <p className={`text-xs font-bold ${form.m15Mss ? "text-orange-200" : "text-gray-400"}`}>15M MSS</p>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">15M FVG High</label><input type="number" step="any" value={form.m15FvgHigh} onChange={(e) => update("m15FvgHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">15M FVG Low</label><input type="number" step="any" value={form.m15FvgLow} onChange={(e) => update("m15FvgLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* LAYER 6 & 7: 5M & 1M TRIGGERS */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-emerald-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-300">⚡ Layer 6 & 7 — 5M & 1M Triggers</h2>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => update("m5Choch", !form.m5Choch)} className={`text-left p-2 rounded-lg border transition ${form.m5Choch ? "bg-emerald-900/40 border-emerald-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.m5Choch ? "bg-emerald-500 border-emerald-500" : "border-gray-600"}`}>
                  {form.m5Choch && <span className="text-black text-[10px] font-bold">✓</span>}
                </div>
                <p className={`text-xs font-bold ${form.m5Choch ? "text-emerald-200" : "text-gray-400"}`}>5M CHoCH</p>
              </div>
            </button>
            <button type="button" onClick={() => update("m5Rejection", !form.m5Rejection)} className={`text-left p-2 rounded-lg border transition ${form.m5Rejection ? "bg-emerald-900/40 border-emerald-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.m5Rejection ? "bg-emerald-500 border-emerald-500" : "border-gray-600"}`}>
                  {form.m5Rejection && <span className="text-black text-[10px] font-bold">✓</span>}
                </div>
                <p className={`text-xs font-bold ${form.m5Rejection ? "text-emerald-200" : "text-gray-400"}`}>5M Rejection</p>
              </div>
            </button>
            <button type="button" onClick={() => update("m1Choch", !form.m1Choch)} className={`text-left p-2 rounded-lg border transition ${form.m1Choch ? "bg-emerald-900/40 border-emerald-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.m1Choch ? "bg-emerald-500 border-emerald-500" : "border-gray-600"}`}>
                  {form.m1Choch && <span className="text-black text-[10px] font-bold">✓</span>}
                </div>
                <p className={`text-xs font-bold ${form.m1Choch ? "text-emerald-200" : "text-gray-400"}`}>1M CHoCH</p>
              </div>
            </button>
            <button type="button" onClick={() => update("m1Rejection", !form.m1Rejection)} className={`text-left p-2 rounded-lg border transition ${form.m1Rejection ? "bg-emerald-900/40 border-emerald-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.m1Rejection ? "bg-emerald-500 border-emerald-500" : "border-gray-600"}`}>
                  {form.m1Rejection && <span className="text-black text-[10px] font-bold">✓</span>}
                </div>
                <p className={`text-xs font-bold ${form.m1Rejection ? "text-emerald-200" : "text-gray-400"}`}>1M Rejection</p>
              </div>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* LAYER 8: EXECUTION */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-700/60 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300">💰 Layer 8 — Execution</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">Entry</label><input type="number" step="any" value={form.entryPrice} onChange={(e) => update("entryPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">Stop Loss</label><input type="number" step="any" value={form.stopLoss} onChange={(e) => update("stopLoss", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">TP1 (Partial)</label><input type="number" step="any" value={form.tp1Price} onChange={(e) => update("tp1Price", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">Final DOL</label><input type="number" step="any" value={form.targetPrice} onChange={(e) => update("targetPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>
        </div>

        {/* LIVE ORACLE CARD */}
        <div className="pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-bold">Live Oracle Reading</p>
          {evaluation && <OracleCard data={cardData} />}
        </div>

        {/* SCREENSHOTS */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <ScreenshotUploader setupId={existingId} userId={userId} screenshots={screenshots} onChange={setScreenshots} table="oracle_screenshots" onEnsureSetup={ensureSetupSaved} />
          <ScreenshotGallery screenshots={screenshots} onDelete={(id) => setScreenshots(prev => prev.filter(s => s.id !== id))} table="oracle_screenshots" />
        </div>

        {/* NOTES */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <label className="block text-xs mb-1 text-gray-400">Notes</label>
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 resize-none text-sm" />
        </div>

        {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}
        {saved && <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">✅ Saved — redirecting...</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || saving}
            className="w-full py-4 rounded-lg font-bold disabled:opacity-50 bg-yellow-800 hover:bg-yellow-700 text-white"
          >
            {savingDraft ? "Saving..." : "📝 Save Draft"}
          </button>
          <button
            type="button"
            onClick={handleSaveFinal}
            disabled={saving || savingDraft || !canSaveFinal}
            className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${
              canSaveFinal ? "bg-indigo-700 hover:bg-indigo-600" : "bg-gray-800"
            }`}
          >
            {saving ? "Saving..." : canSaveFinal ? "✅ Save as Final" : `💾 ${evaluation.layersPassed}/8 layers (need 5+)`}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function OraclePage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 bg-black text-white"><div className="max-w-4xl mx-auto text-gray-400">Loading Oracle...</div></main>}>
      <OraclePageContent />
    </Suspense>
  );
}