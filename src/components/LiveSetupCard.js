"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { parseZone, getZoneStatus, statusColors } from "@/lib/zoneHelpers";

export default function LiveSetupCard({ setup }) {
  const [livePrice, setLivePrice] = useState(null);
  const [mt5Symbol, setMt5Symbol] = useState(null);

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

        if (data && typeof data.bid === "number") {
          setLivePrice(data.bid);
          setMt5Symbol(data.symbol);

          const zone = parseZone(setup?.rejection_block_zone);
          const status = getZoneStatus(data.bid, zone);
          const direction =
            setup?.d1_bias === "bullish" ? "buy" : "sell";

          if (
            status.status === "in-zone" &&
            !sessionStorage.getItem(`alerted-zone-${setup.id}`)
          ) {
            sessionStorage.setItem(`alerted-zone-${setup.id}`, "true");
            fetch("/api/alerts/telegram", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pair: setup.pair,
                zone: setup.rejection_block_zone,
                price: data.bid,
                direction,
                timeframe: "D1",
                setupId: setup.id,
                status: "in-zone",
              }),
            }).catch(() => {});
          }

          if (
            status.status === "approaching" &&
            !sessionStorage.getItem(`alerted-approach-${setup.id}`)
          ) {
            sessionStorage.setItem(
              `alerted-approach-${setup.id}`,
              "true"
            );
            fetch("/api/alerts/telegram", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pair: setup.pair,
                zone: setup.rejection_block_zone,
                price: data.bid,
                direction,
                timeframe: "D1",
                setupId: setup.id,
                status: "approaching",
              }),
            }).catch(() => {});
          }
        }
      } catch {}
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup?.id]);

  const zone = parseZone(setup?.rejection_block_zone);
  const status = getZoneStatus(livePrice, zone);
  const colors = statusColors(status.status);

  const pair = setup?.pair || "";
  const isVol80 =
    pair.toLowerCase().includes("volatility 80") ||
    pair.toLowerCase().includes("vol_80");

  if (!isVol80) return null;

  const rbScore = setup?.rb_quality_score || 0;

  return (
    <div
      className={`p-4 rounded-lg border ${colors.bg} ${colors.border} transition-all`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
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
            {rbScore > 0 && (
  <span
    className={`text-xs px-2 py-0.5 rounded-full ${
      rbScore >= 9
        ? "bg-green-900/40 text-green-300"
        : rbScore >= 7
        ? "bg-yellow-900/40 text-yellow-300"
        : "bg-red-900/40 text-red-300"
    }`}
  >
    RB {rbScore}/12
  </span>
)}
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

      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-800 text-sm">
        <div>
          <p className="text-gray-500 text-xs">Live Price</p>
          <p className="font-bold tabular-nums text-white">
            {typeof livePrice === "number" ? livePrice.toFixed(2) : "—"}
          </p>
        </div>

        <div>
          <p className="text-gray-500 text-xs">Distance</p>
          <p className={`font-bold tabular-nums ${colors.text}`}>
            {typeof status.distance === "number"
              ? status.status === "in-zone"
                ? "IN ZONE"
                : status.distance.toFixed(2)
              : "—"}
          </p>
        </div>
      </div>

      {status.status === "in-zone" && (
        <div className="mt-3 p-2 rounded-md bg-green-900/60 border border-green-500 text-center">
          <p className="text-green-200 text-sm font-bold">
            🎯 ZONE HIT - Prepare entry
          </p>
        </div>
      )}

      {status.status === "approaching" && (
        <div className="mt-3 p-2 rounded-md bg-yellow-900/40 border border-yellow-700 text-center">
          <p className="text-yellow-200 text-sm font-bold">
            ⚠️ Approaching Zone - Watch closely
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-3">
        <Link
          href={`/setups/${setup.id}`}
          className="py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-center text-gray-300"
        >
          View Setup
        </Link>
        <Link
          href={`/trade?setup=${setup.id}`}
          className={`py-2 rounded-lg text-xs text-center font-medium ${
            status.status === "in-zone"
              ? "bg-green-700 hover:bg-green-600 text-white"
              : "bg-blue-700 hover:bg-blue-600 text-white"
          }`}
        >
          {status.status === "in-zone" ? "Start Trade 🎯" : "Checklist →"}
        </Link>
      </div>
    </div>
  );
}