"use client";

import { useEffect, useState } from "react";

export default function Mt5Ticker() {
  const [tick, setTick] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastReceived, setLastReceived] = useState(null);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch("/api/price/mt5", { cache: "no-store" });
        const data = await res.json();
        if (data.bid) {
          setTick(data);
          setConnected(true);
          setLastReceived(new Date());
        }
      } catch (err) {
        // silent
      }
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check freshness — if no update in 5s, show disconnected
  useEffect(() => {
    if (!lastReceived) return;
    const check = setInterval(() => {
      if (Date.now() - lastReceived.getTime() > 5000) {
        setConnected(false);
      }
    }, 1000);
    return () => clearInterval(check);
  }, [lastReceived]);

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">
          {tick?.symbol || "MT5 (Headway)"}
        </span>
        <span
          className={`w-2 h-2 rounded-full ${
            connected ? "bg-green-500 animate-pulse" : "bg-gray-600"
          }`}
        />
      </div>

      <div className="flex justify-between items-baseline">
        <div className="text-2xl font-bold tabular-nums text-white">
          {tick?.bid ? tick.bid.toFixed(2) : "—"}
        </div>
      </div>

      {tick?.bid && tick?.ask && (
        <div className="flex gap-3 text-xs text-gray-500 mt-1 tabular-nums">
          <span>Bid {tick.bid.toFixed(2)}</span>
          <span>Ask {tick.ask.toFixed(2)}</span>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-1">
        {connected ? "Headway MT5 feed" : "Waiting for bridge..."}
      </p>
    </div>
  );
}