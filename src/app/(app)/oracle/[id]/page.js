"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import { evaluateOracle } from "@/lib/oracleEngine";
import { getSetupTableInfo, setupHref, shortDateTime } from "@/lib/decksEngine";
import OracleCard from "@/components/OracleCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

export default function OracleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params?.id;

  const [row, setRow] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [userId, setUserId] = useState(null);
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
      if (user) setUserId(user.id);

      const { data: setupData, error: setupErr } = await supabase
        .from("oracle_readings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
        
      if (setupErr || !setupData) {
        setError(setupErr?.message || "Oracle reading not found.");
        setLoading(false);
        return;
      }

      const { data: shotsData } = await supabase
        .from("oracle_screenshots")
        .select("*")
        .eq("reading_id", id)
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

    // We re-evaluate to get the layer breakdown for the card
    const result = evaluateOracle({
      weeklyBias: row.weekly_bias,
      dailyBias: row.daily_bias,
      dailyRangeHigh: row.daily_range_high,
      dailyRangeLow: row.daily_range_low,
      currentPrice: row.current_price,
      h4Structure: row.h4_structure,
      h4Break: row.h4_break,
      h4Displacement: row.h4_displacement,
      h4Sweep: row.h4_sweep,
      h1FvgHigh: row.h1_fvg_high,
      h1FvgLow: row.h1_fvg_low,
      h1Killzone: row.h1_killzone,
      m15Sweep: row.m15_sweep,
      m15Mss: row.m15_mss,
      m15FvgHigh: row.m15_fvg_high,
      m15FvgLow: row.m15_fvg_low,
      m5Choch: row.m5_choch,
      m5Rejection: row.m5_rejection,
      m1Choch: row.m1_choch,
      m1Rejection: row.m1_rejection,
      entryPrice: row.entry_price,
      stopLoss: row.stop_loss,
      tp1Price: row.tp1_price,
      targetPrice: row.target_price,
    });

    return {
      ...result,
      // Pass entry/stop/target to the card for display
      entryPrice: row.entry_price,
      stopLoss: row.stop_loss,
      tp1Price: row.tp1_price,
      targetPrice: row.target_price,
    };
  }, [row]);

  async function handleSaveNotes() {
    setSavingNotes(true); setNotesSaved(false); setError("");
    const { error: updErr } = await supabase
      .from("oracle_readings")
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
      .from("oracle_readings")
      .update({ trade_result: newResult || null, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updErr) { setError(updErr.message); setSavingResult(false); return; }
    setRow((prev) => (prev ? { ...prev, trade_result: newResult || null } : prev));
    setTradeResult(newResult);
    setSavingResult(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete ${isDraft ? "this draft" : "this Oracle reading"}?`)) return;
    setDeleting(true);
    const { error: delErr } = await supabase.from("oracle_readings").delete().eq("id", id);
    if (delErr) { setError(delErr.message); setDeleting(false); return; }
    router.push("/oracle/journal");
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-gray-400">Loading Oracle reading...</div>
      </main>
    );
  }

  if (error && !row) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>
          <button type="button" onClick={() => router.push("/oracle")} className="w-full py-3 rounded-lg bg-gray-800 font-bold">← Back</button>
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

  const linkedTableInfo = getSetupTableInfo(row.linked_setup_table);
  const setupUrl = setupHref(row.linked_setup_table, row.linked_setup_id);

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-4xl mx-auto space-y-5">
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
                onClick={() => router.push(`/oracle?edit=${row.id}`)}
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
            <h1 className="text-2xl font-bold">🧠 Oracle Reading</h1>
            <p className="text-gray-400 text-sm mt-1">
              {row.pair}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Read on {shortDateTime(row.created_at)}
            </p>
            
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
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
              onClick={() => router.push(`/oracle?edit=${row.id}`)}
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

        {/* Linked Setup */}
        {row.linked_setup_id && linkedTableInfo && setupUrl && (
          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/60 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs font-bold text-amber-200">
                🔗 Generated from {linkedTableInfo.emoji} {linkedTableInfo.label} Setup
              </p>
              <a
                href={setupUrl}
                className="text-xs text-amber-300 hover:text-amber-200 font-semibold"
              >
                Open Setup →
              </a>
            </div>
            <p className="text-xs text-gray-400">{row.linked_setup_label}</p>
          </div>
        )}

        {/* Trade Management */}
        {!isDraft && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <div>
              <p className="text-xs font-bold text-gray-300 mb-2">Trade Result (Did the Oracle predict correctly?)</p>
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
          </div>
        )}

        {/* The Oracle Card */}
        {evaluation && <OracleCard data={evaluation} />}

        {/* Screenshots */}
        <div className="p-4 rounded-lg bg-gray-900 border-2 border-emerald-800 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-emerald-300">📸 Screenshots</h2>
            <p className="text-xs text-gray-500 mt-0.5">{screenshots.length} attached</p>
          </div>
          <ScreenshotGallery
            screenshots={screenshots}
            onDelete={(deletedId) => setScreenshots((prev) => prev.filter((s) => s.id !== deletedId))}
            table="oracle_screenshots"
          />
          <div className="pt-3 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-400 mb-2">Add more</p>
            <ScreenshotUploader
              setupId={row.id}
              userId={userId}
              screenshots={screenshots}
              onChange={setScreenshots}
              table="oracle_screenshots"
              setupIdField="reading_id"
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
          onClick={() => router.push("/oracle/journal")}
          className="w-full py-3 rounded-lg bg-gray-800 font-bold"
        >
          ← Back to Oracle Journal
        </button>
      </div>
    </main>
  );
}