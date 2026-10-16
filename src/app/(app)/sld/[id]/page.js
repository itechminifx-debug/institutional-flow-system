"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import { evaluateSld, sldTypeInfo } from "@/lib/sldEngine";
import SldCard from "@/components/SldCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

export default function SldDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params?.id;

  const [row, setRow] = useState(null);
  const [dolLevels, setDolLevels] = useState([]);
  const [poiZones, setPoiZones] = useState([]);
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

      const { data: setupData, error: setupErr } = await supabase.from("sld_setups").select("*").eq("id", id).maybeSingle();
      if (setupErr || !setupData) {
        setError(setupErr?.message || "SLD setup not found.");
        setLoading(false);
        return;
      }

      const { data: dolData } = await supabase.from("sld_dol_levels").select("*").eq("setup_id", id).order("created_at");
      const { data: poiData } = await supabase.from("sld_poi_zones").select("*").eq("setup_id", id).order("created_at");
      const { data: shotsData } = await supabase.from("sld_screenshots").select("*").eq("setup_id", id).order("created_at");

      setRow(setupData);
      setDolLevels((dolData || []).map((d) => ({
        id: d.id,
        type: d.dol_type,
        price: d.price,
        rank: d.rank,
        strength: d.strength,
        note: d.note,
        isActive: d.is_active,
      })));
      setPoiZones((poiData || []).map((p) => ({
        id: p.id,
        type: p.zone_type,
        high: p.zone_high,
        low: p.zone_low,
        ce: p.zone_ce,
        isActive: p.is_active,
        note: p.note,
      })));
      setScreenshots(shotsData || []);
      setNotesDraft(setupData.notes || "");
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const evaluation = useMemo(() => {
    if (!row) return null;
    const activeDol = dolLevels.find((d) => d.isActive) || dolLevels[0] || null;
    const activePoi = poiZones.find((p) => p.isActive) || poiZones[0] || null;

    return evaluateSld({
      sequenceType: row.sequence_type,
      pair: row.pair,
      timeframe: row.timeframe,
      d1Bias: row.d1_bias,
      structureVerdict: row.structure_verdict,
      chochDetected: row.choch_detected,
      quarterlyAligned: row.quarterly_aligned,
      dolType: activeDol?.type,
      dolPrice: activeDol?.price,
      dolRank: activeDol?.rank,
      currentPrice: row.current_close,
      sweepHappened: row.sweep_happened,
      sweepLevel: row.sweep_level,
      bosConfirmed: row.bos_confirmed,
      bosLevel: row.bos_level,
      poiZone: activePoi
        ? { type: activePoi.type, high: activePoi.high, low: activePoi.low }
        : null,
      dealingRange: { high: row.range_high, low: row.range_low },
      pathClear: row.path_clear,
      priceTapped: row.price_tapped_poi,
      ltfChoch: row.ltf_choch_confirmed,
      ltfFvgEntry: row.ltf_fvg_entry,
      partial2RTaken: row.partial_2r_taken,
      breakevenSet: row.breakeven_set,
      trailActive: row.trail_active,
      trailLevel: row.trail_level,
      tradeStatus: row.trade_status,
      nextDol: row.next_dol,
      nextDolType: row.next_dol_type,
      structureFlipped: false,
      pipSize: row.pip_size || 1,
      accountSize: 0,
      riskPercent: 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, dolLevels, poiZones]);

  const warnings = useMemo(() => {
    if (!row) return [];
    const list = [];
    if (row.choch_detected) {
      list.push({ key: "choch", label: "CHoCH detected", detail: "Structure may be flipping." });
    }
    if (evaluation?.trade && evaluation.trade.rr < 3) {
      list.push({
        key: "weak_rr",
        label: "RR below 3:1",
        detail: `Current RR: 1:${evaluation.trade.rr.toFixed(2)}.`,
      });
    }
    return list;
  }, [row, evaluation]);

  async function handleSaveNotes() {
    setSavingNotes(true); setNotesSaved(false); setError("");
    const { error: updErr } = await supabase.from("sld_setups").update({ notes: notesDraft }).eq("id", id);
    if (updErr) { setError(updErr.message); setSavingNotes(false); return; }
    setRow((prev) => (prev ? { ...prev, notes: notesDraft } : prev));
    setSavingNotes(false); setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  async function handleDelete() {
    if (!confirm(`Delete ${isDraft ? "this draft" : "this SLD setup"}?`)) return;
    setDeleting(true);
    const { error: delErr } = await supabase.from("sld_setups").delete().eq("id", id);
    if (delErr) { setError(delErr.message); setDeleting(false); return; }
    router.push("/sld/journal");
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-gray-400">Loading SLD setup...</div>
      </main>
    );
  }

  if (error && !row) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>
          <button type="button" onClick={() => router.push("/sld")} className="w-full py-3 rounded-lg bg-gray-800 font-bold">← Back</button>
        </div>
      </main>
    );
  }

  const typeInfo = sldTypeInfo(row.sequence_type);

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
              <button type="button" onClick={() => router.push(`/sld?edit=${row.id}`)}
                className="text-xs px-3 py-2 rounded-lg bg-yellow-700 font-bold">▶ Continue editing</button>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">{typeInfo.emoji} {typeInfo.label}</h1>
            <p className="text-gray-400 text-sm">
              {row.pair} · {row.timeframe} · {row.session || "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Saved {new Date(row.created_at).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => router.push(`/sld?edit=${row.id}`)}
              className="text-xs px-3 py-2 rounded-lg bg-blue-900/40 text-blue-300 font-semibold">✏️ Edit</button>
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="text-xs px-3 py-2 rounded-lg bg-red-900/40 text-red-300 font-semibold disabled:opacity-50">
              {deleting ? "Deleting..." : "🗑 Delete"}
            </button>
          </div>
        </div>

        {evaluation && <SldCard data={evaluation} warnings={warnings} />}

        <div className="p-4 rounded-lg bg-gray-900 border-2 border-emerald-800 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-emerald-300">📸 Screenshots</h2>
            <p className="text-xs text-gray-500 mt-0.5">{screenshots.length} attached</p>
          </div>
          <ScreenshotGallery screenshots={screenshots}
            onDelete={(deletedId) => setScreenshots((prev) => prev.filter((s) => s.id !== deletedId))} />
          <div className="pt-3 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-400 mb-2">Add more</p>
            <ScreenshotUploader
  setupId={row.id}
  userId={userId}
  screenshots={screenshots}
  onChange={setScreenshots}
  table="sld_screenshots"
/>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border-2 border-purple-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-purple-200">📓 Journal Notes</h2>
            {notesSaved && <span className="text-xs px-2 py-1 rounded-full bg-green-900/40 text-green-300 font-semibold">✅ Saved</span>}
          </div>
          <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={6}
            placeholder="Observations, outcome, lessons..."
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 resize-none text-sm" />
          <button type="button" onClick={handleSaveNotes} disabled={savingNotes || notesDraft === (row.notes || "")}
            className="w-full py-2 rounded-lg bg-purple-800 font-bold text-sm disabled:opacity-50">
            {savingNotes ? "Saving..." : "💾 Save Notes"}
          </button>
        </div>

        {dolLevels.length > 0 && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
            <h2 className="text-sm font-semibold text-blue-400">DOL Levels ({dolLevels.length})</h2>
            {dolLevels.map((d, i) => (
              <div key={d.id || i} className={`p-2 rounded border text-xs ${d.isActive ? "bg-blue-950/20 border-blue-700" : "bg-black border-gray-800"}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded-full bg-gray-800 uppercase">{d.type}</span>
                  <span className="tabular-nums font-bold">{d.price !== null ? formatPrice(d.price) : "—"}</span>
                  <span className="text-gray-500">Rank: {d.rank || "—"}</span>
                  {d.isActive && <span className="text-blue-300 font-semibold">active</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {poiZones.length > 0 && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
            <h2 className="text-sm font-semibold text-purple-400">POI Zones ({poiZones.length})</h2>
            {poiZones.map((p, i) => (
              <div key={p.id || i} className={`p-2 rounded border text-xs ${p.isActive ? "bg-purple-950/20 border-purple-700" : "bg-black border-gray-800"}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded-full bg-gray-800 uppercase">{p.type}</span>
                  <span className="tabular-nums">{formatPrice(p.low)} – {formatPrice(p.high)}</span>
                  <span className="text-gray-500">CE {formatPrice(p.ce)}</span>
                  {p.isActive && <span className="text-purple-300 font-semibold">active</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        <button type="button" onClick={() => router.push("/sld/journal")}
          className="w-full py-3 rounded-lg bg-gray-800 font-bold">
          ← Back to SLD Journal
        </button>
      </div>
    </main>
  );
}