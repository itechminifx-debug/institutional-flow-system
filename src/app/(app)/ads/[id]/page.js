"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import { evaluateAds } from "@/lib/adsEngine";
import AdsCard from "@/components/AdsCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";
import LinkedDecksPanel from "@/components/LinkedDecksPanel";

export default function AdsDetailPage() {
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
        .from("ads_setups")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (setupErr || !setupData) {
        setError(setupErr?.message || "ADS setup not found.");
        setLoading(false);
        return;
      }

      const { data: shotsData } = await supabase
        .from("ads_screenshots")
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

    const result = evaluateAds({
      d1Bias: row.d1_bias,
      d1RangeHigh: row.d1_range_high,
      d1RangeLow: row.d1_range_low,
      currentPrice: row.current_price,
      dolLevel: row.dol_level,
      dolType: row.dol_type,
      ema50Value: row.ema50_value,
      session: row.session,
      m30SweepDirection: row.m30_sweep_direction,
      m30SweepLevel: row.m30_sweep_level,
      m30ChochConfirmed: row.m30_choch_confirmed,
      m30ChochLevel: row.m30_choch_level,
      m30FvgHigh: row.m30_fvg_high,
      m30FvgLow: row.m30_fvg_low,
      m1ChochConfirmed: row.m1_choch_confirmed,
      m1RejectionPresent: row.m1_rejection_present,
      m1EntryPrice: row.m1_entry_price,
      stopLoss: row.stop_loss,
      tp1Price: row.tp1_price,
      tp2Price: row.tp2_price,
      accountSize,
      riskPercent,
    });

    // Enrich with raw row values so ThreeTierMap can draw correctly
    return {
      ...result,
      d1Bias: row.d1_bias,
      d1RangeHigh: row.d1_range_high,
      d1RangeLow: row.d1_range_low,
      currentPrice: row.current_price,
      dolLevel: row.dol_level,
      m30SweepLevel: row.m30_sweep_level,
      m30FvgHigh: row.m30_fvg_high,
      m30FvgLow: row.m30_fvg_low,
      m1EntryPrice: row.m1_entry_price,
      stopLoss: row.stop_loss,
      tp1Price: row.tp1_price,
      tp2Price: row.tp2_price,
    };
  }, [row, accountSize, riskPercent]);

  async function handleSaveNotes() {
    setSavingNotes(true); setNotesSaved(false); setError("");
    const { error: updErr } = await supabase
      .from("ads_setups")
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
      .from("ads_setups")
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
      .from("ads_setups")
      .update({ tp1_taken: newVal, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updErr) { setError(updErr.message); setSavingTp1(false); return; }
    setRow((prev) => (prev ? { ...prev, tp1_taken: newVal } : prev));
    setTp1Taken(newVal);
    setSavingTp1(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete ${isDraft ? "this draft" : "this ADS setup"}?`)) return;
    setDeleting(true);
    const { error: delErr } = await supabase.from("ads_setups").delete().eq("id", id);
    if (delErr) { setError(delErr.message); setDeleting(false); return; }
    router.push("/ads/journal");
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-gray-400">Loading ADS setup...</div>
      </main>
    );
  }

  if (error && !row) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>
          <button type="button" onClick={() => router.push("/ads")} className="w-full py-3 rounded-lg bg-gray-800 font-bold">← Back</button>
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
                onClick={() => router.push(`/ads?edit=${row.id}`)}
                className="text-xs px-3 py-2 rounded-lg bg-yellow-700 font-bold"
              >
                ▶ Continue editing
              </button>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">👑 Apex Deep Search</h1>
            <p className="text-gray-400 text-sm">
              {row.pair} · {row.session === "london" ? "London KZ" : row.session === "ny_am" ? "NY AM KZ" : row.session || "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Saved {new Date(row.created_at).toLocaleString()}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {evaluation?.isAplus && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border-2 border-amber-500 bg-amber-900/60 text-amber-100 font-bold">
                  🌟 A+
                </span>
              )}
              {evaluation?.poiZoneWarning && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-yellow-700 bg-yellow-950/40 text-yellow-200 font-bold">
                  ⚠️ Wrong Zone
                </span>
              )}
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
              onClick={() => router.push(`/ads?edit=${row.id}`)}
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
                <p className="text-xs font-bold text-gray-300 mb-2">TP1 (Partial @ {formatPrice(row.tp1_price)})</p>
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
                      {tp1Taken ? "TP1 taken — 50% booked, SL to BE" : "Mark TP1 as taken"}
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Card */}
        {evaluation && <AdsCard data={evaluation} />}

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
              table="ads_screenshots"
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
<LinkedDecksPanel
  setupTable="ads_setups"
  setupId={row.id}
  setupLabel={`${row.pair} — ${row.session || ""}`}
/>
        <button
          type="button"
          onClick={() => router.push("/ads/journal")}
          className="w-full py-3 rounded-lg bg-gray-800 font-bold"
        >
          ← Back to ADS Journal
        </button>
      </div>
    </main>
  );
}