"use client";

import { useEffect, useState } from "react";
import { connectToTickDB } from "@/lib/tickdbApi";

export default function GoldTicker() {
  const [price, setPrice] = useState(null);
  const [change, setChange] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_TICKDB_API_KEY;
    if (!apiKey) return;

    const disconnect = connectToTickDB(["XAUUSD"], apiKey, (tick) => {
      setPrice(tick.quote);
      setChange(tick.change24h);
      setConnected(true);
    });

    return () => disconnect();
  }, []);

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">XAUUSD (Gold)</span>
        <span
          className={`w-2 h-2 rounded-full ${
            connected ? "bg-green-500 animate-pulse" : "bg-gray-600"
          }`}
        />
      </div>

      <div className="text-2xl font-bold tabular-nums">
        {price !== null ? `$${price.toFixed(2)}` : "—"}
      </div>

      {change !== null && (
        <p
          className={`text-xs mt-1 ${
            parseFloat(change) >= 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {parseFloat(change) >= 0 ? "+" : ""}
          {parseFloat(change).toFixed(2)}% (24h)
        </p>
      )}

      <p className="text-xs text-gray-500 mt-1">TickDB feed</p>
    </div>
  );
}