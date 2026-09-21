"use client";

import { useEffect, useState } from "react";
import {
  calculateLotSize,
  calculateRR,
  suggestStopLoss,
  suggestTakeProfit,
} from "@/lib/riskEngine";
import { parseZone } from "@/lib/zoneHelpers";

export default function EntryCalculator({
  setup,
  profile,
  livePrice,
  onEnter,
  submitting,
}) {
  const direction = setup.d1_bias === "bullish" ? "buy" : "sell";
  const zone = parseZone(setup.rejection_block_zone);

  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  // Auto-fill entry price from live price when component mounts
  useEffect(() => {
    if (livePrice && !entryPrice) {
      setEntryPrice(livePrice.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePrice]);

  // Auto-suggest SL when entry price changes
  useEffect(() => {
    if (entryPrice && zone && !stopLoss) {
      const suggested = suggestStopLoss(
        direction,
        zone,
        parseFloat(entryPrice)
      );
      if (suggested) setStopLoss(suggested.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryPrice, zone]);

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
  }, [entryPrice, stopLoss]);

  const accountSize = profile?.account_size || 0;
  const riskPercent = profile?.risk_percent || 1;

  const { lotSize, riskAmount, slDistance } = calculateLotSize({
    accountSize,
    riskPercent,
    entryPrice: parseFloat(entryPrice) || 0,
    stopLoss: parseFloat(stopLoss) || 0,
  });

  const rr = calculateRR(
    parseFloat(entryPrice) || 0,
    parseFloat(stopLoss) || 0,
    parseFloat(takeProfit) || 0
  );

  const rrWarning = rr > 0 && rr < 1;

  function handleEnter() {
    if (!entryPrice || !stopLoss || !takeProfit) return;

    onEnter({
      entry_price: parseFloat(entryPrice),
      stop_loss: parseFloat(stopLoss),
      take_profit: parseFloat(takeProfit),
      lot_size: lotSize,
      risk_percent: riskPercent,
      rr_ratio: rr,
    });
  }

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-4">
      <h2 className="text-lg font-semibold text-blue-400">
        Entry Calculator
      </h2>

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
            className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Calculation summary */}
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
              rrWarning ? "text-red-400" : "text-green-400"
            }`}
          >
            {rr > 0 ? `1:${rr}` : "—"}
          </p>
        </div>
      </div>

      {rrWarning && (
        <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
          ⚠️ RR below 1:1 — your blueprint requires ≥ 1:1. Adjust SL or TP.
        </div>
      )}

      <button
        type="button"
        onClick={handleEnter}
        disabled={submitting || !entryPrice || !stopLoss || !takeProfit || rrWarning}
        className="w-full py-4 rounded-lg bg-green-700 hover:bg-green-600 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Entering trade..." : "ENTER TRADE"}
      </button>

      <p className="text-xs text-gray-500 text-center">
        This creates the trade record. Manage it in Journal.
      </p>
    </div>
  );
}