"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import { evaluateAmd, amdTypeInfo } from "@/lib/amdEngine";
import {
  computeEmaDirection,
  enrichVerdict,
  computeWarningReasons,
} from "@/lib/verdictEngine";
import AmdCard from "@/components/AmdCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

export default function AmdDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params?.id;

  const [row, setRow] = useState(null);
  const [rbs, setRbs] = useState([]);
  const [fvgs, setFvgs] = useState([]);
  const [orderBlocks, setOrderBlocks] = useState([]);
  const [verdictCloses, setVerdictCloses] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const isDraft = row?.status === "draft";

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const { data: setupData, error: setupErr } = await supabase.from("amd_setups").select("*").eq("id", id).maybeSingle();
      if (setupErr || !setupData) {
        setError(setupErr?.message || "AMD setup not found.");
        setLoading(false);
        return;
      }

      const { data: rbData } = await supabase.from("amd_rbs").select("*").eq("setup_id", id).order("created_at", { ascending: false });
      const { data: fvgData } = await supabase.from("amd_fvgs").select("*").eq("setup_id", id).order("created_at", { ascending: true });
      const { data: obData } = await supabase.from("amd_order_blocks").select("*").eq("setup_id", id).order("created_at", { ascending: true });
      const { data: vcData } = await supabase.from("amd_verdict_closes").select("*").eq("setup_id", id).order("sequence_number", { ascending: true });
      const { data: shotsData } = await supabase.from("amd_screenshots").select("*").eq("setup_id", id).order("created_at", { ascending: true });

      let fvgList = [];
      if (fvgData && fvgData.length > 0) {
        fvgList = fvgData.map((f, idx) => ({
          id: Math.random().toString(36).slice(2),
          high: f.fvg_high?.toString() || "",
          low: f.fvg_low?.toString() || "",
          addedAt: f.created_at || new Date(Date.now() - idx * 1000).toISOString(),
        }));
      } else if (setupData.fvg_high || setupData.fvg_low) {
        fvgList = [{
          id: Math.random().toString(36).slice(2),
          high: setupData.fvg_high?.toString() || "",
          low: setupData.fvg_low?.toString() || "",
          addedAt: setupData.created_at || new Date().toISOString(),
        }];
      }

      let obList = [];
      if (obData && obData.length > 0) {
        obList = obData.map((o, idx) => ({
          id: Math.random().toString(36).slice(2),
          high: o.ob_high?.toString() || "",
          low: o.ob_low?.toString() || "",
          addedAt: o.created_at || new Date(Date.now() - idx * 1000).toISOString(),
        }));
      }

      let vcList = [];
      if (vcData && vcData.length > 0) {
        vcList = vcData.map((vc, idx) => ({
          id: Math.random().toString(36).slice(2),
          sequenceNumber: vc.sequence_number ?? idx + 1,
          candle: {
            open: vc.candle?.open?.toString() || "",
            high: vc.candle?.high?.toString() || "",
            low: vc.candle?.low?.toString() || "",
            close: vc.candle?.close?.toString() || "",
          },
        }));
      }

      setRow(setupData);
      setRbs(rbData || []);
      setFvgs(fvgList);
      setOrderBlocks(obList);
      setVerdictCloses(vcList);
      setScreenshots(shotsData || []);
      setNotesDraft(setupData.notes || "");
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const evaluation = useMemo(() => {
    if (!row) return null;
    const activeRb = rbs.find((rb) => rb.is_active) || rbs[0] || null;
    const rbHigh = activeRb?.rb_high ?? row.active_rb_high ?? null;
    const rbLow = activeRb?.rb_low ?? row.active_rb_low ?? null;

    return evaluateAmd({
      sequenceType: row.sequence_type,
      rangeHigh: row.range_high, rangeLow: row.range_low,
      atrCurrent: row.atr_current, atrPrior: row.atr_prior,
      sweepCandle: row.sweep_candle,
      displacementCandle: row.displacement_candle,
      currentClose: row.current_close,
      mssReference: row.mss_reference,
      mssCandleHigh: row.mss_candle_high, mssCandleLow: row.mss_candle_low,
      inducementLevel: row.inducement_level,
      bslLevel: row.bsl_level, sslLevel: row.ssl_level,
      drawOnLiquidity: row.draw_on_liquidity,
      d1Bias: row.d1_bias,
      d1Timeframe: row.d1_timeframe || "D1",
      h4Timeframe: row.h4_timeframe || "H4",
      ltfTimeframe: row.ltf_timeframe || "M15",
      fvgs: fvgs.map((f) => ({ id: f.id, high: f.high, low: f.low, addedAt: f.addedAt })),
      orderBlocks: orderBlocks.map((o) => ({ id: o.id, high: o.high, low: o.low, addedAt: o.addedAt })),
      rbHigh, rbLow,
      closeCandle: row.close_candle,
      verdictCloses: verdictCloses.map((vc) => ({ id: vc.id, sequenceNumber: vc.sequenceNumber, candle: vc.candle })),
      nextLiquidityLevel: row.next_liquidity_level,
      pipSize: row.pip_size || 1,
      manualMindset: row.checklist_answers?.mindset === true,
      accountSize: 0, riskPercent: 0,
      ema50Price: row.ema50_price,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, rbs, fvgs, orderBlocks, verdictCloses]);

  const enrichedVerdict = useMemo(() => {
    if (!row) return null;
    if (!evaluation?.baseNegotiation) return null;
    const base = {
      verdict: evaluation.baseNegotiation.verdict,
      strength: evaluation.baseNegotiation.strength || "normal",
      reason: evaluation.baseNegotiation.reason || "",
    };
    const ema = computeEmaDirection({ emaPrice: row.ema50_price, closePrice: row.current_close });
    return enrichVerdict({
      verdict: base, ema,
      htfBiasInput: row.htf_bias_override || "auto",
      sweepDirection: row.sweep_direction || "none",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, evaluation]);

  const alignment = enrichedVerdict?.emaAlignment;

  const trade = useMemo(() => {
    if (!row?.entry || !row?.sl || !row?.tp) return null;
    return {
      direction: row.verdict,
      entry: row.entry, sl: row.sl, tp: row.tp, rr: row.rr,
      pipSize: row.pip_size, slPips: row.sl_pips, tpPips: row.tp_pips,
      lotSize: row.lot_size, riskAmount: row.risk_amount,
    };
  }, [row]);

  const irlErl = useMemo(() => {
    if (!row) return null;
    if (!row.dealing_high && !row.irl_high && !row.erl_price) return null;
    return {
      range: { dealingHigh: row.dealing_high, dealingLow: row.dealing_low, dealingCe: row.dealing_ce },
      irl: { high: row.irl_high, low: row.irl_low, ce: row.irl_ce },
      erl: { price: row.erl_price },
      aligned: row.irl_erl_aligned,
    };
  }, [row]);

  const warningReasons = useMemo(() => {
    if (!row) return [];
    return computeWarningReasons({ verdict: enrichedVerdict, alignment, pathDanger: null, blockerBadge: null, extraReasons: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrichedVerdict, alignment]);

  async function handleSaveNotes() {
    setSavingNotes(true); setNotesSaved(false); setError("");
    const { error: updErr } = await supabase.from("amd_setups").update({ notes: notesDraft }).eq("id", id);
    if (updErr) { setError(updErr.message); setSavingNotes(false); return; }
    setRow((prev) => (prev ? { ...prev, notes: notesDraft } : prev));
    setSavingNotes(false); setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  async function handleDelete() {
    const label = isDraft ? "this draft" : "this AMD setup";
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    setDeleting(true);
    const { error: delErr } = await supabase.from("amd_setups").delete().eq("id", id);
    if (delErr) { setError(delErr.message); setDeleting(false); return; }
    router.push("/amd/journal");
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-gray-400">Loading AMD setup...</div>
      </main>
    );
  }

  if (error && !row) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error || "AMD setup not found."}</div>
          <button type="button" onClick={() => router.push("/amd")} className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold">← Back to AMD</button>
        </div>
      </main>
    );
  }

  const typeInfo = amdTypeInfo(row.sequence_type);

  const reactionStyleMap = {
    entry: "bg-green-900/40 border-green-700 text-green-200",
    rb_breakout: "bg-green-900/40 border-green-600 text-green-200",
    rb_discount: "bg-green-900/40 border-green-700 text-green-200",
    rb_premium: "bg-yellow-900/40 border-yellow-700 text-yellow-200",
    rb_wrong_side: "bg-red-900/40 border-red-700 text-red-200",
    tip_test: "bg-purple-900/40 border-purple-700 text-purple-200",
    sweep: "bg-blue-900/40 border-blue-700 text-blue-200",
    retest: "bg-purple-900/40 border-purple-700 text-purple-200",
    contested: "bg-yellow-900/40 border-yellow-700 text-yellow-200",
    filled: "bg-blue-900/40 border-blue-700 text-blue-200",
    held: "bg-yellow-900/40 border-yellow-700 text-yellow-200",
    broke: "bg-red-900/40 border-red-700 text-red-200",
    unclassified: "bg-gray-900/40 border-gray-700 text-gray-300",
  };

  const reactionLabelMap = {
    entry: "🎯 ENTRY", rb_breakout: "🚀 RB BREAKOUT", rb_discount: "🟢 RB DISCOUNT",
    rb_premium: "🟡 RB PREMIUM", rb_wrong_side: "🔴 RB WRONG SIDE",
    tip_test: "🎯 TIP TEST", sweep: "🌊 SWEEP", retest: "🔁 RETEST",
    contested: "⚠️ CONTESTED", filled: "🟩 FILLED", held: "🟡 HELD",
    broke: "🔴 BROKE", unclassified: "⚪ —",
  };

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        {isDraft && (
          <div className="p-4 rounded-lg bg-yellow-950/40 border-2 border-yellow-700 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-bold text-yellow-200">📝 DRAFT — not yet finalized</p>
                <p className="text-xs text-yellow-300/90 mt-0.5">
                  {row.checklist_score ?? 0}/10 gates passed · Last saved {row.updated_at ? new Date(row.updated_at).toLocaleString() : "—"}
                </p>
              </div>
              <button type="button" onClick={() => router.push(`/amd?edit=${row.id}`)}
                className="text-xs px-3 py-2 rounded-lg bg-yellow-700 hover:bg-yellow-600 text-white font-bold">▶ Continue editing</button>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">{typeInfo.emoji} {typeInfo.label}</h1>
            <p className="text-gray-400 text-sm">
              {row.pair} · {row.timeframe} · {row.sequence_type === "bullish" ? "Bullish" : "Bearish"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Saved {new Date(row.created_at).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => router.push(`/amd?edit=${row.id}`)}
              className="text-xs px-3 py-2 rounded-lg bg-blue-900/40 text-blue-300 hover:bg-blue-800/40 font-semibold">✏️ Edit</button>
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="text-xs px-3 py-2 rounded-lg bg-red-900/40 text-red-300 hover:bg-red-800/40 font-semibold disabled:opacity-50">
              {deleting ? "Deleting..." : "🗑 Delete"}
            </button>
          </div>
        </div>

        {enrichedVerdict?.hasHtfConflict && (
          <div className="p-4 rounded-lg border-2 border-red-700 bg-red-950/40 space-y-2">
            <p className="text-sm font-bold text-red-200">🚨 Counter-Trend Trade</p>
            {enrichedVerdict.htfConflict.map((c, i) => (
              <div key={i}>
                <p className="text-xs font-semibold text-red-200">{c.label}</p>
                <p className="text-xs text-red-300 mt-0.5">{c.detail}</p>
              </div>
            ))}
          </div>
        )}

        {enrichedVerdict?.hasSweepOverride && (
          <div className="p-4 rounded-lg border-2 border-purple-700 bg-purple-950/40 space-y-2">
            <p className="text-sm font-bold text-purple-200">🔄 Sweep Override</p>
            <p className="text-xs text-purple-200">{enrichedVerdict.sweepOverride.label}</p>
            <p className="text-xs text-purple-300 mt-1">{enrichedVerdict.sweepOverride.detail}</p>
          </div>
        )}

        {evaluation && (
          <AmdCard data={evaluation} trade={trade} irlErl={irlErl} warnings={warningReasons} />
        )}

        <div className="p-4 rounded-lg bg-gray-900 border-2 border-blue-800 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-blue-300">📸 Chart Screenshots</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {screenshots.length} image{screenshots.length === 1 ? "" : "s"} attached · Click any to enlarge
            </p>
          </div>
          <ScreenshotGallery screenshots={screenshots}
            onDelete={(deletedId) => setScreenshots((prev) => prev.filter((s) => s.id !== deletedId))} />
          <div className="pt-3 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-400 mb-2">Add more screenshots</p>
            <ScreenshotUploader setupId={row.id} userId={userId} screenshots={screenshots} onChange={setScreenshots} />
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border-2 border-purple-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-purple-200">📓 Journal Notes</h2>
              <p className="text-xs text-gray-500 mt-0.5">Write what happened — observations, outcome, lessons.</p>
            </div>
            {notesSaved && (
              <span className="text-xs px-2 py-1 rounded-full bg-green-900/40 text-green-300 font-semibold">✅ Saved</span>
            )}
          </div>
          <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={6}
            placeholder="How did the trade play out? What did you see? What would you do differently?"
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-purple-500 outline-none resize-none text-sm" />
          <button type="button" onClick={handleSaveNotes} disabled={savingNotes || notesDraft === (row.notes || "")}
            className="w-full py-2 rounded-lg bg-purple-800 hover:bg-purple-700 font-bold text-sm disabled:opacity-50">
            {savingNotes ? "Saving notes..." : "💾 Save Notes"}
          </button>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">Raw Inputs</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-500">D1 Bias</p><p className="font-bold capitalize">{row.d1_bias ?? "—"}</p></div>
            <div><p className="text-xs text-gray-500">D1 / H4 / LTF</p><p className="font-bold">{(row.d1_timeframe ?? "—")} → {(row.h4_timeframe ?? "—")} → {(row.ltf_timeframe ?? "—")}</p></div>
            <div><p className="text-xs text-gray-500">Range High</p><p className="font-bold tabular-nums">{row.range_high !== null ? formatPrice(row.range_high) : "—"}</p></div>
            <div><p className="text-xs text-gray-500">Range Low</p><p className="font-bold tabular-nums">{row.range_low !== null ? formatPrice(row.range_low) : "—"}</p></div>
            <div><p className="text-xs text-gray-500">ATR current</p><p className="font-bold tabular-nums">{row.atr_current ?? "—"}</p></div>
            <div><p className="text-xs text-gray-500">ATR prior</p><p className="font-bold tabular-nums">{row.atr_prior ?? "—"}</p></div>
            <div><p className="text-xs text-gray-500">MSS Reference</p><p className="font-bold tabular-nums">{row.mss_reference !== null ? formatPrice(row.mss_reference) : "—"}</p></div>
            <div><p className="text-xs text-gray-500">MSS Candle High</p><p className="font-bold tabular-nums">{row.mss_candle_high !== null ? formatPrice(row.mss_candle_high) : "—"}</p></div>
            <div><p className="text-xs text-gray-500">MSS Candle Low</p><p className="font-bold tabular-nums">{row.mss_candle_low !== null ? formatPrice(row.mss_candle_low) : "—"}</p></div>
            <div><p className="text-xs text-gray-500">Inducement Level</p><p className="font-bold tabular-nums">{row.inducement_level !== null ? formatPrice(row.inducement_level) : "—"}</p></div>
            <div><p className="text-xs text-gray-500">BSL Level</p><p className="font-bold tabular-nums text-blue-300">{row.bsl_level !== null ? formatPrice(row.bsl_level) : "—"}</p></div>
            <div><p className="text-xs text-gray-500">SSL Level</p><p className="font-bold tabular-nums text-orange-300">{row.ssl_level !== null ? formatPrice(row.ssl_level) : "—"}</p></div>
            <div><p className="text-xs text-gray-500">Draw on Liquidity</p><p className="font-bold uppercase">{row.draw_on_liquidity ?? "—"}</p></div>
            <div><p className="text-xs text-gray-500">Displacement Quality</p><p className="font-bold capitalize">{row.displacement_quality ?? "—"}</p></div>
            <div><p className="text-xs text-gray-500">Next Liquidity Target</p><p className="font-bold tabular-nums">{row.next_liquidity_level !== null ? formatPrice(row.next_liquidity_level) : "—"}</p></div>
            <div><p className="text-xs text-gray-500">Current Close</p><p className="font-bold tabular-nums">{row.current_close !== null ? formatPrice(row.current_close) : "—"}</p></div>
            <div><p className="text-xs text-gray-500">Sweep side</p><p className="font-bold">{row.sweep_side ?? "—"}</p></div>
            <div><p className="text-xs text-gray-500">Pip size</p><p className="font-bold tabular-nums">{row.pip_size ?? "—"}</p></div>
            <div><p className="text-xs text-gray-500">Score</p><p className="font-bold tabular-nums">{row.checklist_score ?? "—"}/10</p></div>
          </div>
        </div>

        {verdictCloses.length > 0 && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <h2 className="text-sm font-semibold text-blue-400">Verdict Closes ({verdictCloses.length})</h2>
            <div className="space-y-2">
              {verdictCloses.map((vc, i) => {
                const ranked = evaluation?.verdictCloses?.ranked?.[i];
                const isFinal = ranked?.isFinal;
                const reactionType = ranked?.reactionType || "unclassified";
                return (
                  <div key={vc.id || i} className={`p-2 rounded border ${isFinal ? "bg-green-950/20 border-green-700 ring-1 ring-green-700" : "bg-black border-gray-800"}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400">Close #{vc.sequenceNumber ?? i + 1}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border font-bold ${reactionStyleMap[reactionType] || reactionStyleMap.unclassified}`}>
                        {reactionLabelMap[reactionType] || reactionLabelMap.unclassified}
                      </span>
                      {isFinal && <span className="text-xs text-green-300 font-bold">🎯 FINAL</span>}
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-1 text-xs">
                      <div><span className="text-gray-500">O </span><span className="tabular-nums">{vc.candle?.open ?? "—"}</span></div>
                      <div><span className="text-gray-500">H </span><span className="tabular-nums">{vc.candle?.high ?? "—"}</span></div>
                      <div><span className="text-gray-500">L </span><span className="tabular-nums">{vc.candle?.low ?? "—"}</span></div>
                      <div><span className="text-gray-500">C </span><span className="tabular-nums">{vc.candle?.close ?? "—"}</span></div>
                    </div>
                    {ranked?.detail && <p className="text-xs text-gray-500 mt-1 italic">{ranked.detail}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {fvgs.length > 0 && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <h2 className="text-sm font-semibold text-blue-400">Fair Value Gaps ({fvgs.length})</h2>
            <div className="space-y-2">
              {fvgs.map((f, i) => {
                const active = evaluation?.activeFvg;
                const isActive = active && parseFloat(f.high) === active.high && parseFloat(f.low) === active.low;
                return (
                  <div key={f.id || i} className={`p-2 rounded border flex items-center justify-between gap-2 text-xs ${isActive ? "bg-blue-950/20 border-blue-700" : "bg-black border-gray-800"}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-300">FVG {i + 1}</span>
                      <span className="tabular-nums">{formatPrice(f.low)} – {formatPrice(f.high)}</span>
                      <span className="text-gray-500">CE {formatPrice((parseFloat(f.high) + parseFloat(f.low)) / 2)}</span>
                    </div>
                    {isActive && <span className="text-xs text-blue-300 font-semibold">active</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {orderBlocks.length > 0 && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <h2 className="text-sm font-semibold text-teal-400">Order Blocks ({orderBlocks.length})</h2>
            <div className="space-y-2">
              {orderBlocks.map((o, i) => {
                const active = evaluation?.activeOb;
                const isActive = active && parseFloat(o.high) === active.high && parseFloat(o.low) === active.low;
                return (
                  <div key={o.id || i} className={`p-2 rounded border flex items-center justify-between gap-2 text-xs ${isActive ? "bg-teal-950/20 border-teal-700" : "bg-black border-gray-800"}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-300">OB {i + 1}</span>
                      <span className="tabular-nums">{formatPrice(o.low)} – {formatPrice(o.high)}</span>
                      <span className="text-gray-500">CE {formatPrice((parseFloat(o.high) + parseFloat(o.low)) / 2)}</span>
                    </div>
                    {isActive && <span className="text-xs text-teal-300 font-semibold">active</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">Candles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: "Sweep (Manipulation)", c: row.sweep_candle },
              { label: "Displacement", c: row.displacement_candle },
              { label: "Close (Trigger)", c: row.close_candle },
            ].map(({ label, c }) => (
              <div key={label} className="p-3 rounded-lg bg-black border border-gray-800 space-y-1 text-xs">
                <p className="font-semibold text-gray-400">{label}</p>
                <p>O: <span className="tabular-nums">{c?.open ?? "—"}</span></p>
                <p>H: <span className="tabular-nums">{c?.high ?? "—"}</span></p>
                <p>L: <span className="tabular-nums">{c?.low ?? "—"}</span></p>
                <p>C: <span className="tabular-nums">{c?.close ?? "—"}</span></p>
              </div>
            ))}
          </div>
        </div>

        {rbs.length > 0 && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <h2 className="text-sm font-semibold text-blue-400">Rejection Blocks ({rbs.length})</h2>
            <div className="space-y-2">
              {rbs.map((rb) => (
                <div key={rb.id} className={`p-2 rounded border flex items-center justify-between gap-2 text-xs ${rb.is_active ? "bg-green-950/20 border-green-700" : "bg-black border-gray-800"}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-300">{rb.rank}</span>
                    <span className="tabular-nums">{formatPrice(rb.rb_low)} – {formatPrice(rb.rb_high)}</span>
                    <span className="text-gray-500">CE {formatPrice(rb.rb_ce)}</span>
                  </div>
                  {rb.is_active && <span className="text-xs text-green-400 font-semibold">active</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <button type="button" onClick={() => router.push("/amd/journal")}
          className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold">
          ← Back to AMD Journal
        </button>
      </div>
    </main>
  );
}