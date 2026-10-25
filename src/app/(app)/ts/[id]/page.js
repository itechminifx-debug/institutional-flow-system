"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import { evaluateTs } from "@/lib/tsEngine";
import TsCard from "@/components/TsCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

export default function TsDetailPage() {
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
  const [tp1Taken, setTp1Taken] = useState(false);
  const [savingTp1, setSavingTp1] = useState(false);

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
        .from("ts_setups")
        .select("*")
        .eq("id", id)
        .maybeSingle();
        
      if (setupErr || !setupData) {
        setError(setupErr?.message || "TS setup not found.");
        setLoading(false);
        return;
      }

      const { data: shotsData } = await supabase
        .from("ts_screenshots")
        .select("*")
        .eq("setup_id", id)
        .order("created_at");

      setRow(setupData);
      setScreenshots(shotsData || []);
      setNotesDraft(setupData.notes || "");
      setTradeResult(setupData.trade_result || "");
      setTp1Taken(setupData.tp1_taken || false);
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  const evaluation = useMemo(() => {
    if (!row) return null;

    const result = evaluateTs({
      d1Bias: row.d1_bias,
      h1High: row.h1_high,
      h1Low: row.h1_low,
      currentPrice: row.current_price,
      sweepDirection: row.sweep_direction,
      sweepLevel: row.sweep_level,
      mssConfirmed: row.mss_confirmed,
      fvgPresent: row.fvg_present,
      fvgHigh: row.fvg_high,
      fvgLow: row.fvg_low,
      m1TriggerType: row.m1_trigger_type,
      entryPrice: row.entry_price,
      accountSize,
      riskPercent,
    });

    // Enrich with raw row values so the container visual draws correctly
    return {
      ...result,
      d1Bias: row.d1_bias,
      h1High: row.h1_high,
      h1Low: row.h1_low,
      currentPrice: row.current_price,
      sweepDirection: row.sweep_direction,
      sweepLevel: row.sweep_level,
      fvgHigh: row.fvg_high,
      fvgLow: row.fvg_low,
      entryPrice: row.entry_price,
    };
  }, [row, accountSize, riskPercent]);

  async function handleSaveNotes() {
    setSavingNotes(true); setNotesSaved(false); setError("");
    const { error: updErr } = await supabase
      .from("ts_setups")
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
      .from("ts_setups")
      .update({ trade_result: newResult || null, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updErr) { setError(updErr.message); setSavingResult(false); return; }
    setRow((prev) => (prev ? { ...prev, trade_result: newResult || null } : prev));
    setTradeResult(newResult);
    setSavingResult(false);
  }

  async function handleToggleTp1() {
    const newVal = !tp1Taken;
    setSavingTp1(true); setError("");
    const { error: updErr } = await supabase
      .from("ts_setups")
      .update({ tp1_taken: newVal, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updErr) { setError(updErr.message); setSavingTp1(false); return; }
    setRow((prev) => (prev ? { ...prev, tp1_taken: newVal } : prev));
    setTp1Taken(newVal);
    setSavingTp1(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete ${isDraft ? "this draft" : "this TS setup"}?`)) return;
    setDeleting(true);
    const { error: delErr } = await supabase.from("ts_setups").delete().eq("id", id);
    if (delErr) { setError(delErr.message); setDeleting(false); return; }
    router.push("/ts/journal");
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-gray-400">Loading TS setup...</div>
      </main>
    );
  }

  if (error && !row) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>
          <button type="button" onClick={() => router.push("/ts")} className="w-full py-3 rounded-lg bg-gray-800 font-bold">← Back</button>
        </div>
      </main>
    );
  }

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
                onClick={() => router.push(`/ts?edit=${row.id}`)}
                className="text-xs px-3 py-2 rounded-lg bg-yellow-700 font-bold"
              >
                ▶ Continue editing
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              ⏱️ Time-Slice Setup
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {row.pair}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Saved {new Date(row.created_at).toLocaleString()}
            </p>
            
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                row.d1_bias === "bearish" ? "bg-red-900/40 border-red-700 text-red-200" : "bg-green-900/40 border-green-700 text-green-200"
              }`}>
                {row.d1_bias?.toUpperCase()} BIAS
              </span>
              {currentResultBadge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${currentResultBadge.cls}`}>
                  {currentResultBadge.label}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => router.push(`/ts?edit=${row.id}`)}
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

        {/* Trade Management */}
        {!isDraft && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <div>
              <p className="text-xs font-bold text-gray-300 mb-2">Trade Result</p>
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

            {row.tp1_price && (
              <div className="pt-2 border-t border-gray-800">
                <p className="text-xs font-bold text-gray-300 mb-2">TP1 Hit (50% off at CE)</p>
                <button
                  type="button"
                  onClick={handleToggleTp1}
                  disabled={savingTp1}
                  className={`w-full text-left p-3 rounded-lg border transition disabled:opacity-50 ${
                    tp1Taken ? "bg-green-900/40 border-green-700" : "bg-black border-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      tp1Taken ? "bg-green-500 border-green-500" : "border-gray-600"
                    }`}>
                      {tp1Taken && <span className="text-black text-xs font-bold">✓</span>}
                    </div>
                    <p className={`text-sm font-medium ${tp1Taken ? "text-green-200" : "text-white"}`}>
                      {tp1Taken ? `TP1 taken — SL to BE. Now targeting TP2 (${formatPrice(row.tp2_price)})` : "Mark TP1 as taken"}
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* The Container Card */}
        {evaluation && <TsCard data={evaluation} />}

        {/* Screenshots */}
        <div className="p-4 rounded-lg bg-gray-900 border-2 border-emerald-800 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-emerald-300">📸 Screenshots</h2>
            <p className="text-xs text-gray-500 mt-0.5">{screenshots.length} attached</p>
          </div>
          <ScreenshotGallery
            screenshots={screenshots}
            onDelete={(deletedId) => setScreenshots((prev) => prev.filter((s) => s.id !== deletedId))}
            table="ts_screenshots"
          />
          <div className="pt-3 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-400 mb-2">Add more</p>
            <ScreenshotUploader
              setupId={row.id}
              userId={userId}
              screenshots={screenshots}
              onChange={setScreenshots}
              table="ts_screenshots"
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
          onClick={() => router.push("/ts/journal")}
          className="w-full py-3 rounded-lg bg-gray-800 font-bold"
        >
          ← Back to TS Journal
        </button>
      </div>
    </main>
  );
}