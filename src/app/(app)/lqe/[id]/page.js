"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import { evaluateLqe } from "@/lib/lqeEngine";
import LqeCard from "@/components/LqeCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

export default function LqeDetailPage() {
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

  const isDraft = row?.status === "draft";

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: prof } = await supabase.from("profiles").select("account_size, risk_percent").eq("id", user.id).single();
        if (prof) {
          setAccountSize(prof.account_size || 0);
          setRiskPercent(prof.risk_percent || 1);
        }
      }

      const { data: setupData, error: setupErr } = await supabase.from("lqe_setups").select("*").eq("id", id).maybeSingle();
      if (setupErr || !setupData) {
        setError(setupErr?.message || "LQE setup not found.");
        setLoading(false);
        return;
      }

      const { data: shotsData } = await supabase.from("lqe_screenshots").select("*").eq("setup_id", id).order("created_at");

      setRow(setupData);
      setScreenshots(shotsData || []);
      setNotesDraft(setupData.notes || "");
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  const evaluation = useMemo(() => {
    if (!row) return null;
    return evaluateLqe({
      dailyBias: row.daily_bias,
      session: row.session,
      dealingRangeHigh: row.dealing_range_high,
      dealingRangeLow: row.dealing_range_low,
      currentPrice: row.current_price,
      sweepType: row.sweep_type,
      sweepLevel: row.sweep_level,
      sweepConfirmed: row.sweep_confirmed,
      smtDivergence: row.smt_divergence,
      mssConfirmed: row.mss_confirmed,
      chochConfirmed: row.choch_confirmed,
      displacementPresent: row.displacement_present,
      pdArrayType: row.pd_array_type,
      pdArrayHigh: row.pd_array_high,
      pdArrayLow: row.pd_array_low,
      isRejectionBlock: row.is_rejection_block,
      targetPrice: row.target_price,
      targetLiquidityType: row.target_liquidity_type,
      mitigationStatus: row.mitigation_status || "unmitigated",
      parentArrayHigh: row.parent_array_high,
      parentArrayLow: row.parent_array_low,
      parentArrayTimeframe: row.parent_array_timeframe,
      targetClass: row.target_class || "external",
      accountSize,
      riskPercent,
    });
  }, [row, accountSize, riskPercent]);

  async function handleSaveNotes() {
    setSavingNotes(true); setNotesSaved(false); setError("");
    const { error: updErr } = await supabase.from("lqe_setups").update({ notes: notesDraft }).eq("id", id);
    if (updErr) { setError(updErr.message); setSavingNotes(false); return; }
    setRow((prev) => (prev ? { ...prev, notes: notesDraft } : prev));
    setSavingNotes(false); setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  async function handleDelete() {
    if (!confirm(`Delete ${isDraft ? "this draft" : "this LQE setup"}?`)) return;
    setDeleting(true);
    const { error: delErr } = await supabase.from("lqe_setups").delete().eq("id", id);
    if (delErr) { setError(delErr.message); setDeleting(false); return; }
    router.push("/lqe/journal");
  }

  if (loading) return <main className="min-h-screen p-6 bg-black text-white"><div className="max-w-3xl mx-auto text-gray-400">Loading LQE setup...</div></main>;
  if (error && !row) return (
    <main className="min-h-screen p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>
        <button type="button" onClick={() => router.push("/lqe")} className="w-full py-3 rounded-lg bg-gray-800 font-bold">← Back</button>
      </div>
    </main>
  );

  // PATCH: Adaptive Badges
  const badges = [];
  if (row.mitigation_status === "mitigated_rejected") {
    badges.push({ key: "mitigated", label: "🔗 Mitigated + Rejected", cls: "bg-orange-900/40 border-orange-700 text-orange-200" });
  } else if (row.mitigation_status === "mitigated_failed") {
    badges.push({ key: "failed", label: "❌ Mitigation Failed", cls: "bg-red-900/40 border-red-700 text-red-200" });
  } else if (row.mitigation_status === "mitigating") {
    badges.push({ key: "mitigating", label: "⏳ Mitigating", cls: "bg-yellow-900/40 border-yellow-700 text-yellow-200" });
  }
  
  if (row.target_class === "external") {
    badges.push({ key: "erl", label: "🎯 Targeting ERL", cls: "bg-green-900/40 border-green-700 text-green-200" });
  } else {
    badges.push({ key: "irl", label: "⚠️ Targeting IRL (Trap)", cls: "bg-red-900/40 border-red-700 text-red-200" });
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        {isDraft && (
          <div className="p-4 rounded-lg bg-yellow-950/40 border-2 border-yellow-700 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-bold text-yellow-200">📝 DRAFT</p>
                <p className="text-xs text-yellow-300/90 mt-0.5">Last saved {row.updated_at ? new Date(row.updated_at).toLocaleString() : "—"}</p>
              </div>
              <button type="button" onClick={() => router.push(`/lqe?edit=${row.id}`)} className="text-xs px-3 py-2 rounded-lg bg-yellow-700 font-bold">▶ Continue editing</button>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">⚙️ LQE Setup</h1>
            <p className="text-gray-400 text-sm">{row.pair} · {row.timeframe} · {row.session || "—"}</p>
            <p className="text-xs text-gray-500 mt-1">Saved {new Date(row.created_at).toLocaleString()}</p>
            {badges.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {badges.map((b) => (
                  <span key={b.key} className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${b.cls}`}>
                    {b.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => router.push(`/lqe?edit=${row.id}`)} className="text-xs px-3 py-2 rounded-lg bg-blue-900/40 text-blue-300 font-semibold">✏️ Edit</button>
            <button type="button" onClick={handleDelete} disabled={deleting} className="text-xs px-3 py-2 rounded-lg bg-red-900/40 text-red-300 font-semibold disabled:opacity-50">{deleting ? "Deleting..." : "🗑 Delete"}</button>
          </div>
        </div>

        {evaluation && <LqeCard data={evaluation} />}

        <div className="p-4 rounded-lg bg-gray-900 border-2 border-emerald-800 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-emerald-300">📸 Screenshots</h2>
            <p className="text-xs text-gray-500 mt-0.5">{screenshots.length} attached</p>
          </div>
          <ScreenshotGallery screenshots={screenshots} onDelete={(deletedId) => setScreenshots((prev) => prev.filter((s) => s.id !== deletedId))} />
          <div className="pt-3 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-400 mb-2">Add more</p>
            <ScreenshotUploader setupId={row.id} userId={userId} screenshots={screenshots} onChange={setScreenshots} table="lqe_screenshots" />
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border-2 border-purple-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-purple-200">📓 Journal Notes</h2>
            {notesSaved && <span className="text-xs px-2 py-1 rounded-full bg-green-900/40 text-green-300 font-semibold">✅ Saved</span>}
          </div>
          <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={6} placeholder="Observations, outcome, lessons..." className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 resize-none text-sm" />
          <button type="button" onClick={handleSaveNotes} disabled={savingNotes || notesDraft === (row.notes || "")} className="w-full py-2 rounded-lg bg-purple-800 font-bold text-sm disabled:opacity-50">{savingNotes ? "Saving..." : "💾 Save Notes"}</button>
        </div>

        <button type="button" onClick={() => router.push("/lqe/journal")} className="w-full py-3 rounded-lg bg-gray-800 font-bold">← Back to LQE Journal</button>
      </div>
    </main>
  );
}