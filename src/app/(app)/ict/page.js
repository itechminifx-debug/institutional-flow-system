"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import {
  ICT_SESSIONS,
  ICT_STRUCTURES,
  ICT_BREAKS,
  ICT_LIQUIDITY_TYPES,
  ICT_SWEEP_TYPES,
  ICT_ARRAY_TYPES,
  ICT_MACROS,
  ICT_AMD_PHASES,
  evaluateIct,
} from "@/lib/ictEngine";
import PairPicker from "@/components/PairPicker";
import IctCard from "@/components/IctCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

function IctPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "M15",

    // Phase 1: Context & Structure
    htfBias: "bearish",
    ltfAligned: false,
    structureVerdict: "LH_LL",
    structuralBreak: "choch",
    displacementPresent: false,
    rangeHigh: "",
    rangeLow: "",
    currentPrice: "",
    chochNotes: "",

    // Phase 2: Liquidity
    sweepHappened: false,
    sweepType: "none",
    sweepLevel: "",
    drawOnLiquidity: "unknown",
    dolLevel: "",
    dolNotes: "",

    // Phase 3: PD Arrays
    arrayType: "fvg",
    arrayHigh: "",
    arrayLow: "",
    arrayZone: "premium",
    arrayConfluenceNotes: "",

    // Phase 4: Time & Model
    session: "london",
    inKillZone: false,
    macroWindow: "none",
    amdPhase: "manipulation",
    modelFullChecked: false,

    // Execution
    entryPrice: "",
    stopLoss: "",
    targetPrice: "",

    // Meta
    notes: "",
    tradeResult: "",
  });

  const [userId, setUserId] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [existingId, setExistingId] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      if (!isEdit) return;

      setLoading(true);
      const { data, error: loadErr } = await supabase
        .from("ict_setups")
        .select("*")
        .eq("id", editId)
        .maybeSingle();

      if (loadErr || !data) {
        setError(loadErr?.message || "ICT setup not found.");
        setLoading(false);
        return;
      }

      setForm({
        pair: data.pair || "Volatility 80",
        timeframe: data.timeframe || "M15",
        htfBias: data.htf_bias || "bearish",
        ltfAligned: data.ltf_aligned || false,
        structureVerdict: data.structure_verdict || "LH_LL",
        structuralBreak: data.structural_break || "choch",
        displacementPresent: data.displacement_present || false,
        rangeHigh: data.range_high?.toString() || "",
        rangeLow: data.range_low?.toString() || "",
        currentPrice: data.current_price?.toString() || "",
        chochNotes: data.choch_notes || "",
        sweepHappened: data.sweep_happened || false,
        sweepType: data.sweep_type || "none",
        sweepLevel: data.sweep_level?.toString() || "",
        drawOnLiquidity: data.draw_on_liquidity || "unknown",
        dolLevel: data.dol_level?.toString() || "",
        dolNotes: data.dol_notes || "",
        arrayType: data.array_type || "fvg",
        arrayHigh: data.array_high?.toString() || "",
        arrayLow: data.array_low?.toString() || "",
        arrayZone: data.array_zone || "premium",
        arrayConfluenceNotes: data.array_confluence_notes || "",
        session: data.session || "london",
        inKillZone: data.in_kill_zone || false,
        macroWindow: data.macro_window || "none",
        amdPhase: data.amd_phase || "manipulation",
        modelFullChecked: data.model_full_checked || false,
        entryPrice: data.entry_price?.toString() || "",
        stopLoss: data.stop_loss?.toString() || "",
        targetPrice: data.target_price?.toString() || "",
        notes: data.notes || "",
        tradeResult: data.trade_result || "",
      });

      // Load screenshots
      const { data: shots } = await supabase
        .from("ict_screenshots")
        .select("*")
        .eq("setup_id", data.id)
        .order("created_at");
      setScreenshots(shots || []);

      setExistingId(data.id);
      setLoading(false);
    }
    load();
  }, [editId, isEdit, supabase]);

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  const evaluation = useMemo(() => {
    return evaluateIct({
      htfBias: form.htfBias,
      ltfAligned: form.ltfAligned,
      structureVerdict: form.structureVerdict,
      structuralBreak: form.structuralBreak,
      displacementPresent: form.displacementPresent,
      rangeHigh: form.rangeHigh,
      rangeLow: form.rangeLow,
      currentPrice: form.currentPrice,
      sweepHappened: form.sweepHappened,
      sweepType: form.sweepType,
      sweepLevel: form.sweepLevel,
      drawOnLiquidity: form.drawOnLiquidity,
      dolLevel: form.dolLevel,
      arrayType: form.arrayType,
      arrayHigh: form.arrayHigh,
      arrayLow: form.arrayLow,
      arrayZone: form.arrayZone,
      session: form.session,
      inKillZone: form.inKillZone,
      macroWindow: form.macroWindow,
      amdPhase: form.amdPhase,
      modelFullChecked: form.modelFullChecked,
    });
  }, [form]);

  // ============================================================
  // SAVE
  // ============================================================
  async function saveSetup({ isDraft }) {
    if (!form.htfBias) { setError("HTF Bias is required."); return null; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); return null; }

    // Compute R:R locally
    const entry = parseFloat(form.entryPrice);
    const sl = parseFloat(form.stopLoss);
    const tp = parseFloat(form.targetPrice);
    let rr = null;
    if (!isNaN(entry) && !isNaN(sl) && !isNaN(tp)) {
      const risk = Math.abs(entry - sl);
      const reward = Math.abs(tp - entry);
      rr = risk > 0 ? reward / risk : 0;
    }

    const payload = {
      user_id: user.id,
      pair: form.pair,
      timeframe: form.timeframe,
      status: isDraft ? "draft" : "complete",
      
      // Phase 1
      htf_bias: form.htfBias,
      ltf_aligned: form.ltfAligned,
      structure_verdict: form.structureVerdict,
      structural_break: form.structuralBreak,
      displacement_present: form.displacementPresent,
      range_high: form.rangeHigh ? parseFloat(form.rangeHigh) : null,
      range_low: form.rangeLow ? parseFloat(form.rangeLow) : null,
      current_price: form.currentPrice ? parseFloat(form.currentPrice) : null,
      zone: evaluation.context.zone || null,
      choch_notes: form.chochNotes,

      // Phase 2
      sweep_happened: form.sweepHappened,
      sweep_type: form.sweepType,
      sweep_level: form.sweepLevel ? parseFloat(form.sweepLevel) : null,
      draw_on_liquidity: form.drawOnLiquidity,
      dol_level: form.dolLevel ? parseFloat(form.dolLevel) : null,
      dol_notes: form.dolNotes,

      // Phase 3
      array_type: form.arrayType,
      array_high: form.arrayHigh ? parseFloat(form.arrayHigh) : null,
      array_low: form.arrayLow ? parseFloat(form.arrayLow) : null,
      array_zone: form.arrayZone,
      array_confluence_notes: form.arrayConfluenceNotes,

      // Phase 4
      session: form.session,
      in_kill_zone: form.inKillZone,
      macro_window: form.macroWindow,
      amd_phase: form.amdPhase,
      model_full_checked: form.modelFullChecked,

      // Execution
      entry_price: isNaN(entry) ? null : entry,
      stop_loss: isNaN(sl) ? null : sl,
      target_price: isNaN(tp) ? null : tp,
      rr: rr,

      // Doctrine
      doctrine_score: evaluation.doctrine.score,
      doctrine_tier: evaluation.doctrine.tier,
      doctrine_warnings: evaluation.doctrine.warnings,

      // Meta
      notes: form.notes,
      trade_result: form.tradeResult || null,
    };

    let setupRow;
    if (isEdit && existingId) {
      const { data, error: updErr } = await supabase
        .from("ict_setups")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existingId)
        .select()
        .single();
      if (updErr) { setError(updErr.message); return null; }
      setupRow = data;
    } else {
      const { data, error: insErr } = await supabase
        .from("ict_setups")
        .insert(payload)
        .select()
        .single();
      if (insErr) { setError(insErr.message); return null; }
      setupRow = data;
      setExistingId(data.id);
    }

    return setupRow;
  }

  async function handleSaveDraft() {
    setSavingDraft(true); setError("");
    const row = await saveSetup({ isDraft: true });
    setSavingDraft(false);
    if (!row) return;
    setSaved(true);
    setTimeout(() => router.push(`/ict/${row.id}`), 800);
  }

  async function handleSaveFinal() {
    setSaving(true); setError("");
    const row = await saveSetup({ isDraft: false });
    setSaving(false);
    if (!row) return;
    setSaved(true);
    setTimeout(() => router.push(`/ict/${row.id}`), 800);
  }

  async function ensureSetupSaved() {
    if (existingId) return existingId;
    const row = await saveSetup({ isDraft: true });
    if (!row) throw new Error("Failed to save draft before uploading screenshot.");
    return row.id;
  }

  if (loading && isEdit) {
    return <div className="p-6 text-gray-400">Loading setup...</div>;
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? "Edit ICT Setup" : "📖 ICT Core Doctrine"}</h1>
          <p className="text-gray-400 text-sm">Score your setup against the complete book methodology.</p>
        </div>

        {/* Meta */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <PairPicker value={form.pair} onChange={(p) => update("pair", p)} label="Pair" />
            <div>
              <label className="block text-xs mb-1 text-gray-400">Timeframe</label>
              <select value={form.timeframe} onChange={(e) => update("timeframe", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="H4">H4</option>
                <option value="H1">H1</option>
                <option value="M30">M30</option>
                <option value="M15">M15</option>
                <option value="M5">M5</option>
              </select>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PHASE 1: CONTEXT & STRUCTURE */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-blue-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-blue-300">🌍 Phase 1 — Context & Structure</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">HTF Bias</label>
              <select value={form.htfBias} onChange={(e) => update("htfBias", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="bullish">🟢 Bullish</option>
                <option value="bearish">🔴 Bearish</option>
                <option value="unclear">⚪ Unclear</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Structure Verdict</label>
              <select value={form.structureVerdict} onChange={(e) => update("structureVerdict", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {ICT_STRUCTURES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Structural Break</label>
              <select value={form.structuralBreak} onChange={(e) => update("structuralBreak", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {ICT_BREAKS.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
              </select>
            </div>
            <div className="pt-6">
              <button
                type="button"
                onClick={() => update("displacementPresent", !form.displacementPresent)}
                className={`w-full text-left p-2 rounded-lg border transition ${form.displacementPresent ? "bg-blue-900/40 border-blue-700 text-blue-200" : "bg-black border-gray-800 text-gray-400"}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.displacementPresent ? "bg-blue-500 border-blue-500" : "border-gray-600"}`}>
                    {form.displacementPresent && <span className="text-black text-[10px] font-bold">✓</span>}
                  </div>
                  <p className="text-xs font-bold">Displacement Present</p>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">Range High</label><input type="number" step="any" value={form.rangeHigh} onChange={(e) => update("rangeHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">Range Low</label><input type="number" step="any" value={form.rangeLow} onChange={(e) => update("rangeLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">Current Price</label><input type="number" step="any" value={form.currentPrice} onChange={(e) => update("currentPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => update("ltfAligned", !form.ltfAligned)}
              className={`w-full text-left p-3 rounded-lg border transition ${form.ltfAligned ? "bg-blue-900/40 border-blue-700" : "bg-black border-gray-800"}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.ltfAligned ? "bg-blue-500 border-blue-500" : "border-gray-600"}`}>
                  {form.ltfAligned && <span className="text-black text-xs font-bold">✓</span>}
                </div>
                <p className={`text-sm font-medium ${form.ltfAligned ? "text-blue-200" : "text-white"}`}>LTF reading confirms HTF</p>
              </div>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PHASE 2: LIQUIDITY */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-cyan-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-cyan-300">💧 Phase 2 — Liquidity</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Liquidity Type</label>
              <select value={form.sweepType} onChange={(e) => update("sweepType", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {ICT_LIQUIDITY_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Sweep or Run?</label>
              <select value={form.sweepType} onChange={(e) => update("sweepType", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {ICT_SWEEP_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Sweep Level</label>
              <input type="number" step="any" value={form.sweepLevel} onChange={(e) => update("sweepLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div className="pt-6">
              <button
                type="button"
                onClick={() => update("sweepHappened", !form.sweepHappened)}
                className={`w-full text-left p-2 rounded-lg border transition ${form.sweepHappened ? "bg-cyan-900/40 border-cyan-700 text-cyan-200" : "bg-black border-gray-800 text-gray-400"}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.sweepHappened ? "bg-cyan-500 border-cyan-500" : "border-gray-600"}`}>
                    {form.sweepHappened && <span className="text-black text-[10px] font-bold">✓</span>}
                  </div>
                  <p className="text-xs font-bold">Liquidity Swept</p>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Draw on Liquidity (DOL)</label>
              <select value={form.drawOnLiquidity} onChange={(e) => update("drawOnLiquidity", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="erl">🎯 External (ERL)</option>
                <option value="irl">🎯 Internal (IRL)</option>
                <option value="unknown">⚪ Unknown</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">DOL Level</label>
              <input type="number" step="any" value={form.dolLevel} onChange={(e) => update("dolLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PHASE 3: PD ARRAYS */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-purple-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-purple-300">🧱 Phase 3 — PD Arrays</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Array Type</label>
              <select value={form.arrayType} onChange={(e) => update("arrayType", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {ICT_ARRAY_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Array Zone</label>
              <select value={form.arrayZone} onChange={(e) => update("arrayZone", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="premium">⬆️ Premium</option>
                <option value="discount">⬇️ Discount</option>
                <option value="equilibrium">➖ Equilibrium</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">Array Low</label><input type="number" step="any" value={form.arrayLow} onChange={(e) => update("arrayLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">Array High</label><input type="number" step="any" value={form.arrayHigh} onChange={(e) => update("arrayHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PHASE 4: TIME & MODEL */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-emerald-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-300">⏱️ Phase 4 — Time & Model</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Session</label>
              <select value={form.session} onChange={(e) => update("session", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {ICT_SESSIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Macro Window</label>
              <select value={form.macroWindow} onChange={(e) => update("macroWindow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {ICT_MACROS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">AMD Phase</label>
              <select value={form.amdPhase} onChange={(e) => update("amdPhase", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {ICT_AMD_PHASES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div className="pt-6 space-y-2">
              <button
                type="button"
                onClick={() => update("inKillZone", !form.inKillZone)}
                className={`w-full text-left p-2 rounded-lg border transition ${form.inKillZone ? "bg-emerald-900/40 border-emerald-700 text-emerald-200" : "bg-black border-gray-800 text-gray-400"}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.inKillZone ? "bg-emerald-500 border-emerald-500" : "border-gray-600"}`}>
                    {form.inKillZone && <span className="text-black text-[10px] font-bold">✓</span>}
                  </div>
                  <p className="text-xs font-bold">Inside Kill Zone</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => update("modelFullChecked", !form.modelFullChecked)}
                className={`w-full text-left p-2 rounded-lg border transition ${form.modelFullChecked ? "bg-emerald-900/40 border-emerald-700 text-emerald-200" : "bg-black border-gray-800 text-gray-400"}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.modelFullChecked ? "bg-emerald-500 border-emerald-500" : "border-gray-600"}`}>
                    {form.modelFullChecked && <span className="text-black text-[10px] font-bold">✓</span>}
                  </div>
                  <p className="text-xs font-bold">Full Model Verified</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* EXECUTION */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300">⚔️ Execution</h2>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">Entry</label><input type="number" step="any" value={form.entryPrice} onChange={(e) => update("entryPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">Stop Loss</label><input type="number" step="any" value={form.stopLoss} onChange={(e) => update("stopLoss", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">Target</label><input type="number" step="any" value={form.targetPrice} onChange={(e) => update("targetPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>
        </div>

        {/* LIVE CARD — always shown, updates in real-time */}
        <div className="pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-bold">Live Doctrine Score</p>
          {evaluation && <IctCard data={evaluation} />}
        </div>

        {/* SCREENSHOTS */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <ScreenshotUploader setupId={existingId} userId={userId} screenshots={screenshots} onChange={setScreenshots} table="ict_screenshots" onEnsureSetup={ensureSetupSaved} />
          <ScreenshotGallery screenshots={screenshots} onDelete={(id) => setScreenshots(prev => prev.filter(s => s.id !== id))} table="ict_screenshots" />
        </div>

        {/* NOTES */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <label className="block text-xs mb-1 text-gray-400">Notes</label>
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 resize-none text-sm" />
        </div>

        {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}
        {saved && <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">✅ Saved — redirecting...</div>}

        {/* SAVE BUTTONS — both always enabled (except for Title/Auth) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button type="button" onClick={handleSaveDraft} disabled={savingDraft || saving} className="w-full py-4 rounded-lg font-bold disabled:opacity-50 bg-yellow-800 hover:bg-yellow-700 text-white">
            {savingDraft ? "Saving..." : "📝 Save Draft"}
          </button>
          <button type="button" onClick={handleSaveFinal} disabled={saving || savingDraft} className="w-full py-4 rounded-lg font-bold disabled:opacity-50 bg-cyan-700 hover:bg-cyan-600 text-white">
            {saving ? "Saving..." : "✅ Save as Final"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function IctPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 bg-black text-white"><div className="max-w-3xl mx-auto text-gray-400">Loading ICT form...</div></main>}>
      <IctPageContent />
    </Suspense>
  );
}