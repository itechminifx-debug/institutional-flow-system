// app/apx/[id]/page.jsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { evaluateApx } from "@/lib/apxEngine";
import ApxCard from "@/components/ApxCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

export default function ApxDetailPage() {
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
  const [rDraft, setRDraft] = useState("");
  const [savingResult, setSavingResult] = useState(false);

  const isDraft = row?.status === "draft";

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const { data, error: err } = await supabase.from("apx_setups").select("*").eq("id", id).maybeSingle();
      if (err || !data) { setError(err?.message || "APX setup not found."); setLoading(false); return; }

      const { data: shots } = await supabase.from("apx_screenshots").select("*").eq("setup_id", id).order("created_at");

      setRow(data);
      setScreenshots(shots || []);
      setNotesDraft(data.notes || "");
      setTradeResult(data.trade_result || "");
      setRDraft(typeof data.r_result === "number" ? String(data.r_result) : "");
      setLoading(false);
    })();
  }, [id, supabase]);

  const evaluation = useMemo(() => (row ? evaluateApx(row) : null), [row]);

  async function handleSaveNotes() {
    setSavingNotes(true); setNotesSaved(false); setError("");
    const { error: err } = await supabase.from("apx_setups").update({ notes: notesDraft, updated_at: new Date().toISOString() }).eq("id", id);
    if (err) { setError(err.message); setSavingNotes(false); return; }
    setRow((p) => (p ? { ...p, notes: notesDraft } : p));
    setSavingNotes(false); setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  async function handleResult(newResult) {
    setSavingResult(true); setError("");
    const rNum = parseFloat(rDraft);
    const rVal = (newResult === "won" || newResult === "lost") && !isNaN(rNum) ? rNum : null;
    const { error: err } = await supabase
      .from("apx_setups")
      .update({ trade_result: newResult || null, r_result: rVal, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (err) { setError(err.message); setSavingResult(false); return; }
    setRow((p) => (p ? { ...p, trade_result: newResult || null, r_result: rVal } : p));
    setTradeResult(newResult);
    setSavingResult(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete ${isDraft ? "this draft" : "this APX setup"}?`)) return;
    setDeleting(true);
    const { error: err } = await supabase.from("apx_setups").delete().eq("id", id);
    if (err) { setError(err.message); setDeleting(false); return; }
    router.push("/apx/journal");
  }

  if (loading) return <main className="min-h-screen p-6 bg-black text-white"><p className="text-gray-400 text-sm">Loading APX setup…</p></main>;
  if (error && !row) return (
    <main className="min-h-screen p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>
        <button onClick={() => router.push("/apx")} className="w-full py-3 rounded-lg bg-gray-800 font-bold">← Back</button>
      </div>
    </main>
  );

  const resultBadges = {
    active: { label: "🎯 Active", cls: "bg-blue-900/40 border-blue-700 text-blue-200" },
    won:    { label: "✅ Won",    cls: "bg-green-900/40 border-green-700 text-green-200" },
    lost:   { label: "🔴 Lost",   cls: "bg-red-900/40 border-red-700 text-red-200" },
  };
  const badge = tradeResult ? resultBadges[tradeResult] : null;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        {isDraft && (
          <div className="p-4 rounded-lg bg-amber-950/40 border-2 border-amber-700 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-bold text-amber-200">📝 DRAFT</p>
                <p className="text-xs text-amber-300/90 mt-0.5">Last saved {row.updated_at ? new Date(row.updated_at).toLocaleString() : "—"}</p>
              </div>
              <button onClick={() => router.push(`/apx/manual?edit=${row.id}`)} className="text-xs px-3 py-2 rounded-lg bg-amber-700 font-bold">
                ▶ Continue editing
              </button>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-amber-400">🎯 APX Setup</h1>
            <p className="text-gray-400 text-sm">{row.pair || "—"} · {row.timeframe_stack || "—"}</p>
            <p className="text-xs text-gray-500 mt-1">Saved {new Date(row.created_at).toLocaleString()}</p>
            {badge && <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full border font-bold ${badge.cls}`}>{badge.label}</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => router.push(`/apx/manual?edit=${row.id}`)} className="text-xs px-3 py-2 rounded-lg bg-blue-900/40 text-blue-300 font-semibold">✏️ Edit</button>
            <button onClick={handleDelete} disabled={deleting} className="text-xs px-3 py-2 rounded-lg bg-red-900/40 text-red-300 font-semibold disabled:opacity-50">{deleting ? "Deleting…" : "🗑 Delete"}</button>
          </div>
        </div>

        {!isDraft && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <p className="text-xs font-bold text-gray-300">Trade Result</p>
            <div className="grid grid-cols-4 gap-2">
              {[{ key: "", label: "— None" }, { key: "active", label: "🎯 Active" }, { key: "won", label: "✅ Won" }, { key: "lost", label: "🔴 Lost" }].map((opt) => (
                <button key={opt.key} onClick={() => handleResult(opt.key)} disabled={savingResult || tradeResult === opt.key}
                  className={`px-2 py-2 rounded-lg border text-xs font-bold disabled:opacity-50 ${tradeResult === opt.key ? "ring-2 ring-amber-400 border-amber-600 bg-amber-900/30" : "border-gray-700 bg-black text-gray-300"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {(tradeResult === "won" || tradeResult === "lost") && (
              <div className="flex items-center gap-2 pt-2">
                <label className="text-xs text-gray-400">R multiple</label>
                <input type="number" step="any" value={rDraft} onChange={(e) => setRDraft(e.target.value)} placeholder="e.g. 2.5" className="w-28 px-2 py-1.5 rounded-lg bg-black border border-gray-700 text-sm" />
              </div>
            )}
          </div>
        )}

        {evaluation && <ApxCard data={evaluation} />}

        <div className="p-4 rounded-lg bg-gray-900 border-2 border-emerald-800 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-emerald-300">📸 Screenshots</h2>
            <p className="text-xs text-gray-500 mt-0.5">{screenshots.length} attached</p>
          </div>
          <ScreenshotGallery screenshots={screenshots} onDelete={(delId) => setScreenshots((p) => p.filter((s) => s.id !== delId))} table="apx_screenshots" />
          <div className="pt-3 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-400 mb-2">Add more</p>
            <ScreenshotUploader setupId={row.id} userId={userId} screenshots={screenshots} onChange={setScreenshots} table="apx_screenshots" />
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border-2 border-purple-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-purple-200">📓 Journal Notes</h2>
            {notesSaved && <span className="text-xs px-2 py-1 rounded-full bg-green-900/40 text-green-300 font-semibold">✅ Saved</span>}
          </div>
          <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={6} placeholder="Observations, outcome, lessons…" className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 resize-none text-sm" />
          <button onClick={handleSaveNotes} disabled={savingNotes || notesDraft === (row.notes || "")} className="w-full py-2 rounded-lg bg-purple-800 font-bold text-sm disabled:opacity-50">
            {savingNotes ? "Saving…" : "💾 Save Notes"}
          </button>
        </div>

        <button onClick={() => router.push("/apx/journal")} className="w-full py-3 rounded-lg bg-gray-800 font-bold">← Back to APX Journal</button>
      </div>
    </main>
  );
}