"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import {
  APX_SETUP_TYPES,
  APX_BIASES,
  APX_DIRECTIONS,
  evaluateApx,
  computeApxAutoTrade,
} from "@/lib/apxEngine";
import ApxCard from "@/components/ApxCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

function ApxPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "EURUSD",
    setupType: "standard",
    bias: "bullish",
    direction: "long",
    rangeHigh: "",
    rangeLow: "",
    impulseHigh: "",
    impulseLow: "",
    sweepLevel: "",
    sweepClosedBackInside: false,
    displacementRange: "",
    atrValue: "",
    inducementLevel: "",
    inducementBroken: false,
    mssLevel: "",
    mssConfirmed: false,
    fvgHigh: "",
    fvgLow: "",
    ema50Value: "",
    ema50Tapped: false,
    entryPrice: "",
    stopLoss: "",
    targetPrice: "",
    executionMode: "auto",
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

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      if (!isEdit) return;

      setLoading(true);
      const { data, error: loadErr } = await supabase.from("apx_setups").select("*").eq("id", editId).maybeSingle();
      if (loadErr || !data) { setError(loadErr?.message || "Setup not found."); setLoading(false); return; }

      setForm({
        pair: data.pair || "EURUSD",
        setupType: data.setup_type || "standard",
        bias: data.bias || "bullish",
        direction: data.direction || "long",
        rangeHigh: data.range_high?.toString() || "",
        rangeLow: data.range_low?.toString() || "",
        impulseHigh: data.impulse_high?.toString() || "",
        impulseLow: data.impulse_low?.toString() || "",
        sweepLevel: data.sweep_level?.toString() || "",
        sweepClosedBackInside: data.sweep_closed_back_inside || false,
        displacementRange: data.displacement_range?.toString() || "",
        atrValue: data.atr_value?.toString() || "",
        inducementLevel: data.inducement_level?.toString() || "",
        inducementBroken: data.inducement_broken || false,
        mssLevel: data.mss_level?.toString() || "",
        mssConfirmed: data.mss_confirmed || false,
        fvgHigh: data.fvg_high?.toString() || "",
        fvgLow: data.fvg_low?.toString() || "",
        ema50Value: data.ema50_value?.toString() || "",
        ema50Tapped: data.ema50_tapped || false,
        entryPrice: data.entry_price?.toString() || "",
        stopLoss: data.stop_loss?.toString() || "",
        targetPrice: data.target_price?.toString() || "",
        executionMode: "manual", // Default to manual when editing old setups
        notes: data.notes || "",
      });

      const { data: shotsData } = await supabase.from("apx_screenshots").select("*").eq("setup_id", data.id).order("created_at");
      setScreenshots(shotsData || []);
      setExistingId(data.id);
      setLoading(false);
    }
    load();
  }, [editId, isEdit, supabase]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Compute auto-trade if needed
  const autoTrade = useMemo(() => {
    if (form.executionMode !== "auto") return null;
    return computeApxAutoTrade({
      direction: form.direction,
      rangeHigh: form.rangeHigh, rangeLow: form.rangeLow,
      impulseHigh: form.impulseHigh, impulseLow: form.impulseLow,
      inducementLevel: form.inducementLevel,
    });
  }, [form.executionMode, form.direction, form.rangeHigh, form.rangeLow, form.impulseHigh, form.impulseLow, form.inducementLevel]);

  const evaluation = useMemo(() => {
    let evalEntry = form.entryPrice;
    let evalSL = form.stopLoss;
    let evalTP = form.targetPrice;

    if (form.executionMode === "auto" && autoTrade) {
      evalEntry = autoTrade.entry;
      evalSL = autoTrade.stopLoss;
      evalTP = autoTrade.targetPrice;
    }

    return evaluateApx({
      setupType: form.setupType, bias: form.bias, direction: form.direction,
      rangeHigh: form.rangeHigh, rangeLow: form.rangeLow, impulseHigh: form.impulseHigh, impulseLow: form.impulseLow,
      sweepLevel: form.sweepLevel, sweepClosedBackInside: form.sweepClosedBackInside, displacementRange: form.displacementRange, atrValue: form.atrValue,
      inducementLevel: form.inducementLevel, inducementBroken: form.inducementBroken, mssLevel: form.mssLevel, mssConfirmed: form.mssConfirmed, fvgHigh: form.fvgHigh, fvgLow: form.fvgLow,
      ema50Value: form.ema50Value, ema50Tapped: form.ema50Tapped,
      entryPrice: evalEntry, stopLoss: evalSL, targetPrice: evalTP,
    });
  }, [form, autoTrade]);

  async function saveSetup({ isDraft }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); return null; }

    let finalEntry = form.entryPrice;
    let finalSL = form.stopLoss;
    let finalTP = form.targetPrice;

    if (form.executionMode === "auto" && autoTrade) {
      finalEntry = autoTrade.entry;
      finalSL = autoTrade.stopLoss;
      finalTP = autoTrade.targetPrice;
    }

    const payload = {
      user_id: user.id,
      pair: form.pair,
      status: isDraft ? "draft" : "complete",
      setup_type: form.setupType, bias: form.bias, direction: form.direction,
      range_high: form.rangeHigh ? parseFloat(form.rangeHigh) : null,
      range_low: form.rangeLow ? parseFloat(form.rangeLow) : null,
      impulse_high: form.impulseHigh ? parseFloat(form.impulseHigh) : null,
      impulse_low: form.impulseLow ? parseFloat(form.impulseLow) : null,
      sweep_level: form.sweepLevel ? parseFloat(form.sweepLevel) : null,
      sweep_closed_back_inside: form.sweepClosedBackInside,
      displacement_range: form.displacementRange ? parseFloat(form.displacementRange) : null,
      atr_value: form.atrValue ? parseFloat(form.atrValue) : null,
      inducement_level: form.inducementLevel ? parseFloat(form.inducementLevel) : null,
      inducement_broken: form.inducementBroken,
      mss_level: form.mssLevel ? parseFloat(form.mssLevel) : null,
      mss_confirmed: form.mssConfirmed,
      fvg_high: form.fvgHigh ? parseFloat(form.fvgHigh) : null,
      fvg_low: form.fvgLow ? parseFloat(form.fvgLow) : null,
      ema50_value: form.ema50Value ? parseFloat(form.ema50Value) : null,
      ema50_tapped: form.ema50Tapped,
      entry_price: finalEntry ? parseFloat(finalEntry) : null,
      stop_loss: finalSL ? parseFloat(finalSL) : null,
      target_price: finalTP ? parseFloat(finalTP) : null,
      doctrine_score: evaluation.doctrineScore,
      notes: form.notes,
    };

    let row;
    if (isEdit && existingId) {
      const { data, error: updErr } = await supabase.from("apx_setups").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", existingId).select().single();
      if (updErr) { setError(updErr.message); return null; }
      row = data;
    } else {
      const { data, error: insErr } = await supabase.from("apx_setups").insert(payload).select().single();
      if (insErr) { setError(insErr.message); return null; }
      row = data;
      setExistingId(data.id);
    }
    return row;
  }

  async function handleSaveDraft() {
    setSavingDraft(true); setError("");
    const row = await saveSetup({ isDraft: true });
    setSavingDraft(false);
    if (!row) return;
    setSaved(true);
    setTimeout(() => router.push(`/apx/${row.id}`), 800);
  }

  async function handleSaveFinal() {
    if (evaluation.layersPassed < 4) { setError("All 4 stages must be complete to save as Final."); return; }
    setSaving(true); setError("");
    const row = await saveSetup({ isDraft: false });
    setSaving(false);
    if (!row) return;
    setSaved(true);
    setTimeout(() => router.push(`/apx/${row.id}`), 800);
  }

  async function ensureSetupSaved() {
    if (existingId) return existingId;
    const row = await saveSetup({ isDraft: true });
    if (!row) throw new Error("Failed to save draft before uploading screenshot.");
    return row.id;
  }

  if (loading && isEdit) return <div className="p-6 text-gray-400">Loading APX setup...</div>;

  const canSaveFinal = evaluation.layersPassed === 4;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">{isEdit ? "Edit APX Setup" : "🎯 APX System"}</h1>
          <p className="text-gray-400 text-sm">Institutional flow setups.</p>
        </div>

        {/* Meta */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div>
            <label className="block text-xs mb-1 text-gray-400">Pair</label>
            <input value={form.pair} onChange={(e) => update("pair", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">Setup Type</label><select value={form.setupType} onChange={(e) => update("setupType", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">{APX_SETUP_TYPES.map(s => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}</select></div>
            <div><label className="block text-xs mb-1 text-gray-400">Bias</label><select value={form.bias} onChange={(e) => update("bias", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">{APX_BIASES.map(b => <option key={b.key} value={b.key}>{b.emoji} {b.label}</option>)}</select></div>
            <div><label className="block text-xs mb-1 text-gray-400">Direction</label><select value={form.direction} onChange={(e) => update("direction", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">{APX_DIRECTIONS.map(d => <option key={d.key} value={d.key}>{d.emoji} {d.label}</option>)}</select></div>
          </div>
        </div>

        {/* Stage 1: Context */}
        <div className="p-4 rounded-lg bg-gray-900 border border-blue-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-blue-300">🌍 Stage 1 — Context</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">Range High</label><input type="number" step="any" value={form.rangeHigh} onChange={(e) => update("rangeHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">Range Low</label><input type="number" step="any" value={form.rangeLow} onChange={(e) => update("rangeLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">Impulse High (OTE)</label><input type="number" step="any" value={form.impulseHigh} onChange={(e) => update("impulseHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">Impulse Low (OTE)</label><input type="number" step="any" value={form.impulseLow} onChange={(e) => update("impulseLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>
        </div>

        {/* Stage 2: Liquidity */}
        <div className="p-4 rounded-lg bg-gray-900 border border-orange-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-orange-300">💧 Stage 2 — Liquidity</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">Sweep Level</label><input type="number" step="any" value={form.sweepLevel} onChange={(e) => update("sweepLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">Displacement</label><input type="number" step="any" value={form.displacementRange} onChange={(e) => update("displacementRange", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">ATR (opt)</label><input type="number" step="any" value={form.atrValue} onChange={(e) => update("atrValue", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">50 EMA (opt)</label><input type="number" step="any" value={form.ema50Value} onChange={(e) => update("ema50Value", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => update("sweepClosedBackInside", !form.sweepClosedBackInside)} className={`text-left p-2 rounded-lg border transition ${form.sweepClosedBackInside ? "bg-orange-900/40 border-orange-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.sweepClosedBackInside ? "bg-orange-500 border-orange-500" : "border-gray-600"}`}>{form.sweepClosedBackInside && <span className="text-black text-[10px] font-bold">✓</span>}</div><p className={`text-xs font-bold ${form.sweepClosedBackInside ? "text-orange-200" : "text-gray-400"}`}>Closed back inside</p></div>
            </button>
            <button type="button" onClick={() => update("ema50Tapped", !form.ema50Tapped)} className={`text-left p-2 rounded-lg border transition ${form.ema50Tapped ? "bg-orange-900/40 border-orange-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.ema50Tapped ? "bg-orange-500 border-orange-500" : "border-gray-600"}`}>{form.ema50Tapped && <span className="text-black text-[10px] font-bold">✓</span>}</div><p className={`text-xs font-bold ${form.ema50Tapped ? "text-orange-200" : "text-gray-400"}`}>50 EMA Tapped</p></div>
            </button>
          </div>
        </div>

        {/* Stage 3: Structure */}
        <div className="p-4 rounded-lg bg-gray-900 border border-purple-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-purple-300">🔍 Stage 3 — Inducement / MSS</h2>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">Inducement</label><input type="number" step="any" value={form.inducementLevel} onChange={(e) => update("inducementLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">MSS Level</label><input type="number" step="any" value={form.mssLevel} onChange={(e) => update("mssLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">FVG High</label><input type="number" step="any" value={form.fvgHigh} onChange={(e) => update("fvgHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">FVG Low</label><input type="number" step="any" value={form.fvgLow} onChange={(e) => update("fvgLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <button type="button" onClick={() => update("inducementBroken", !form.inducementBroken)} className={`text-left p-2 rounded-lg border transition ${form.inducementBroken ? "bg-purple-900/40 border-purple-700" : "bg-black border-gray-800"} mt-5`}>
              <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.inducementBroken ? "bg-purple-500 border-purple-500" : "border-gray-600"}`}>{form.inducementBroken && <span className="text-black text-[10px] font-bold">✓</span>}</div><p className={`text-xs font-bold ${form.inducementBroken ? "text-purple-200" : "text-gray-400"}`}>Inducement Broken</p></div>
            </button>
            <button type="button" onClick={() => update("mssConfirmed", !form.mssConfirmed)} className={`text-left p-2 rounded-lg border transition ${form.mssConfirmed ? "bg-purple-900/40 border-purple-700" : "bg-black border-gray-800"} mt-5`}>
              <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.mssConfirmed ? "bg-purple-500 border-purple-500" : "border-gray-600"}`}>{form.mssConfirmed && <span className="text-black text-[10px] font-bold">✓</span>}</div><p className={`text-xs font-bold ${form.mssConfirmed ? "text-purple-200" : "text-gray-400"}`}>MSS Confirmed</p></div>
            </button>
          </div>
        </div>

        {/* Stage 4: Entry */}
        <div className="p-4 rounded-lg bg-gray-900 border border-emerald-800/60 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-emerald-300">🎯 Stage 4 — Entry</h2>
            
            <div className="flex bg-black rounded-lg border border-gray-700 p-1">
              <button type="button" onClick={() => { update("executionMode", "auto"); update("entryPrice", ""); update("stopLoss", ""); update("targetPrice", ""); }} className={`px-3 py-1 text-xs font-bold rounded ${form.executionMode === "auto" ? "bg-emerald-700 text-white" : "text-gray-400 hover:text-white"}`}>🤖 Automatic</button>
              <button type="button" onClick={() => update("executionMode", "manual")} className={`px-3 py-1 text-xs font-bold rounded ${form.executionMode === "manual" ? "bg-blue-700 text-white" : "text-gray-400 hover:text-white"}`}>✍️ Manual</button>
            </div>
          </div>

          {form.executionMode === "auto" ? (
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800 space-y-2">
              <p className="text-xs text-emerald-200">The engine will automatically calculate the Entry (OTE 70.5%), Stop Loss, and Target (1:2.5 RR).</p>
              
              {autoTrade ? (
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-2 rounded bg-black border border-gray-800">
                    <p className="text-[10px] text-gray-500">Auto Entry</p>
                    <p className="font-bold text-yellow-400 text-sm">{autoTrade.entry}</p>
                  </div>
                  <div className="p-2 rounded bg-black border border-gray-800">
                    <p className="text-[10px] text-gray-500">Auto SL</p>
                    <p className="font-bold text-red-400 text-sm">{autoTrade.stopLoss}</p>
                    <p className="text-[10px] text-red-300">{autoTrade.riskPips} pips</p>
                  </div>
                  <div className="p-2 rounded bg-black border border-gray-800">
                    <p className="text-[10px] text-gray-500">Auto TP</p>
                    <p className="font-bold text-green-400 text-sm">{autoTrade.targetPrice}</p>
                    <p className="text-[10px] text-green-300">{autoTrade.rewardPips} pips</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Fill out Context & Inducement to calculate.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs mb-1 text-gray-400">Entry</label><input type="number" step="any" value={form.entryPrice} onChange={(e) => update("entryPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
              <div><label className="block text-xs mb-1 text-gray-400">Stop Loss</label><input type="number" step="any" value={form.stopLoss} onChange={(e) => update("stopLoss", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
              <div><label className="block text-xs mb-1 text-gray-400">Target</label><input type="number" step="any" value={form.targetPrice} onChange={(e) => update("targetPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            </div>
          )}
        </div>

        {/* Live APX Card */}
        <div className="pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-bold">Live APX Preview</p>
          {evaluation && <ApxCard data={evaluation} />}
        </div>

        {/* Screenshots */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <ScreenshotUploader setupId={existingId} userId={userId} screenshots={screenshots} onChange={setScreenshots} table="apx_screenshots" onEnsureSetup={ensureSetupSaved} setupIdField="setup_id" />
          <ScreenshotGallery screenshots={screenshots} onDelete={(id) => setScreenshots(prev => prev.filter(s => s.id !== id))} table="apx_screenshots" setupIdField="setup_id" />
        </div>

        {/* Notes */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <label className="block text-xs mb-1 text-gray-400">Notes</label>
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 resize-none text-sm" />
        </div>

        {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}
        {saved && <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">✅ Saved — redirecting...</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-10">
          <button type="button" onClick={handleSaveDraft} disabled={savingDraft || saving} className="w-full py-4 rounded-lg font-bold disabled:opacity-50 bg-yellow-800 hover:bg-yellow-700 text-white">{savingDraft ? "Saving..." : "📝 Save Draft"}</button>
          <button type="button" onClick={handleSaveFinal} disabled={saving || savingDraft || !canSaveFinal} className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${canSaveFinal ? "bg-amber-700 hover:bg-amber-600" : "bg-gray-800"}`}>{saving ? "Saving..." : canSaveFinal ? "✅ Save as Final" : `💾 ${evaluation.layersPassed}/4 stages (need all)`}</button>
        </div>
      </div>
    </main>
  );
}

export default function ApxPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 bg-black text-white"><div className="max-w-4xl mx-auto text-gray-400">Loading APX...</div></main>}>
      <ApxPageContent />
    </Suspense>
  );
}