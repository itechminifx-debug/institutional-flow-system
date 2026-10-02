"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { PAIRS } from "@/lib/setupHelpers";
import { formatPrice } from "@/lib/formatNumbers";
import {
  mssInfo,
  validateMSS,
  computeMSSZone,
  computeCompressionLevel,
  compressionInfo,
} from "@/lib/mssHelpers";

export default function MSSPage() {
  const supabase = createClient();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "H4",
    direction: "bullish",
    brokenLevel: "",
    closePrice: "",
    notes: "",
  });

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("mss_events")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      let eventsWithCounts = data || [];

      // Fetch nested RRB counts
      if (eventsWithCounts.length > 0) {
        const eventIds = eventsWithCounts.map((e) => e.id);
        const { data: nestedData } = await supabase
          .from("mss_nested_rrbs")
          .select("mss_id")
          .eq("user_id", user.id)
          .in("mss_id", eventIds);

        const countMap = {};
        (nestedData || []).forEach((n) => {
          countMap[n.mss_id] = (countMap[n.mss_id] || 0) + 1;
        });

        eventsWithCounts = eventsWithCounts.map((e) => ({
          ...e,
          nested_rrb_count: countMap[e.id] || 0,
        }));
      }

      setEvents(eventsWithCounts);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const validation = validateMSS({
      direction: form.direction,
      brokenLevel: form.brokenLevel,
      closePrice: form.closePrice,
    });

    if (!validation.isValid) {
      setError(validation.errors[0]);
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated.");
      setSubmitting(false);
      return;
    }

    const broken = parseFloat(form.brokenLevel);
    const close = parseFloat(form.closePrice);

    // Compute the MSS zone
    const zone = computeMSSZone({
      direction: form.direction,
      brokenLevel: broken,
      closePrice: close,
    });

    // Check for opposite-direction active zones to invalidate
    const { data: activeZones } = await supabase
      .from("mss_events")
      .select("id, direction")
      .eq("user_id", user.id)
      .eq("pair", form.pair)
      .eq("zone_status", "active")
      .neq("direction", form.direction);

    const { data, error: insertError } = await supabase
      .from("mss_events")
      .insert({
        user_id: user.id,
        pair: form.pair,
        timeframe: form.timeframe,
        direction: form.direction,
        broken_level: broken,
        broken_swing_type:
          form.direction === "bullish" ? "swing_high" : "swing_low",
        close_price: close,
        zone_high: zone?.zoneHigh,
        zone_low: zone?.zoneLow,
        zone_status: "active",
        nested_rrb_count: 0,
        compression_level: "low",
        notes: form.notes || null,
      })
      .select()
      .single();

    // Invalidate opposite-direction zones
    if (!insertError && data && activeZones?.length > 0) {
      await supabase
        .from("mss_events")
        .update({
          zone_status: "invalidated",
          invalidated_by_mss_id: data.id,
          invalidated_at: new Date().toISOString(),
        })
        .in(
          "id",
          activeZones.map((z) => z.id)
        );
    }

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setEvents((prev) => [{ ...data, nested_rrb_count: 0 }, ...prev]);
    setForm({
      pair: "Volatility 80",
      timeframe: "H4",
      direction: "bullish",
      brokenLevel: "",
      closePrice: "",
      notes: "",
    });
    setShowForm(false);
  }

  async function deleteEvent(id) {
    if (!window.confirm("Delete this MSS event?")) return;
    const { error: delError } = await supabase
      .from("mss_events")
      .delete()
      .eq("id", id);
    if (delError) return;
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  const bullishCount = events.filter((e) => e.direction === "bullish").length;
  const bearishCount = events.filter((e) => e.direction === "bearish").length;
  const compressedCount = events.filter(
    (e) => (e.nested_rrb_count || 0) >= 3
  ).length;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Market Structure Shift</h1>
          <p className="text-gray-400 text-sm">
            Track every MSS — the moment the trend reverses
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-bold">{events.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-xs text-green-500">Bullish</p>
            <p className="text-lg font-bold text-green-400">
              {bullishCount}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-xs text-red-500">Bearish</p>
            <p className="text-lg font-bold text-red-400">{bearishCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-xs text-orange-500">Compressed</p>
            <p className="text-lg font-bold text-orange-400">
              🔥{compressedCount}
            </p>
          </div>
        </div>

        {/* Add button */}
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full mb-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium"
          >
            + Log MSS Event
          </button>
        )}

        {/* Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="p-4 rounded-lg bg-gray-900 border border-gray-800 mb-6 space-y-3"
          >
            <h2 className="text-sm font-semibold text-blue-400">
              Log a Market Structure Shift
            </h2>

            {/* Direction */}
            <div>
              <label className="block text-xs mb-2 text-gray-400">
                Direction
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, direction: "bullish" }))
                  }
                  className={`py-2 rounded-lg text-sm transition ${
                    form.direction === "bullish"
                      ? "bg-green-900/40 border border-green-600 text-green-200 font-bold"
                      : "bg-black border border-gray-800 text-gray-400"
                  }`}
                >
                  🟢 Bullish MSS
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, direction: "bearish" }))
                  }
                  className={`py-2 rounded-lg text-sm transition ${
                    form.direction === "bearish"
                      ? "bg-red-900/40 border border-red-600 text-red-200 font-bold"
                      : "bg-black border border-gray-800 text-gray-400"
                  }`}
                >
                  🔴 Bearish MSS
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1 text-gray-400">
                  Pair
                </label>
                <select
                  value={form.pair}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pair: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
                >
                  {PAIRS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-400">
                  Timeframe
                </label>
                <select
                  value={form.timeframe}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, timeframe: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
                >
                  <option value="D1">D1</option>
                  <option value="H4">H4</option>
                  <option value="H1">H1</option>
                  <option value="M30">M30</option>
                  <option value="M15">M15</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1 text-gray-400">
                  Broken {form.direction === "bullish" ? "High" : "Low"}{" "}
                  (Swing)
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.brokenLevel}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, brokenLevel: e.target.value }))
                  }
                  placeholder="e.g. 209500"
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-400">
                  Close Price (Beyond the Level)
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.closePrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, closePrice: e.target.value }))
                  }
                  placeholder="e.g. 209800"
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Notes (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
                placeholder="e.g. Confirmed on H4 close"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none resize-none text-sm"
              />
            </div>

            {error && (
              <div className="p-2 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
                className="py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Log MSS"}
              </button>
            </div>
          </form>
        )}

        {/* Events list */}
        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading...</p>
        ) : events.length === 0 ? (
          <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-gray-400 mb-4">No MSS events logged yet.</p>
            <p className="text-xs text-gray-500">
              Log an MSS when price closes beyond the last opposing swing.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((e) => {
              const info = mssInfo(e.direction);
              if (!info) return null;

              const compression = e.compression_level
                ? compressionInfo(e.compression_level)
                : null;

              return (
                <div
                  key={e.id}
                  className={`p-4 rounded-lg border ${info.color}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${info.badge} font-semibold`}
                      >
                        {info.emoji} {info.label}
                      </span>
                      <span className="text-sm font-medium">{e.pair}</span>
                      <span className="text-xs opacity-70">
                        {e.timeframe}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteEvent(e.id)}
                      className="text-xs px-2 py-1 rounded bg-black/40 hover:bg-black/60 text-red-400"
                    >
                      ×
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs mt-2">
                    <div>
                      <p className="opacity-70">
                        Broken{" "}
                        {e.broken_swing_type === "swing_high"
                          ? "High"
                          : "Low"}
                      </p>
                      <p className="font-bold tabular-nums text-white">
                        {formatPrice(e.broken_level)}
                      </p>
                    </div>
                    <div>
                      <p className="opacity-70">Close Beyond</p>
                      <p className="font-bold tabular-nums text-white">
                        {formatPrice(e.close_price)}
                      </p>
                    </div>
                    {e.zone_high && e.zone_low && (
                      <div>
                        <p className="opacity-70">Zone</p>
                        <p className="font-bold tabular-nums text-blue-300">
                          {formatPrice(e.zone_low)} –{" "}
                          {formatPrice(e.zone_high)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Zone status badge */}
                  {e.zone_status && (
                    <div className="mt-2 pt-2 border-t border-current/20 flex items-center justify-between">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          e.zone_status === "active"
                            ? "bg-green-900/40 text-green-300"
                            : e.zone_status === "mitigated"
                            ? "bg-yellow-900/40 text-yellow-300"
                            : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {e.zone_status === "active"
                          ? "🟢 Active Zone"
                          : e.zone_status === "mitigated"
                          ? "🟡 Mitigated"
                          : "⚫ Invalidated"}
                      </span>
                      {e.rb_aligned && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300">
                          🎯 RB Aligned
                        </span>
                      )}
                    </div>
                  )}

                  {/* Nested RRB compression */}
                  {typeof e.nested_rrb_count === "number" &&
                    e.nested_rrb_count > 0 && (
                      <div className="mt-2 pt-2 border-t border-current/20 flex items-center justify-between">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            compressionInfo(
                              computeCompressionLevel(e.nested_rrb_count)
                            ).badge
                          }`}
                        >
                          {
                            compressionInfo(
                              computeCompressionLevel(e.nested_rrb_count)
                            ).emoji
                          }{" "}
                          {e.nested_rrb_count} Nested RRB
                          {e.nested_rrb_count === 1 ? "" : "s"}
                        </span>
                        <span className="text-xs opacity-70">
                          {
                            compressionInfo(
                              computeCompressionLevel(e.nested_rrb_count)
                            ).label
                          }
                        </span>
                      </div>
                    )}

                  {e.notes && (
                    <p className="text-xs opacity-70 mt-2 pt-2 border-t border-current/20">
                      {e.notes}
                    </p>
                  )}

                  <p className="text-xs opacity-50 mt-2">
                    {new Date(e.created_at).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Info card */}
        <div className="mt-6 p-4 rounded-lg bg-blue-950/30 border border-blue-900/50">
          <h3 className="text-xs font-semibold text-blue-300 mb-2">
            💡 What is MSS?
          </h3>
          <ul className="text-xs text-gray-300 space-y-1 ml-4 list-disc">
            <li>
              <strong>Bullish MSS:</strong> downtrend → close ABOVE the last
              swing high
            </li>
            <li>
              <strong>Bearish MSS:</strong> uptrend → close BELOW the last
              swing low
            </li>
            <li>
              MSS confirms reversals. BOS (Break of Structure) confirms
              continuation
            </li>
            <li>
              A wick is not enough — you need a <strong>close</strong> beyond
              the level
            </li>
            <li>
              <strong>Nested RRBs</strong> = doubled defense. The more nested
              RRBs, the stronger the compression
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}