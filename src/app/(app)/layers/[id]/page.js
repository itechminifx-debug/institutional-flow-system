"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import {
  evaluateLayers,
  layersTypeInfo,
  sessionInfo,
} from "@/lib/layersEngine";
import LayersCard from "@/components/LayersCard";
import ScreenshotUploader from "@/components/ScreenshotUploader";
import ScreenshotGallery from "@/components/ScreenshotGallery";

export default function LayersDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params?.id;

  const [row, setRow] = useState(null);
  const [zones, setZones] = useState([]);
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
        .from("layers_setups")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (setupErr || !setupData) {
        setError(setupErr?.message || "Layers setup not found.");
        setLoading(false);
        return;
      }

      const { data: zoneData } = await supabase
        .from("layers_zones")
        .select("*")
        .eq("setup_id", id)
        .order("created_at", { ascending: true });

      const { data: shotsData } = await supabase
        .from("layers_screenshots")
        .select("*")
        .eq("setup_id", id)
        .order("created_at", { ascending: true });

      setRow(setupData);
      setZones(
        (zoneData || []).map((z) => ({
          id: Math.random().toString(36).slice(2),
          type: z.zone_type || "fvg",
          high: z.zone_high?.toString() || "",
          low: z.zone_low?.toString() || "",
        }))
      );
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

    return evaluateLayers({
      sequenceType: row.sequence_type,
      pair: row.pair,
      timeframe: row.timeframe,
      dailyBias: row.daily_bias,
      dealingRangeHigh: row.dealing_range_high,
      dealingRangeLow: row.dealing_range_low,
      currentClose: row.sweep_candle?.close,
      drawOnLiquidity: row.draw_on_liquidity,
      drawPrice: row.draw_price,
      sweepLevel: row.sweep_level,
      sweepCandle: row.sweep_candle,
      displacementCandle: row.displacement_candle,
      mssReference: row.mss_reference,
      zones,
      entryCandle: row.entry_candle,
      session: row.session,
      pipSize: row.pip_size || 1,
      accountSize: 0,
      riskPercent: 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, zones]);

  // ----------------------------------------------------------
  // WARNINGS
  // ----------------------------------------------------------
  const warnings = useMemo(() => {
    if (!row) return [];
    const list = [];

    if (row.daily_bias && row.daily_bias !== row.sequence_type) {
      list.push({
        key: "bias_conflict",
        label: "Daily bias conflicts with setup",
        detail: `Bias is ${row.daily_bias}, setup is ${row.sequence_type}.`,
      });
    }

    if (
      row.draw_on_liquidity &&
      ((row.sequence_type === "bullish" && row.draw_on_liquidity !== "bsl") ||
        (row.sequence_type === "bearish" && row.draw_on_liquidity !== "ssl"))
    ) {
      list.push({
        key: "draw_mismatch",
        label: "Draw on liquidity direction mismatch",
        detail: `${row.sequence_type} setups target ${
          row.sequence_type === "bullish" ? "BSL" : "SSL"
        }.`,
      });
    }

    if (
      evaluation?.trade &&
      evaluation.trade.rr !== null &&
      evaluation.trade.rr < 2
    ) {
      list.push({
        key: "weak_rr",
        label: "Reward-to-risk below 2:1",
        detail: `RR is 1:${evaluation.trade.rr.toFixed(2)} — thin reward.`,
      });
    }

    return list;
  }, [row, evaluation]);

  // ----------------------------------------------------------
  // SAVE NOTES
  // ----------------------------------------------------------
  async function handleSaveNotes() {
    setSavingNotes(true);
    setNotesSaved(false);
    setError("");
    const { error: updErr } = await supabase
      .from("layers_setups")
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
    const label = isDraft ? "this draft" : "this Layers setup";
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    setDeleting(true);
    const { error: delErr } = await supabase
      .from("layers_setups")
      .delete()
      .eq("id", id);
    if (delErr) {
      setError(delErr.message);
      setDeleting(false);
      return;
    }
    router.push("/layers/journal");
  }

  // ----------------------------------------------------------
  // LOADING / ERROR
  // ----------------------------------------------------------
  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-gray-400">
          Loading Layers setup...
        </div>
      </main>
    );
  }

  if (error && !row) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error || "Layers setup not found."}
          </div>
          <button
            type="button"
            onClick={() => router.push("/layers")}
            className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold"
          >
            ← Back to Layers
          </button>
        </div>
      </main>
    );
  }

  const typeInfo = layersTypeInfo(row.sequence_type);
  const session = sessionInfo(row.session);

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
                  Context {evaluation?.context?.score ?? 0}% · Setup{" "}
                  {evaluation?.setup?.score ?? 0}% · Trigger{" "}
                  {evaluation?.trigger?.score ?? 0}% · Last saved{" "}
                  {row.updated_at
                    ? new Date(row.updated_at).toLocaleString()
                    : "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/layers?edit=${row.id}`)}
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
              onClick={() => router.push(`/layers?edit=${row.id}`)}
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

        {/* THE CARD */}
        {evaluation && <LayersCard data={evaluation} warnings={warnings} />}

        {/* Screenshots */}
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

        {/* Raw Inputs */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            Raw Inputs
          </h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Daily Bias</p>
              <p className="font-bold capitalize">
                {row.daily_bias ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Session</p>
              <p className="font-bold">
                {session.emoji} {session.label}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Dealing Range High</p>
              <p className="font-bold tabular-nums">
                {row.dealing_range_high !== null
                  ? formatPrice(row.dealing_range_high)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Dealing Range Low</p>
              <p className="font-bold tabular-nums">
                {row.dealing_range_low !== null
                  ? formatPrice(row.dealing_range_low)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Draw on Liquidity</p>
              <p className="font-bold uppercase">
                {row.draw_on_liquidity ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Draw Price</p>
              <p className="font-bold tabular-nums">
                {row.draw_price !== null
                  ? formatPrice(row.draw_price)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Sweep Level</p>
              <p className="font-bold tabular-nums">
                {row.sweep_level !== null
                  ? formatPrice(row.sweep_level)
                  : "—"}
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
              <p className="text-xs text-gray-500">Pip size</p>
              <p className="font-bold tabular-nums">{row.pip_size ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Layer Scores</p>
              <p className="font-bold tabular-nums">
                C{row.context_score ?? 0} · S{row.setup_score ?? 0} · T
                {row.trigger_score ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Candles */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">Candles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: "Sweep", c: row.sweep_candle },
              { label: "Displacement", c: row.displacement_candle },
              { label: "Entry", c: row.entry_candle },
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

        {/* Zones */}
        {zones.length > 0 && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <h2 className="text-sm font-semibold text-blue-400">
              Zones ({zones.length})
            </h2>
            <div className="space-y-2">
              {zones.map((z, i) => (
                <div
                  key={z.id || i}
                  className="p-2 rounded border bg-black border-gray-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-300 font-bold uppercase">
                      {z.type}
                    </span>
                    <span className="tabular-nums">
                      {formatPrice(parseFloat(z.low) || 0)} –{" "}
                      {formatPrice(parseFloat(z.high) || 0)}
                    </span>
                  </div>
                  <span className="text-gray-500">Zone {i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back */}
        <button
          type="button"
          onClick={() => router.push("/layers/journal")}
          className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold"
        >
          ← Back to Layers Journal
        </button>
      </div>
    </main>
  );
}