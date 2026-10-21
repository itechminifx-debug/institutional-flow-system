"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import { evaluateFwt } from "@/lib/fwtEngine";
import FwtCard from "@/components/FwtCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

export default function FwtDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params?.id;

  const [row, setRow] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [userId, setUserId] = useState(null);
  const [accountSize, setAccountSize] = useState(0);
  const [riskPercent, setRiskPercent] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [tradeResult, setTradeResult] = useState("");
  const [savingResult, setSavingResult] = useState(false);

  const isDraft = row?.status === "draft";

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
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
      }

      const { data: setupData, error: setupErr } = await supabase
        .from("fwt_setups")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (setupErr || !setupData) {
        setError(setupErr?.message || "FWT setup not found.");
        setLoading(false);
        return;
      }

      const { data: shotsData } = await supabase
        .from("fwt_screenshots")
        .select("*")
        .eq("setup_id", id)
        .order("created_at");

      setRow(setupData);
      setScreenshots(shotsData || []);
      setNotesDraft(setupData.notes || "");
      setTradeResult(setupData.trade_result || "");
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  const evaluation = useMemo(() => {
    if (!row) return null;

    const result = evaluateFwt({
      mode: row.mode || "live",
      dailyBias: row.daily_bias,
      currentPrice: row.current_price,
      candleOpen: row.candle_open,
      candleHigh: row.candle_high,
      candleLow: row.candle_low,
      candleClose: row.candle_close,
      wickDirection: row.wick_direction,
      wickExtreme: row.wick_extreme,
      liquiditySweptType: row.liquidity_swept_type,
      liquiditySweptLevel: row.liquidity_swept_level,
      wickConfirmed: row.wick_confirmed,
      m15ChochConfirmed: row.m15_choch_confirmed,
      m15ChochLevel: row.m15_choch_level,
      m15FvgHigh: row.m15_fvg_high,
      m15FvgLow: row.m15_fvg_low,
      m1ChochConfirmed: row.m1_choch_confirmed,
      m1RejectionPresent: row.m1_rejection_present,
      entryPrice: row.entry_price,
      stopLoss: row.stop_loss,
      targetPrice: row.target_price,
      accountSize,
      riskPercent,
    });

    // Enrich with candle visual data
    return {
      ...result,
      candle: {
        open: row.candle_open,
        high: row.candle_high,
        low: row.candle_low,
        close: row.candle_close,
        currentPrice: row.current_price,
        wickDirection: row.wick_direction,
        wickExtreme: row.wick_extreme,
        entryPrice: row.entry_price,
        stopLoss: row.stop_loss,
        targetPrice: row.target_price,
        dailyBias: row.daily_bias,
      },
    };
  }, [row, accountSize, riskPercent]);

  async function handleSaveNotes() {
    setSavingNotes(true); setNotesSaved(false); setError("");
    const { error: updErr } = await supabase
      .from("fwt_setups")
      .update({ notes: notesDraft, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updErr) { setError(updErr.message); setSavingNotes(false); return; }
    setRow((prev) => (prev ? { ...prev, notes: notesDraft } : prev));
    setSavingNotes(false); setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  async function handleSaveResult(newResult) {
    setSavingResult(true); setError("");
    const { error: updErr } = await supabase
      .from("fwt_setups")
      .update({ trade_result: newResult || null, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updErr) { setError(updErr.message); setSavingResult(false); return; }
    setRow((prev) => (prev ? { ...prev, trade_result: newResult || null } : prev));
    setTradeResult(newResult);
    setSavingResult(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete ${isDraft ? "this draft" : "this FWT setup"}?`)) return;
    setDeleting(true);
    const { error: delErr } = await supabase.from("fwt_setups").delete().eq("id", id);
    if (delErr) { setError(delErr.message); setDeleting(false); return; }
    router.push("/fwt/journal");
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-gray-400">Loading FWT setup...</div>
      </main>
    );
  }

  if (error && !row) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>
          <button type="button" onClick={() => router.push("/fwt")} className="w-full py-3 rounded-lg bg-gray-800 font-bold">← Back</button>
        </div>
      </main>
    );
  }

  // Trade result badge config
  const resultBadges = {
    active: { label: "🎯 Active", cls: "bg-blue-900/40 border-blue-700 text-blue-200" },
    won:    { label: "✅ Won",    cls: "bg-green-900/40 border-green-700 text-green-200" },
    lost:   { label: "🔴 Lost",   cls: "bg-red-900/40 border-red-700 text-red-200" },
  };
  const currentResultBadge = tradeResult ? resultBadges[tradeResult] : null;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        {isDraft && (
          <div className="p-4 rounded-lg bg-yellow-950/40 border-2 border-yellow-700 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-bold text-yellow-200">📝 DRAFT</p>
                <p className="text-xs text-yellow-300/90 mt-0.5">
                  Last saved {row.updated_at ? new Date(row.updated_at).toLocaleString() : "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/fwt?edit=${row.id}`)}
                className="text-xs px-3 py-2 rounded-lg bg-yellow-700 font-bold"
              >
                ▶ Continue editing
              </button>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">🕯️ FWT Setup</h1>
            <p className="text-gray-400 text-sm">
              {row.pair} · {row.session || "—"} ·{" "}
              <span className={row.mode === "live" ? "text-cyan-400" : "text-purple-400"}>
                {row.mode === "live" ? "LIVE" : "CLOSED"}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Saved {new Date(row.created_at).toLocaleString()}
            </p>
            {currentResultBadge && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${currentResultBadge.cls}`}>
                  {currentResultBadge.label}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => router.push(`/fwt?edit=${row.id}`)}
              className="text-xs px-3 py-2 rounded-lg bg-blue-900/40 text-blue-300 font-semibold"
            >
              ✏️ Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs px-3 py-2 rounded-lg bg-red-900/40 text-red-300 font-semibold disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "🗑 Delete"}
            </button>
          </div>
        </div>

        {/* Trade Result selector (only for completed setups) */}
        {!isDraft && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
            <p className="text-xs font-bold text-gray-300">Trade Result</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: "", label: "— None", cls: "bg-black border-gray-800 text-gray-400" },
                { key: "active", label: "🎯 Active", cls: "bg-blue-900/40 border-blue-700 text-blue-200" },
                { key: "won", label: "✅ Won", cls: "bg-green-900/40 border-green-700 text-green-200" },
                { key: "lost", label: "🔴 Lost", cls: "bg-red-900/40 border-red-700 text-red-200" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleSaveResult(opt.key)}
                  disabled={savingResult || tradeResult === opt.key}
                  className={`px-2 py-2 rounded-lg border text-xs font-bold transition disabled:opacity-50 ${opt.cls} ${
                    tradeResult === opt.key ? "ring-2 ring-white" : ""
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Card */}
        {evaluation && <FwtCard data={evaluation} />}

        {/* Screenshots */}
        <div className="p-4 rounded-lg bg-gray-900 border-2 border-emerald-800 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-emerald-300">📸 Screenshots</h2>
            <p className="text-xs text-gray-500 mt-0.5">{screenshots.length} attached</p>
          </div>
          <ScreenshotGallery
            screenshots={screenshots}
            onDelete={(deletedId) => setScreenshots((prev) => prev.filter((s) => s.id !== deletedId))}
          />
          <div className="pt-3 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-400 mb-2">Add more</p>
            <ScreenshotUploader
              setupId={row.id}
              userId={userId}
              screenshots={screenshots}
              onChange={setScreenshots}
              table="fwt_screenshots"
            />
          </div>
        </div>

        {/* Journal Notes */}
        <div className="p-4 rounded-lg bg-gray-900 border-2 border-purple-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-purple-200">📓 Journal Notes</h2>
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
            placeholder="Observations, outcome, lessons..."
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 resize-none text-sm"
          />
          <button
            type="button"
            onClick={handleSaveNotes}
            disabled={savingNotes || notesDraft === (row.notes || "")}
            className="w-full py-2 rounded-lg bg-purple-800 font-bold text-sm disabled:opacity-50"
          >
            {savingNotes ? "Saving..." : "💾 Save Notes"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.push("/fwt/journal")}
          className="w-full py-3 rounded-lg bg-gray-800 font-bold"
        >
          ← Back to FWT Journal
        </button>
      </div>
    </main>
  );
}