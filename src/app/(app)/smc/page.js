"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import {
  SMC_SESSIONS,
  SWEEP_TYPES,
  PD_ARRAY_TYPES,
  DOL_TYPES,
  evaluateSmc,
} from "@/lib/smcEngine";
import { computeCe } from "@/lib/liquidityZoneEngine";
import PairPicker from "@/components/PairPicker";
import SmcCard from "@/components/SmcCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";
import { Suspense } from "react";

function SmcPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "M15",
    session: "london",
    
    // Step 1 & 2: Context
    dailyBias: "bullish",
    rangeHigh: "",
    rangeLow: "",
    currentPrice: "",
    
    // Step 3: Liquidity
    sweepHappened: false,
    sweepType: "ssl",
    sweepLevel: "",
    
    // Step 4 & 5: Confirmation & Entry
    chochConfirmed: false,
    displacementPresent: false,
    poiHigh: "",
    poiLow: "",
    activePoiType: "fvg",
    
    // Step 6: Target
    dolPrice: "",
    dolType: "bsl",
    
    notes: "",
  });

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
      const { data: setupData, error: setupErr } = await supabase.from("smc_setups").select("*").eq("id", editId).maybeSingle();
      
      if (setupErr || !setupData) {
        setError(setupErr?.message || "SMC setup not found.");
        setLoadingEdit(false);
        return;
      }

      const { data: shotsData } = await supabase.from("smc_screenshots").select("*").eq("setup_id", setupData.id).order("created_at");
      setScreenshots(shotsData || []);

      setForm({
        pair: setupData.pair || "Volatility 80",
        timeframe: setupData.timeframe || "M15",
        session: setupData.session || "london",
        dailyBias: setupData.daily_bias || "bullish",
        rangeHigh: setupData.dealing_range_high?.toString() || "",
        rangeLow: setupData.dealing_range_low?.toString() || "",
        currentPrice: setupData.current_price?.toString() || "",
        sweepHappened: setupData.sweep_happened || false,
        sweepType: setupData.sweep_type || "ssl",
        sweepLevel: setupData.sweep_level?.toString() || "",
        chochConfirmed: setupData.choch_confirmed || false,
        displacementPresent: setupData.displacement_present || false,
        poiHigh: setupData.poi_high?.toString() || "",
        poiLow: setupData.poi_low?.toString() || "",
        activePoiType: setupData.active_poi_type || "fvg",
        dolPrice: setupData.dol_price?.toString() || "",
        dolType: setupData.dol_type || "bsl",
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

  const evaluation = useMemo(() => {
    return evaluateSmc({
      dailyBias: form.dailyBias,
      session: form.session,
      dealingRangeHigh: form.rangeHigh,
      dealingRangeLow: form.rangeLow,
      currentPrice: form.currentPrice,
      sweepHappened: form.sweepHappened,
      sweepType: form.sweepType,
      sweepLevel: form.sweepLevel,
      chochConfirmed: form.chochConfirmed,
      displacementPresent: form.displacementPresent,
      poiHigh: form.poiHigh,
      poiLow: form.poiLow,
      dolPrice: form.dolPrice,
      dolType: form.dolType,
      accountSize,
      riskPercent,
    });
  }, [form, accountSize, riskPercent]);

  async function saveSmc({ isDraft }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); return null; }

    const trade = evaluation.trade;
    const payload = {
      user_id: user.id,
      pair: form.pair,
      timeframe: form.timeframe,
      status: isDraft ? "draft" : "complete",
      session: form.session,
      daily_bias: form.dailyBias,
      dealing_range_high: form.rangeHigh ? parseFloat(form.rangeHigh) : null,
      dealing_range_low: form.rangeLow ? parseFloat(form.rangeLow) : null,
      current_price: form.currentPrice ? parseFloat(form.currentPrice) : null,
      premium_discount: evaluation.context.gates.find(g => g.key === "zone")?.pass ? (form.dailyBias === "bullish" ? "discount" : "premium") : "equilibrium",
      sweep_happened: form.sweepHappened,
      sweep_type: form.sweepType,
      sweep_level: form.sweepLevel ? parseFloat(form.sweepLevel) : null,
      choch_confirmed: form.chochConfirmed,
      displacement_present: form.displacementPresent,
      active_poi_type: form.activePoiType,
      poi_high: form.poiHigh ? parseFloat(form.poiHigh) : null,
      poi_low: form.poiLow ? parseFloat(form.poiLow) : null,
      dol_price: form.dolPrice ? parseFloat(form.dolPrice) : null,
      dol_type: form.dolType,
      entry: trade && !trade.invalid ? trade.entry : null,
      sl: trade && !trade.invalid ? trade.sl : null,
      tp: trade && !trade.invalid ? trade.tp : null,
      rr: trade && !trade.invalid ? trade.rr : null,
      notes: form.notes,
    };

    let setupRow;
    if (isEdit && existingSetupId) {
      const { data, error: updErr } = await supabase.from("smc_setups").update(payload).eq("id", existingSetupId).select().single();
      if (updErr) { setError(updErr.message); return null; }
      setupRow = data;
    } else {
      const { data, error: insErr } = await supabase.from("smc_setups").insert(payload).select().single();
      if (insErr) { setError(insErr.message); return null; }
      setupRow = data;
      setExistingSetupId(data.id);
    }

    return setupRow;
  }

  async function handleSaveDraft() {
    setSavingDraft(true); setError("");
    const row = await saveSmc({ isDraft: true });
    setSavingDraft(false);
    if (!row) return;
    setDraftSavedAt(new Date());
    setSaved(false);
  }

  async function handleSaveFinal() {
    if (!evaluation.preEntryReady) { setError("All 6 steps must pass before saving as final."); return; }
    setSaving(true); setError("");
    const row = await saveSmc({ isDraft: false });
    setSaving(false);
    if (!row) return;
    setDraftSavedAt(null);
    setSaved(true);
    setTimeout(() => router.push(`/smc/${row.id}`), 800);
  }

  async function ensureSetupSaved() {
    if (existingSetupId) return existingSetupId;
    const row = await saveSmc({ isDraft: true });
    if (!row) throw new Error("Failed to save draft.");
    setDraftSavedAt(new Date());
    return row.id;
  }

  if (loadingEdit && isEdit) return <div className="p-6 text-gray-400">Loading SMC setup...</div>;

  const canSaveFinal = evaluation.preEntryReady;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? "Edit SMC Setup" : "SMC / ICT — Complete Entry Model"}</h1>
          <p className="text-gray-400 text-sm">Context → Time → Sweep → CHoCH → PD Array → DOL</p>
        </div>

        {/* Context Box */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <PairPicker value={form.pair} onChange={(p) => update("pair", p)} label="Pair" />
            <div>
              <label className="block text-xs mb-1 text-gray-400">Timeframe</label>
              <select value={form.timeframe} onChange={(e) => update("timeframe", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="H4">H4</option>
                <option value="H1">H1</option>
                <option value="M15">M15</option>
                <option value="M5">M5</option>
              </select>
            </div>
          </div>
        </div>

        {/* STEP 1 & 2: Context & Time */}
        <div className="p-4 rounded-lg bg-gray-900 border border-blue-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-blue-300">🌍 Step 1 & 2 — Context & Time</h2>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Daily Bias</label>
              <select value={form.dailyBias} onChange={(e) => update("dailyBias", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="bullish">🟢 Bullish</option>
                <option value="bearish">🔴 Bearish</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Session / Kill Zone</label>
              <select value={form.session} onChange={(e) => update("session", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {SMC_SESSIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Range High</label>
              <input type="number" step="any" value={form.rangeHigh} onChange={(e) => update("rangeHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Range Low</label>
              <input type="number" step="any" value={form.rangeLow} onChange={(e) => update("rangeLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Current Price</label>
              <input type="number" step="any" value={form.currentPrice} onChange={(e) => update("currentPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>
        </div>

        {/* STEP 3: Liquidity */}
        <div className="p-4 rounded-lg bg-gray-900 border border-purple-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-purple-300">💧 Step 3 — Liquidity (Sweep)</h2>
          <button type="button" onClick={() => update("sweepHappened", !form.sweepHappened)} className={`w-full text-left p-3 rounded-lg border transition ${form.sweepHappened ? "bg-purple-900/40 border-purple-700" : "bg-black border-gray-800"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.sweepHappened ? "bg-purple-500 border-purple-500" : "border-gray-600"}`}>
                {form.sweepHappened && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <p className={`text-sm font-medium ${form.sweepHappened ? "text-purple-200" : "text-white"}`}>Liquidity Swept</p>
            </div>
          </button>

          {form.sweepHappened && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1 text-gray-400">Sweep Type</label>
                <select value={form.sweepType} onChange={(e) => update("sweepType", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                  {SWEEP_TYPES.map((s) => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-400">Sweep Level</label>
                <input type="number" step="any" value={form.sweepLevel} onChange={(e) => update("sweepLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
              </div>
            </div>
          )}
        </div>

        {/* STEP 4 & 5: Confirmation & Entry */}
        <div className="p-4 rounded-lg bg-gray-900 border border-emerald-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-300">⚡ Step 4 & 5 — Confirmation & PD Array</h2>
          
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => update("chochConfirmed", !form.chochConfirmed)} className={`text-left p-3 rounded-lg border transition ${form.chochConfirmed ? "bg-emerald-900/40 border-emerald-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.chochConfirmed ? "bg-emerald-500 border-emerald-500" : "border-gray-600"}`}>
                  {form.chochConfirmed && <span className="text-black text-xs font-bold">✓</span>}
                </div>
                <p className={`text-sm font-medium ${form.chochConfirmed ? "text-emerald-200" : "text-white"}`}>CHoCH Confirmed</p>
              </div>
            </button>
            <button type="button" onClick={() => update("displacementPresent", !form.displacementPresent)} className={`text-left p-3 rounded-lg border transition ${form.displacementPresent ? "bg-emerald-900/40 border-emerald-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.displacementPresent ? "bg-emerald-500 border-emerald-500" : "border-gray-600"}`}>
                  {form.displacementPresent && <span className="text-black text-xs font-bold">✓</span>}
                </div>
                <p className={`text-sm font-medium ${form.displacementPresent ? "text-emerald-200" : "text-white"}`}>Displacement Present</p>
              </div>
            </button>
          </div>

          <div className="pt-2 border-t border-emerald-800/40 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Array Type</label>
              <select value={form.activePoiType} onChange={(e) => update("activePoiType", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {PD_ARRAY_TYPES.map((p) => <option key={p.key} value={p.key}>{p.emoji} {p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Array Low</label>
              <input type="number" step="any" value={form.poiLow} onChange={(e) => update("poiLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Array High</label>
              <input type="number" step="any" value={form.poiHigh} onChange={(e) => update("poiHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>
        </div>

        {/* STEP 6: DOL */}
        <div className="p-4 rounded-lg bg-gray-900 border border-yellow-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-yellow-300">🎯 Step 6 — Target (DOL)</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">DOL Price</label>
              <input type="number" step="any" value={form.dolPrice} onChange={(e) => update("dolPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">DOL Type</label>
              <select value={form.dolType} onChange={(e) => update("dolType", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {DOL_TYPES.map((d) => <option key={d.key} value={d.key}>{d.emoji} {d.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {evaluation && <SmcCard data={evaluation} />}

        {/* Screenshots & Notes */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <ScreenshotUploader setupId={existingSetupId} userId={userId} screenshots={screenshots} onChange={setScreenshots} table="smc_screenshots" onEnsureSetup={ensureSetupSaved} />
          <ScreenshotGallery screenshots={screenshots} onDelete={(id) => setScreenshots((prev) => prev.filter((s) => s.id !== id))} />
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <label className="block text-xs mb-1 text-gray-400">Notes</label>
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 resize-none text-sm" />
        </div>

        {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}
        {draftSavedAt && <div className="p-3 rounded-lg bg-yellow-900/40 border border-yellow-700 text-yellow-100 text-sm">📝 Draft saved</div>}
        {saved && <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">✅ Saved — redirecting...</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button type="button" onClick={handleSaveDraft} disabled={savingDraft || saving} className="w-full py-4 rounded-lg font-bold disabled:opacity-50 bg-yellow-800 hover:bg-yellow-700 text-white">
            {savingDraft ? "Saving..." : "📝 Save Draft"}
          </button>
          <button type="button" onClick={handleSaveFinal} disabled={saving || savingDraft || !canSaveFinal} className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${canSaveFinal ? "bg-blue-700 hover:bg-blue-600" : "bg-gray-800"}`}>
            {saving ? "Saving..." : canSaveFinal ? "✅ Save as Final" : "💾 All 6 steps must pass"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function SmcPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 bg-black text-white"><div className="max-w-3xl mx-auto text-gray-400">Loading SMC...</div></main>}>
      <SmcPageContent />
    </Suspense>
  );
}