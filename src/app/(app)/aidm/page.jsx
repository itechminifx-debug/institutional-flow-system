"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import {
  AIDM_DIRECTIONS,
  AIDM_SESSIONS,
  AIDM_TIMEFRAMES,
  evaluateAidm,
} from "@/lib/aidmEngine";
import PairPicker from "@/components/PairPicker";
import AidmCard from "@/components/AidmCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

function AidmPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "",
    timeframe: "4H",
    session: "london",
    direction: "bullish",
    rangeHigh: "",
    rangeLow: "",
    currentPrice: "",
    sweptErl: false,
    liquiditySweptType: "ssl",
    mssConfirmed: false,
    mssLevel: "",
    fvgHigh: "",
    fvgLow: "",
    structureFlipped: false,
    entryPrice: "",
    stopLoss: "",
    takeProfit1: "",
    takeProfit2: "",
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

      setLoadingEdit(true);
      const { data: setupData, error: setupErr } = await supabase
        .from("aidm_setups")
        .select("*")
        .eq("id", editId)
        .maybeSingle();

      if (setupErr || !setupData) {
        setError(setupErr?.message || "AIDM setup not found.");
        setLoadingEdit(false);
        return;
      }

      const { data: shotsData } = await supabase
        .from("aidm_screenshots")
        .select("*")
        .eq("setup_id", setupData.id)
        .order("created_at");
      setScreenshots(shotsData || []);

      setForm({
        pair: setupData.pair || "",
        timeframe: setupData.timeframe || "4H",
        session: setupData.session || "london",
        direction: setupData.direction || "bullish",
        rangeHigh: setupData.range_high?.toString() || "",
        rangeLow: setupData.range_low?.toString() || "",
        currentPrice: setupData.current_price?.toString() || "",
        sweptErl: setupData.swept_erl || false,
        liquiditySweptType: setupData.liquidity_swept_type || "ssl",
        mssConfirmed: setupData.mss_confirmed || false,
        mssLevel: setupData.mss_level?.toString() || "",
        fvgHigh: setupData.fvg_high?.toString() || "",
        fvgLow: setupData.fvg_low?.toString() || "",
        structureFlipped: setupData.structure_flipped || false,
        entryPrice: setupData.entry_price?.toString() || "",
        stopLoss: setupData.stop_loss?.toString() || "",
        takeProfit1: setupData.take_profit_1?.toString() || "",
        takeProfit2: setupData.take_profit_2?.toString() || "",
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
    return evaluateAidm({
      direction: form.direction,
      rangeHigh: form.rangeHigh,
      rangeLow: form.rangeLow,
      currentPrice: form.currentPrice,
      session: form.session,
      sweptErl: form.sweptErl,
      liquiditySweptType: form.liquiditySweptType,
      mssConfirmed: form.mssConfirmed,
      mssLevel: form.mssLevel,
      fvgHigh: form.fvgHigh,
      fvgLow: form.fvgLow,
      structureFlipped: form.structureFlipped,
      entryPrice: form.entryPrice,
      stopLoss: form.stopLoss,
      takeProfit1: form.takeProfit1,
      takeProfit2: form.takeProfit2,
      accountSize,
      riskPercent,
    });
  }, [form, accountSize, riskPercent]);

  async function saveAidm({ isDraft }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); return null; }

    const trade = evaluation.trade;
    const levels = evaluation.context?.gates && {
      ce: evaluation.ce,
      ote62: evaluation.ote62,
      ote79: evaluation.ote79,
      poiZone: evaluation.poiZone,
      size: evaluation.rangeHigh && evaluation.rangeLow
        ? parseFloat(evaluation.rangeHigh) - parseFloat(evaluation.rangeLow)
        : null,
    };

    const payload = {
      user_id: user.id,
      pair: form.pair || null,
      timeframe: form.timeframe,
      session: form.session,
      direction: form.direction,
      status: isDraft ? "draft" : "complete",

      range_high: form.rangeHigh ? parseFloat(form.rangeHigh) : null,
      range_low: form.rangeLow ? parseFloat(form.rangeLow) : null,
      range_size: levels?.size ?? null,
      ce_50: evaluation.ce ?? null,
      ote_62: evaluation.ote62 ?? null,
      ote_79: evaluation.ote79 ?? null,
      ote_zone_low: evaluation.ote62 && evaluation.ote79
        ? Math.min(evaluation.ote62, evaluation.ote79)
        : null,
      ote_zone_high: evaluation.ote62 && evaluation.ote79
        ? Math.max(evaluation.ote62, evaluation.ote79)
        : null,
      poi_zone: evaluation.poiZone ?? null,

      current_price: form.currentPrice ? parseFloat(form.currentPrice) : null,
      swept_erl: form.sweptErl,
      liquidity_swept_type: form.liquiditySweptType,
      mss_confirmed: form.mssConfirmed,
      mss_level: form.mssLevel ? parseFloat(form.mssLevel) : null,
      fvg_high: form.fvgHigh ? parseFloat(form.fvgHigh) : null,
      fvg_low: form.fvgLow ? parseFloat(form.fvgLow) : null,
      structure_flipped: form.structureFlipped,

      entry_price: trade && !trade.invalid ? trade.entry : null,
      stop_loss: trade && !trade.invalid ? trade.sl : null,
      take_profit_1: trade && !trade.invalid ? trade.tp1 : null,
      take_profit_2: trade && !trade.invalid ? trade.tp2 : null,

      account_size: accountSize || null,
      risk_percent: riskPercent || 1,
      lot_size: trade && !trade.invalid ? trade.lotSize : null,

      notes: form.notes || null,
    };

    let setupRow;
    if (isEdit && existingSetupId) {
      const { data, error: updErr } = await supabase
        .from("aidm_setups")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existingSetupId)
        .select()
        .single();
      if (updErr) { setError(updErr.message); return null; }
      setupRow = data;
    } else {
      const { data, error: insErr } = await supabase
        .from("aidm_setups")
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
    const row = await saveAidm({ isDraft: true });
    setSavingDraft(false);
    if (!row) return;
    setDraftSavedAt(new Date());
    setSaved(false);
  }

  async function handleSaveFinal() {
    if (!evaluation.preEntryReady) {
      setError("The full sequence must be complete before saving as final.");
      return;
    }
    if (!evaluation.trade || evaluation.trade.invalid) {
      setError(evaluation.trade?.invalidReason || "Trade could not be computed.");
      return;
    }
    setSaving(true); setError("");
    const row = await saveAidm({ isDraft: false });
    setSaving(false);
    if (!row) return;
    setDraftSavedAt(null);
    setSaved(true);
    setTimeout(() => router.push(`/aidm/${row.id}`), 800);
  }

  async function ensureSetupSaved() {
    if (existingSetupId) return existingSetupId;
    const row = await saveAidm({ isDraft: true });
    if (!row) throw new Error("Failed to save draft.");
    setDraftSavedAt(new Date());
    return row.id;
  }

  if (loadingEdit && isEdit) {
    return <div className="p-6 text-gray-400">Loading AIDM setup...</div>;
  }

  const canSaveFinal = evaluation.preEntryReady && evaluation.trade && !evaluation.trade.invalid;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit ? "Edit AIDM Setup" : "📐 AIDM — APEX-IDM"}
          </h1>
          <p className="text-gray-400 text-sm">
            Map → Time &amp; Trap → Structure Shift → Sniper Entry → Risk &amp; Targets.
          </p>
        </div>

        {/* Header basics */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <PairPicker value={form.pair} onChange={(p) => update("pair", p)} label="Pair" />
            <div>
              <label className="block text-xs mb-1 text-gray-400">Timeframe</label>
              <select
                value={form.timeframe}
                onChange={(e) => update("timeframe", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm"
              >
                {AIDM_TIMEFRAMES.map((tf) => (
                  <option key={tf} value={tf}>{tf}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1 text-gray-400">Direction</label>
            <div className="grid grid-cols-2 gap-2">
              {AIDM_DIRECTIONS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => update("direction", d.key)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition ${
                    form.direction === d.key
                      ? d.key === "bullish"
                        ? "bg-green-900/40 border-green-700 text-green-200"
                        : "bg-red-900/40 border-red-700 text-red-200"
                      : "bg-black border-gray-800 text-gray-400"
                  }`}
                >
                  <p className="font-bold">{d.label}</p>
                  <p className="text-[10px] mt-0.5 text-gray-400">{d.hint}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PART 1 — MAP */}
        <div className="p-4 rounded-lg bg-gray-900 border border-blue-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-blue-300">🗺️ Part 1 — Map (Range + CE + OTE)</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Range High</label>
              <input
                type="number" step="any"
                value={form.rangeHigh}
                onChange={(e) => update("rangeHigh", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Range Low</label>
              <input
                type="number" step="any"
                value={form.rangeLow}
                onChange={(e) => update("rangeLow", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1 text-gray-400">Current Price</label>
            <input
              type="number" step="any"
              value={form.currentPrice}
              onChange={(e) => update("currentPrice", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm"
            />
          </div>

          {/* Auto-calc display */}
          {evaluation.ce !== null && (
            <div className="p-3 rounded-lg bg-black border border-blue-800/40 grid grid-cols-2 gap-2 text-xs">
              <p className="text-gray-400">Size: <span className="text-white font-mono">{evaluation.rangeHigh - evaluation.rangeLow}</span></p>
              <p className="text-gray-400">50% CE: <span className="text-yellow-300 font-mono font-bold">{evaluation.ce}</span></p>
              <p className="text-gray-400">62%: <span className="text-sky-300 font-mono">{evaluation.ote62}</span></p>
              <p className="text-gray-400">79%: <span className="text-sky-300 font-mono">{evaluation.ote79}</span></p>
              <p className="text-gray-400 col-span-2">POI: <span className="text-sky-200 font-bold uppercase">{evaluation.poiZone}</span></p>
            </div>
          )}
        </div>

        {/* PART 2 — TIME & TRAP */}
        <div className="p-4 rounded-lg bg-gray-900 border border-orange-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-orange-300">⚡ Part 2 — Time &amp; Trap</h2>

          <div>
            <label className="block text-xs mb-1 text-gray-400">Kill Zone</label>
            <select
              value={form.session}
              onChange={(e) => update("session", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm"
            >
              {AIDM_SESSIONS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => update("sweptErl", !form.sweptErl)}
            className={`w-full text-left p-3 rounded-lg border transition ${
              form.sweptErl ? "bg-orange-900/40 border-orange-700" : "bg-black border-gray-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                form.sweptErl ? "bg-orange-500 border-orange-500" : "border-gray-600"
              }`}>
                {form.sweptErl && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <p className={`text-sm font-medium ${form.sweptErl ? "text-orange-200" : "text-white"}`}>
                ERL Swept (liquidity taken)
              </p>
            </div>
          </button>

          <div>
            <label className="block text-xs mb-1 text-gray-400">Swept Side</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "bsl", label: "🔵 BSL (Buyside)", hint: "Above — trap for buyers" },
                { key: "ssl", label: "🟠 SSL (Sellside)", hint: "Below — trap for sellers" },
              ].map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => update("liquiditySweptType", o.key)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition ${
                    form.liquiditySweptType === o.key
                      ? "bg-orange-900/40 border-orange-700 text-orange-200"
                      : "bg-black border-gray-800 text-gray-400"
                  }`}
                >
                  <p className="font-bold">{o.label}</p>
                  <p className="text-[10px] mt-0.5">{o.hint}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PART 3 — STRUCTURE SHIFT */}
        <div className="p-4 rounded-lg bg-gray-900 border border-purple-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-purple-300">🔍 Part 3 — Structure Shift</h2>

          <button
            type="button"
            onClick={() => update("mssConfirmed", !form.mssConfirmed)}
            className={`w-full text-left p-3 rounded-lg border transition ${
              form.mssConfirmed ? "bg-purple-900/40 border-purple-700" : "bg-black border-gray-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                form.mssConfirmed ? "bg-purple-500 border-purple-500" : "border-gray-600"
              }`}>
                {form.mssConfirmed && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <p className={`text-sm font-medium ${form.mssConfirmed ? "text-purple-200" : "text-white"}`}>
                MSS Confirmed (displacement CHoCH + FVG)
              </p>
            </div>
          </button>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">MSS Level</label>
              <input type="number" step="any"
                value={form.mssLevel}
                onChange={(e) => update("mssLevel", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">FVG Low</label>
              <input type="number" step="any"
                value={form.fvgLow}
                onChange={(e) => update("fvgLow", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">FVG High</label>
              <input type="number" step="any"
                value={form.fvgHigh}
                onChange={(e) => update("fvgHigh", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => update("structureFlipped", !form.structureFlipped)}
            className={`w-full text-left p-3 rounded-lg border transition ${
              form.structureFlipped ? "bg-red-900/40 border-red-700" : "bg-black border-gray-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                form.structureFlipped ? "bg-red-500 border-red-500" : "border-gray-600"
              }`}>
                {form.structureFlipped && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <p className={`text-sm font-medium ${form.structureFlipped ? "text-red-200" : "text-white"}`}>
                HTF Veto — structure flipped against HTF bias
              </p>
            </div>
          </button>
        </div>

        {/* PART 4 — SNIPER ENTRY */}
        <div className="p-4 rounded-lg bg-gray-900 border border-emerald-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-300">🎯 Part 4 — Sniper Entry</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Entry Price</label>
              <input type="number" step="any"
                value={form.entryPrice}
                onChange={(e) => update("entryPrice", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Stop Loss</label>
              <input type="number" step="any"
                value={form.stopLoss}
                onChange={(e) => update("stopLoss", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm"
              />
            </div>
          </div>
        </div>

        {/* PART 5 — RISK & TARGETS */}
        <div className="p-4 rounded-lg bg-gray-900 border border-teal-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-teal-300">💰 Part 5 — Risk &amp; Targets</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">TP1 — 50% CE</label>
              <input type="number" step="any"
                value={form.takeProfit1}
                onChange={(e) => update("takeProfit1", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">TP2 — Opposite ERL</label>
              <input type="number" step="any"
                value={form.takeProfit2}
                onChange={(e) => update("takeProfit2", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm"
              />
            </div>
          </div>
        </div>

        {evaluation && (
          <AidmCard
            data={{
              ...evaluation,
              currentPrice: form.currentPrice,
              entryPrice: form.entryPrice,
              stopLoss: form.stopLoss,
              targetPrice: form.takeProfit2 || form.takeProfit1,
            }}
          />
        )}

        {/* Screenshots */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <ScreenshotUploader
            setupId={existingSetupId}
            userId={userId}
            screenshots={screenshots}
            onChange={setScreenshots}
            table="aidm_screenshots"
            onEnsureSetup={ensureSetupSaved}
          />
          <ScreenshotGallery
            screenshots={screenshots}
            onDelete={(id) => setScreenshots(prev => prev.filter(s => s.id !== id))}
            table="aidm_screenshots"
          />
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <label className="block text-xs mb-1 text-gray-400">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 resize-none text-sm"
          />
        </div>

        {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}
        {draftSavedAt && <div className="p-3 rounded-lg bg-yellow-900/40 border border-yellow-700 text-yellow-100 text-sm">📝 Draft saved · {draftSavedAt.toLocaleTimeString()}</div>}
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
              canSaveFinal ? "bg-sky-700 hover:bg-sky-600" : "bg-gray-800"
            }`}
          >
            {saving ? "Saving..." : canSaveFinal ? "✅ Save as Final" : "💾 Sequence incomplete"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function AidmPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 bg-black text-white"><div className="max-w-3xl mx-auto text-gray-400">Loading AIDM...</div></main>}>
      <AidmPageContent />
    </Suspense>
  );
}