"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import {
  ADS_SESSIONS,
  D1_BIASES,
  SWEEP_DIRECTIONS,
  DOL_TYPES,
  evaluateAds,
} from "@/lib/adsEngine";
import PairPicker from "@/components/PairPicker";
import AdsCard from "@/components/AdsCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

function AdsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "Volatility 80",

    // ===== PHASE 1 — D1 NARRATIVE =====
    d1Bias: "bearish",
    d1RangeHigh: "",
    d1RangeLow: "",
    currentPrice: "",
    d1FvgHigh: "",
    d1FvgLow: "",
    dolType: "ssl",
    dolLevel: "",
    ema50Value: "",

    // ===== PHASE 2 — M30 TRAP =====
    session: "london",
    m30SweepDirection: "upper",
    m30SweepLevel: "",
    m30ChochConfirmed: false,
    m30ChochLevel: "",
    m30FvgHigh: "",
    m30FvgLow: "",

    // ===== PHASE 3 — M1 TRIGGER =====
    m1ChochConfirmed: false,
    m1RejectionPresent: false,
    m1EntryPrice: "",

    // ===== EXECUTION =====
    stopLoss: "",
    tp1Price: "",
    tp1Taken: false,
    tp2Price: "",

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
      const { data: setupData, error: setupErr } = await supabase.from("ads_setups").select("*").eq("id", editId).maybeSingle();
      if (setupErr || !setupData) {
        setError(setupErr?.message || "ADS setup not found.");
        setLoadingEdit(false);
        return;
      }

      const { data: shotsData } = await supabase.from("ads_screenshots").select("*").eq("setup_id", setupData.id).order("created_at");
      setScreenshots(shotsData || []);

      setForm({
        pair: setupData.pair || "Volatility 80",
        d1Bias: setupData.d1_bias || "bearish",
        d1RangeHigh: setupData.d1_range_high?.toString() || "",
        d1RangeLow: setupData.d1_range_low?.toString() || "",
        currentPrice: setupData.current_price?.toString() || "",
        d1FvgHigh: setupData.d1_fvg_high?.toString() || "",
        d1FvgLow: setupData.d1_fvg_low?.toString() || "",
        dolType: setupData.dol_type || "ssl",
        dolLevel: setupData.dol_level?.toString() || "",
        ema50Value: setupData.ema50_value?.toString() || "",
        session: setupData.session || "london",
        m30SweepDirection: setupData.m30_sweep_direction || "upper",
        m30SweepLevel: setupData.m30_sweep_level?.toString() || "",
        m30ChochConfirmed: setupData.m30_choch_confirmed || false,
        m30ChochLevel: setupData.m30_choch_level?.toString() || "",
        m30FvgHigh: setupData.m30_fvg_high?.toString() || "",
        m30FvgLow: setupData.m30_fvg_low?.toString() || "",
        m1ChochConfirmed: setupData.m1_choch_confirmed || false,
        m1RejectionPresent: setupData.m1_rejection_present || false,
        m1EntryPrice: setupData.m1_entry_price?.toString() || "",
        stopLoss: setupData.stop_loss?.toString() || "",
        tp1Price: setupData.tp1_price?.toString() || "",
        tp1Taken: setupData.tp1_taken || false,
        tp2Price: setupData.tp2_price?.toString() || "",
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
    return evaluateAds({
      d1Bias: form.d1Bias,
      d1RangeHigh: form.d1RangeHigh,
      d1RangeLow: form.d1RangeLow,
      currentPrice: form.currentPrice,
      dolLevel: form.dolLevel,
      dolType: form.dolType,
      ema50Value: form.ema50Value,
      session: form.session,
      m30SweepDirection: form.m30SweepDirection,
      m30SweepLevel: form.m30SweepLevel,
      m30ChochConfirmed: form.m30ChochConfirmed,
      m30ChochLevel: form.m30ChochLevel,
      m30FvgHigh: form.m30FvgHigh,
      m30FvgLow: form.m30FvgLow,
      m1ChochConfirmed: form.m1ChochConfirmed,
      m1RejectionPresent: form.m1RejectionPresent,
      m1EntryPrice: form.m1EntryPrice,
      stopLoss: form.stopLoss,
      tp1Price: form.tp1Price,
      tp2Price: form.tp2Price,
      accountSize,
      riskPercent,
    });
  }, [form, accountSize, riskPercent]);

  // Enrich evaluation with raw values so AdsCard's ThreeTierMap can draw lines
  const cardData = useMemo(() => {
    return {
      ...evaluation,
      d1Bias: form.d1Bias,
      d1RangeHigh: form.d1RangeHigh,
      d1RangeLow: form.d1RangeLow,
      currentPrice: form.currentPrice,
      dolLevel: form.dolLevel,
      m30SweepLevel: form.m30SweepLevel,
      m30FvgHigh: form.m30FvgHigh,
      m30FvgLow: form.m30FvgLow,
      m1EntryPrice: form.m1EntryPrice,
      stopLoss: form.stopLoss,
      tp1Price: form.tp1Price,
      tp2Price: form.tp2Price,
    };
  }, [evaluation, form]);

  async function saveAds({ isDraft }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); return null; }

    const trade = evaluation.trade;

    const payload = {
      user_id: user.id,
      pair: form.pair,
      status: isDraft ? "draft" : "complete",

      // Phase 1
      d1_bias: form.d1Bias,
      d1_range_high: form.d1RangeHigh ? parseFloat(form.d1RangeHigh) : null,
      d1_range_low: form.d1RangeLow ? parseFloat(form.d1RangeLow) : null,
      current_price: form.currentPrice ? parseFloat(form.currentPrice) : null,
      d1_zone: evaluation.d1Zone || null,
      d1_fvg_high: form.d1FvgHigh ? parseFloat(form.d1FvgHigh) : null,
      d1_fvg_low: form.d1FvgLow ? parseFloat(form.d1FvgLow) : null,
      dol_type: form.dolType,
      dol_level: form.dolLevel ? parseFloat(form.dolLevel) : null,
      ema50_value: form.ema50Value ? parseFloat(form.ema50Value) : null,
      ema50_conflict: evaluation.emaConflict || false,

      // Phase 2
      session: form.session,
      m30_sweep_direction: form.m30SweepDirection,
      m30_sweep_level: form.m30SweepLevel ? parseFloat(form.m30SweepLevel) : null,
      m30_choch_confirmed: form.m30ChochConfirmed,
      m30_choch_level: form.m30ChochLevel ? parseFloat(form.m30ChochLevel) : null,
      m30_fvg_high: form.m30FvgHigh ? parseFloat(form.m30FvgHigh) : null,
      m30_fvg_low: form.m30FvgLow ? parseFloat(form.m30FvgLow) : null,
      m30_poi_zone: evaluation.m30PoiZone || null,
      m30_poi_zone_warning: evaluation.poiZoneWarning || false,

      // Phase 3
      m1_choch_confirmed: form.m1ChochConfirmed,
      m1_rejection_present: form.m1RejectionPresent,
      m1_entry_price: form.m1EntryPrice ? parseFloat(form.m1EntryPrice) : null,

      // Execution
      stop_loss: trade && !trade.invalid ? trade.sl : null,
      tp1_price: trade && !trade.invalid && trade.tp1 !== null ? trade.tp1 : null,
      tp1_taken: form.tp1Taken,
      tp2_price: trade && !trade.invalid ? trade.tp2 : null,
      rr_tp1: trade && !trade.invalid && trade.rr1 !== null ? trade.rr1 : null,
      rr_tp2: trade && !trade.invalid ? trade.rr2 : null,

      notes: form.notes,
    };

    let setupRow;
    if (isEdit && existingSetupId) {
      const { data, error: updErr } = await supabase
        .from("ads_setups")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existingSetupId)
        .select()
        .single();
      if (updErr) { setError(updErr.message); return null; }
      setupRow = data;
    } else {
      const { data, error: insErr } = await supabase
        .from("ads_setups")
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
    const row = await saveAds({ isDraft: true });
    setSavingDraft(false);
    if (!row) return;
    setDraftSavedAt(new Date());
    setSaved(false);
  }

  async function handleSaveFinal() {
    if (!evaluation.preEntryReady) { setError("The Golden Rule is incomplete. All three phases must pass."); return; }
    if (!evaluation.trade || evaluation.trade.invalid) { setError(evaluation.trade?.invalidReason || "Trade could not be computed."); return; }
    setSaving(true); setError("");
    const row = await saveAds({ isDraft: false });
    setSaving(false);
    if (!row) return;
    setDraftSavedAt(null);
    setSaved(true);
    setTimeout(() => router.push(`/ads/${row.id}`), 800);
  }

  async function ensureSetupSaved() {
    if (existingSetupId) return existingSetupId;
    const row = await saveAds({ isDraft: true });
    if (!row) throw new Error("Failed to save draft.");
    setDraftSavedAt(new Date());
    return row.id;
  }

  if (loadingEdit && isEdit) return <div className="p-6 text-gray-400">Loading ADS setup...</div>;

  const canSaveFinal = evaluation.preEntryReady && evaluation.trade && !evaluation.trade.invalid;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? "Edit ADS Setup" : "👑 Apex Deep Search"}</h1>
          <p className="text-gray-400 text-sm">D1 Narrative → M30 Trap → M1 Trigger. D1 tells WHERE. M30 tells WHEN. M1 tells HOW.</p>
        </div>

        {/* Pair */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <PairPicker value={form.pair} onChange={(p) => update("pair", p)} label="Pair" />
        </div>

        {/* ============================================================ */}
        {/* PHASE 1 — D1 NARRATIVE */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-blue-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-blue-300">🌍 Phase 1 — D1 Narrative (WHERE)</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">D1 Bias</label>
              <select value={form.d1Bias} onChange={(e) => update("d1Bias", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {D1_BIASES.map(b => <option key={b.key} value={b.key}>{b.emoji} {b.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Current Price</label>
              <input type="number" step="any" value={form.currentPrice} onChange={(e) => update("currentPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">D1 Range High</label>
              <input type="number" step="any" value={form.d1RangeHigh} onChange={(e) => update("d1RangeHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">D1 Range Low</label>
              <input type="number" step="any" value={form.d1RangeLow} onChange={(e) => update("d1RangeLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">DOL Type</label>
              <select value={form.dolType} onChange={(e) => update("dolType", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {DOL_TYPES.map(d => <option key={d.key} value={d.key}>{d.emoji} {d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">DOL Level (ultimate target)</label>
              <input type="number" step="any" value={form.dolLevel} onChange={(e) => update("dolLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">D1 FVG Low (optional)</label>
              <input type="number" step="any" value={form.d1FvgLow} onChange={(e) => update("d1FvgLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">D1 FVG High (optional)</label>
              <input type="number" step="any" value={form.d1FvgHigh} onChange={(e) => update("d1FvgHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>

          <div className="pt-2 border-t border-blue-800/40">
            <label className="block text-xs mb-1 text-gray-400">
              50 EMA Value <span className="text-amber-400">(A+ bonus)</span>
            </label>
            <input
              type="number"
              step="any"
              value={form.ema50Value}
              onChange={(e) => update("ema50Value", e.target.value)}
              placeholder="e.g. 1.10250"
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm"
            />
            {evaluation?.emaConflict && (
              <div className="mt-2 p-2 rounded bg-yellow-950/40 border border-yellow-800">
                <p className="text-xs text-yellow-200">
                  ⚠️ Price is on the wrong side of the 50 EMA. Trend conflict — reduce risk.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* PHASE 2 — M30 TRAP */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-orange-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-orange-300">🪤 Phase 2 — M30 Trap (WHEN)</h2>

          <div>
            <label className="block text-xs mb-1 text-gray-400">Session (Kill Zone)</label>
            <select value={form.session} onChange={(e) => update("session", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
              {ADS_SESSIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">M30 Sweep Direction</label>
              <div className="grid grid-cols-2 gap-2">
                {SWEEP_DIRECTIONS.map(s => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => update("m30SweepDirection", s.key)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs transition ${
                      form.m30SweepDirection === s.key
                        ? "bg-orange-900/40 border-orange-700 text-orange-200"
                        : "bg-black border-gray-800 text-gray-400"
                    }`}
                  >
                    <p className="font-bold">{s.emoji} {s.label}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Sweep Level (SL reference)</label>
              <input type="number" step="any" value={form.m30SweepLevel} onChange={(e) => update("m30SweepLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => update("m30ChochConfirmed", !form.m30ChochConfirmed)}
            className={`w-full text-left p-3 rounded-lg border transition ${form.m30ChochConfirmed ? "bg-orange-900/40 border-orange-700" : "bg-black border-gray-800"}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.m30ChochConfirmed ? "bg-orange-500 border-orange-500" : "border-gray-600"}`}>
                {form.m30ChochConfirmed && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <p className={`text-sm font-medium ${form.m30ChochConfirmed ? "text-orange-200" : "text-white"}`}>M30 CHoCH Confirmed</p>
            </div>
          </button>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">CHoCH Level</label>
              <input type="number" step="any" value={form.m30ChochLevel} onChange={(e) => update("m30ChochLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">M30 FVG Low</label>
              <input type="number" step="any" value={form.m30FvgLow} onChange={(e) => update("m30FvgLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">M30 FVG High</label>
              <input type="number" step="any" value={form.m30FvgHigh} onChange={(e) => update("m30FvgHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PHASE 3 — M1 TRIGGER */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-emerald-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-300">🎯 Phase 3 — M1 Trigger (HOW)</h2>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => update("m1ChochConfirmed", !form.m1ChochConfirmed)}
              className={`text-left p-3 rounded-lg border transition ${form.m1ChochConfirmed ? "bg-emerald-900/40 border-emerald-700" : "bg-black border-gray-800"}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.m1ChochConfirmed ? "bg-emerald-500 border-emerald-500" : "border-gray-600"}`}>
                  {form.m1ChochConfirmed && <span className="text-black text-xs font-bold">✓</span>}
                </div>
                <p className={`text-sm font-medium ${form.m1ChochConfirmed ? "text-emerald-200" : "text-white"}`}>M1 CHoCH Confirmed</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => update("m1RejectionPresent", !form.m1RejectionPresent)}
              className={`text-left p-3 rounded-lg border transition ${form.m1RejectionPresent ? "bg-emerald-900/40 border-emerald-700" : "bg-black border-gray-800"}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.m1RejectionPresent ? "bg-emerald-500 border-emerald-500" : "border-gray-600"}`}>
                  {form.m1RejectionPresent && <span className="text-black text-xs font-bold">✓</span>}
                </div>
                <p className={`text-sm font-medium ${form.m1RejectionPresent ? "text-emerald-200" : "text-white"}`}>M1 Rejection Block</p>
              </div>
            </button>
          </div>

          <div className="pt-2 border-t border-emerald-800/40">
            <label className="block text-xs mb-1 text-gray-400">M1 Entry Price</label>
            <input type="number" step="any" value={form.m1EntryPrice} onChange={(e) => update("m1EntryPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
          </div>
        </div>

        {/* ============================================================ */}
        {/* EXECUTION — SL, TP1, TP2 */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-amber-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-amber-300">⚔️ Execution</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Stop Loss (razor)</label>
              <input type="number" step="any" value={form.stopLoss} onChange={(e) => update("stopLoss", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
              <p className="text-[10px] text-gray-500 mt-1">Must be beyond the M30 sweep extreme.</p>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">TP2 — Final DOL (required)</label>
              <input type="number" step="any" value={form.tp2Price} onChange={(e) => update("tp2Price", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-800/40">
            <div>
              <label className="block text-xs mb-1 text-gray-400">TP1 — Partial (optional)</label>
              <input type="number" step="any" value={form.tp1Price} onChange={(e) => update("tp1Price", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
              <p className="text-[10px] text-gray-500 mt-1">50% off here, move SL to BE.</p>
            </div>
            <button
              type="button"
              onClick={() => update("tp1Taken", !form.tp1Taken)}
              className={`text-left p-3 rounded-lg border transition self-start ${form.tp1Taken ? "bg-green-900/40 border-green-700" : "bg-black border-gray-800"}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.tp1Taken ? "bg-green-500 border-green-500" : "border-gray-600"}`}>
                  {form.tp1Taken && <span className="text-black text-xs font-bold">✓</span>}
                </div>
                <p className={`text-sm font-medium ${form.tp1Taken ? "text-green-200" : "text-white"}`}>TP1 Hit</p>
              </div>
            </button>
          </div>
        </div>

        {/* LIVE CARD */}
        {evaluation && <AdsCard data={cardData} />}

        {/* SCREENSHOTS */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <ScreenshotUploader
            setupId={existingSetupId}
            userId={userId}
            screenshots={screenshots}
            onChange={setScreenshots}
            table="ads_screenshots"
            onEnsureSetup={ensureSetupSaved}
          />
          <ScreenshotGallery
            screenshots={screenshots}
            onDelete={(id) => setScreenshots((prev) => prev.filter((s) => s.id !== id))}
          />
        </div>

        {/* NOTES */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <label className="block text-xs mb-1 text-gray-400">Notes</label>
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 resize-none text-sm" />
        </div>

        {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}
        {draftSavedAt && <div className="p-3 rounded-lg bg-yellow-900/40 border border-yellow-700 text-yellow-100 text-sm">📝 Draft saved · {draftSavedAt.toLocaleTimeString()}</div>}
        {saved && <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">✅ Saved — redirecting...</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button type="button" onClick={handleSaveDraft} disabled={savingDraft || saving} className="w-full py-4 rounded-lg font-bold disabled:opacity-50 bg-yellow-800 hover:bg-yellow-700 text-white">
            {savingDraft ? "Saving..." : "📝 Save Draft"}
          </button>
          <button
            type="button"
            onClick={handleSaveFinal}
            disabled={saving || savingDraft || !canSaveFinal}
            className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${
              canSaveFinal ? "bg-amber-700 hover:bg-amber-600" : "bg-gray-800"
            }`}
          >
            {saving ? "Saving..." : canSaveFinal ? "✅ Save as Final" : "👑 Golden Rule incomplete"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function AdsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 bg-black text-white"><div className="max-w-3xl mx-auto text-gray-400">Loading ADS...</div></main>}>
      <AdsPageContent />
    </Suspense>
  );
}