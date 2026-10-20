"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { LQE_SESSIONS, SWEEP_TYPES, PD_ARRAY_TYPES, evaluateLqe } from "@/lib/lqeEngine";
import PairPicker from "@/components/PairPicker";
import LqeCard from "@/components/LqeCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

function emptyArray() {
  return {
    id: Math.random().toString(36).slice(2),
    array_type: "fvg",
    direction: "bullish",
    high: "",
    low: "",
    date_formed: "",
    is_mitigated: false,
    flip_state: "intact",
    flip_date: "",
    flip_price: "",
    note: "",
  };
}

function LqePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "M15",
    session: "london",
    dailyBias: "bullish",
    rangeHigh: "",
    rangeLow: "",
    currentPrice: "",
    sweepType: "ssl",
    sweepLevel: "",
    sweepConfirmed: false,
    smtDivergence: false,
    correlatedPair: "",
    mssConfirmed: false,
    chochConfirmed: false,
    displacementPresent: false,
    arrays: [emptyArray()],
    targetLiquidityType: "eqh_eql",
    targetPrice: "",
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
      const { data: setupData, error: setupErr } = await supabase.from("lqe_setups").select("*").eq("id", editId).maybeSingle();
      if (setupErr || !setupData) { setError(setupErr?.message || "LQE setup not found."); setLoadingEdit(false); return; }

      const { data: arrayData } = await supabase.from("lqe_arrays").select("*").eq("setup_id", setupData.id).order("created_at");
      const { data: shotsData } = await supabase.from("lqe_screenshots").select("*").eq("setup_id", setupData.id).order("created_at");
      setScreenshots(shotsData || []);

      setForm({
        pair: setupData.pair || "Volatility 80",
        timeframe: setupData.timeframe || "M15",
        session: setupData.session || "london",
        dailyBias: setupData.daily_bias || "bullish",
        rangeHigh: setupData.dealing_range_high?.toString() || "",
        rangeLow: setupData.dealing_range_low?.toString() || "",
        currentPrice: setupData.current_price?.toString() || "",
        sweepType: setupData.sweep_type || "ssl",
        sweepLevel: setupData.sweep_level?.toString() || "",
        sweepConfirmed: setupData.sweep_confirmed || false,
        smtDivergence: setupData.smt_divergence || false,
        correlatedPair: setupData.correlated_pair || "",
        mssConfirmed: setupData.mss_confirmed || false,
        chochConfirmed: setupData.choch_confirmed || false,
        displacementPresent: setupData.displacement_present || false,
        arrays: arrayData && arrayData.length > 0 ? arrayData.map(a => ({
          id: a.id,
          array_type: a.array_type || "fvg",
          direction: a.direction || "bullish",
          high: a.high?.toString() || "",
          low: a.low?.toString() || "",
          date_formed: a.date_formed || "",
          is_mitigated: a.is_mitigated || false,
          flip_state: a.flip_state || "intact",
          flip_date: a.flip_date || "",
          flip_price: a.flip_price?.toString() || "",
          note: a.note || "",
        })) : [emptyArray()],
        targetLiquidityType: setupData.target_liquidity_type || "eqh_eql",
        targetPrice: setupData.target_price?.toString() || "",
        notes: setupData.notes || "",
      });

      setExistingSetupId(setupData.id);
      setLoadingEdit(false);
    }
    load();
  }, [editId, isEdit, supabase]);

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }
  function updateArray(id, field, value) {
    setForm((f) => ({ ...f, arrays: f.arrays.map((a) => (a.id === id ? { ...a, [field]: value } : a)) }));
  }
  function addArray() { setForm((f) => ({ ...f, arrays: [...f.arrays, emptyArray()] })); }
  function removeArray(id) { setForm((f) => ({ ...f, arrays: f.arrays.filter((a) => a.id !== id) })); }

  const evaluation = useMemo(() => {
    return evaluateLqe({
      dailyBias: form.dailyBias,
      session: form.session,
      dealingRangeHigh: form.rangeHigh,
      dealingRangeLow: form.rangeLow,
      currentPrice: form.currentPrice,
      sweepType: form.sweepType,
      sweepLevel: form.sweepLevel,
      sweepConfirmed: form.sweepConfirmed,
      smtDivergence: form.smtDivergence,
      mssConfirmed: form.mssConfirmed,
      chochConfirmed: form.chochConfirmed,
      displacementPresent: form.displacementPresent,
      arrays: form.arrays,
      targetPrice: form.targetPrice,
      targetLiquidityType: form.targetLiquidityType,
      accountSize,
      riskPercent,
    });
  }, [form, accountSize, riskPercent]);

  async function saveLqe({ isDraft }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); return null; }

    const trade = evaluation.trade;

    const payload = {
      user_id: user.id,
      pair: form.pair,
      timeframe: form.timeframe,
      status: isDraft ? "draft" : "complete",
      session: form.session,
      killzone_valid: evaluation.context.gates.find(g => g.key === "time")?.pass || false,
      daily_bias: form.dailyBias,
      dealing_range_high: form.rangeHigh ? parseFloat(form.rangeHigh) : null,
      dealing_range_low: form.rangeLow ? parseFloat(form.rangeLow) : null,
      current_price: form.currentPrice ? parseFloat(form.currentPrice) : null,
      sweep_type: form.sweepType,
      sweep_level: form.sweepLevel ? parseFloat(form.sweepLevel) : null,
      sweep_confirmed: form.sweepConfirmed,
      smt_divergence: form.smtDivergence,
      correlated_pair: form.correlatedPair,
      mss_confirmed: form.mssConfirmed,
      choch_confirmed: form.chochConfirmed,
      displacement_present: form.displacementPresent,
      entry_price: trade && !trade.invalid ? trade.entry : null,
      ote_entry_level: trade && !trade.invalid ? trade.oteEntry : null,
      stop_loss: trade && !trade.invalid ? trade.sl : null,
      target_liquidity_type: form.targetLiquidityType,
      target_price: form.targetPrice ? parseFloat(form.targetPrice) : null,
      rr: trade && !trade.invalid ? trade.rr : null,
      notes: form.notes,
    };

    let setupRow;
    if (isEdit && existingSetupId) {
      const { data, error: updErr } = await supabase.from("lqe_setups").update(payload).eq("id", existingSetupId).select().single();
      if (updErr) { setError(updErr.message); return null; }
      setupRow = data;
      await supabase.from("lqe_arrays").delete().eq("setup_id", existingSetupId);
    } else {
      const { data, error: insErr } = await supabase.from("lqe_setups").insert(payload).select().single();
      if (insErr) { setError(insErr.message); return null; }
      setupRow = data;
      setExistingSetupId(data.id);
    }

    const cleanArrays = form.arrays
      .map(a => ({
        array_type: a.array_type || "fvg",
        direction: a.direction,
        high: parseFloat(a.high),
        low: parseFloat(a.low),
        date_formed: a.date_formed || null,
        is_mitigated: a.is_mitigated || false,
        flip_state: a.flip_state || "intact",
        flip_date: a.flip_date || null,
        flip_price: a.flip_price ? parseFloat(a.flip_price) : null,
        note: a.note || null,
      }))
      .filter(a => !isNaN(a.high) && !isNaN(a.low) && a.high > a.low);

    if (cleanArrays.length > 0) {
      const arrayRows = cleanArrays.map(a => ({
        user_id: user.id,
        setup_id: setupRow.id,
        array_type: a.array_type,
        direction: a.direction,
        high: a.high,
        low: a.low,
        date_formed: a.date_formed,
        is_mitigated: a.is_mitigated,
        flip_state: a.flip_state,
        flip_date: a.flip_date,
        flip_price: a.flip_price,
        note: a.note,
      }));
      const { error: arrErr } = await supabase.from("lqe_arrays").insert(arrayRows);
      if (arrErr) { setError(arrErr.message); return null; }
    }

    return setupRow;
  }

  async function handleSaveDraft() {
    setSavingDraft(true); setError("");
    const row = await saveLqe({ isDraft: true });
    setSavingDraft(false);
    if (!row) return;
    setDraftSavedAt(new Date());
    setSaved(false);
  }

  async function handleSaveFinal() {
    if (!evaluation.preEntryReady) { setError("The full sequence must be complete before saving as final."); return; }
    setSaving(true); setError("");
    const row = await saveLqe({ isDraft: false });
    setSaving(false);
    if (!row) return;
    setDraftSavedAt(null);
    setSaved(true);
    setTimeout(() => router.push(`/lqe/${row.id}`), 800);
  }

  async function ensureSetupSaved() {
    if (existingSetupId) return existingSetupId;
    const row = await saveLqe({ isDraft: true });
    if (!row) throw new Error("Failed to save draft.");
    setDraftSavedAt(new Date());
    return row.id;
  }

  if (loadingEdit && isEdit) return <div className="p-6 text-gray-400">Loading LQE setup...</div>;

  const canSaveFinal = evaluation.preEntryReady;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? "Edit LQE Setup" : "Liquidity Engine (LQE)"}</h1>
          <p className="text-gray-400 text-sm">Context → Sweep → Structure → Ladder → Delivery</p>
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

        {/* STEP 1: Context */}
        <div className="p-4 rounded-lg bg-gray-900 border border-blue-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-blue-300">🌍 Step 1 — Context & Time</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Daily Bias</label>
              <select value={form.dailyBias} onChange={(e) => update("dailyBias", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="bullish">🟢 Bullish</option>
                <option value="bearish">🔴 Bearish</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Session</label>
              <select value={form.session} onChange={(e) => update("session", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {LQE_SESSIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">Range High</label><input type="number" step="any" value={form.rangeHigh} onChange={(e) => update("rangeHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">Range Low</label><input type="number" step="any" value={form.rangeLow} onChange={(e) => update("rangeLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div><label className="block text-xs mb-1 text-gray-400">Current Price</label><input type="number" step="any" value={form.currentPrice} onChange={(e) => update("currentPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>
        </div>

        {/* STEP 2: Sweep */}
        <div className="p-4 rounded-lg bg-gray-900 border border-purple-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-purple-300">💧 Step 2 — Liquidity Sweep</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Sweep Type</label>
              <select value={form.sweepType} onChange={(e) => update("sweepType", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {SWEEP_TYPES.map((s) => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
              </select>
            </div>
            <div><label className="block text-xs mb-1 text-gray-400">Sweep Level</label><input type="number" step="any" value={form.sweepLevel} onChange={(e) => update("sweepLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => update("sweepConfirmed", !form.sweepConfirmed)} className={`text-left p-3 rounded-lg border transition ${form.sweepConfirmed ? "bg-purple-900/40 border-purple-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.sweepConfirmed ? "bg-purple-500 border-purple-500" : "border-gray-600"}`}>{form.sweepConfirmed && <span className="text-black text-xs font-bold">✓</span>}</div>
                <p className={`text-sm font-medium ${form.sweepConfirmed ? "text-purple-200" : "text-white"}`}>Sweep Confirmed</p>
              </div>
            </button>
            <button type="button" onClick={() => update("smtDivergence", !form.smtDivergence)} className={`text-left p-3 rounded-lg border transition ${form.smtDivergence ? "bg-purple-900/40 border-purple-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.smtDivergence ? "bg-purple-500 border-purple-500" : "border-gray-600"}`}>{form.smtDivergence && <span className="text-black text-xs font-bold">✓</span>}</div>
                <p className={`text-sm font-medium ${form.smtDivergence ? "text-purple-200" : "text-white"}`}>SMT Divergence</p>
              </div>
            </button>
          </div>
        </div>

        {/* STEP 3: Structure */}
        <div className="p-4 rounded-lg bg-gray-900 border border-emerald-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-300">⚡ Step 3 — Structure Shift</h2>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => update("mssConfirmed", !form.mssConfirmed)} className={`text-left p-3 rounded-lg border transition ${form.mssConfirmed ? "bg-emerald-900/40 border-emerald-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.mssConfirmed ? "bg-emerald-500 border-emerald-500" : "border-gray-600"}`}>{form.mssConfirmed && <span className="text-black text-xs font-bold">✓</span>}</div>
                <p className={`text-sm font-medium ${form.mssConfirmed ? "text-emerald-200" : "text-white"}`}>MSS Confirmed</p>
              </div>
            </button>
            <button type="button" onClick={() => update("chochConfirmed", !form.chochConfirmed)} className={`text-left p-3 rounded-lg border transition ${form.chochConfirmed ? "bg-emerald-900/40 border-emerald-700" : "bg-black border-gray-800"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.chochConfirmed ? "bg-emerald-500 border-emerald-500" : "border-gray-600"}`}>{form.chochConfirmed && <span className="text-black text-xs font-bold">✓</span>}</div>
                <p className={`text-sm font-medium ${form.chochConfirmed ? "text-emerald-200" : "text-white"}`}>LTF CHoCH Confirmed</p>
              </div>
            </button>
          </div>
          <button type="button" onClick={() => update("displacementPresent", !form.displacementPresent)} className={`w-full text-left p-3 rounded-lg border transition ${form.displacementPresent ? "bg-emerald-900/40 border-emerald-700" : "bg-black border-gray-800"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.displacementPresent ? "bg-emerald-500 border-emerald-500" : "border-gray-600"}`}>{form.displacementPresent && <span className="text-black text-xs font-bold">✓</span>}</div>
              <p className={`text-sm font-medium ${form.displacementPresent ? "text-emerald-200" : "text-white"}`}>Displacement Present</p>
            </div>
          </button>
        </div>

        {/* STEP 4: PD Array Matrix */}
        <div className="p-4 rounded-lg bg-gray-900 border border-yellow-800/60 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-yellow-300">🪜 Step 4 — PD Array Matrix (Ladder)</h2>
            <button type="button" onClick={addArray} className="text-xs px-2 py-1 rounded bg-yellow-900/40 text-yellow-300 hover:bg-yellow-800/40">+ Add Array</button>
          </div>

          {form.arrays.map((a, i) => (
            <div key={a.id} className="p-3 rounded-lg border border-gray-800 bg-black space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400">Array #{i + 1}</p>
                {form.arrays.length > 1 && (
                  <button type="button" onClick={() => removeArray(a.id)} className="text-red-400 text-xs">✕ Remove</button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] mb-0.5 text-gray-500">PD Array Type</label>
                  <select value={a.array_type} onChange={(e) => updateArray(a.id, "array_type", e.target.value)} className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs">
                    {PD_ARRAY_TYPES.map(t => (
                      <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] mb-0.5 text-gray-500">Direction</label>
                  <select value={a.direction} onChange={(e) => updateArray(a.id, "direction", e.target.value)} className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs">
                    <option value="bullish">🟢 Bullish</option>
                    <option value="bearish">🔴 Bearish</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] mb-0.5 text-gray-500">Low</label>
                  <input type="number" step="any" value={a.low} onChange={(e) => updateArray(a.id, "low", e.target.value)} className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] mb-0.5 text-gray-500">High</label>
                  <input type="number" step="any" value={a.high} onChange={(e) => updateArray(a.id, "high", e.target.value)} className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] mb-0.5 text-gray-500">Date Formed</label>
                  <input type="date" value={a.date_formed} onChange={(e) => updateArray(a.id, "date_formed", e.target.value)} className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => updateArray(a.id, "is_mitigated", !a.is_mitigated)} className={`text-left px-2 py-1.5 rounded border text-xs transition ${a.is_mitigated ? "bg-orange-900/40 border-orange-700 text-orange-200" : "bg-black border-gray-800 text-gray-400"}`}>
                  {a.is_mitigated ? "✅ Mitigated" : "⚪ Unmitigated"}
                </button>
                <input type="text" value={a.note} onChange={(e) => updateArray(a.id, "note", e.target.value)} placeholder="Note (optional)" className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs" />
              </div>

              {/* Flip State */}
              <div className="pt-2 border-t border-gray-800 space-y-2">
                <button type="button" onClick={() => updateArray(a.id, "flip_state", a.flip_state === "flipped" ? "intact" : "flipped")} className={`w-full text-left px-2 py-1.5 rounded border text-xs transition ${a.flip_state === "flipped" ? "bg-purple-900/40 border-purple-700 text-purple-200" : "bg-black border-gray-800 text-gray-400"}`}>
                  {a.flip_state === "flipped"
                    ? `🔀 Flipped (now acts as ${a.direction === "bullish" ? "bearish" : "bullish"})`
                    : "⚪ Intact (works in original direction)"}
                </button>

                {a.flip_state === "flipped" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] mb-0.5 text-gray-500">Flip Date</label>
                      <input type="date" value={a.flip_date} onChange={(e) => updateArray(a.id, "flip_date", e.target.value)} className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] mb-0.5 text-gray-500">Flip Price (close)</label>
                      <input type="number" step="any" value={a.flip_price} onChange={(e) => updateArray(a.id, "flip_price", e.target.value)} className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* STEP 5 & 6: Delivery */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-700/60 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300">🎯 Step 5 & 6 — Delivery (Target)</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs mb-1 text-gray-400">Target DOL Price</label><input type="number" step="any" value={form.targetPrice} onChange={(e) => update("targetPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Target Type</label>
              <select value={form.targetLiquidityType} onChange={(e) => update("targetLiquidityType", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                <option value="eqh_eql">🧲 EQH/EQL</option>
                <option value="pdh_pdl">📅 PDH/PDL</option>
                <option value="swing">🔷 Swing High/Low</option>
                <option value="void">⭕ Liquidity Void</option>
              </select>
            </div>
          </div>
        </div>

        {evaluation && <LqeCard data={evaluation} />}

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <ScreenshotUploader setupId={existingSetupId} userId={userId} screenshots={screenshots} onChange={setScreenshots} table="lqe_screenshots" onEnsureSetup={ensureSetupSaved} />
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
          <button type="button" onClick={handleSaveFinal} disabled={saving || savingDraft || !canSaveFinal} className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${canSaveFinal ? "bg-orange-700 hover:bg-orange-600" : "bg-gray-800"}`}>
            {saving ? "Saving..." : canSaveFinal ? "✅ Save as Final" : "💾 Sequence incomplete"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function LqePage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 bg-black text-white"><div className="max-w-3xl mx-auto text-gray-400">Loading LQE...</div></main>}>
      <LqePageContent />
    </Suspense>
  );
}