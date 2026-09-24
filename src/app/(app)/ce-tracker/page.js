"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import {
  ceStateInfo,
  flipTradeLabel,
  getFlipDirection,
} from "@/lib/ceFlipHelpers";

export default function CETrackerPage() {
  const supabase = createClient();
  const [ceLines, setCeLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("ce_flips")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setCeLines(data || []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateState(id, newState) {
    const payload = {
      state: newState,
      updated_at: new Date().toISOString(),
    };

    if (newState === "tapped") {
      payload.first_tap_at = new Date().toISOString();
      payload.last_tap_at = new Date().toISOString();
    }
    if (newState === "flipped") {
      payload.flipped_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("ce_flips")
      .update(payload)
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setCeLines((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...payload } : c))
    );
  }

  async function incrementTap(id) {
    const line = ceLines.find((c) => c.id === id);
    if (!line) return;

    const { error: updateError } = await supabase
      .from("ce_flips")
      .update({
        tapped_count: (line.tapped_count || 0) + 1,
        last_tap_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) return;

    setCeLines((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              tapped_count: (c.tapped_count || 0) + 1,
              last_tap_at: new Date().toISOString(),
            }
          : c
      )
    );
  }

  async function deleteLine(id) {
    if (!window.confirm("Delete this CE tracker line?")) return;
    const { error: delError } = await supabase
      .from("ce_flips")
      .delete()
      .eq("id", id);
    if (delError) return;
    setCeLines((prev) => prev.filter((c) => c.id !== id));
  }

  const activeStates = ["fresh", "tapped", "held", "flipped", "retested"];

  const filtered =
    filter === "active"
      ? ceLines.filter((c) => activeStates.includes(c.state))
      : filter === "flipped"
      ? ceLines.filter((c) => c.state === "flipped" || c.state === "retested")
      : ceLines;

  const flipReady = ceLines.filter(
    (c) => c.state === "flipped" || c.state === "retested"
  );

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">CE Flip Tracker</h1>
          <p className="text-gray-400 text-sm">
            Track every CE line from formation → flip → second trade
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <Stat
            label="Total"
            value={ceLines.length}
            color="text-white"
          />
          <Stat
            label="Active"
            value={ceLines.filter((c) => activeStates.includes(c.state)).length}
            color="text-blue-400"
          />
          <Stat
            label="Held"
            value={ceLines.filter((c) => c.state === "held").length}
            color="text-green-400"
          />
          <Stat
            label="Flip Ready"
            value={flipReady.length}
            color="text-orange-400"
          />
        </div>

        {/* Flip-ready alert */}
        {flipReady.length > 0 && (
          <div className="p-4 rounded-lg bg-orange-950/60 border border-orange-700 mb-4">
            <p className="text-orange-200 font-semibold text-sm">
              🟠 {flipReady.length} CE line{flipReady.length === 1 ? "" : "s"}{" "}
              ready for flip trade
            </p>
            <p className="text-orange-300 text-xs mt-1">
              Price has flipped below/above these CE levels. Watch for return
              to enter opposite direction.
            </p>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {["active", "flipped", "all"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-xs transition ${
                filter === f
                  ? "bg-blue-600 text-white font-medium"
                  : "bg-gray-900 text-gray-400"
              }`}
            >
              {f === "active"
                ? "Active"
                : f === "flipped"
                ? "Flip Ready"
                : "All"}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-gray-400 mb-4">
              No CE lines tracked yet.
            </p>
            <Link
              href="/setups"
              className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
            >
              Create a Setup to auto-track its CE →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((line) => {
              const info = ceStateInfo(line.state);
              const flipDir = getFlipDirection(line.original_direction);

              return (
                <div
                  key={line.id}
                  className={`p-4 rounded-lg border ${info.color}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${info.badge} font-medium`}
                        >
                          {info.emoji} {info.label}
                        </span>
                        <span className="text-sm font-medium">
                          {line.pair}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            line.original_direction === "bullish"
                              ? "bg-green-900/40 text-green-300"
                              : "bg-red-900/40 text-red-300"
                          }`}
                        >
                          {line.original_direction}
                        </span>
                      </div>
                      <p className="text-xs opacity-70 mt-1">
                        {info.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteLine(line.id)}
                      className="text-xs px-2 py-1 rounded bg-black/40 hover:bg-black/60 text-red-400"
                    >
                      ×
                    </button>
                  </div>

                  {/* CE Price */}
                  <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                    <div>
                      <p className="opacity-70">CE Line</p>
                      <p className="font-bold tabular-nums text-lg">
                        {formatPrice(line.ce_price)}
                      </p>
                    </div>
                    <div>
                      <p className="opacity-70">Taps</p>
                      <p className="font-bold tabular-nums">
                        {line.tapped_count || 0}
                      </p>
                    </div>
                    {line.flip_close_price && (
                      <div>
                        <p className="opacity-70">Flip Close</p>
                        <p className="font-bold tabular-nums text-orange-300">
                          {formatPrice(line.flip_close_price)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Flip trade hint */}
                  {(line.state === "flipped" ||
                    line.state === "retested") && (
                    <div className="p-3 rounded-lg bg-black/40 border border-current/30 mb-3">
                      <p className="text-xs font-semibold">
                        {flipTradeLabel(line.original_direction)}
                      </p>
                      <p className="text-xs opacity-70 mt-1">
                        Watch for return to CE at {formatPrice(line.ce_price)}{" "}
                        — enter {flipDir.toUpperCase()} on rejection.
                      </p>
                    </div>
                  )}

                  {/* State buttons */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => updateState(line.id, "tapped")}
                      disabled={line.state === "tapped"}
                      className="py-2 rounded-lg bg-black/40 hover:bg-black/60 text-xs disabled:opacity-40"
                    >
                      🟡 Tap
                    </button>
                    <button
                      type="button"
                      onClick={() => updateState(line.id, "held")}
                      disabled={line.state === "held"}
                      className="py-2 rounded-lg bg-black/40 hover:bg-black/60 text-xs disabled:opacity-40"
                    >
                      🟢 Held
                    </button>
                    <button
                      type="button"
                      onClick={() => updateState(line.id, "flipped")}
                      disabled={line.state === "flipped"}
                      className="py-2 rounded-lg bg-black/40 hover:bg-black/60 text-xs disabled:opacity-40"
                    >
                      🔴 Flipped
                    </button>
                    <button
                      type="button"
                      onClick={() => updateState(line.id, "retested")}
                      disabled={line.state === "retested"}
                      className="py-2 rounded-lg bg-black/40 hover:bg-black/60 text-xs disabled:opacity-40"
                    >
                      🟠 Retest
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => incrementTap(line.id)}
                      className="py-2 rounded-lg bg-black/30 hover:bg-black/50 text-xs"
                    >
                      +1 Tap ({line.tapped_count || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => updateState(line.id, "dead")}
                      className="py-2 rounded-lg bg-black/30 hover:bg-black/50 text-xs text-gray-400"
                    >
                      ⚫ Mark Dead
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}