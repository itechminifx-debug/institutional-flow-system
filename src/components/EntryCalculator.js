"use client";

import { useEffect, useState } from "react";
import {
  calculateLotSize,
  calculateRR,
  suggestStopLoss,
  suggestTakeProfit,
  validateTrade,
} from "@/lib/riskEngine";
import { parseZone } from "@/lib/zoneHelpers";

export default function EntryCalculator({
  setup,
  profile,
  livePrice,
  onEnter,
  submitting,
  newsBlocked = false,
}) {
  const direction = setup.d1_bias === "bullish" ? "buy" : "sell";
  const zone = parseZone(setup.rejection_block_zone);

  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [touched, setTouched] = useState({
    entry: false,
    sl: false,
    tp: false,
  });

  // Auto-fill entry price from live price
  useEffect(() => {
    if (livePrice && !entryPrice) {
      setEntryPrice(livePrice.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePrice]);

  // Auto-suggest SL when entry is set
  useEffect(() => {
    if (entryPrice && zone && !stopLoss) {
      const suggested = suggestStopLoss(direction, zone);
      if (suggested) setStopLoss(suggested.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryPrice, zone, direction]);

  // Auto-suggest TP when SL is set
  useEffect(() => {
    if (entryPrice && stopLoss && !takeProfit) {
      const suggested = suggestTakeProfit(
        direction,
        parseFloat(entryPrice),
        parseFloat(stopLoss),
        2
      );
      if (suggested) setTakeProfit(suggested.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryPrice, stopLoss, direction]);

  const accountSize = profile?.account_size || 0;
  const riskPercent = profile?.risk_percent || 1;

  const entryNum = parseFloat(entryPrice) || 0;
  const slNum = parseFloat(stopLoss) || 0;
  const tpNum = parseFloat(takeProfit) || 0;

  const { lotSize, riskAmount, slDistance } = calculateLotSize({
    accountSize,
    riskPercent,
    entryPrice: entryNum,
    stopLoss: slNum,
  });

  const rr = calculateRR(entryNum, slNum, tpNum);
  const validationErrors = validateTrade({
    direction,
    entryPrice: entryNum,
    stopLoss: slNum,
    takeProfit: tpNum,
  });
  const isValid = validationErrors.length === 0;
  const rrWarning = rr > 0 && rr < 1;

  function handleEnter() {
    if (!isValid || rrWarning) return;
    onEnter({
      entry_price: entryNum,
      stop_loss: slNum,
      take_profit: tpNum,
      lot_size: lotSize,
      risk_percent: riskPercent,
      rr_ratio: rr,
    });
  }

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-blue-400">
          Entry Calculator
        </h2>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            direction === "buy"
              ? "bg-green-900/40 text-green-300"
              : "bg-red-900/40 text-red-300"
          }`}
        >
          {direction.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm mb-2 text-gray-300">
            Entry Price
          </label>
          <input
            type="number"
            step="any"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, entry: true }))}
            className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm mb-2 text-gray-300">
            Stop Loss
          </label>
          <input
            type="number"
            step="any"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, sl: true }))}
            className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm mb-2 text-gray-300">
            Take Profit
          </label>
          <input
            type="number"
            step="any"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, tp: true }))}
            className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg bg-black border border-gray-800">
        <div>
          <p className="text-gray-500 text-xs">Lot Size</p>
          <p className="font-bold text-white tabular-nums">
            {lotSize.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Risk ($)</p>
          <p className="font-bold text-yellow-400 tabular-nums">
            ${riskAmount.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">SL Distance</p>
          <p className="font-bold text-white tabular-nums">
            {slDistance.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">RR Ratio</p>
          <p
            className={`font-bold tabular-nums ${
              rr > 0 && rr < 1
                ? "text-red-400"
                : rr >= 1
                ? "text-green-400"
                : "text-gray-500"
            }`}
          >
            {rr > 0 ? `1:${rr}` : "—"}
          </p>
        </div>
      </div>

      {/* Validation errors */}
      {(touched.entry || touched.sl || touched.tp) &&
        validationErrors.length > 0 && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm space-y-1">
            {validationErrors.map((err, i) => (
              <p key={i}>• {err}</p>
            ))}
          </div>
        )}

      {rrWarning && (
        <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
          ⚠️ RR below 1:1 — your blueprint requires ≥ 1:1.
        </div>
      )}

      {newsBlocked && (
  <div className="p-3 rounded-lg bg-red-950/60 border border-red-700 text-red-200 text-sm">
    🚫 Trade blocked — high-impact news window active. Wait 60 minutes after
    the release.
  </div>
)}

<button
  type="button"
  onClick={handleEnter}
  disabled={submitting || !isValid || rrWarning || newsBlocked}
  className="w-full py-4 rounded-lg bg-green-700 hover:bg-green-600 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
>
  {submitting
    ? "Entering trade..."
    : newsBlocked
    ? "TRADE BLOCKED — News Window"
    : "ENTER TRADE"}
</button>

      <p className="text-xs text-gray-500 text-center">
        Validates direction, calculates lot size, and logs the trade.
      </p>
    </div>
  );
}