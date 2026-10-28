"use client";

import { formatPrice } from "@/lib/formatNumbers";

// ============================================================
// Sub-components
// ============================================================

function ProbabilityMeter({ prediction, probability, confidence }) {
  const colorMap = {
    BUY: "text-green-400",
    SELL: "text-red-400",
    WAIT: "text-yellow-400",
  };
  const bgMap = {
    BUY: "bg-green-500",
    SELL: "bg-red-500",
    WAIT: "bg-yellow-500",
  };
  const borderMap = {
    BUY: "border-green-700 bg-green-950/20",
    SELL: "border-red-700 bg-red-950/20",
    WAIT: "border-yellow-700 bg-yellow-950/20",
  };

  const color = colorMap[prediction] || colorMap.WAIT;
  const bg = bgMap[prediction] || bgMap.WAIT;
  const border = borderMap[prediction] || borderMap.WAIT;

  const confLabel = {
    high: "🟢 High Confidence",
    medium: "🟡 Medium Confidence",
    low: "🔴 Low Confidence",
  }[confidence] || "⚪ Unknown";

  return (
    <div className={`p-4 rounded-lg border-2 ${border} space-y-3`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Oracle Prediction</p>
          <p className={`text-3xl font-bold ${color}`}>
            {prediction === "BUY" ? "🟢 BUY" : prediction === "SELL" ? "🔴 SELL" : "⏳ WAIT"}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${color}`}>{probability}%</p>
          <p className="text-[10px] text-gray-500">probability</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-800 rounded overflow-hidden">
        <div
          className={`h-full ${bg} transition-all`}
          style={{ width: `${probability}%` }}
        />
      </div>

      <p className="text-xs text-gray-400 text-center">{confLabel}</p>
    </div>
  );
}

function LayerRow({ timeframe, layer, index }) {
  const status = layer.ready ? "ready" : "wait";
  const emoji = layer.ready ? "✅" : "⚠️";
  
  return (
    <div className={`p-2 rounded border text-xs ${
      layer.ready
        ? "bg-green-950/10 border-green-900/40"
        : "bg-yellow-950/10 border-yellow-900/40"
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[10px] text-gray-500 font-mono w-4">{index + 1}</span>
          <span className={`text-sm ${layer.ready ? "text-green-300" : "text-yellow-300"}`}>{emoji}</span>
          <span className="font-bold text-white text-xs shrink-0">{timeframe}</span>
          <span className="text-gray-400 text-[11px] truncate">{layer.narrative}</span>
        </div>
        <span className={`text-[10px] font-bold shrink-0 ${layer.ready ? "text-green-300" : "text-yellow-300"}`}>
          {layer.score}%
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Main Oracle Card
// ============================================================
export default function OracleCard({ data }) {
  if (!data) return null;

  const {
    weekly, daily, h4, h1, m15, m5, m1, execution,
    prediction, confidence, probability, narrative,
    warnings, doctrineScore, layersPassed, totalLayers,
  } = data;

  const layers = [
    { timeframe: "Weekly",   layer: weekly },
    { timeframe: "Daily",    layer: daily },
    { timeframe: "4H",       layer: h4 },
    { timeframe: "1H",       layer: h1 },
    { timeframe: "15M",      layer: m15 },
    { timeframe: "5M",       layer: m5 },
    { timeframe: "1M",       layer: m1 },
    { timeframe: "Execution", layer: execution },
  ];

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-indigo-800 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-indigo-300">🧠 IFS Oracle — Master Chart Reader</h2>
          <p className="text-xs text-gray-500 mt-0.5">Weekly → Daily → 4H → 1H → 15M → 5M → 1M → Execution</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-indigo-700 bg-indigo-900/40 text-indigo-200 font-bold">
            📊 {layersPassed}/{totalLayers} layers
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
            doctrineScore >= 90 ? "bg-green-900/40 border-green-700 text-green-200"
            : doctrineScore >= 70 ? "bg-yellow-900/40 border-yellow-700 text-yellow-200"
            : doctrineScore >= 40 ? "bg-orange-900/40 border-orange-700 text-orange-200"
            : "bg-red-900/40 border-red-700 text-red-200"
          }`}>
            Doctrine {doctrineScore}/100
          </span>
        </div>
      </div>

      {/* Prediction Meter */}
      <ProbabilityMeter prediction={prediction} probability={probability} confidence={confidence} />

      {/* The 8 Layers */}
      <div className="space-y-1">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Layer Scoreboard</p>
        {layers.map((l, i) => (
          <LayerRow key={l.timeframe} timeframe={l.timeframe} layer={l.layer} index={i} />
        ))}
      </div>

      {/* The Full Narrative */}
      {narrative && (
        <div className="p-3 rounded-lg bg-black border border-indigo-900/40 space-y-1.5">
          <p className="text-[10px] text-indigo-300 uppercase tracking-wider font-bold">📖 The Narrative</p>
          <p className="text-xs text-gray-300 leading-relaxed">{narrative}</p>
        </div>
      )}

      {/* Execution Summary */}
      {execution.ready && (
        <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-800 space-y-2">
          <p className="text-[10px] text-indigo-300 uppercase tracking-wider font-bold">💰 Execution Plan</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {data.entryPrice && (
              <div>
                <p className="text-gray-500 text-[10px]">Entry</p>
                <p className="font-bold text-yellow-400 tabular-nums">{formatPrice(data.entryPrice)}</p>
              </div>
            )}
            {data.stopLoss && (
              <div>
                <p className="text-gray-500 text-[10px]">Stop Loss</p>
                <p className="font-bold text-red-400 tabular-nums">{formatPrice(data.stopLoss)}</p>
              </div>
            )}
            {data.targetPrice && (
              <div>
                <p className="text-gray-500 text-[10px]">Final Target</p>
                <p className="font-bold text-green-400 tabular-nums">{formatPrice(data.targetPrice)}</p>
              </div>
            )}
            {data.tp1Price && (
              <div>
                <p className="text-gray-500 text-[10px]">TP1 (Partial)</p>
                <p className="font-bold text-green-300 tabular-nums">{formatPrice(data.tp1Price)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="p-3 rounded-lg bg-yellow-950/20 border border-yellow-800/60 space-y-1">
          <p className="text-[10px] text-yellow-300 uppercase tracking-wider font-bold">⚠️ Doctrine Drift ({warnings.length})</p>
          <ul className="text-xs text-yellow-200/90 space-y-0.5 ml-3 list-disc">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}