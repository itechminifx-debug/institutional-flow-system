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
  const [screenshots, setScreenshots] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const isDraft = row?.status === "draft";

  // ----------------------------------------------------------
  // LOAD
  // ----------------------------------------------------------
  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const { data: setupData, error: setupErr } = await supabase
        .from("amd_setups")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (setupErr || !setupData) {
        setError(setupErr?.message || "AMD setup not found.");
        setLoading(false);
        return;
      }

      const { data: rbData } = await supabase
        .from("amd_rbs")
        .select("*")
        .eq("setup_id", id)
        .order("created_at", { ascending: false });

      const { data: fvgData } = await supabase
        .from("amd_fvgs")
        .select("*")
        .eq("setup_id", id)
        .order("created_at", { ascending: true });

      const { data: shotsData } = await supabase
        .from("amd_screenshots")
        .select("*")
        .eq("setup_id", id)
        .order("created_at", { ascending: true });

      // Load FVGs — with legacy auto-migration
      let fvgList = [];
      if (fvgData && fvgData.length > 0) {
        fvgList = fvgData.map((f, idx) => ({
          id: Math.random().toString(36).slice(2),
          high: f.fvg_high?.toString() || "",
          low: f.fvg_low?.toString() || "",
          addedAt:
            f.created_at ||
            new Date(Date.now() - idx * 1000).toISOString(),
        }));
      } else if (setupData.fvg_high || setupData.fvg_low) {
        fvgList = [
          {
            id: Math.random().toString(36).slice(2),
            high: setupData.fvg_high?.toString() || "",
            low: setupData.fvg_low?.toString() || "",
            addedAt: setupData.created_at || new Date().toISOString(),
          },
        ];
      }

      setRow(setupData);
      setRbs(rbData || []);
      setFvgs(fvgList);
      setScreenshots(shotsData || []);
      setNotesDraft(setupData.notes || "");
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ----------------------------------------------------------
  // RE-EVALUATE
  // ----------------------------------------------------------
  const evaluation = useMemo(() => {
    if (!row) return null;
    const activeRb = rbs.find((rb) => rb.is_active) || rbs[0] || null;
    const rbHigh = activeRb?.rb_high ?? row.active_rb_high ?? null;
    const rbLow = activeRb?.rb_low ?? row.active_rb_low ?? null;

    return evaluateAmd({
      sequenceType: row.sequence_type,
      rangeHigh: row.range_high,
      rangeLow: row.range_low,
      atrCurrent: row.atr_current,
      atrPrior: row.atr_prior,
      sweepCandle: row.sweep_candle,
      currentClose: row.current_close,
      mssReference: row.mss_reference,
      fvgs: fvgs.map((f) => ({
        id: f.id,
        high: f.high,
        low: f.low,
        addedAt: f.addedAt,
      })),
      rbHigh,
      rbLow,
      closeCandle: row.close_candle,
      nextLiquidityLevel: row.next_liquidity_level,
      pipSize: row.pip_size || 1,
      manualMindset: row.checklist_answers?.mindset === true,
      accountSize: 0,
      riskPercent: 0,
      ema50Price: row.ema50_price,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, rbs, fvgs]);

  // ----------------------------------------------------------
  // ENRICHED VERDICT
  // ----------------------------------------------------------
  const enrichedVerdict = useMemo(() => {
    if (!row) return null;
    if (!evaluation?.baseNegotiation) return null;
    const base = {
      verdict: evaluation.baseNegotiation.verdict,
      strength: evaluation.baseNegotiation.strength || "normal",
      reason: evaluation.baseNegotiation.reason || "",
    };
    const ema = computeEmaDirection({
      emaPrice: row.ema50_price,
      closePrice: row.current_close,
    });
    return enrichVerdict({
      verdict: base,
      ema,
      htfBiasInput: row.htf_bias_override || "auto",
      sweepDirection: row.sweep_direction || "none",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, evaluation]);

  const alignment = enrichedVerdict?.emaAlignment;

  // ----------------------------------------------------------
  // TRADE
  // ----------------------------------------------------------
  const trade = useMemo(() => {
    if (!row?.entry || !row?.sl || !row?.tp) return null;
    return {
      direction: row.verdict,
      entry: row.entry,
      sl: row.sl,
      tp: row.tp,
      rr: row.rr,
      pipSize: row.pip_size,
      slPips: row.sl_pips,
      tpPips: row.tp_pips,
      lotSize: row.lot_size,
      riskAmount: row.risk_amount,
    };
  }, [row]);

  // ----------------------------------------------------------
  // IRL / ERL
  // ----------------------------------------------------------
  const irlErl = useMemo(() => {
    if (!row) return null;
    if (!row.dealing_high && !row.irl_high && !row.erl_price) return null;
    return {
      range: {
        dealingHigh: row.dealing_high,
        dealingLow: row.dealing_low,
        dealingCe: row.dealing_ce,
      },
      irl: { high: row.irl_high, low: row.irl_low, ce: row.irl_ce },
      erl: { price: row.erl_price },
      aligned: row.irl_erl_aligned,
    };
  }, [row]);

  // ----------------------------------------------------------
  // WARNINGS
  // ----------------------------------------------------------
  const warningReasons = useMemo(() => {
    if (!row) return [];
    return computeWarningReasons({
      verdict: enrichedVerdict,
      alignment,
      pathDanger: null,
      blockerBadge: null,
      extraReasons: [],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrichedVerdict, alignment]);

  // ----------------------------------------------------------
  // SAVE NOTES
  // ----------------------------------------------------------
  async function handleSaveNotes() {
    setSavingNotes(true);
    setNotesSaved(false);
    setError("");
    const { error: updErr } = await supabase
      .from("amd_setups")
      .update({ notes: notesDraft })
      .eq("id", id);
    if (updErr) {
      setError(updErr.message);
      setSavingNotes(false);
      return;
    }
    setRow((prev) => (prev ? { ...prev, notes: notesDraft } : prev));
    setSavingNotes(false);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  // ----------------------------------------------------------
  // DELETE
  // ----------------------------------------------------------
  async function handleDelete() {
    const label = isDraft ? "this draft" : "this AMD setup";
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    setDeleting(true);
    const { error: delErr } = await supabase
      .from("amd_setups")
      .delete()
      .eq("id", id);
    if (delErr) {
      setError(delErr.message);
      setDeleting(false);
      return;
    }
    router.push("/amd/journal");
  }

  // ----------------------------------------------------------
  // LOADING / ERROR
  // ----------------------------------------------------------
  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-gray-400">
          Loading AMD setup...
        </div>
      </main>
    );
  }

  if (error && !row) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error || "AMD setup not found."}
          </div>
          <button
            type="button"
            onClick={() => router.push("/amd")}
            className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold"
          >
            ← Back to AMD
          </button>
        </div>
      </main>
    );
  }

  const typeInfo = amdTypeInfo(row.sequence_type);

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* DRAFT BANNER */}
        {isDraft && (
          <div className="p-4 rounded-lg bg-yellow-950/40 border-2 border-yellow-700 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-bold text-yellow-200">
                  📝 DRAFT — not yet finalized
                </p>
                <p className="text-xs text-yellow-300/90 mt-0.5">
                  {row.checklist_score ?? 0}/10 gates passed · Last saved{" "}
                  {row.updated_at
                    ? new Date(row.updated_at).toLocaleString()
                    : "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/amd?edit=${row.id}`)}
                className="text-xs px-3 py-2 rounded-lg bg-yellow-700 hover:bg-yellow-600 text-white font-bold"
              >
                ▶ Continue editing
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              {typeInfo.emoji} {typeInfo.label}
            </h1>
            <p className="text-gray-400 text-sm">
              {row.pair} · {row.timeframe} ·{" "}
              {row.sequence_type === "bullish" ? "Bullish" : "Bearish"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Saved {new Date(row.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => router.push(`/amd?edit=${row.id}`)}
              className="text-xs px-3 py-2 rounded-lg bg-blue-900/40 text-blue-300 hover:bg-blue-800/40 font-semibold"
            >
              ✏️ Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs px-3 py-2 rounded-lg bg-red-900/40 text-red-300 hover:bg-red-800/40 font-semibold disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "🗑 Delete"}
            </button>
          </div>
        </div>

        {/* HTF / Sweep banners */}
        {enrichedVerdict?.hasHtfConflict && (
          <div className="p-4 rounded-lg border-2 border-red-700 bg-red-950/40 space-y-2">
            <p className="text-sm font-bold text-red-200">
              🚨 Counter-Trend Trade
            </p>
            {enrichedVerdict.htfConflict.map((c, i) => (
              <div key={i}>
                <p className="text-xs font-semibold text-red-200">
                  {c.label}
                </p>
                <p className="text-xs text-red-300 mt-0.5">{c.detail}</p>
              </div>
            ))}
          </div>
        )}

        {enrichedVerdict?.hasSweepOverride && (
          <div className="p-4 rounded-lg border-2 border-purple-700 bg-purple-950/40 space-y-2">
            <p className="text-sm font-bold text-purple-200">
              🔄 Sweep Override
            </p>
            <p className="text-xs text-purple-200">
              {enrichedVerdict.sweepOverride.label}
            </p>
            <p className="text-xs text-purple-300 mt-1">
              {enrichedVerdict.sweepOverride.detail}
            </p>
          </div>
        )}

        {/* CARD */}
        {evaluation && (
          <AmdCard
            data={evaluation}
            trade={trade}
            irlErl={irlErl}
            warnings={warningReasons}
          />
        )}

        {/* 📸 SCREENSHOTS */}
        <div className="p-4 rounded-lg bg-gray-900 border-2 border-blue-800 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-blue-300">
              📸 Chart Screenshots
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {screenshots.length} image{screenshots.length === 1 ? "" : "s"}{" "}
              attached · Click any to enlarge
            </p>
          </div>

          <ScreenshotGallery
            screenshots={screenshots}
            onDelete={(deletedId) =>
              setScreenshots((prev) =>
                prev.filter((s) => s.id !== deletedId)
              )
            }
          />

          <div className="pt-3 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-400 mb-2">
              Add more screenshots
            </p>
            <ScreenshotUploader
              setupId={row.id}
              userId={userId}
              screenshots={screenshots}
              onChange={setScreenshots}
            />
          </div>
        </div>

        {/* JOURNAL NOTES */}
        <div className="p-4 rounded-lg bg-gray-900 border-2 border-purple-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-purple-200">
                📓 Journal Notes
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Write what happened — observations, outcome, lessons.
              </p>
            </div>
            {notesSaved && (
              <span className="text-xs px-2 py-1 rounded-full bg-green-900/40 text-green-300 font-semibold">
                ✅ Saved
              </span>
            )}
          </div>

          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={6}
            placeholder="How did the trade play out? What did you see? What would you do differently?"
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-purple-500 outline-none resize-none text-sm"
          />

          <button
            type="button"
            onClick={handleSaveNotes}
            disabled={savingNotes || notesDraft === (row.notes || "")}
            className="w-full py-2 rounded-lg bg-purple-800 hover:bg-purple-700 font-bold text-sm disabled:opacity-50"
          >
            {savingNotes ? "Saving notes..." : "💾 Save Notes"}
          </button>
        </div>

        {/* Raw inputs */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            Raw Inputs
          </h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Range High</p>
              <p className="font-bold tabular-nums">
                {row.range_high !== null ? formatPrice(row.range_high) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Range Low</p>
              <p className="font-bold tabular-nums">
                {row.range_low !== null ? formatPrice(row.range_low) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">ATR current</p>
              <p className="font-bold tabular-nums">
                {row.atr_current ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">ATR prior</p>
              <p className="font-bold tabular-nums">
                {row.atr_prior ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">MSS Reference</p>
              <p className="font-bold tabular-nums">
                {row.mss_reference !== null
                  ? formatPrice(row.mss_reference)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Next Liquidity Target</p>
              <p className="font-bold tabular-nums">
                {row.next_liquidity_level !== null
                  ? formatPrice(row.next_liquidity_level)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Current Close</p>
              <p className="font-bold tabular-nums">
                {row.current_close !== null
                  ? formatPrice(row.current_close)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Sweep side</p>
              <p className="font-bold">{row.sweep_side ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Pip size</p>
              <p className="font-bold tabular-nums">{row.pip_size ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Score</p>
              <p className="font-bold tabular-nums">
                {row.checklist_score ?? "—"}/10
              </p>
            </div>
          </div>
        </div>

        {/* FVGs */}
        {fvgs.length > 0 && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <h2 className="text-sm font-semibold text-blue-400">
              Fair Value Gaps ({fvgs.length})
            </h2>
            <div className="space-y-2">
              {fvgs.map((f, i) => {
                const active = evaluation?.activeFvg;
                const isActive =
                  active &&
                  parseFloat(f.high) === active.high &&
                  parseFloat(f.low) === active.low;
                return (
                  <div
                    key={f.id || i}
                    className={`p-2 rounded border flex items-center justify-between gap-2 text-xs ${
                      isActive
                        ? "bg-blue-950/20 border-blue-700"
                        : "bg-black border-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-300">
                        FVG {i + 1}
                      </span>
                      <span className="tabular-nums">
                        {formatPrice(f.low)} – {formatPrice(f.high)}
                      </span>
                      <span className="text-gray-500">
                        CE{" "}
                        {formatPrice(
                          (parseFloat(f.high) + parseFloat(f.low)) / 2
                        )}
                      </span>
                    </div>
                    {isActive && (
                      <span className="text-xs text-blue-300 font-semibold">
                        active
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Candles */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">Candles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: "Sweep (Manipulation)", c: row.sweep_candle },
              { label: "Close (Trigger)", c: row.close_candle },
            ].map(({ label, c }) => (
              <div
                key={label}
                className="p-3 rounded-lg bg-black border border-gray-800 space-y-1 text-xs"
              >
                <p className="font-semibold text-gray-400">{label}</p>
                <p>
                  O: <span className="tabular-nums">{c?.open ?? "—"}</span>
                </p>
                <p>
                  H: <span className="tabular-nums">{c?.high ?? "—"}</span>
                </p>
                <p>
                  L: <span className="tabular-nums">{c?.low ?? "—"}</span>
                </p>
                <p>
                  C: <span className="tabular-nums">{c?.close ?? "—"}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* RBs */}
        {rbs.length > 0 && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <h2 className="text-sm font-semibold text-blue-400">
              Rejection Blocks ({rbs.length})
            </h2>
            <div className="space-y-2">
              {rbs.map((rb) => (
                <div
                  key={rb.id}
                  className={`p-2 rounded border flex items-center justify-between gap-2 text-xs ${
                    rb.is_active
                      ? "bg-green-950/20 border-green-700"
                      : "bg-black border-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-300">
                      {rb.rank}
                    </span>
                    <span className="tabular-nums">
                      {formatPrice(rb.rb_low)} – {formatPrice(rb.rb_high)}
                    </span>
                    <span className="text-gray-500">
                      CE {formatPrice(rb.rb_ce)}
                    </span>
                  </div>
                  {rb.is_active && (
                    <span className="text-xs text-green-400 font-semibold">
                      active
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back */}
        <button
          type="button"
          onClick={() => router.push("/amd/journal")}
          className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold"
        >
          ← Back to AMD Journal
        </button>
      </div>
    </main>
  );
}