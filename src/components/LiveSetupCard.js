"use client";

import { useEffect, useState } from "react";
import { parseZone, getZoneStatus, statusColors } from "@/lib/zoneHelpers";

export default function LiveSetupCard({ setup }) {
  const [livePrice, setLivePrice] = useState(null);
  const [mt5Symbol, setMt5Symbol] = useState(null);

  // Poll MT5 price every second
  useEffect(() => {
    async function fetchPrice() {
      try {
        const bridgeUrl = process.env.NEXT_PUBLIC_MT5_BRIDGE_URL;
        const url = bridgeUrl ? `${bridgeUrl}/api/price/mt5` : "/api/price/mt5";
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        if (data.bid) {
          setLivePrice(data.bid);
          setMt5Symbol(data.symbol);
        }
      } catch {}
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, 1000);
   // Trigger alert once per session per setup
if (status.status === "in-zone" && !sessionStorage.getItem(`alerted-${setup.id}`)) {
  sessionStorage.setItem(`alerted-${setup.id}`, "true");
  fetch("/api/alerts/telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pair: setup.pair,
      zone: setup.rejection_block_zone,
      price: livePrice,
      direction: setup.d1_bias === "bullish" ? "buy" : "sell",
    }),
  });
}   
    return () => clearInterval(interval);
  }, []);

  const zone = parseZone(setup.rejection_block_zone);
  const status = getZoneStatus(livePrice, zone);
  const colors = statusColors(status.status);

  // Only watch setups whose pair starts with "Volatility 80" or "VOL_80"
  const isVol80 =
    setup.pair.toLowerCase().includes("volatility 80") ||
    setup.pair.toLowerCase().includes("vol_80");

  if (!isVol80) {
    return null; // Skip other pairs for now
  }

  return (
    <div
      className={`p-4 rounded-lg border ${colors.bg} ${colors.border} transition-all`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{setup.pair}</h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                setup.d1_bias === "bullish"
                  ? "bg-green-900/40 text-green-300"
                  : "bg-red-900/40 text-red-300"
              }`}
            >
              {setup.d1_bias}
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-1">
            Zone: {setup.rejection_block_zone || "—"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
          <span className={`text-xs font-medium ${colors.text}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Live Price + Zone Info */}
      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-800 text-sm">
        <div>
          <p className="text-gray-500 text-xs">Live Price</p>
          <p className="font-bold tabular-nums text-white">
            {livePrice !== null ? livePrice.toFixed(2) : "—"}
          </p>
        </div>

        <div>
          <p className="text-gray-500 text-xs">Distance</p>
          <p className={`font-bold tabular-nums ${colors.text}`}>
            {status.distance !== null
              ? status.status === "in-zone"
                ? "IN ZONE"
                : status.distance.toFixed(2)
              : "—"}
          </p>
        </div>
      </div>

      {/* Zone Hit Alert */}
      {status.status === "in-zone" && (
        <div className="mt-3 p-2 rounded-md bg-green-900/60 border border-green-500 text-center">
          <p className="text-green-200 text-sm font-bold">
            🎯 ZONE HIT — Prepare entry
          </p>
        </div>
      )}
    </div>
  );
}