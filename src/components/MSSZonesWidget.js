"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import {
  mssInfo,
  compressionInfo,
  computeCompressionLevel,
  distanceToMSSZone,
  priceInMSSZone,
} from "@/lib/mssHelpers";

export default function MSSZonesWidget() {
  const supabase = createClient();
  const [zones, setZones] = useState([]);
  const [livePrice, setLivePrice] = useState(null);
  const [loading, setLoading] = useState(true);

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
        .from("mss_events")
        .select("*")
        .eq("user_id", user.id)
        .eq("zone_status", "active")
        .order("created_at", { ascending: false })
        .limit(10);

      setZones(data || []);
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

  // Find the nearest active zone
  const nearest =
    zones.length > 0 && livePrice != null
      ? [...zones].sort((a, b) => {
          const dA = distanceToMSSZone(livePrice, a) ?? Infinity;
          const dB = distanceToMSSZone(livePrice, b) ?? Infinity;
          return dA - dB;
        })[0]
      : zones[0];

  if (!nearest) {
    return (
      <Link
        href="/mss-zones"
        className="block p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-600 transition"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">MSS Zones</span>
          <span className="text-xs text-blue-400">Open →</span>
        </div>
        <p className="text-lg font-bold text-gray-400">No active zones</p>
        <p className="text-xs text-gray-500 mt-1">
          Log an MSS to create one
        </p>
      </Link>
    );
  }

  const info = mssInfo(nearest.direction);
  const compression = compressionInfo(
    nearest.compression_level ||
      computeCompressionLevel(nearest.nested_rrb_count || 0)
  );
  const distance =
    livePrice != null ? distanceToMSSZone(livePrice, nearest) : null;
  const isInside = livePrice != null && priceInMSSZone(livePrice, nearest);
  const ce =
    Math.round(((nearest.zone_high + nearest.zone_low) / 2) * 100) / 100;

  return (
    <Link
      href="/mss-zones"
      className={`block p-4 rounded-lg border-2 transition ${info.color}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm opacity-70">Nearest MSS Zone</span>
        <span className="text-xs text-blue-400">Open →</span>
      </div>
      <p className="text-2xl mb-1">{info.emoji}</p>
      <p className="text-lg font-bold">{info.label}</p>
      <p className="text-xs opacity-70 mt-1">
        {nearest.pair} · {nearest.timeframe}
      </p>
      <p className="text-xs text-yellow-300 mt-1">
        ⭐ CE: {formatPrice(ce)}
      </p>
      {(nearest.nested_rrb_count || 0) > 0 && (
        <p className="text-xs mt-1 opacity-80">
          {compression.emoji} {nearest.nested_rrb_count}× defense
        </p>
      )}
      {isInside ? (
        <p className="text-xs mt-1 font-bold animate-pulse">
          ● PRICE IN ZONE
        </p>
      ) : distance != null ? (
        <p className="text-xs mt-1 opacity-70">
          {distance.toFixed(2)} away
        </p>
      ) : null}
    </Link>
  );
}