"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import {
  TS_BIASES,
  TS_SWEEP_DIRECTIONS,
  TS_TRIGGER_TYPES,
  evaluateTs,
} from "@/lib/tsEngine";
import PairPicker from "@/components/PairPicker";
import TsCard from "@/components/TsCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

function TsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "Volatility 80",

    // Phase 1: The Container (1H)
    d1Bias: "bearish",
    h1High: "",
    h1Low: "",
    currentPrice: "",

    // Phase 2: The Trap (15M)
    sweepDirection: "above",
    sweepLevel: "",
    mssConfirmed: false,
    fvgPresent: false,

    // Phase 3: The Zone (5M)
    fvgHigh: "",
    fvgLow: "",

    // Phase 4: The Trigger (1M)
    m1TriggerType: "choch",
    entryPrice: "",

    // Meta
    notes: "",
    tradeResult: "",
  });

  const [accountSize, setAccountSize] = useState(0);
  const [riskPercent, setRiskPercent] = useState(1);
  const [userId, setUserId] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [existingId, setExistingId] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: prof } = await supabase
        .from("profiles")
        .select("account_size, risk_percent")
        .eq("id", user.id)
        .single();
      if (prof) {
        setAccountSize(prof.account_size || 0);
        setRiskPercent(prof.risk_percent || 1);
      }

      if (!isEdit) return;

      setLoading(true);
      const { data, error: loadErr } = await supabase
        .from("ts_setups")
        .select("*")
        .eq("id", editId)
        .maybeSingle();

      if (loadErr || !data) {
        setError(loadErr?.message || "TS setup not found.");
        setLoading(false);
        return;
      }

      setForm({
        pair: data.pair || "Volatility 80",
        d1Bias: data.d1_bias || "bearish",
        h1High: data.h1_high?.toString() || "",
        h1Low: data.h1_low?.toString() || "",
        currentPrice: data.current_price?.toString() || "",
        sweepDirection: data.sweep_direction || "above",
        sweepLevel: data.sweep_level?.toString() || "",
        mssConfirmed: data.mss_confirmed || false,
        fvgPresent: data.fvg_present || false,
        fvgHigh: data.fvg_high?.toString() || "",
        fvgLow: data.fvg_low?.toString() || "",
        m1TriggerType: data.m1_trigger_type || "choch",
        entryPrice: data.entry_price?.toString() || "",
        notes: data.notes || "",
        tradeResult: data.trade_result || "",
      });

      // Load screenshots
      const { data: shots } = await supabase
        .from("ts_screenshots")
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
    return evaluateTs({
      d1Bias: form.d1Bias,
      h1High: form.h1High,
      h1Low: form.h1Low,
      currentPrice: form.currentPrice,
      sweepDirection: form.sweepDirection,
      sweepLevel: form.sweepLevel,
      mssConfirmed: form.mssConfirmed,
      fvgPresent: form.fvgPresent,
      fvgHigh: form.fvgHigh,
      fvgLow: form.fvgLow,
      m1TriggerType: form.m1TriggerType,
      entryPrice: form.entryPrice,
      accountSize,
      riskPercent,
    });
  }, [form, accountSize, riskPercent]);

  // Enrich for the card's visual
  const cardData = useMemo(() => {
    return {
      ...evaluation,
      d1Bias: form.d1Bias,
      h1High: form.h1High,
      h1Low: form.h1Low,
      currentPrice: form.currentPrice,
      sweepDirection: form.sweepDirection,
      sweepLevel: form.sweepLevel,
      fvgHigh: form.fvgHigh,
      fvgLow: form.fvgLow,
      entryPrice: form.entryPrice,
    };
  }, [evaluation, form]);

  async function saveSetup({ isDraft }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); return null; }

    const trade = evaluation.trade;

    const payload = {
      user_id: user.id,
      pair: form.pair,
      status: isDraft ? "draft" : "complete",
      
      // Phase 1
      d1_bias: form.d1Bias,
      h1_high: form.h1High ? parseFloat(form.h1High) : null,
      h1_low: form.h1Low ? parseFloat(form.h1Low) : null,
      h1_ce: evaluation.ce ?? null,
      current_price: form.currentPrice ? parseFloat(form.currentPrice) : null,

      // Phase 2
      sweep_direction: form.sweepDirection,
      sweep_level: form.sweepLevel ? parseFloat(form.sweepLevel) : null,
      mss_confirmed: form.mssConfirmed,
      fvg_present: form.fvgPresent,

      // Phase 3
      fvg_high: form.fvgHigh ? parseFloat(form.fvgHigh) : null,
      fvg_low: form.fvgLow ? parseFloat(form.fvgLow) : null,
      fvg_zone: evaluation.fvgZone || null,

      // Phase 4
      m1_trigger_type: form.m1TriggerType,
      entry_price: form.entryPrice ? parseFloat(form.entryPrice) : null,

      // Execution
      stop_loss: trade && !trade.invalid ? trade.sl : null,
      tp1_price: trade && !trade.invalid ? trade.tp1 : null,
      tp2_price: trade && !trade.invalid ? trade.tp2 : null,
      rr_tp1: trade && !trade.invalid ? trade.rr1 : null,
      rr_tp2: trade && !trade.invalid ? trade.rr2 : null,
      tp1_taken: false,

      // Meta
      notes: form.notes,
      trade_result: form.tradeResult || null,
    };

    let setupRow;
    if (isEdit && existingId) {
      const { data, error: updErr } = await supabase
        .from("ts_setups")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existingId)
        .select()
        .single();
      if (updErr) { setError(updErr.message); return null; }
      setupRow = data;
    } else {
      const { data, error: insErr } = await supabase
        .from("ts_setups")
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
    setTimeout(() => router.push(`/ts/${row.id}`), 800);
  }

  async function handleSaveFinal() {
    if (!evaluation.preEntryReady) { setError("The sequence is incomplete. All 4 phases must pass."); return; }
    if (!evaluation.trade || evaluation.trade.invalid) { setError(evaluation.trade?.invalidReason || "Trade could not be computed."); return; }
    setSaving(true); setError("");
    const row = await saveSetup({ isDraft: false });
    setSaving(false);
    if (!row) return;
    setSaved(true);
    setTimeout(() => router.push(`/ts/${row.id}`), 800);
  }

  async function ensureSetupSaved() {
    if (existingId) return existingId;
    const row = await saveSetup({ isDraft: true });
    if (!row) throw new Error("Failed to save draft before uploading screenshot.");
    return row.id;
  }

  if (loading && isEdit) {
    return <div className="p-6 text-gray-400">Loading TS setup...</div>;
  }

  const canSaveFinal = evaluation.preEntryReady && evaluation.trade && !evaluation.trade.invalid;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? "Edit TS Setup" : "⏱️ Time-Slice Setup"}</h1>
          <p className="text-gray-400 text-sm">1H Container → 15M Trap → 5M Zone → 1M Trigger</p>
        </div>

        {/* Pair */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <PairPicker value={form.pair} onChange={(p) => update("pair", p)} label="Pair" />
        </div>

        {/* ============================================================ */}
        {/* PHASE 1: THE CONTAINER */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-violet-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-violet-300">📦 Phase 1 — The Container (Previous 1H Candle)</h2>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">D1 Bias</label>
              <select value={form.d1Bias} onChange={(e) => update("d1Bias", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {TS_BIASES.map(b => <option key={b.key} value={b.key}>{b.emoji} {b.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Current Price</label>
              <input type="number" step="any" value={form.currentPrice} onChange={(e) => update("currentPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">1H High (BSL)</label>
              <input type="number" step="any" value={form.h1High} onChange={(e) => update("h1High", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">1H Low (SSL)</label>
              <input type="number" step="any" value={form.h1Low} onChange={(e) => update("h1Low", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>

          <div className="p-2 rounded bg-black border border-violet-800/30">
            <p className="text-xs text-violet-200/80">
              💡 <strong>1H CE:</strong> {evaluation.ce ? evaluation.ce.toFixed(5) : "Enter High & Low to compute"}
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PHASE 2: THE TRAP */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-orange-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-orange-300">🪤 Phase 2 — The Trap (15M)</h2>

          <div>
            <label className="block text-xs mb-1 text-gray-400">Sweep Direction</label>
            <div className="grid grid-cols-2 gap-2">
              {TS_SWEEP_DIRECTIONS.map(s => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => update("sweepDirection", s.key)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition ${
                    form.sweepDirection === s.key
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
            <label className="block text-xs mb-1 text-gray-400">Sweep Level (Wick Tip)</label>
            <input type="number" step="any" value={form.sweepLevel} onChange={(e) => update("sweepLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => update("mssConfirmed", !form.mssConfirmed)}
              className={`text-left p-3 rounded-lg border transition ${form.mssConfirmed ? "bg-orange-900/40 border-orange-700" : "bg-black border-gray-800"}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.mssConfirmed ? "bg-orange-500 border-orange-500" : "border-gray-600"}`}>
                  {form.mssConfirmed && <span className="text-black text-xs font-bold">✓</span>}
                </div>
                <p className={`text-sm font-medium ${form.mssConfirmed ? "text-orange-200" : "text-white"}`}>15M MSS Confirmed</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => update("fvgPresent", !form.fvgPresent)}
              className={`text-left p-3 rounded-lg border transition ${form.fvgPresent ? "bg-orange-900/40 border-orange-700" : "bg-black border-gray-800"}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${form.fvgPresent ? "bg-orange-500 border-orange-500" : "border-gray-600"}`}>
                  {form.fvgPresent && <span className="text-black text-xs font-bold">✓</span>}
                </div>
                <p className={`text-sm font-medium ${form.fvgPresent ? "text-orange-200" : "text-white"}`}>FVG Present</p>
              </div>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PHASE 3: THE ZONE */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-purple-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-purple-300">🎯 Phase 3 — The Zone (5M / 15M FVG)</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">FVG Low</label>
              <input type="number" step="any" value={form.fvgLow} onChange={(e) => update("fvgLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">FVG High</label>
              <input type="number" step="any" value={form.fvgHigh} onChange={(e) => update("fvgHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>

          {evaluation.fvgZone && evaluation.fvgZone !== "unknown" && (
            <div className={`p-2 rounded border ${
              (form.d1Bias === "bearish" && evaluation.fvgZone === "premium") ||
              (form.d1Bias === "bullish" && evaluation.fvgZone === "discount")
                ? "bg-green-950/40 border-green-800"
                : "bg-red-950/40 border-red-800"
            }`}>
              <p className={`text-xs ${
                (form.d1Bias === "bearish" && evaluation.fvgZone === "premium") ||
                (form.d1Bias === "bullish" && evaluation.fvgZone === "discount")
                  ? "text-green-200"
                  : "text-red-200"
              }`}>
                FVG is in the <strong>{evaluation.fvgZone.toUpperCase()}</strong> zone.
                {(form.d1Bias === "bearish" && evaluation.fvgZone === "premium") ||
                 (form.d1Bias === "bullish" && evaluation.fvgZone === "discount")
                  ? " Correct zone."
                  : " ⚠️ Wrong zone for this bias."}
              </p>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* PHASE 4: THE TRIGGER */}
        {/* ============================================================ */}
        <div className="p-4 rounded-lg bg-gray-900 border border-emerald-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-300">⚡ Phase 4 — The Trigger (1M)</h2>

          <div>
            <label className="block text-xs mb-1 text-gray-400">1M Trigger</label>
            <div className="grid grid-cols-3 gap-2">
              {TS_TRIGGER_TYPES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => update("m1TriggerType", t.key)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition ${
                    form.m1TriggerType === t.key
                      ? "bg-emerald-900/40 border-emerald-700 text-emerald-200"
                      : "bg-black border-gray-800 text-gray-400"
                  }`}
                >
                  <p className="font-bold">{t.emoji} {t.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1 text-gray-400">Entry Price</label>
            <input type="number" step="any" value={form.entryPrice} onChange={(e) => update("entryPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
          </div>
        </div>

        {/* LIVE CARD */}
        {evaluation && <TsCard data={cardData} />}

        {/* SCREENSHOTS */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <ScreenshotUploader setupId={existingId} userId={userId} screenshots={screenshots} onChange={setScreenshots} table="ts_screenshots" onEnsureSetup={ensureSetupSaved} />
          <ScreenshotGallery screenshots={screenshots} onDelete={(id) => setScreenshots(prev => prev.filter(s => s.id !== id))} table="ts_screenshots" />
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
              canSaveFinal ? "bg-violet-700 hover:bg-violet-600" : "bg-gray-800"
            }`}
          >
            {saving ? "Saving..." : canSaveFinal ? "✅ Save as Final" : "💾 Sequence incomplete"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function TsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 bg-black text-white"><div className="max-w-3xl mx-auto text-gray-400">Loading TS form...</div></main>}>
      <TsPageContent />
    </Suspense>
  );
}