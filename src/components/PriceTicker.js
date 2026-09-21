"use client";

import { useEffect, useState } from "react";
import { connectToDeriv } from "@/lib/derivApi";

export default function PriceTicker({ symbol, label, source = "deriv" }) {
  const [price, setPrice] = useState(null);
  const [prevPrice, setPrevPrice] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (source === "deriv") {
      const disconnect = connectToDeriv(symbol, (tick) => {
        setPrevPrice(price);
        setPrice(tick.quote);
        setConnected(true);
      });

      return () => disconnect();
    }
  }, [symbol, source]);

  const direction =
    price !== null && prevPrice !== null
      ? price > prevPrice
        ? "up"
        : price < prevPrice
        ? "down"
        : "flat"
      : "flat";

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <span
          className={`w-2 h-2 rounded-full ${
            connected ? "bg-green-500 animate-pulse" : "bg-gray-600"
          }`}
        />
      </div>

      <div
        className={`text-2xl font-bold tabular-nums transition-colors ${
          direction === "up"
            ? "text-green-400"
            : direction === "down"
            ? "text-red-400"
            : "text-white"
        }`}
      >
        {price !== null ? price.toFixed(2) : "—"}
      </div>

      <p className="text-xs text-gray-500 mt-1">
        {source === "deriv" ? "Deriv feed (reference)" : "TickDB feed"}
      </p>
    </div>
  );
}