"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import { getActiveSweeps } from "@/lib/sweepHelpers";

export default function SweepWidget() {
  const supabase = createClient();
  const [levels, setLevels] = useState([]);
  const [livePrice, setLivePrice] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load liquidity levels for Vol 80
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("liquidity_maps")
        .select("*")
        .eq("user_id", user.id)
        .eq("pair", "Volatility 80")
        .eq("swept", false);

      setLevels(data || []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll live price
  useEffect(() => {
    async function fetchPrice() {
      try {
        const bridgeUrl = process.env.NEXT_PUBLIC_MT5_BRIDGE_URL;
        const url = bridgeUrl
          ? `${bridgeUrl}/api/price/mt5`
          : "/api/price/mt5";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.bid === "number") setLivePrice(data.bid);
      } catch {}
    }
    fetchPrice();
    const interval = setInterval(fetchPrice, 2000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;

  // Use ATR = 400 as default (user can change on the /sweeps page)
  const defaultAtr = 400;
  const active = getActiveSweeps(levels, livePrice, defaultAtr);
  const top = active[0];

  if (!top) {
    return (
      <Link
        href="/sweeps"
        className="block p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-600 transition"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Sweep Watch</span>
          <span className="text-xs text-blue-400">Open →</span>
        </div>
        <p className="text-lg font-bold text-gray-400">
          No active sweeps
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {levels.length} level{levels.length === 1 ? "" : "s"} watched
        </p>
      </Link>
    );
  }

  return (
    <Link
      href="/sweeps"
      className={`block p-4 rounded-lg border-2 transition ${top.sweep.color}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm opacity-70">Sweep Watch</span>
        <span className="text-xs text-blue-400">Open →</span>
      </div>
      <p className="text-2xl mb-1">{top.sweep.emoji}</p>
      <p className="text-lg font-bold">{top.sweep.label}</p>
      <p className="text-xs opacity-70 mt-1">
        {top.pair} · {formatPrice(top.price)}
      </p>
      <p className="text-xs opacity-60 mt-1">
        {top.sweep.distance?.toFixed(2)} away
      </p>
    </Link>
  );
}