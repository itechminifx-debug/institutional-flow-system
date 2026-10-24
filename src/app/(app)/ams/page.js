"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import {
  AMS_SCENARIOS,
  AMS_SESSIONS,
  SWEEP_DIRECTIONS,
  DOL_TYPES,
  PULLBACK_IRL_TYPES,
  M1_TRIGGER_TYPES,
  COMMANDMENTS,
  evaluateAms,
} from "@/lib/amsEngine";
import PairPicker from "@/components/PairPicker";
import AmsCard from "@/components/AmsCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

function AmsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "Volatility 80",

    // Meta
    scenario: "",                     // empty until chosen

    // D1 Context
    d1Bias: "bearish",
    d1RangeHigh: "",
    d1RangeLow: "",
    currentPrice: "",
    dolType: "ssl",
    dolLevel: "",
    ema50Value: "",

    // Swing Anatomy
    lastHH: "",
    lastHL: "",
    lastLH: "",
    lastLL: "",
    eqhEqlLevel: "",
    bosLevel: "",
    chochLevel: "",
    mssLevel: "",

    // Scenario A — Trend (IRL pullback)
    pullbackIrlType: "fvg",
    pullbackIrlHigh: "",
    pullbackIrlLow: "",

    // Scenario B/C — Reversal/Range (Sweep → MSS → FVG)
    session: "london",
    m30SweepDirection: "upper",
    m30SweepLevel: "",
    m30MssConfirmed: false,
    m30MssLevel: "",
    m30FvgHigh: "",
    m30FvgLow: "",

    // M1 Trigger
    m1TriggerType: "choch",
    m1EntryPrice: "",

    // Hybrid Entry
    entryMode: "auto",                // 'auto' | 'manual'
    manualEntry: "",
    manualSl: "",
    manualTp1: "",
    manualTp2: "",

    // Meta
    notes: "",
    tp1Taken: false,
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
      const { data: setupData, error: setupErr } = await supabase.from("ams_setups").select("*").eq("id", editId).maybeSingle();
      if (setupErr || !setupData) {
        setError(setupErr?.message || "AMS setup not found.");
        setLoadingEdit(false);
        return;
      }

      const { data: shotsData } = await supabase.from("ams_screenshots").select("*").eq("setup_id", setupData.id).order("created_at");
      setScreenshots(shotsData || []);

      setForm({
        pair: setupData.pair || "Volatility 80",
        scenario: setupData.scenario || "",
        d1Bias: setupData.d1_bias || "bearish",
        d1RangeHigh: setupData.d1_range_high?.toString() || "",
        d1RangeLow: setupData.d1_range_low?.toString() || "",
        currentPrice: setupData.current_price?.toString() || "",
        dolType: setupData.dol_type || "ssl",
        dolLevel: setupData.dol_level?.toString() || "",
        ema50Value: setupData.ema50_value?.toString() || "",
        lastHH: setupData.last_hh?.toString() || "",
        lastHL: setupData.last_hl?.toString() || "",
        lastLH: setupData.last_lh?.toString() || "",
        lastLL: setupData.last_ll?.toString() || "",
        eqhEqlLevel: setupData.eqh_eql_level?.toString() || "",
        bosLevel: setupData.bos_level?.toString() || "",
        chochLevel: setupData.choch_level?.toString() || "",
        mssLevel: setupData.mss_level?.toString() || "",
        pullbackIrlType: setupData.pullback_irl_type || "fvg",
        pullbackIrlHigh: setupData.pullback_irl_high?.toString() || "",
        pullbackIrlLow: setupData.pullback_irl_low?.toString() || "",
        session: setupData.session || "london",
        m30SweepDirection: setupData.m30_sweep_direction || "upper",
        m30SweepLevel: setupData.m30_sweep_level?.toString() || "",
        m30MssConfirmed: setupData.m30_mss_confirmed || false,
        m30MssLevel: setupData.m30_mss_level?.toString() || "",
        m30FvgHigh: setupData.m30_fvg_high?.toString() || "",
        m30FvgLow: setupData.m30_fvg_low?.toString() || "",
        m1TriggerType: setupData.m1_trigger_type || "choch",
        m1EntryPrice: setupData.m1_entry_price?.toString() || "",
        entryMode: setupData.entry_mode || "auto",
        manualEntry: setupData.manual_entry?.toString() || "",
        manualSl: setupData.manual_sl?.toString() || "",
        manualTp1: setupData.manual_tp1?.toString() || "",
        manualTp2: setupData.manual_tp2?.toString() || "",
        notes: setupData.notes || "",
        tp1Taken: setupData.tp1_taken || false,
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
    return evaluateAms({
      scenario: form.scenario,
      d1Bias: form.d1Bias,
      d1RangeHigh: form.d1RangeHigh,
      d1RangeLow: form.d1RangeLow,
      currentPrice: form.currentPrice,
      dolLevel: form.dolLevel,
      dolType: form.dolType,
      ema50Value: form.ema50Value,
      lastHH: form.lastHH,
      lastHL: form.lastHL,
      lastLH: form.lastLH,
      lastLL: form.lastLL,
      eqhEqlLevel: form.eqhEqlLevel,
      bosLevel: form.bosLevel,
      chochLevel: form.chochLevel,
      mssLevel: form.mssLevel,
      pullbackIrlType: form.pullbackIrlType,
      pullbackIrlHigh: form.pullbackIrlHigh,
      pullbackIrlLow: form.pullbackIrlLow,
      session: form.session,
      m30SweepDirection: form.m30SweepDirection,
      m30SweepLevel: form.m30SweepLevel,
      m30MssConfirmed: form.m30MssConfirmed,
      m30MssLevel: form.m30MssLevel,
      m30FvgHigh: form.m30FvgHigh,
      m30FvgLow: form.m30FvgLow,
      m1TriggerType: form.m1TriggerType,
      m1EntryPrice: form.m1EntryPrice,
      entryMode: form.entryMode,
      manualEntry: form.manualEntry,
      manualSl: form.manualSl,
      manualTp1: form.manualTp1,
      manualTp2: form.manualTp2,
      accountSize,
      riskPercent,
    });
  }, [form, accountSize, riskPercent]);

  // Enrich for the card's Anatomy Map
  const cardData = useMemo(() => {
    return {
      ...evaluation,
      d1Bias: form.d1Bias,
      d1RangeHigh: form.d1RangeHigh,
      d1RangeLow: form.d1RangeLow,
      currentPrice: form.currentPrice,
      dolLevel: form.dolLevel,
      lastHH: form.lastHH,
      lastHL: form.lastHL,
      lastLH: form.lastLH,
      lastLL: form.lastLL,
      eqhEqlLevel: form.eqhEqlLevel,
      bosLevel: form.bosLevel,
      chochLevel: form.chochLevel,
      mssLevel: form.mssLevel,
      m30SweepLevel: form.m30SweepLevel,
      m30FvgHigh: form.m30FvgHigh,
      m30FvgLow: form.m30FvgLow,
    };
  }, [evaluation, form]);

  async function saveAms({ isDraft }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); return null; }

    const payload = {
      user_id: user.id,
      pair: form.pair,
      scenario: form.scenario || "reversal",  // fallback if not picked
      status: isDraft ? "draft" : "complete",
      d1_bias: form.d1Bias,
      d1_range_high: form.d1RangeHigh ? parseFloat(form.d1RangeHigh) : null,
      d1_range_low: form.d1RangeLow ? parseFloat(form.d1RangeLow) : null,
      current_price: form.currentPrice ? parseFloat(form.currentPrice) : null,
      d1_zone: evaluation.d1?.zone || null,
      dol_type: form.dolType,
      dol_level: form.dolLevel ? parseFloat(form.dolLevel) : null,
      ema50_value: form.ema50Value ? parseFloat(form.ema50Value) : null,
      ema50_conflict: evaluation.d1?.emaConflict || false,
      last_hh: form.lastHH ? parseFloat(form.lastHH) : null,
      last_hl: form.lastHL ? parseFloat(form.lastHL) : null,
      last_lh: form.lastLH ? parseFloat(form.lastLH) : null,
      last_ll: form.lastLL ? parseFloat(form.lastLL) : null,
      eqh_eql_level: form.eqhEqlLevel ? parseFloat(form.eqhEqlLevel) : null,
      bos_level: form.bosLevel ? parseFloat(form.bosLevel) : null,
      choch_level: form.chochLevel ? parseFloat(form.chochLevel) : null,
      mss_level: form.mssLevel ? parseFloat(form.mssLevel) : null,
      session: (form.scenario === "reversal" || form.scenario === "range") ? form.session : null,
      m30_sweep_direction: (form.scenario === "reversal" || form.scenario === "range") ? form.m30SweepDirection : null,
      m30_sweep_level: form.m30SweepLevel ? parseFloat(form.m30SweepLevel) : null,
      m30_mss_confirmed: form.m30MssConfirmed,
      m30_mss_level: form.m30MssLevel ? parseFloat(form.m30MssLevel) : null,
      m30_fvg_high: form.m30FvgHigh ? parseFloat(form.m30FvgHigh) : null,
      m30_fvg_low: form.m30FvgLow ? parseFloat(form.m30FvgLow) : null,
      pullback_irl_type: form.scenario === "trend" ? form.pullbackIrlType : null,
      pullback_irl_high: form.pullbackIrlHigh ? parseFloat(form.pullbackIrlHigh) : null,
      pullback_irl_low: form.pullbackIrlLow ? parseFloat(form.pullbackIrlLow) : null,
      m1_trigger_type: form.m1TriggerType,
      m1_entry_price: form.m1EntryPrice ? parseFloat(form.m1EntryPrice) : null,
      entry_mode: form.entryMode,
      auto_entry: evaluation.auto?.autoEntry ?? null,
      auto_sl: evaluation.auto?.autoSl ?? null,
      auto_tp1: evaluation.auto?.autoTp1 ?? null,
      auto_tp2: evaluation.auto?.autoTp2 ?? null,
      auto_rr_tp1: evaluation.auto?.autoRrTp1 ?? null,
      auto_rr_tp2: evaluation.auto?.autoRrTp2 ?? null,
      manual_entry: form.manualEntry ? parseFloat(form.manualEntry) : null,
      manual_sl: form.manualSl ? parseFloat(form.manualSl) : null,
      manual_tp1: form.manualTp1 ? parseFloat(form.manualTp1) : null,
      manual_tp2: form.manualTp2 ? parseFloat(form.manualTp2) : null,
      active_entry: evaluation.activeEntry ?? null,
      active_sl: evaluation.activeSl ?? null,
      active_tp1: evaluation.activeTp1 ?? null,
      active_tp2: evaluation.activeTp2 ?? null,
      active_rr_tp1: evaluation.trade?.rr1 ?? null,
      active_rr_tp2: evaluation.trade?.rr2 ?? null,
      tp1_taken: form.tp1Taken,
      risk_percent_used: riskPercent,
      commandments_passed: evaluation.commandments?.passed || 0,
      commandments_warnings: evaluation.commandments?.warnings || [],
      commandments_blocked: evaluation.commandments?.hardBlocked || false,
      notes: form.notes,
    };

    let setupRow;
    if (isEdit && existingSetupId) {
      const { data, error: updErr } = await supabase
        .from("ams_setups")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existingSetupId)
        .select()
        .single();
      if (updErr) { setError(updErr.message); return null; }
      setupRow = data;
    } else {
      const { data, error: insErr } = await supabase
        .from("ams_setups")
        .insert(payload)
        .select()
        .single();
      if (insErr) { setError(insErr.message); return null; }
      setupRow = data;
      setExistingSetupId(data.id);
    }

    return setupRow;
  }

  async function handleSaveDraft() {
    setSavingDraft(true); setError("");
    const row = await saveAms({ isDraft: true });
    setSavingDraft(false);
    if (!row) return;
    setDraftSavedAt(new Date());
    setSaved(false);
  }

  async function handleSaveFinal() {
    if (!evaluation.preEntryReady) {
      setError("The setup must pass all gates (including the 4 hard-block Commandments).");
      return;
    }
    if (!evaluation.trade || evaluation.trade.invalid) {
      setError(evaluation.trade?.invalidReason || "Trade could not be computed.");
      return;
    }
    setSaving(true); setError("");
    const row = await saveAms({ isDraft: false });
    setSaving(false);
    if (!row) return;
    setDraftSavedAt(null);
    setSaved(true);
    setTimeout(() => router.push(`/ams/${row.id}`), 800);
  }

  async function ensureSetupSaved() {
    if (existingSetupId) return existingSetupId;
    if (!form.scenario) throw new Error("Pick a scenario first.");
    const row = await saveAms({ isDraft: true });
    if (!row) throw new Error("Failed to save draft.");
    setDraftSavedAt(new Date());
    return row.id;
  }

  if (loadingEdit && isEdit) return <div className="p-6 text-gray-400">Loading AMS setup...</div>;

  const canSaveFinal = evaluation.preEntryReady && evaluation.trade && !evaluation.trade.invalid;
  const scenarioLocked = !form.scenario;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? "Edit AMS Setup" : "👑 Apex Master System"}</h1>
          <p className="text-gray-400 text-sm">Trend / Reversal / Range · Hybrid Entry · 10 Commandments</p>
        </div>

        {/* Pair */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <PairPicker value={form.pair} onChange={(p) => update("pair", p)} label="Pair" />
        </div>

        {/* ============================================================ */}
        {/* SCENARIO SELECTOR (must be first) */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border-2 border-red-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-red-300">🎯 Step 0 — Pick Your Scenario</h2>
          <p className="text-xs text-gray-500">The scenario drives which fields appear. You must classify the market before you trade it.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {AMS_SCENARIOS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => update("scenario", s.key)}
                className={`text-left p-3 rounded-lg border transition ${
                  form.scenario === s.key
                    ? s.key === "trend"
                      ? "bg-blue-900/40 border-blue-700 text-blue-200"
                      : s.key === "reversal"
                      ? "bg-orange-900/40 border-orange-700 text-orange-200"
                      : "bg-purple-900/40 border-purple-700 text-purple-200"
                    : "bg-black border-gray-800 text-gray-400"
                }`}
              >
                <p className="font-bold text-xs">{s.emoji} {s.label}</p>
                <p className="text-[10px] mt-1 opacity-80">{s.hint}</p>
              </button>
            ))}
          </div>

          {form.scenario && (
            <p className="text-[10px] text-red-300/80 italic pt-2 border-t border-red-800/40">
              ⚠️ "Never trade a BOS breakout. It is the trap." — Commandment #1
            </p>
          )}
        </div>

        {/* If no scenario, hide everything else */}
        {scenarioLocked && (
          <div className="p-4 rounded-lg bg-yellow-950/40 border border-yellow-800 text-xs text-yellow-200 text-center">
            ⬆️ Pick a scenario above to continue.
          </div>
        )}

        {!scenarioLocked && (
          <>
            {/* ============================================================ */}
            {/* D1 CONTEXT */}
            {/* ============================================================ */}
            <div className="p-4 rounded-lg bg-gray-900 border border-blue-800/60 space-y-3">
              <h2 className="text-sm font-semibold text-blue-300">🌍 Phase 1 — D1 Context</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1 text-gray-400">D1 Bias</label>
                  <select value={form.d1Bias} onChange={(e) => update("d1Bias", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                    <option value="bullish">🟢 Bullish</option>
                    <option value="bearish">🔴 Bearish</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-400">Current Price</label>
                  <input type="number" step="any" value={form.currentPrice} onChange={(e) => update("currentPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs mb-1 text-gray-400">D1 Range High</label><input type="number" step="any" value={form.d1RangeHigh} onChange={(e) => update("d1RangeHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
                <div><label className="block text-xs mb-1 text-gray-400">D1 Range Low</label><input type="number" step="any" value={form.d1RangeLow} onChange={(e) => update("d1RangeLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1 text-gray-400">DOL Type</label>
                  <select value={form.dolType} onChange={(e) => update("dolType", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                    {DOL_TYPES.map(d => <option key={d.key} value={d.key}>{d.emoji} {d.label}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs mb-1 text-gray-400">DOL Level</label><input type="number" step="any" value={form.dolLevel} onChange={(e) => update("dolLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
              </div>

              <div>
                <label className="block text-xs mb-1 text-gray-400">50 EMA Value <span className="text-amber-400">(filter, not checkpoint)</span></label>
                <input type="number" step="any" value={form.ema50Value} onChange={(e) => update("ema50Value", e.target.value)} placeholder="e.g. 1.10250" className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
              </div>
            </div>

            {/* ============================================================ */}
            {/* SWING ANATOMY */}
            {/* ============================================================ */}
            <div className="p-4 rounded-lg bg-gray-900 border border-red-800/60 space-y-3">
              <h2 className="text-sm font-semibold text-red-300">🦴 Phase 2 — Swing Anatomy</h2>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs mb-1 text-gray-400">Last HH</label><input type="number" step="any" value={form.lastHH} onChange={(e) => update("lastHH", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
                <div><label className="block text-xs mb-1 text-gray-400">Last HL</label><input type="number" step="any" value={form.lastHL} onChange={(e) => update("lastHL", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
                <div><label className="block text-xs mb-1 text-gray-400">Last LH</label><input type="number" step="any" value={form.lastLH} onChange={(e) => update("lastLH", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
                <div><label className="block text-xs mb-1 text-gray-400">Last LL</label><input type="number" step="any" value={form.lastLL} onChange={(e) => update("lastLL", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
              </div>

              <div>
                <label className="block text-xs mb-1 text-gray-400">EQH/EQL Level <span className="text-pink-400">(magnet)</span></label>
                <input type="number" step="any" value={form.eqhEqlLevel} onChange={(e) => update("eqhEqlLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-red-800/40">
                <div><label className="block text-xs mb-1 text-gray-400">BOS (trap)</label><input type="number" step="any" value={form.bosLevel} onChange={(e) => update("bosLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
                <div><label className="block text-xs mb-1 text-gray-400">CHoCH</label><input type="number" step="any" value={form.chochLevel} onChange={(e) => update("chochLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
                <div><label className="block text-xs mb-1 text-gray-400">MSS</label><input type="number" step="any" value={form.mssLevel} onChange={(e) => update("mssLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* SCENARIO-SPECIFIC PHASE */}
            {/* ============================================================ */}
            {form.scenario === "trend" && (
              <div className="p-4 rounded-lg bg-gray-900 border border-blue-800/60 space-y-3">
                <h2 className="text-sm font-semibold text-blue-300">📈 Scenario A — Healthy Trend (IRL Pullback)</h2>
                <p className="text-xs text-gray-500">No MSS required. Sell the IRL pullback in a downtrend. Target the next ERL.</p>

                <div>
                  <label className="block text-xs mb-1 text-gray-400">IRL Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PULLBACK_IRL_TYPES.map(t => (
                      <button key={t.key} type="button" onClick={() => update("pullbackIrlType", t.key)} className={`text-left px-3 py-2 rounded-lg border text-xs transition ${form.pullbackIrlType === t.key ? "bg-blue-900/40 border-blue-700 text-blue-200" : "bg-black border-gray-800 text-gray-400"}`}>
                        <p className="font-bold">{t.emoji} {t.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs mb-1 text-gray-400">Pullback IRL Low</label><input type="number" step="any" value={form.pullbackIrlLow} onChange={(e) => update("pullbackIrlLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
                  <div><label className="block text-xs mb-1 text-gray-400">Pullback IRL High</label><input type="number" step="any" value={form.pullbackIrlHigh} onChange={(e) => update("pullbackIrlHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
                </div>
              </div>
            )}

            {(form.scenario === "reversal" || form.scenario === "range") && (
              <div className="p-4 rounded-lg bg-gray-900 border border-orange-800/60 space-y-3">
                <h2 className="text-sm font-semibold text-orange-300">
                  {form.scenario === "reversal" ? "🔄 Scenario B — Reversal" : "📦 Scenario C — Range"} (Sweep → MSS → FVG)
                </h2>

                <div>
                  <label className="block text-xs mb-1 text-gray-400">Session (Kill Zone)</label>
                  <select value={form.session} onChange={(e) => update("session", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                    {AMS_SESSIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1 text-gray-400">Sweep Direction</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SWEEP_DIRECTIONS.map(s => (
                        <button key={s.key} type="button" onClick={() => update("m30SweepDirection", s.key)} className={`text-left px-3 py-2 rounded-lg border text-xs transition ${form.m30SweepDirection === s.key ? "bg-orange-900/40 border-orange-700 text-orange-200" : "bg-black border-gray-800 text-gray-400"}`}>
                          <p className="font-bold">{s.emoji} {s.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div><label className="block text-xs mb-1 text-gray-400">Sweep Level (SL reference)</label><input type="number" step="any" value={form.m30SweepLevel} onChange={(e) => update("m30SweepLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
                </div>

                <button type="button" onClick={() => update("m30MssConfirmed", !form.m30MssConfirmed)} className={`w-full text-left p-3 rounded-lg border transition ${form.m30MssConfirmed ? "bg-orange-900/40 border-orange-700" : "bg-black border-gray-800"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.m30MssConfirmed ? "bg-orange-500 border-orange-500" : "border-gray-600"}`}>
                      {form.m30MssConfirmed && <span className="text-black text-xs font-bold">✓</span>}
                    </div>
                    <p className={`text-sm font-medium ${form.m30MssConfirmed ? "text-orange-200" : "text-white"}`}>M30 MSS Confirmed (displacement)</p>
                  </div>
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <div><label className="block text-xs mb-1 text-gray-400">MSS Level</label><input type="number" step="any" value={form.m30MssLevel} onChange={(e) => update("m30MssLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
                  <div><label className="block text-xs mb-1 text-gray-400">M30 FVG Low</label><input type="number" step="any" value={form.m30FvgLow} onChange={(e) => update("m30FvgLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
                  <div><label className="block text-xs mb-1 text-gray-400">M30 FVG High</label><input type="number" step="any" value={form.m30FvgHigh} onChange={(e) => update("m30FvgHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" /></div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* M1 TRIGGER */}
            {/* ============================================================ */}
            <div className="p-4 rounded-lg bg-gray-900 border border-emerald-800/60 space-y-3">
              <h2 className="text-sm font-semibold text-emerald-300">🎯 Phase 3 — M1 Trigger</h2>

              <div>
                <label className="block text-xs mb-1 text-gray-400">Trigger Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {M1_TRIGGER_TYPES.map(t => (
                    <button key={t.key} type="button" onClick={() => update("m1TriggerType", t.key)} className={`text-left px-3 py-2 rounded-lg border text-xs transition ${form.m1TriggerType === t.key ? "bg-emerald-900/40 border-emerald-700 text-emerald-200" : "bg-black border-gray-800 text-gray-400"}`}>
                      <p className="font-bold">{t.emoji} {t.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1 text-gray-400">M1 Entry Price</label>
                <input type="number" step="any" value={form.m1EntryPrice} onChange={(e) => update("m1EntryPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
              </div>
            </div>

            {/* ============================================================ */}
            {/* HYBRID ENTRY — the big feature */}
            {/* ============================================================ */}
            <div className="p-4 rounded-lg bg-gray-900 border-2 border-red-700 space-y-3">
              <h2 className="text-sm font-semibold text-red-300">⚔️ Phase 4 — Execution (Hybrid Entry)</h2>

              <div>
                <label className="block text-xs mb-2 text-gray-400">Entry Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => update("entryMode", "auto")}
                    className={`text-left px-3 py-3 rounded-lg border text-xs transition ${
                      form.entryMode === "auto"
                        ? "bg-blue-900/40 border-blue-700 text-blue-200"
                        : "bg-black border-gray-800 text-gray-400"
                    }`}
                  >
                    <p className="font-bold">🤖 AUTO</p>
                    <p className="text-[10px] mt-1 opacity-80">System computes Entry/SL/TP</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => update("entryMode", "manual")}
                    className={`text-left px-3 py-3 rounded-lg border text-xs transition ${
                      form.entryMode === "manual"
                        ? "bg-purple-900/40 border-purple-700 text-purple-200"
                        : "bg-black border-gray-800 text-gray-400"
                    }`}
                  >
                    <p className="font-bold">✍️ MANUAL</p>
                    <p className="text-[10px] mt-1 opacity-80">You enter, engine validates</p>
                  </button>
                </div>
              </div>

              {/* AUTO mode — show computed values (read-only) */}
              {form.entryMode === "auto" && (
                <div className="pt-2 border-t border-blue-800/40 space-y-2">
                  <p className="text-xs font-bold text-blue-300">Auto-computed values:</p>
                  {evaluation.auto?.ready ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 rounded bg-black border border-gray-800">
                        <p className="text-gray-500 text-[10px]">Entry</p>
                        <p className="font-bold tabular-nums text-yellow-400">{evaluation.auto.autoEntry}</p>
                      </div>
                      <div className="p-2 rounded bg-black border border-gray-800">
                        <p className="text-gray-500 text-[10px]">SL</p>
                        <p className="font-bold tabular-nums text-red-400">{evaluation.auto.autoSl}</p>
                      </div>
                      <div className="p-2 rounded bg-black border border-gray-800">
                        <p className="text-gray-500 text-[10px]">TP1</p>
                        <p className="font-bold tabular-nums text-green-300">{evaluation.auto.autoTp1 ?? "—"}</p>
                      </div>
                      <div className="p-2 rounded bg-black border border-gray-800">
                        <p className="text-gray-500 text-[10px]">TP2 (DOL)</p>
                        <p className="font-bold tabular-nums text-green-400">{evaluation.auto.autoTp2}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-yellow-950/40 border border-yellow-800 text-xs text-yellow-200">
                      {evaluation.auto?.reasons?.[0] || "Auto-compute requires IRL bounds + DOL."}
                    </div>
                  )}
                </div>
              )}

              {/* MANUAL mode — user inputs */}
              {form.entryMode === "manual" && (
                <div className="pt-2 border-t border-purple-800/40 space-y-2">
                  <p className="text-xs font-bold text-purple-300">Enter your values (engine validates):</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] mb-0.5 text-gray-500">Entry</label>
                      <input type="number" step="any" value={form.manualEntry} onChange={(e) => update("manualEntry", e.target.value)} className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] mb-0.5 text-gray-500">SL</label>
                      <input type="number" step="any" value={form.manualSl} onChange={(e) => update("manualSl", e.target.value)} className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] mb-0.5 text-gray-500">TP1</label>
                      <input type="number" step="any" value={form.manualTp1} onChange={(e) => update("manualTp1", e.target.value)} className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] mb-0.5 text-gray-500">TP2 (DOL)</label>
                      <input type="number" step="any" value={form.manualTp2} onChange={(e) => update("manualTp2", e.target.value)} className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs" />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-red-800/40">
                <button
                  type="button"
                  onClick={() => update("tp1Taken", !form.tp1Taken)}
                  className={`w-full text-left p-2 rounded-lg border transition ${form.tp1Taken ? "bg-green-900/40 border-green-700" : "bg-black border-gray-800"}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.tp1Taken ? "bg-green-500 border-green-500" : "border-gray-600"}`}>
                      {form.tp1Taken && <span className="text-black text-[10px] font-bold">✓</span>}
                    </div>
                    <p className={`text-xs font-medium ${form.tp1Taken ? "text-green-200" : "text-white"}`}>TP1 hit (50% off, SL to BE)</p>
                  </div>
                </button>
              </div>
            </div>

            {/* ============================================================ */}
            {/* COMMANDMENTS PREVIEW */}
            {/* ============================================================ */}
            <div className="p-4 rounded-lg bg-gray-900 border border-red-800/60 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-red-300">📜 Phase 5 — The 10 Commandments</h2>
                <span className={`text-xs font-bold ${
                  evaluation.commandments?.passed === 10 ? "text-green-300"
                  : evaluation.commandments?.passed >= 7 ? "text-yellow-300"
                  : "text-red-300"
                }`}>
                  {evaluation.commandments?.passed || 0}/10
                  {evaluation.commandments?.hardBlocked && " ❌ BLOCKED"}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {(evaluation.commandments?.results || []).map((r) => {
                  const rule = COMMANDMENTS.find(c => c.n === r.n);
                  return (
                    <div
                      key={r.n}
                      className={`flex flex-col items-center justify-center p-1.5 rounded border text-center ${
                        r.pass
                          ? "bg-green-950/30 border-green-800 text-green-200"
                          : r.hardBlock
                          ? "bg-red-950/40 border-red-700 text-red-200"
                          : "bg-yellow-950/30 border-yellow-800 text-yellow-200"
                      }`}
                      title={rule?.text || `Commandment ${r.n}`}
                    >
                      <span className="text-sm leading-none">
                        {r.pass ? "✅" : r.hardBlock ? "🚫" : "⚠️"}
                      </span>
                      <span className="text-[8px] font-bold mt-0.5">#{r.n}</span>
                    </div>
                  );
                })}
              </div>
              {evaluation.commandments?.hardBlocked && (
                <p className="text-[10px] text-red-300 pt-1">
                  ❌ Hard-block rules failing. Fix them before saving as Final.
                </p>
              )}
            </div>
          </>
        )}

        {/* LIVE CARD */}
        {form.scenario && evaluation && <AmsCard data={cardData} />}

        {/* SCREENSHOTS */}
        {form.scenario && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <ScreenshotUploader setupId={existingSetupId} userId={userId} screenshots={screenshots} onChange={setScreenshots} table="ams_screenshots" onEnsureSetup={ensureSetupSaved} />
            <ScreenshotGallery screenshots={screenshots} onDelete={(id) => setScreenshots((prev) => prev.filter((s) => s.id !== id))} />
          </div>
        )}

        {/* NOTES */}
        {form.scenario && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <label className="block text-xs mb-1 text-gray-400">Notes</label>
            <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 resize-none text-sm" />
          </div>
        )}

        {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}
        {draftSavedAt && <div className="p-3 rounded-lg bg-yellow-900/40 border border-yellow-700 text-yellow-100 text-sm">📝 Draft saved · {draftSavedAt.toLocaleTimeString()}</div>}
        {saved && <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">✅ Saved — redirecting...</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button type="button" onClick={handleSaveDraft} disabled={savingDraft || saving || !form.scenario} className="w-full py-4 rounded-lg font-bold disabled:opacity-50 bg-yellow-800 hover:bg-yellow-700 text-white">
            {savingDraft ? "Saving..." : "📝 Save Draft"}
          </button>
          <button
            type="button"
            onClick={handleSaveFinal}
            disabled={saving || savingDraft || !canSaveFinal}
            className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${
              canSaveFinal ? "bg-red-700 hover:bg-red-600" : "bg-gray-800"
            }`}
          >
            {saving ? "Saving..." : canSaveFinal ? "✅ Save as Final" : "👑 Setup incomplete"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function AmsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 bg-black text-white"><div className="max-w-3xl mx-auto text-gray-400">Loading AMS...</div></main>}>
      <AmsPageContent />
    </Suspense>
  );
}