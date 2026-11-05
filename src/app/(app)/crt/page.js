"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import {
  CRT_BIASES,
  evaluateCrt,
  computeCrtAutoTrade,
} from "@/lib/crtEngine";
import CrtCard from "@/components/CrtCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

function CrtPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "EURUSD",
    bias: "bullish",
    direction: "long",
    
    // Multi-Candle Data
    candleCount: "1",
    manualCrtHigh: "",
    manualCrtLow: "",
    crtHigh: "",
    crtLow: "",

    // LTF
    sweepLevel: "",
    sweepConfirmed: false,
    mssConfirmed: false,
    inducementBroken: false,
    fvgHigh: "",
    fvgLow: "",
    obHigh: "",
    obLow: "",
    
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
      const { data, error: loadErr } = await supabase.from("crt_setups").select("*").eq("id", editId).maybeSingle();
      if (loadErr || !data) { setError(loadErr?.message || "Setup not found."); setLoading(false); return; }

      setForm({
        pair: data.pair || "EURUSD",
        bias: data.bias || "bullish",
        direction: data.direction || "long",
        candleCount: data.candle_count?.toString() || "1",
        manualCrtHigh: data.crt_high?.toString() || "",
        manualCrtLow: data.crt_low?.toString() || "",
        crtHigh: data.crt_high?.toString() || "",
        crtLow: data.crt_low?.toString() || "",
        sweepLevel: data.sweep_level?.toString() || "",
        sweepConfirmed: data.sweep_confirmed || false,
        mssConfirmed: data.mss_confirmed || false,
        inducementBroken: data.inducement_broken || false,
        fvgHigh: data.fvg_high?.toString() || "",
        fvgLow: data.fvg_low?.toString() || "",
        obHigh: data.ob_high?.toString() || "",
        obLow: data.ob_low?.toString() || "",
        entryPrice: data.entry_price?.toString() || "",
        stopLoss: data.stop_loss?.toString() || "",
        targetPrice: data.target_price?.toString() || "",
        executionMode: "manual",
        notes: data.notes || "",
      });

      const { data: shotsData } = await supabase.from("crt_screenshots").select("*").eq("setup_id", data.id).order("created_at");
      setScreenshots(shotsData || []);
      setExistingId(data.id);
      setLoading(false);
    }
    load();
  }, [editId, isEdit, supabase]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Sync manual CRT with actual CRT used in math
  useEffect(() => {
    if (form.manualCrtHigh || form.manualCrtLow) {
      setForm(f => ({ ...f, crtHigh: f.manualCrtHigh, crtLow: f.manualCrtLow }));
    }
  }, [form.manualCrtHigh, form.manualCrtLow]);

  const autoTrade = useMemo(() => {
    if (form.executionMode !== "auto") return null;
    return computeCrtAutoTrade({
      direction: form.direction,
      crtHigh: form.crtHigh, crtLow: form.crtLow,
      sweepLevel: form.sweepLevel,
      fvgHigh: form.fvgHigh, fvgLow: form.fvgLow,
    });
  }, [form.executionMode, form.direction, form.crtHigh, form.crtLow, form.sweepLevel, form.fvgHigh, form.fvgLow]);

  const evaluation = useMemo(() => {
    let evalEntry = form.entryPrice;
    let evalSL = form.stopLoss;
    let evalTP = form.targetPrice;

    if (form.executionMode === "auto" && autoTrade) {
      evalEntry = autoTrade.entry;
      evalSL = autoTrade.stopLoss;
      evalTP = autoTrade.targetPrice;
    }

    return evaluateCrt({
      direction: form.direction,
      crtHigh: form.crtHigh, crtLow: form.crtLow,
      sweepLevel: form.sweepLevel, sweepConfirmed: form.sweepConfirmed,
      mssConfirmed: form.mssConfirmed, inducementBroken: form.inducementBroken,
      fvgHigh: form.fvgHigh, fvgLow: form.fvgLow, obHigh: form.obHigh, obLow: form.obLow,
      entryPrice: evalEntry, stopLoss: evalSL, targetPrice: evalTP,
    });
  }, [form, autoTrade]);

  async function saveSetup({ isDraft }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); return null; }

    let finalEntry = form.entryPrice, finalSL = form.stopLoss, finalTP = form.targetPrice;
    if (form.executionMode === "auto" && autoTrade) {
      finalEntry = autoTrade.entry; finalSL = autoTrade.stopLoss; finalTP = autoTrade.targetPrice;
    }

    const payload = {
      user_id: user.id, pair: form.pair, status: isDraft ? "draft" : "complete",
      bias: form.bias, direction: form.direction, candle_count: parseInt(form.candleCount),
      crt_high: form.crtHigh ? parseFloat(form.crtHigh) : null,
      crt_low: form.crtLow ? parseFloat(form.crtLow) : null,
      sweep_level: form.sweepLevel ? parseFloat(form.sweepLevel) : null,
      sweep_confirmed: form.sweepConfirmed, mss_confirmed: form.mssConfirmed, inducement_broken: form.inducementBroken,
      fvg_high: form.fvgHigh ? parseFloat(form.fvgHigh) : null,
      fvg_low: form.fvgLow ? parseFloat(form.fvgLow) : null,
      ob_high: form.obHigh ? parseFloat(form.obHigh) : null,
      ob_low: form.obLow ? parseFloat(form.obLow) : null,
      entry_price: finalEntry ? parseFloat(finalEntry) : null,
      stop_loss: finalSL ? parseFloat(finalSL) : null,
      target_price: finalTP ? parseFloat(finalTP) : null,
      doctrine_score: evaluation.doctrineScore, notes: form.notes,
    };

    let row;
    if (isEdit && existingId) {
      const { data, error: updErr } = await supabase.from("crt_setups").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", existingId).select().single();
      if (updErr) { setError(updErr.message); return null; } row = data;
    } else {
      const { data, error: insErr } = await supabase.from("crt_setups").insert(payload).select().single();
      if (insErr) { setError(insErr.message); return null; } row = data; setExistingId(data.id);
    }
    return row;
  }

  async function handleSaveDraft() {
    setSavingDraft(true); setError("");
    const row = await saveSetup({ isDraft: true });
    setSavingDraft(false);
    if (!row) return; setSaved(true);
    setTimeout(() => router.push(`/crt/${row.id}`), 800);
  }

  async function handleSaveFinal() {
    if (evaluation.layersPassed < 4) { setError("All 4 stages must be complete to save as Final."); return; }
    setSaving(true); setError("");
    const row = await saveSetup({ isDraft: false });
    setSaving(false);
    if (!row) return; setSaved(true);
    setTimeout(() => router.push(`/crt/${row.id}`), 800);
  }

  async function ensureSetupSaved() {
    if (existingId) return existingId;
    const row = await saveSetup({ isDraft: true });
    if (!row) throw new Error("Failed to save draft."); return row.id;
  }

  if (loading && isEdit) return <div className="p-6 text-gray-400">Loading CRT setup...</div>;
  const canSaveFinal = evaluation.layersPassed === 4;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-teal-400">{isEdit ? "Edit CRT Setup" : "🕯️ CRT System"}</h1>
          <p className="text-gray-400 text-sm">Candle Range Theory setups.</p>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div><label className="block text-xs mb-1 text-gray-400">Pair</label><input value={form.pair} onChange={(e) => update("pair", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">Bias</label><select value={form.bias} onChange={(e) => update("bias", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">{CRT_BIASES.map(b => <option key={b.key} value={b.key}>{b.emoji} {b.label}</option>)}</select></div>
            <div><label className="block text-xs mb-1 text-gray-400">Direction</label><select value={form.direction} onChange={(e) => update("direction", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm"><option value="long">⬆️ Long</option><option value="short">⬇️ Short</option></select></div>
          </div>
        </div>

        {/* 1. CRT Context */}
        <div className="p-4 rounded-lg bg-gray-900 border border-blue-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-blue-300">🌍 4H CRT Range</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Candles in Range</label>
              <select value={form.candleCount} onChange={(e) => update("candleCount", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="1">1 Candle</option><option value="2">2 Candles</option><option value="3">3+ Candles</option>
              </select>
            </div>
            <div><label className="block text-xs mb-1 text-gray-400">CRT High</label><input type="number" step="any" value={form.manualCrtHigh} onChange={(e) => update("manualCrtHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">CRT Low</label><input type="number" step="any" value={form.manualCrtLow} onChange={(e) => update("manualCrtLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>
        </div>

        {/* 2. LTF Sweep & Structure */}
        <div className="p-4 rounded-lg bg-gray-900 border border-orange-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-orange-300">💧 15M Liquidity & Structure</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">Sweep Level</label><input type="number" step="any" value={form.sweepLevel} onChange={(e) => update("sweepLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <button type="button" onClick={() => update("sweepConfirmed", !form.sweepConfirmed)} className={`text-left p-2 rounded-lg border transition mt-5 ${form.sweepConfirmed ? "bg-orange-900/40 border-orange-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.sweepConfirmed ? "bg-orange-500 border-orange-500" : "border-gray-600"}`}>{form.sweepConfirmed && <span className="text-black text-[10px] font-bold">✓</span>}</div><p className={`text-xs font-bold ${form.sweepConfirmed ? "text-orange-200" : "text-gray-400"}`}>Swept</p></div>
            </button>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-purple-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-purple-300">🔍 1M MSS & POI</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button type="button" onClick={() => update("mssConfirmed", !form.mssConfirmed)} className={`text-left p-2 rounded-lg border transition ${form.mssConfirmed ? "bg-purple-900/40 border-purple-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.mssConfirmed ? "bg-purple-500 border-purple-500" : "border-gray-600"}`}>{form.mssConfirmed && <span className="text-black text-[10px] font-bold">✓</span>}</div><p className={`text-xs font-bold ${form.mssConfirmed ? "text-purple-200" : "text-gray-400"}`}>MSS Confirmed</p></div>
            </button>
            <button type="button" onClick={() => update("inducementBroken", !form.inducementBroken)} className={`text-left p-2 rounded-lg border transition ${form.inducementBroken ? "bg-purple-900/40 border-purple-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.inducementBroken ? "bg-purple-500 border-purple-500" : "border-gray-600"}`}>{form.inducementBroken && <span className="text-black text-[10px] font-bold">✓</span>}</div><p className={`text-xs font-bold ${form.inducementBroken ? "text-purple-200" : "text-gray-400"}`}>Inducement Swept</p></div>
            </button>
            <div><label className="block text-xs mb-1 text-gray-400">FVG / OB High</label><input type="number" step="any" value={form.fvgHigh} onChange={(e) => update("fvgHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">FVG / OB Low</label><input type="number" step="any" value={form.fvgLow} onChange={(e) => update("fvgLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>
        </div>

        {/* 3. Entry */}
        <div className="p-4 rounded-lg bg-gray-900 border border-emerald-800/60 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-emerald-300">🎯 1M Entry</h2>
            <div className="flex bg-black rounded-lg border border-gray-700 p-1">
              <button type="button" onClick={() => { update("executionMode", "auto"); update("entryPrice", ""); update("stopLoss", ""); update("targetPrice", ""); }} className={`px-3 py-1 text-xs font-bold rounded ${form.executionMode === "auto" ? "bg-emerald-700 text-white" : "text-gray-400 hover:text-white"}`}>🤖 Automatic</button>
              <button type="button" onClick={() => update("executionMode", "manual")} className={`px-3 py-1 text-xs font-bold rounded ${form.executionMode === "manual" ? "bg-blue-700 text-white" : "text-gray-400 hover:text-white"}`}>✍️ Manual</button>
            </div>
          </div>

          {form.executionMode === "auto" ? (
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800 space-y-2">
              {autoTrade ? (
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-2 rounded bg-black border border-gray-800"><p className="text-[10px] text-gray-500">Auto Entry</p><p className="font-bold text-yellow-400 text-sm">{autoTrade.entry}</p></div>
                  <div className="p-2 rounded bg-black border border-gray-800"><p className="text-[10px] text-gray-500">Auto SL</p><p className="font-bold text-red-400 text-sm">{autoTrade.stopLoss}</p><p className="text-[10px] text-red-300">{autoTrade.riskPips} pips</p></div>
                  <div className="p-2 rounded bg-black border border-gray-800"><p className="text-[10px] text-gray-500">Auto TP</p><p className="font-bold text-green-400 text-sm">{autoTrade.targetPrice}</p><p className="text-[10px] text-green-300">{autoTrade.rewardPips} pips</p></div>
                </div>
              ) : <p className="text-xs text-gray-500">Fill out CRT Range & FVG to calculate.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs mb-1 text-gray-400">Entry</label><input type="number" step="any" value={form.entryPrice} onChange={(e) => update("entryPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
              <div><label className="block text-xs mb-1 text-gray-400">Stop Loss</label><input type="number" step="any" value={form.stopLoss} onChange={(e) => update("stopLoss", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
              <div><label className="block text-xs mb-1 text-gray-400">Target</label><input type="number" step="any" value={form.targetPrice} onChange={(e) => update("targetPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-bold">Live CRT Preview</p>
          {evaluation && <CrtCard data={evaluation} />}
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <ScreenshotUploader setupId={existingId} userId={userId} screenshots={screenshots} onChange={setScreenshots} table="crt_screenshots" onEnsureSetup={ensureSetupSaved} setupIdField="setup_id" />
          <ScreenshotGallery screenshots={screenshots} onDelete={(id) => setScreenshots(prev => prev.filter(s => s.id !== id))} table="crt_screenshots" setupIdField="setup_id" />
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <label className="block text-xs mb-1 text-gray-400">Notes</label>
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 resize-none text-sm" />
        </div>

        {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}
        {saved && <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">✅ Saved — redirecting...</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-10">
          <button type="button" onClick={handleSaveDraft} disabled={savingDraft || saving} className="w-full py-4 rounded-lg font-bold disabled:opacity-50 bg-yellow-800 hover:bg-yellow-700 text-white">{savingDraft ? "Saving..." : "📝 Save Draft"}</button>
          <button type="button" onClick={handleSaveFinal} disabled={saving || savingDraft || !canSaveFinal} className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${canSaveFinal ? "bg-teal-700 hover:bg-teal-600" : "bg-gray-800"}`}>{saving ? "Saving..." : canSaveFinal ? "✅ Save as Final" : `💾 ${evaluation.layersPassed}/4 stages (need all)`}</button>
        </div>
      </div>
    </main>
  );
}

export default function CrtPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 bg-black text-white"><div className="max-w-4xl mx-auto text-gray-400">Loading CRT...</div></main>}>
      <CrtPageContent />
    </Suspense>
  );
}