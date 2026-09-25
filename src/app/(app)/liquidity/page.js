"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { PAIRS } from "@/lib/setupHelpers";
import { formatPrice } from "@/lib/formatNumbers";
import {
  LEVEL_TYPES,
  SESSIONS,
  levelInfo,
  distanceLabel,
  liquidityAround,
} from "@/lib/liquidityHelpers";

export default function LiquidityPage() {
  const supabase = createClient();

  const [pair, setPair] = useState("Volatility 80");
  const [levels, setLevels] = useState([]);
  const [livePrice, setLivePrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    level_type: "unmitigated_high",
    price: "",
    timeframe: "D1",
    session: "",
    notes: "",
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("liquidity_maps")
        .select("*")
        .eq("user_id", user.id)
        .eq("pair", pair)
        .order("price", { ascending: false });

      setLevels(data || []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair]);

  useEffect(() => {
    async function fetchPrice() {
      try {
        if (pair.toLowerCase().includes("volatility 80")) {
          const bridgeUrl = process.env.NEXT_PUBLIC_MT5_BRIDGE_URL;
          const url = bridgeUrl
            ? `${bridgeUrl}/api/price/mt5`
            : "/api/price/mt5";
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();
          if (typeof data.bid === "number") setLivePrice(data.bid);
        }
      } catch {}
    }
    fetchPrice();
    const interval = setInterval(fetchPrice, 2000);
    return () => clearInterval(interval);
  }, [pair]);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");

    const price = parseFloat(form.price);
    if (!price || price <= 0) {
      setError("Enter a valid price.");
      return;
    }

    setAdding(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated.");
      setAdding(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("liquidity_maps")
      .insert({
        user_id: user.id,
        pair,
        level_type: form.level_type,
        price,
        timeframe: form.timeframe,
        session: form.session || null,
        notes: form.notes || null,
      });

    setAdding(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm({
      level_type: "unmitigated_high",
      price: "",
      timeframe: "D1",
      session: "",
      notes: "",
    });

    const { data } = await supabase
      .from("liquidity_maps")
      .select("*")
      .eq("user_id", user.id)
      .eq("pair", pair)
      .order("price", { ascending: false });

    setLevels(data || []);
  }

  async function toggleSwept(level) {
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("liquidity_maps")
      .update({
        swept: !level.swept,
        swept_at: !level.swept ? now : null,
      })
      .eq("id", level.id);

    if (updateError) return;

    setLevels((prev) =>
      prev.map((l) =>
        l.id === level.id
          ? { ...l, swept: !l.swept, swept_at: !l.swept ? now : null }
          : l
      )
    );
  }

  async function deleteLevel(id) {
    if (!window.confirm("Delete this level?")) return;
    const { error: delError } = await supabase
      .from("liquidity_maps")
      .delete()
      .eq("id", id);

    if (delError) return;
    setLevels((prev) => prev.filter((l) => l.id !== id));
  }

  const { above, below } = liquidityAround(levels, livePrice);

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Liquidity Map</h1>
          <p className="text-gray-400 text-sm">
            Mark the fuel — stops, sweeps, and magnets
          </p>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 mb-4">
          <label className="block text-sm mb-2 text-gray-300">Pair</label>
          <select
            value={pair}
            onChange={(e) => setPair(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
          >
            {PAIRS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {livePrice !== null && (
            <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-800">
              <div>
                <p className="text-xs text-gray-500">Live Price</p>
                <p className="font-bold tabular-nums text-white">
                  {formatPrice(livePrice)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Liquidity Above</p>
                <p className="font-bold tabular-nums text-red-400">
                  {above}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Liquidity Below</p>
                <p className="font-bold tabular-nums text-green-400">
                  {below}
                </p>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={handleAdd}
          className="p-4 rounded-lg bg-gray-900 border border-gray-800 mb-6 space-y-3"
        >
          <h2 className="text-sm font-semibold text-blue-400">
            Add Liquidity Level
          </h2>

          <div className="grid grid-cols-2 gap-2">
            {LEVEL_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setForm((f) => ({ ...f, level_type: t.key }))}
                className={`p-2 rounded-lg text-xs transition text-left ${
                  form.level_type === t.key
                    ? `${t.color} font-bold border border-current`
                    : "bg-black border border-gray-800 text-gray-400"
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Price
              </label>
              <input
                type="number"
                step="any"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
                placeholder="e.g. 209500"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
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
                <option value="30M">30M</option>
              </select>
            </div>
          </div>

          {(form.level_type === "session_high" ||
            form.level_type === "session_low") && (
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Session
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SESSIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, session: s }))}
                    className={`py-2 rounded-lg text-xs transition ${
                      form.session === s
                        ? "bg-blue-600 text-white font-medium"
                        : "bg-black border border-gray-800 text-gray-400"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs mb-1 text-gray-400">
              Notes (optional)
            </label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="e.g. Double top from yesterday"
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            />
          </div>

          {error && (
            <div className="p-2 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={adding}
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium disabled:opacity-50 text-sm"
          >
            {adding ? "Adding..." : "+ Add Level"}
          </button>
        </form>

        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading...</p>
        ) : levels.length === 0 ? (
          <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-gray-400">
              No levels yet for {pair}. Add your first liquidity level above.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-400 mb-2">
              {levels.length} level{levels.length === 1 ? "" : "s"} for {pair}
            </h2>
            {levels.map((level) => {
              const info = levelInfo(level.level_type);
              if (!info) return null;

              const isAbove = livePrice != null && level.price > livePrice;
              const distance = distanceLabel(level.price, livePrice);

              return (
                <div
                  key={level.id}
                  className={`p-3 rounded-lg border transition ${
                    level.swept
                      ? "bg-gray-950 border-gray-900 opacity-50"
                      : "bg-gray-900 border-gray-800"
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}
                      >
                        {info.emoji} {info.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {level.timeframe}
                      </span>
                      {level.session && (
                        <span className="text-xs text-gray-500">
                          · {level.session}
                        </span>
                      )}
                      {level.swept && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                          ✓ Swept
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => toggleSwept(level)}
                        className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700"
                        title={level.swept ? "Mark unswept" : "Mark swept"}
                      >
                        {level.swept ? "↺" : "✓"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteLevel(level.id)}
                        className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-red-900 text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm mt-2">
                    <div>
                      <p className="text-xs text-gray-500">Price</p>
                      <p className="font-bold tabular-nums text-white">
                        {formatPrice(level.price)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Position</p>
                      <p
                        className={`font-bold ${
                          isAbove ? "text-red-400" : "text-green-400"
                        }`}
                      >
                        {livePrice != null
                          ? isAbove
                            ? "Above ↑"
                            : "Below ↓"
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Distance</p>
                      <p className="font-bold tabular-nums text-gray-300">
                        {distance}
                      </p>
                    </div>
                  </div>

                  {level.notes && (
                    <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-800">
                      {level.notes}
                    </p>
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