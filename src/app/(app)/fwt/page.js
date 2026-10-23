"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import {
  FWT_SESSIONS,
  FWT_MODES,
  WICK_DIRECTIONS,
  LIQUIDITY_SWEPT_TYPES,
  evaluateFwt,
} from "@/lib/fwtEngine";
import PairPicker from "@/components/PairPicker";
import FwtCard from "@/components/FwtCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

function FwtPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "Volatility 80",
    session: "london",
    mode: "live",

    dailyBias: "bearish",
    currentPrice: "",
    candleOpen: "",
    candleHigh: "",
    candleLow: "",
    candleClose: "",
    ema50Value: "",

    wickDirection: "upper",
    wickExtreme: "",
    liquiditySweptType: "bsl",
    liquiditySweptLevel: "",
    wickConfirmed: false,

    m15ChochConfirmed: false,
    m15ChochLevel: "",
    m15FvgHigh: "",
    m15FvgLow: "",

    m1ChochConfirmed: false,
    m1RejectionPresent: false,
    entryPrice: "",
    stopLoss: "",
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
      const { data: setupData, error: setupErr } = await supabase.from("fwt_setups").select("*").eq("id", editId).maybeSingle();
      if (setupErr || !setupData) {
        setError(setupErr?.message || "FWT setup not found.");
        setLoadingEdit(false);
        return;
      }

      const { data: shotsData } = await supabase.from("fwt_screenshots").select("*").eq("setup_id", setupData.id).order("created_at");
      setScreenshots(shotsData || []);

      setForm({
        pair: setupData.pair || "Volatility 80",
        session: setupData.session || "london",
        mode: setupData.mode || "live",
        dailyBias: setupData.daily_bias || "bearish",
        currentPrice: setupData.current_price?.toString() || "",
        candleOpen: setupData.candle_open?.toString() || "",
        candleHigh: setupData.candle_high?.toString() || "",
        candleLow: setupData.candle_low?.toString() || "",
        candleClose: setupData.candle_close?.toString() || "",
        ema50Value: setupData.ema50_value?.toString() || "",
        wickDirection: setupData.wick_direction || "upper",
        wickExtreme: setupData.wick_extreme?.toString() || "",
        liquiditySweptType: setupData.liquidity_swept_type || "bsl",
        liquiditySweptLevel: setupData.liquidity_swept_level?.toString() || "",
        wickConfirmed: setupData.wick_confirmed || false,
        m15ChochConfirmed: setupData.m15_choch_confirmed || false,
        m15ChochLevel: setupData.m15_choch_level?.toString() || "",
        m15FvgHigh: setupData.m15_fvg_high?.toString() || "",
        m15FvgLow: setupData.m15_fvg_low?.toString() || "",
        m1ChochConfirmed: setupData.m1_choch_confirmed || false,
        m1RejectionPresent: setupData.m1_rejection_present || false,
        entryPrice: setupData.entry_price?.toString() || "",
        stopLoss: setupData.stop_loss?.toString() || "",
        targetPrice: setupData.target_price?.toString() || "",
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
    return evaluateFwt({
      mode: form.mode,
      dailyBias: form.dailyBias,
      currentPrice: form.currentPrice,
      candleOpen: form.candleOpen,
      candleHigh: form.candleHigh,
      candleLow: form.candleLow,
      candleClose: form.candleClose,
      ema50Value: form.ema50Value,
      wickDirection: form.wickDirection,
      wickExtreme: form.wickExtreme,
      liquiditySweptType: form.liquiditySweptType,
      liquiditySweptLevel: form.liquiditySweptLevel,
      wickConfirmed: form.wickConfirmed,
      m15ChochConfirmed: form.m15ChochConfirmed,
      m15ChochLevel: form.m15ChochLevel,
      m15FvgHigh: form.m15FvgHigh,
      m15FvgLow: form.m15FvgLow,
      m1ChochConfirmed: form.m1ChochConfirmed,
      m1RejectionPresent: form.m1RejectionPresent,
      entryPrice: form.entryPrice,
      stopLoss: form.stopLoss,
      targetPrice: form.targetPrice,
      accountSize,
      riskPercent,
    });
  }, [form, accountSize, riskPercent]);

  const cardData = useMemo(() => {
    return {
      ...evaluation,
      candle: {
        open: form.candleOpen,
        high: form.candleHigh,
        low: form.candleLow,
        close: form.candleClose,
        currentPrice: form.currentPrice,
        wickDirection: form.wickDirection,
        wickExtreme: form.wickExtreme,
        entryPrice: form.entryPrice,
        stopLoss: form.stopLoss,
        targetPrice: form.targetPrice,
        dailyBias: form.dailyBias,
      },
    };
  }, [evaluation, form]);

  async function saveFwt({ isDraft }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); return null; }

    const trade = evaluation.trade;

    const payload = {
      user_id: user.id,
      pair: form.pair,
      session: form.session,
      mode: form.mode,
      status: isDraft ? "draft" : "complete",
      daily_bias: form.dailyBias,
      current_price: form.currentPrice ? parseFloat(form.currentPrice) : null,
      candle_open: form.candleOpen ? parseFloat(form.candleOpen) : null,
      candle_high: form.candleHigh ? parseFloat(form.candleHigh) : null,
      candle_low: form.candleLow ? parseFloat(form.candleLow) : null,
      candle_close: form.candleClose ? parseFloat(form.candleClose) : null,
      ema50_value: form.ema50Value ? parseFloat(form.ema50Value) : null,
      ema50_conflict: evaluation.emaConflict || false,
      wick_direction: form.wickDirection,
      wick_extreme: form.wickExtreme ? parseFloat(form.wickExtreme) : null,
      liquidity_swept_type: form.liquiditySweptType,
      liquidity_swept_level: form.liquiditySweptLevel ? parseFloat(form.liquiditySweptLevel) : null,
      wick_confirmed: form.wickConfirmed,
      m15_choch_confirmed: form.m15ChochConfirmed,
      m15_choch_level: form.m15ChochLevel ? parseFloat(form.m15ChochLevel) : null,
      m15_fvg_high: form.m15FvgHigh ? parseFloat(form.m15FvgHigh) : null,
      m15_fvg_low: form.m15FvgLow ? parseFloat(form.m15FvgLow) : null,
      m1_choch_confirmed: form.m1ChochConfirmed,
      m1_rejection_present: form.m1RejectionPresent,
      entry_price: trade && !trade.invalid ? trade.entry : null,
      stop_loss: trade && !trade.invalid ? trade.sl : null,
      target_price: trade && !trade.invalid ? trade.tp : null,
      rr: trade && !trade.invalid ? trade.rr : null,
      notes: form.notes,
    };

    let setupRow;
    if (isEdit && existingSetupId) {
      const { data, error: updErr } = await supabase
        .from("fwt_setups")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existingSetupId)
        .select()
        .single();
      if (updErr) { setError(updErr.message); return null; }
      setupRow = data;
    } else {
      const { data, error: insErr } = await supabase
        .from("fwt_setups")
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
    const row = await saveFwt({ isDraft: true });
    setSavingDraft(false);
    if (!row) return;
    setDraftSavedAt(new Date());
    setSaved(false);
  }

  async function handleSaveFinal() {
    if (!evaluation.preEntryReady) { setError("The full sequence must be complete before saving as final."); return; }
    if (!evaluation.trade || evaluation.trade.invalid) { setError(evaluation.trade?.invalidReason || "Trade could not be computed."); return; }
    setSaving(true); setError("");
    const row = await saveFwt({ isDraft: false });
    setSaving(false);
    if (!row) return;
    setDraftSavedAt(null);
    setSaved(true);
    setTimeout(() => router.push(`/fwt/${row.id}`), 800);
  }

  async function ensureSetupSaved() {
    if (existingSetupId) return existingSetupId;
    const row = await saveFwt({ isDraft: true });
    if (!row) throw new Error("Failed to save draft.");
    setDraftSavedAt(new Date());
    return row.id;
  }

  if (loadingEdit && isEdit) return <div className="p-6 text-gray-400">Loading FWT setup...</div>;

  const canSaveFinal = evaluation.preEntryReady && evaluation.trade && !evaluation.trade.invalid;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? "Edit FWT Setup" : "🕯️ FWT — 4-Hour Wick Trap"}</h1>
          <p className="text-gray-400 text-sm">Bias → Wick → 15M Shift → 1M Entry. Catch the body of the 4H candle.</p>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <PairPicker value={form.pair} onChange={(p) => update("pair", p)} label="Pair" />
            <div>
              <label className="block text-xs mb-1 text-gray-400">4H Session</label>
              <select value={form.session} onChange={(e) => update("session", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {FWT_SESSIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1 text-gray-400">Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {FWT_MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => update("mode", m.key)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition ${
                    form.mode === m.key
                      ? m.key === "live"
                        ? "bg-cyan-900/40 border-cyan-700 text-cyan-200"
                        : "bg-purple-900/40 border-purple-700 text-purple-200"
                      : "bg-black border-gray-800 text-gray-400"
                  }`}
                >
                  <p className="font-bold">{m.label}</p>
                  <p className="text-[10px] mt-0.5 text-gray-400">{m.hint}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-blue-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-blue-300">🌍 Stage 1 — Context & 4H Candle</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Daily Bias</label>
              <select value={form.dailyBias} onChange={(e) => update("dailyBias", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
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
            <div>
              <label className="block text-xs mb-1 text-gray-400">Candle Open</label>
              <input type="number" step="any" value={form.candleOpen} onChange={(e) => update("candleOpen", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Candle Close {form.mode === "live" && <span className="text-gray-500">(optional in live)</span>}
              </label>
              <input type="number" step="any" value={form.candleClose} onChange={(e) => update("candleClose", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Candle High</label>
              <input type="number" step="any" value={form.candleHigh} onChange={(e) => update("candleHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Candle Low</label>
              <input type="number" step="any" value={form.candleLow} onChange={(e) => update("candleLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>

          <div className="pt-2 border-t border-blue-800/40">
            <label className="block text-xs mb-1 text-gray-400">
              50 EMA Value <span className="text-blue-400">(trend filter)</span>
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
                  ⚠️ Price is on the wrong side of the 50 EMA. Your {form.dailyBias} bias is
                  fighting the trend filter — treat this as a counter-trend setup.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-orange-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-orange-300">⚡ Stage 2 — The 4H Wick (Manipulation)</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Wick Direction</label>
              <div className="grid grid-cols-2 gap-2">
                {WICK_DIRECTIONS.map((w) => (
                  <button
                    key={w.key}
                    type="button"
                    onClick={() => {
                      update("wickDirection", w.key);
                      update("liquiditySweptType", w.key === "upper" ? "bsl" : "ssl");
                    }}
                    className={`text-left px-3 py-2 rounded-lg border text-xs transition ${
                      form.wickDirection === w.key
                        ? "bg-orange-900/40 border-orange-700 text-orange-200"
                        : "bg-black border-gray-800 text-gray-400"
                    }`}
                  >
                    <p className="font-bold">{w.emoji} {w.label}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Wick Extreme (SL Reference)</label>
              <input type="number" step="any" value={form.wickExtreme} onChange={(e) => update("wickExtreme", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Liquidity Swept</label>
              <select value={form.liquiditySweptType} onChange={(e) => update("liquiditySweptType", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
                {LIQUIDITY_SWEPT_TYPES.map((s) => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Swept Level (price)</label>
              <input type="number" step="any" value={form.liquiditySweptLevel} onChange={(e) => update("liquiditySweptLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => update("wickConfirmed", !form.wickConfirmed)}
            className={`w-full text-left p-3 rounded-lg border transition ${
              form.wickConfirmed ? "bg-orange-900/40 border-orange-700" : "bg-black border-gray-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                form.wickConfirmed ? "bg-orange-500 border-orange-500" : "border-gray-600"
              }`}>
                {form.wickConfirmed && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${form.wickConfirmed ? "text-orange-200" : "text-white"}`}>
                  Wick confirmed (price rejected)
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  The wick has sprung — price refused to continue beyond it
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-purple-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-purple-300">🔍 Stage 3 — 15M Structure Shift</h2>

          <button
            type="button"
            onClick={() => update("m15ChochConfirmed", !form.m15ChochConfirmed)}
            className={`w-full text-left p-3 rounded-lg border transition ${
              form.m15ChochConfirmed ? "bg-purple-900/40 border-purple-700" : "bg-black border-gray-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                form.m15ChochConfirmed ? "bg-purple-500 border-purple-500" : "border-gray-600"
              }`}>
                {form.m15ChochConfirmed && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <p className={`text-sm font-medium ${form.m15ChochConfirmed ? "text-purple-200" : "text-white"}`}>
                15M CHoCH Confirmed
              </p>
            </div>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">CHoCH Level</label>
              <input type="number" step="any" value={form.m15ChochLevel} onChange={(e) => update("m15ChochLevel", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">15M FVG Low</label>
              <input type="number" step="any" value={form.m15FvgLow} onChange={(e) => update("m15FvgLow", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">15M FVG High</label>
              <input type="number" step="any" value={form.m15FvgHigh} onChange={(e) => update("m15FvgHigh", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-emerald-800/60 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-300">🎯 Stage 4 — 1M Entry Trigger</h2>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => update("m1ChochConfirmed", !form.m1ChochConfirmed)}
              className={`text-left p-3 rounded-lg border transition ${
                form.m1ChochConfirmed ? "bg-emerald-900/40 border-emerald-700" : "bg-black border-gray-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  form.m1ChochConfirmed ? "bg-emerald-500 border-emerald-500" : "border-gray-600"
                }`}>
                  {form.m1ChochConfirmed && <span className="text-black text-xs font-bold">✓</span>}
                </div>
                <p className={`text-sm font-medium ${form.m1ChochConfirmed ? "text-emerald-200" : "text-white"}`}>
                  1M CHoCH
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => update("m1RejectionPresent", !form.m1RejectionPresent)}
              className={`text-left p-3 rounded-lg border transition ${
                form.m1RejectionPresent ? "bg-emerald-900/40 border-emerald-700" : "bg-black border-gray-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  form.m1RejectionPresent ? "bg-emerald-500 border-emerald-500" : "border-gray-600"
                }`}>
                  {form.m1RejectionPresent && <span className="text-black text-xs font-bold">✓</span>}
                </div>
                <p className={`text-sm font-medium ${form.m1RejectionPresent ? "text-emerald-200" : "text-white"}`}>
                  1M Rejection Block
                </p>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-emerald-800/40">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Entry Price</label>
              <input type="number" step="any" value={form.entryPrice} onChange={(e) => update("entryPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Stop Loss</label>
              <input type="number" step="any" value={form.stopLoss} onChange={(e) => update("stopLoss", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Target Price</label>
              <input type="number" step="any" value={form.targetPrice} onChange={(e) => update("targetPrice", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
            </div>
          </div>
        </div>

        {evaluation && <FwtCard data={cardData} />}

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <ScreenshotUploader
            setupId={existingSetupId}
            userId={userId}
            screenshots={screenshots}
            onChange={setScreenshots}
            table="fwt_screenshots"
            onEnsureSetup={ensureSetupSaved}
          />
          <ScreenshotGallery
            screenshots={screenshots}
            onDelete={(id) => setScreenshots((prev) => prev.filter((s) => s.id !== id))}
          />
        </div>

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
              canSaveFinal ? "bg-teal-700 hover:bg-teal-600" : "bg-gray-800"
            }`}
          >
            {saving ? "Saving..." : canSaveFinal ? "✅ Save as Final" : "💾 Sequence incomplete"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function FwtPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 bg-black text-white"><div className="max-w-3xl mx-auto text-gray-400">Loading FWT...</div></main>}>
      <FwtPageContent />
    </Suspense>
  );
}