"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import {
  levelInfo,
  clusterStrengthInfo,
} from "@/lib/liquidityHelpers";
import {
  formatAtrMultiple,
  getActiveSweeps,
  shouldAlert,
} from "@/lib/sweepHelpers";
import PairPicker from "@/components/PairPicker";

export default function SweepsPage() {
  const supabase = createClient();
  const alertFiredRef = useRef({});

  const [pair, setPair] = useState("Volatility 80");
  const [levels, setLevels] = useState([]);
  const [livePrice, setLivePrice] = useState(null);
  const [atr, setAtr] = useState(400);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [levelsRes, eventsRes] = await Promise.all([
        supabase
          .from("liquidity_maps")
          .select("*")
          .eq("user_id", user.id)
          .eq("pair", pair)
          .eq("swept", false)
          .order("price", { ascending: false }),
        supabase
          .from("sweep_events")
          .select("*")
          .eq("user_id", user.id)
          .order("alerted_at", { ascending: false })
          .limit(10),
      ]);

      setLevels(levelsRes.data || []);
      setEvents(eventsRes.data || []);
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

  const activeSweeps = getActiveSweeps(levels, livePrice, atr);

  useEffect(() => {
    async function fireAlerts() {
      if (!livePrice || activeSweeps.length === 0) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      for (const s of activeSweeps) {
        const { alert, column } = shouldAlert(s, s.sweep.status);
        if (!alert) continue;

        const dedupeKey = `${s.id}-${s.sweep.status}`;
        if (alertFiredRef.current[dedupeKey]) continue;
        alertFiredRef.current[dedupeKey] = true;

        try {
          await fetch("/api/alerts/sweep", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pair: s.pair,
              levelPrice: s.price,
              levelType: s.level_type,
              clusterStrength: s.cluster_strength,
              sweepStatus: s.sweep.status,
              distance: s.sweep.distance,
              atrMultiple: s.sweep.atrMultiple,
            }),
          });

          await supabase
            .from("liquidity_maps")
            .update({ [column]: true })
            .eq("id", s.id);

          const { data: newEvent } = await supabase
            .from("sweep_events")
            .insert({
              user_id: user.id,
              liquidity_id: s.id,
              pair: s.pair,
              level_price: s.price,
              level_type: s.level_type,
              cluster_strength: s.cluster_strength,
              sweep_status: s.sweep.status,
              price_at_alert: livePrice,
              distance_at_alert: s.sweep.distance,
            })
            .select()
            .single();

          if (newEvent) {
            setEvents((prev) => [newEvent, ...prev].slice(0, 10));
          }

          setLevels((prev) =>
            prev.map((l) =>
              l.id === s.id ? { ...l, [column]: true } : l
            )
          );
        } catch {}
      }
    }
    fireAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePrice, activeSweeps.length]);

  const statusCounts = {
    occurred: activeSweeps.filter((s) => s.sweep.status === "occurred").length,
    imminent: activeSweeps.filter((s) => s.sweep.status === "imminent").length,
    likely: activeSweeps.filter((s) => s.sweep.status === "likely").length,
  };

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Sweep Prediction</h1>
          <p className="text-gray-400 text-sm">
            Watch every liquidity pool — alert before the sweep
          </p>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <PairPicker
              value={pair}
              onChange={setPair}
              label="Pair"
            />
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                ATR(14)
              </label>
              <input
                type="number"
                step="any"
                value={atr}
                onChange={(e) => setAtr(parseFloat(e.target.value) || 400)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {livePrice !== null && (
            <div className="grid grid-cols-4 gap-3 pt-3 border-t border-gray-800">
              <div>
                <p className="text-xs text-gray-500">Live Price</p>
                <p className="font-bold tabular-nums text-white text-sm">
                  {formatPrice(livePrice)}
                </p>
              </div>
              <div>
                <p className="text-xs text-red-500">Imminent</p>
                <p className="font-bold text-red-400 text-sm">
                  🔥 {statusCounts.imminent}
                </p>
              </div>
              <div>
                <p className="text-xs text-orange-500">Likely</p>
                <p className="font-bold text-orange-400 text-sm">
                  ⚡ {statusCounts.likely}
                </p>
              </div>
              <div>
                <p className="text-xs text-purple-500">Occurred</p>
                <p className="font-bold text-purple-400 text-sm">
                  ✓ {statusCounts.occurred}
                </p>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading...</p>
        ) : activeSweeps.length === 0 ? (
          <div className="p-6 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-gray-400 mb-3">
              No active sweep signals for {pair}.
            </p>
            <Link
              href="/liquidity"
              className="text-xs text-blue-400 hover:underline"
            >
              Add levels in the Liquidity Map →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-blue-400">
              🎯 Active Sweep Signals ({activeSweeps.length})
            </h2>

            {activeSweeps.map((s) => {
              const info = levelInfo(s.level_type);
              const strength = clusterStrengthInfo(
                s.cluster_strength || "moderate"
              );
              const sweep = s.sweep;

              return (
                <div
                  key={s.id}
                  className={`p-4 rounded-lg border-2 ${sweep.color}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-2xl">{sweep.emoji}</span>
                      <span className="text-sm font-bold">
                        {sweep.label}
                      </span>
                      {info && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}
                        >
                          {info.emoji} {info.label}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${strength.badge} font-semibold`}
                      >
                        {strength.emoji} {s.touches || 1}×
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm mb-2">
                    <div>
                      <p className="text-xs opacity-70">Level</p>
                      <p className="font-bold tabular-nums">
                        {formatPrice(s.price)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs opacity-70">Distance</p>
                      <p className="font-bold tabular-nums">
                        {sweep.distance?.toFixed(2) || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs opacity-70">ATR Multiple</p>
                      <p className="font-bold tabular-nums">
                        {formatAtrMultiple(sweep.atrMultiple)}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs opacity-80 mb-3">
                    {sweep.description}
                  </p>

                  {sweep.status === "occurred" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/setups/new"
                        className="py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-center text-xs font-medium"
                      >
                        Create Setup →
                      </Link>
                      <Link
                        href="/rb-validator"
                        className="py-2 rounded-lg bg-green-700 hover:bg-green-600 text-center text-xs font-medium"
                      >
                        Validate RB →
                      </Link>
                    </div>
                  )}

                  {sweep.status === "imminent" && (
                    <div className="p-2 rounded-md bg-black/40 border border-current/30 text-center">
                      <p className="text-xs font-semibold">
                        ⚠️ Get ready — sweep is moments away
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {events.length > 0 && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h3 className="text-sm font-semibold text-blue-400 mb-3">
              Recent Sweep Events
            </h3>
            <div className="space-y-2">
              {events.slice(0, 6).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-black border border-gray-800 text-xs"
                >
                  <div>
                    <p className="font-medium">{e.pair}</p>
                    <p className="text-gray-500">
                      {new Date(e.alerted_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums">
                      {formatPrice(e.level_price)}
                    </p>
                    <p className="text-gray-500 uppercase text-[10px]">
                      {e.sweep_status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-900/50">
          <h3 className="text-xs font-semibold text-blue-300 mb-2">
            💡 How Sweep Prediction Works
          </h3>
          <ul className="text-xs text-gray-300 space-y-1 ml-4 list-disc">
            <li>
              <strong>⚡ Likely</strong> — within 2× ATR
            </li>
            <li>
              <strong>🔥 Imminent</strong> — within 1× ATR
            </li>
            <li>
              <strong>✓ Occurred</strong> — price touched the pool
            </li>
            <li>After a sweep, wait for rejection — then look for RB</li>
          </ul>
        </div>
      </div>
    </main>
  );
}