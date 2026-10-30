"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import { evaluateCrim, computeCrimLevels, CRIM_SESSIONS, CRIM_TIMEFRAMES } from "@/lib/crimEngine";
import PairPicker from "@/components/PairPicker";
import CrimCard from "@/components/CrimCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";


function CrimPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "",
    timeframe: "1H",
    session: "london",
    direction: "bullish",
    rcHigh: "",
    rcLow: "",
    sweptSide: "ssl",
    sweepExtreme: "",
    idmLevel: "",
    chochLevel: "",
    fvgHigh: "",
    fvgLow: "",
    entryPrice: "",
    stopLoss: "",
    takeProfit: "",
    notes: "",
  });

  const [accountSize, setAccountSize] = useState(0);
  const [riskPercent, setRiskPercent] = useState(1);
  const [userId, setUserId] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [error, setError] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [existingSetupId, setExistingSetupId] = useState(null);

  // Load User & Edit Data
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

      if (!isEdit) return;
      setLoadingEdit(true);
      const { data: setupData, error: setupErr } = await supabase.from("crim_setups").select("*").eq("id", editId).maybeSingle();
      
      if (setupErr || !setupData) {
        setError(setupErr?.message || "CRIM setup not found.");
        setLoadingEdit(false);
        return;
      }

      const { data: shotsData } = await supabase.from("crim_screenshots").select("*").eq("setup_id", setupData.id).order("created_at");
      setScreenshots(shotsData || []);

      setForm({
        pair: setupData.pair || "",
        timeframe: setupData.timeframe || "1H",
        session: setupData.session || "london",
        direction: setupData.direction || "bullish",
        rcHigh: setupData.rc_high?.toString() || "",
        rcLow: setupData.rc_low?.toString() || "",
        sweptSide: setupData.swept_side || "ssl",
        sweepExtreme: setupData.sweep_extreme?.toString() || "",
        idmLevel: setupData.idm_level?.toString() || "",
        chochLevel: setupData.choch_level?.toString() || "",
        fvgHigh: setupData.fvg_high?.toString() || "",
        fvgLow: setupData.fvg_low?.toString() || "",
        entryPrice: setupData.entry_price?.toString() || "",
        stopLoss: setupData.stop_loss?.toString() || "",
        takeProfit: setupData.take_profit?.toString() || "",
        notes: setupData.notes || "",
      });

      setExistingSetupId(setupData.id);
      setLoadingEdit(false);
    }
    load();
  }, [editId, isEdit, supabase]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Auto-calculate levels live as the user types
  const levels = useMemo(() => computeCrimLevels({
    rcHigh: form.rcHigh,
    rcLow: form.rcLow,
    direction: form.direction,
  }), [form.rcHigh, form.rcLow, form.direction]);

  // Run the full engine evaluation
  const evaluation = useMemo(() => {
    return evaluateCrim({
      direction: form.direction,
      rcHigh: form.rcHigh,
      rcLow: form.rcLow,
      sweptSide: form.sweptSide,
      sweepExtreme: form.sweepExtreme,
      idmLevel: form.idmLevel,
      chochLevel: form.chochLevel,
      fvgHigh: form.fvgHigh,
      fvgLow: form.fvgLow,
      entryPrice: form.entryPrice,
      stopLoss: form.stopLoss,
      takeProfit: form.takeProfit,
      accountSize,
      riskPercent,
    });
  }, [form, accountSize, riskPercent]);

  async function saveCrim({ isDraft }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); return null; }

    const payload = {
      user_id: user.id,
      pair: form.pair || null,
      timeframe: form.timeframe,
      session: form.session,
      direction: form.direction,
      status: isDraft ? "draft" : "complete",

      // Part 1: CRT
      rc_high: form.rcHigh ? parseFloat(form.rcHigh) : null,
      rc_low: form.rcLow ? parseFloat(form.rcLow) : null,
      rc_ce: levels.ce || null,
      rc_ote_62: levels.ote62 || null,
      rc_ote_79: levels.ote79 || null,

      // Part 2 & 3: Structure
      swept_side: form.sweptSide,
      sweep_extreme: form.sweepExtreme ? parseFloat(form.sweepExtreme) : null,
      idm_level: form.idmLevel ? parseFloat(form.idmLevel) : null,
      choch_level: form.chochLevel ? parseFloat(form.chochLevel) : null,
      fvg_high: form.fvgHigh ? parseFloat(form.fvgHigh) : null,
      fvg_low: form.fvgLow ? parseFloat(form.fvgLow) : null,

      // Part 4: Trade
      entry_price: form.entryPrice ? parseFloat(form.entryPrice) : null,
      stop_loss: form.stopLoss ? parseFloat(form.stopLoss) : null,
      take_profit: form.takeProfit ? parseFloat(form.takeProfit) : null,
      
      account_size: accountSize || null,
      risk_percent: riskPercent || 1,
      lot_size: evaluation.trade ? evaluation.trade.lotSize : null,
      notes: form.notes || null,
    };

    let setupRow;
    if (isEdit && existingSetupId) {
      const { data, error: updErr } = await supabase.from("crim_setups").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", existingSetupId).select().single();
      if (updErr) { setError(updErr.message); return null; }
      setupRow = data;
    } else {
      const { data, error: insErr } = await supabase.from("crim_setups").insert(payload).select().single();
      if (insErr) { setError(insErr.message); return null; }
      setupRow = data;
      setExistingSetupId(data.id);
    }

    return setupRow;
  }

  async function handleSaveDraft() {
    setSavingDraft(true); setError("");
    const row = await saveCrim({ isDraft: true });
    setSavingDraft(false);
    if (!row) return;
    setDraftSavedAt(new Date());
  }

  async function handleSaveFinal() {
    if (!evaluation.allGatesPass) { setError("The full sequence must be complete before saving as final."); return; }
    if (!evaluation.trade) { setError("Trade could not be computed."); return; }
    setSaving(true); setError("");
    const row = await saveCrim({ isDraft: false });
    setSaving(false);
    if (!row) return;
    setDraftSavedAt(null);
    setTimeout(() => router.push(`/crim/${row.id}`), 800);
  }

  async function ensureSetupSaved() {
    if (existingSetupId) return existingSetupId;
    const row = await saveCrim({ isDraft: true });
    if (!row) throw new Error("Failed to save draft.");
    setDraftSavedAt(new Date());
    return row.id;
  }

  if (loadingEdit && isEdit) return <div className="p-6 text-gray-400">Loading CRIM setup...</div>;
  const canSaveFinal = evaluation.allGatesPass && evaluation.trade;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? "Edit CRIM Setup" : "🎯 CRIM — CRT + IDM + MSS"}</h1>
          <p className="text-gray-400 text-sm">The Golden Pipeline: Reference Candle → Sweep → IDM → MSS → Entry</p>
        </div>

        {/* HEADER */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <PairPicker value={form.pair} onChange={(p) => update("pair", p)} label="Pair" />
            <div>
              <label className="block text-xs mb-1 text-gray-400">Timeframe</label>
              <select value={form.timeframe} onChange={(e) => update("timeframe", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {CRIM_TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1 text-gray-400">Session</label>
            <select value={form.session} onChange={(e) => update("session", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
              {CRIM_SESSIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1 text-gray-400">Direction</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => update("direction", "bullish")} className={`text-left px-3 py-2 rounded-lg border text-xs transition ${form.direction === "bullish" ? "bg-green-900/40 border-green-700 text-green-200" : "bg-black border-gray-800 text-gray-400"}`}>
                <p className="font-bold">🟢 Bullish</p>
              </button>
              <button type="button" onClick={() => update("direction", "bearish")} className={`text-left px-3 py-2 rounded-lg border text-xs transition ${form.direction === "bearish" ? "bg-red-900/40 border-red-700 text-red-200" : "bg-black border-gray-800 text-gray-400"}`}>
                <p className="font-bold">🔴 Bearish</p>
              </button>
            </div>
          </div>
        </div>

        {/* PART 1 — CRT */}
        <div className="p-4 rounded-lg bg-gray-900 border border-blue-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-blue-300">📦 Part 1 — Reference Candle (CRT)</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">RC High</label><input type="number" step="any" value={form.rcHigh} onChange={(e) => update("rcHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">RC Low</label><input type="number" step="any" value={form.rcLow} onChange={(e) => update("rcLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>
          
          {/* Auto-calc panel */}
          {levels.valid && (
            <div className="p-3 rounded-lg bg-black border border-blue-800/40 grid grid-cols-2 gap-2 text-xs">
              <p className="text-gray-400">50% CE: <span className="text-yellow-300 font-mono font-bold">{formatPrice(levels.ce)}</span></p>
              <p className="text-gray-400">Zone: <span className="text-sky-300 font-mono uppercase">{levels.zone}</span></p>
              <p className="text-gray-400 col-span-2">OTE 62%-79%: <span className="text-sky-300 font-mono">{formatPrice(levels.ote62)} - {formatPrice(levels.ote79)}</span></p>
            </div>
          )}
        </div>

        {/* PART 2 — SEEK & DESTROY */}
        <div className="p-4 rounded-lg bg-gray-900 border border-orange-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-orange-300">⚡ Part 2 — Seek & Destroy</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Swept Side</label>
              <select value={form.sweptSide} onChange={(e) => update("sweptSide", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="bsl">🔵 BSL (Above)</option>
                <option value="ssl">🟠 SSL (Below)</option>
              </select>
            </div>
            <div><label className="block text-xs mb-1 text-gray-400">Sweep Extreme</label><input type="number" step="any" value={form.sweepExtreme} onChange={(e) => update("sweepExtreme", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>
        </div>

        {/* PART 3 — STRUCTURE */}
        <div className="p-4 rounded-lg bg-gray-900 border border-purple-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-purple-300">🔍 Part 3 — Structure (IDM + MSS)</h2>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">IDM Level</label><input type="number" step="any" value={form.idmLevel} onChange={(e) => update("idmLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">CHoCH Level</label><input type="number" step="any" value={form.chochLevel} onChange={(e) => update("chochLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">FVG High</label><input type="number" step="any" value={form.fvgHigh} onChange={(e) => update("fvgHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>
          <div><label className="block text-xs mb-1 text-gray-400">FVG Low</label><input type="number" step="any" value={form.fvgLow} onChange={(e) => update("fvgLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
        </div>

        {/* PART 4 — ENTRY */}
        <div className="p-4 rounded-lg bg-gray-900 border border-emerald-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-300">🎯 Part 4 — Entry & Targets</h2>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">Entry Price</label><input type="number" step="any" value={form.entryPrice} onChange={(e) => update("entryPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">Stop Loss</label><input type="number" step="any" value={form.stopLoss} onChange={(e) => update("stopLoss", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">Target (RC)</label><input type="number" step="any" value={form.takeProfit} onChange={(e) => update("takeProfit", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>
        </div>

        {evaluation && <CrimCard data={{ ...evaluation, ...form, rcCe: levels.ce, rcOte62: levels.ote62, rcOte79: levels.ote79 }} />}

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <ScreenshotUploader setupId={existingSetupId} userId={userId} screenshots={screenshots} onChange={setScreenshots} table="crim_screenshots" onEnsureSetup={ensureSetupSaved} />
          <ScreenshotGallery screenshots={screenshots} onDelete={(id) => setScreenshots(prev => prev.filter(s => s.id !== id))} table="crim_screenshots" />
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <label className="block text-xs mb-1 text-gray-400">Notes</label>
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 resize-none text-sm" />
        </div>

        {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}
        {draftSavedAt && <div className="p-3 rounded-lg bg-yellow-900/40 border border-yellow-700 text-yellow-100 text-sm">📝 Draft saved · {draftSavedAt.toLocaleTimeString()}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button type="button" onClick={handleSaveDraft} disabled={savingDraft || saving} className="w-full py-4 rounded-lg font-bold disabled:opacity-50 bg-yellow-800 hover:bg-yellow-700 text-white">
            {savingDraft ? "Saving..." : "📝 Save Draft"}
          </button>
          <button type="button" onClick={handleSaveFinal} disabled={saving || savingDraft || !canSaveFinal} className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${canSaveFinal ? "bg-sky-700 hover:bg-sky-600" : "bg-gray-800"}`}>
            {saving ? "Saving..." : canSaveFinal ? "✅ Save as Final" : "💾 Sequence incomplete"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function CrimPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 bg-black text-white"><div className="max-w-3xl mx-auto text-gray-400">Loading CRIM...</div></main>}>
      <CrimPageContent />
    </Suspense>
  );
}