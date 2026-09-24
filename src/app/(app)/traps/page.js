"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { PAIRS } from "@/lib/setupHelpers";
import {
  TRAP_TYPES,
  trapInfo,
  trapStatusColor,
  trapStats,
  isSessionOpen,
} from "@/lib/trapHelpers";

export default function TrapsPage() {
  const supabase = createClient();

  const [traps, setTraps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sessionAlert, setSessionAlert] = useState({ active: false, session: null });

  const [form, setForm] = useState({
    trap_type: "false_breakout",
    pair: "Volatility 80",
    direction: "bullish",
    level_price: "",
    session: "",
    notes: "",
  });

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("retail_traps")
        .select("*")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false })
        .limit(50);

      setTraps(data || []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Session open check (Judas Swing risk)
  useEffect(() => {
    const check = () => setSessionAlert(isSessionOpen());
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated.");
      setSubmitting(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("retail_traps")
      .insert({
        user_id: user.id,
        trap_type: form.trap_type,
        pair: form.pair,
        direction: form.direction,
        level_price: form.level_price ? parseFloat(form.level_price) : null,
        session: form.session || null,
        notes: form.notes || null,
      })
      .select()
      .single();

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setTraps((prev) => [data, ...prev]);
    setForm({
      trap_type: "false_breakout",
      pair: "Volatility 80",
      direction: "bullish",
      level_price: "",
      session: "",
      notes: "",
    });
    setShowForm(false);
  }

  async function updateStatus(id, status) {
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("retail_traps")
      .update({
        status,
        resolved_at: status === "watching" ? null : now,
      })
      .eq("id", id);

    if (updateError) return;

    setTraps((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              resolved_at: status === "watching" ? null : now,
            }
          : t
      )
    );
  }

  async function deleteTrap(id) {
    if (!window.confirm("Delete this trap?")) return;
    const { error: delError } = await supabase
      .from("retail_traps")
      .delete()
      .eq("id", id);

    if (delError) return;
    setTraps((prev) => prev.filter((t) => t.id !== id));
  }

  const stats = trapStats(traps);

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Retail Traps</h1>
          <p className="text-gray-400 text-sm">
            Track where they hunt — trade the reversal, not the trap
          </p>
        </div>

        {/* Session open warning */}
        {sessionAlert.active && (
          <div className="p-4 rounded-lg bg-yellow-950/60 border border-yellow-700 mb-4">
            <p className="text-yellow-200 font-semibold text-sm">
              🌅 {sessionAlert.session} Session Open — Judas Swing Risk
            </p>
            <p className="text-yellow-300 text-xs mt-1">
              Wait 30 minutes for the initial move to settle before entering.
              First move is often a trap.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-bold">{stats.total}</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-xs text-yellow-500">Watching</p>
            <p className="text-lg font-bold text-yellow-400">
              {stats.watching}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-xs text-green-500">Confirmed</p>
            <p className="text-lg font-bold text-green-400">
              {stats.confirmed}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-xs text-red-500">Failed</p>
            <p className="text-lg font-bold text-red-400">{stats.failed}</p>
          </div>
        </div>

        {/* Add button */}
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full mb-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium"
          >
            + Log New Trap
          </button>
        )}

        {/* Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="p-4 rounded-lg bg-gray-900 border border-gray-800 mb-6 space-y-3"
          >
            <h2 className="text-sm font-semibold text-blue-400">
              Log a Trap
            </h2>

            {/* Trap type */}
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Trap Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TRAP_TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, trap_type: t.key }))
                    }
                    className={`p-2 rounded-lg text-xs transition text-left ${
                      form.trap_type === t.key
                        ? `${t.color} font-bold border border-current`
                        : "bg-black border border-gray-800 text-gray-400"
                    }`}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
              {trapInfo(form.trap_type) && (
                <p className="text-xs text-gray-500 mt-2 italic">
                  {trapInfo(form.trap_type).description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
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
                  Level Price
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.level_price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, level_price: e.target.value }))
                  }
                  placeholder="e.g. 209500"
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Direction (retail will lose on this side)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, direction: "bullish" }))
                  }
                  className={`py-2 rounded-lg text-xs transition ${
                    form.direction === "bullish"
                      ? "bg-green-900/40 border border-green-600 text-green-200 font-bold"
                      : "bg-black border border-gray-800 text-gray-400"
                  }`}
                >
                  🟢 Bullish trap
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, direction: "bearish" }))
                  }
                  className={`py-2 rounded-lg text-xs transition ${
                    form.direction === "bearish"
                      ? "bg-red-900/40 border border-red-600 text-red-200 font-bold"
                      : "bg-black border border-gray-800 text-gray-400"
                  }`}
                >
                  🔴 Bearish trap
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
                placeholder="e.g. Wick broke 209500, closed back below"
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
                onClick={() => setShowForm(false)}
                className="py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Log Trap"}
              </button>
            </div>
          </form>
        )}

        {/* Traps list */}
        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading...</p>
        ) : traps.length === 0 ? (
          <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-gray-400">
              No traps logged yet. Log one when you see retail being trapped.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {traps.map((trap) => {
              const info = trapInfo(trap.trap_type);
              if (!info) return null;

              return (
                <div
                  key={trap.id}
                  className="p-4 rounded-lg bg-gray-900 border border-gray-800"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}
                      >
                        {info.emoji} {info.label}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {trap.pair}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          trap.direction === "bullish"
                            ? "bg-green-900/40 text-green-300"
                            : "bg-red-900/40 text-red-300"
                        }`}
                      >
                        {trap.direction}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${trapStatusColor(
                          trap.status
                        )}`}
                      >
                        {trap.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteTrap(trap.id)}
                      className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-red-900 text-red-400"
                    >
                      ×
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs mt-2">
                    {trap.level_price && (
                      <div>
                        <p className="text-gray-500">Level</p>
                        <p className="font-bold tabular-nums text-white">
                          {trap.level_price.toFixed(2)}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-500">Logged</p>
                      <p className="text-gray-300">
                        {new Date(trap.logged_at).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  {trap.notes && (
                    <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-800">
                      {trap.notes}
                    </p>
                  )}

                  {/* Status buttons */}
                  {trap.status === "watching" && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => updateStatus(trap.id, "confirmed")}
                        className="py-2 rounded-lg bg-green-800 hover:bg-green-700 text-xs font-medium"
                      >
                        ✓ Confirmed (retail trapped)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(trap.id, "failed")}
                        className="py-2 rounded-lg bg-red-900 hover:bg-red-800 text-xs font-medium"
                      >
                        ✗ Failed (retail won)
                      </button>
                    </div>
                  )}

                  {trap.status !== "watching" && (
                    <button
                      type="button"
                      onClick={() => updateStatus(trap.id, "watching")}
                      className="mt-3 w-full py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs"
                    >
                      ↺ Reopen
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}