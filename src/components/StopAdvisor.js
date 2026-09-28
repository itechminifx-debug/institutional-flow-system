"use client";

import { useState, useEffect } from "react";
import {
  computeRecommendedStop,
  validateStopDistance,
  computeLotFromStop,
} from "@/lib/stopAdvisor";

export default function StopAdvisor({
  direction,
  entryPrice,
  atr,
  accountSize,
  riskPercent,
  onApplyStop,
}) {
  const [wickExtreme, setWickExtreme] = useState("");
  const [manualSl, setManualSl] = useState("");
  const [applied, setApplied] = useState(false);

  // Auto-compute recommended SL when wick extreme is set
  const recommended = wickExtreme
    ? computeRecommendedStop({
        direction,
        wickExtreme,
        atr,
      })
    : null;

  // Use manual SL if entered, else recommended
  const effectiveSl = manualSl || recommended?.stopLoss || "";

  // Validate the stop distance
  const validation = validateStopDistance({
    entry: entryPrice,
    stopLoss: effectiveSl,
    atr,
  });

  // Compute lot size
  const lot = computeLotFromStop({
    accountSize,
    riskPercent,
    stopDistance: validation.distance,
  });

  function handleApply() {
    if (!effectiveSl || !validation.distance) return;
    if (onApplyStop) {
      onApplyStop({
        stopLoss: parseFloat(effectiveSl),
        distance: validation.distance,
        atrMultiple: validation.atrMultiple,
        lotSize: lot.lotSize,
      });
    }
    setApplied(true);
    setTimeout(() => setApplied(false), 1500);
  }

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-blue-400">
            🎯 Stop Placement Advisor
          </h2>
          <p className="text-gray-500 text-xs mt-1">
            Recommended stop based on wick extreme + ATR buffer
          </p>
        </div>
      </div>

      {/* Input: Wick Extreme */}
      <div>
        <label className="block text-xs mb-1 text-gray-400">
          Wick Extreme (the tip of the rejection wick)
        </label>
        <input
          type="number"
          step="any"
          value={wickExtreme}
          onChange={(e) => {
            setWickExtreme(e.target.value);
            setManualSl("");
          }}
          placeholder={
            direction === "buy"
              ? "e.g. 208400 (low of the wick)"
              : "e.g. 211600 (high of the wick)"
          }
          className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
        />
      </div>

      {/* Recommended SL */}
      {recommended && recommended.valid && (
        <div className="p-3 rounded-lg bg-black border border-blue-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-300 font-semibold">
              Recommended Stop Loss
            </span>
            <span className="text-lg font-bold tabular-nums text-blue-300">
              {recommended.stopLoss.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Wick: {recommended.wick.toFixed(2)} · Buffer:{" "}
            {recommended.buffer.toFixed(2)} ({recommended.atr.toFixed(2)} × 0.2)
          </p>
        </div>
      )}

      {/* Manual Override */}
      {wickExtreme && (
        <div>
          <label className="block text-xs mb-1 text-gray-400">
            Or enter SL manually
          </label>
          <input
            type="number"
            step="any"
            value={manualSl}
            onChange={(e) => setManualSl(e.target.value)}
            placeholder="Override recommended SL"
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
          />
        </div>
      )}

      {/* Validation */}
      {effectiveSl && (
        <div className={`p-3 rounded-lg border ${validation.color}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">
              {validation.emoji} {validation.label}
            </span>
            <span className="text-xs opacity-80">
              {validation.distance?.toFixed(2)} pts
            </span>
          </div>
          <p className="text-xs opacity-90">{validation.description}</p>

          {validation.atrMultiple !== null &&
            validation.atrMultiple !== undefined && (
              <p className="text-xs opacity-70 mt-2">
                ATR Multiple: {validation.atrMultiple.toFixed(2)}× (healthy
                range: 1× - 3×)
              </p>
            )}
        </div>
      )}

      {/* Lot Size */}
      {lot.lotSize > 0 && (
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-black border border-gray-800">
          <div>
            <p className="text-xs text-gray-500">Lot Size</p>
            <p className="text-lg font-bold tabular-nums text-white">
              {lot.lotSize.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Risk ($)</p>
            <p className="text-lg font-bold tabular-nums text-yellow-400">
              ${lot.riskAmount.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Apply button */}
      {effectiveSl && validation.status === "ok" && (
        <button
          type="button"
          onClick={handleApply}
          className="w-full py-3 rounded-lg bg-green-700 hover:bg-green-600 font-medium text-sm"
        >
          {applied
            ? "✓ Applied to Entry Calculator"
            : "📥 Apply this Stop to Entry Calculator"}
        </button>
      )}

      {effectiveSl && validation.status === "too_tight" && (
        <p className="text-xs text-yellow-400 text-center">
          ⚠️ Consider widening the stop — tight stops get swept easily
        </p>
      )}

      {effectiveSl && validation.status === "too_wide" && (
        <p className="text-xs text-red-400 text-center">
          🔴 Stop too wide — check if there is a closer wick to reference
        </p>
      )}

      {/* Info card */}
      <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900/50">
        <h3 className="text-xs font-semibold text-blue-300 mb-1">
          💡 How it works
        </h3>
        <ul className="text-xs text-gray-300 space-y-0.5 ml-4 list-disc">
          <li>SL = Wick extreme ± (ATR × 0.2 buffer)</li>
          <li>Too Tight: &lt; 1× ATR (swept easily)</li>
          <li>OK: 1× - 3× ATR</li>
          <li>Too Wide: &gt; 3× ATR (RR suffers)</li>
        </ul>
      </div>
    </div>
  );
}