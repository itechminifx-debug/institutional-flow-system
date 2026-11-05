"use client";

import { formatPrice } from "@/lib/formatNumbers";

function ProbabilityMeter({ layersPassed, totalLayers, doctrineScore }) {
  const isReady = layersPassed === totalLayers;
  const colorMap = { ready: "text-teal-400", waiting: "text-yellow-400" };
  const bgMap = { ready: "bg-teal-500", waiting: "bg-yellow-500" };
  const borderMap = { ready: "border-teal-700 bg-teal-950/20", waiting: "border-yellow-700 bg-yellow-950/20" };
  const status = isReady ? "ready" : "waiting";

  return (
    <div className={`p-4 rounded-lg border-2 ${borderMap[status]} space-y-3`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">CRT Verdict</p>
          <p className={`text-3xl font-bold ${colorMap[status]}`}>
            {isReady ? "🎯 READY" : "⏳ WAIT"}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${colorMap[status]}`}>{doctrineScore}/100</p>
          <p className="text-[10px] text-gray-500">Score</p>
        </div>
      </div>
      <div className="w-full h-2 bg-gray-800 rounded overflow-hidden">
        <div className={`h-full ${bgMap[status]} transition-all`} style={{ width: `${doctrineScore}%` }} />
      </div>
      <p className="text-xs text-gray-400 text-center">{layersPassed} of {totalLayers} stages complete</p>
    </div>
  );
}

function LayerRow({ stageName, layer, index }) {
  const emoji = layer.ready ? "✅" : "⚠️";
  return (
    <div className={`p-2 rounded border text-xs ${layer.ready ? "bg-teal-950/10 border-teal-900/40" : "bg-yellow-950/10 border-yellow-900/40"}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[10px] text-gray-500 font-mono w-4">{index + 1}</span>
          <span className={`text-sm ${layer.ready ? "text-teal-300" : "text-yellow-300"}`}>{emoji}</span>
          <span className="font-bold text-white text-xs shrink-0">{stageName}</span>
        </div>
        <span className={`text-[10px] font-bold shrink-0 ${layer.ready ? "text-teal-300" : "text-yellow-300"}`}>{layer.score}%</span>
      </div>
      <div className="ml-8 mt-2 space-y-1">
        {layer.gates.map((g, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[11px]">
            <span className={g.pass ? "text-green-400" : "text-red-400"}>{g.pass ? "✓" : "✗"}</span>
            <span className={g.pass ? "text-gray-400" : "text-red-200"}>
              {g.label} {g.detail && !g.pass ? `- ${g.detail}` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CrtCard({ data }) {
  if (!data) return null;

  const { context, liquidity, structure, entry, zones, narrative, doctrineScore, layersPassed, totalLayers } = data;

  const stages = [
    { name: "Context",   layer: context },
    { name: "Liquidity", layer: liquidity },
    { name: "Structure", layer: structure },
    { name: "Entry",     layer: entry },
  ];

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-teal-800 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-teal-300">🕯️ CRT — Candle Range Theory</h2>
          <p className="text-xs text-gray-500 mt-0.5">Sequence: 4H Range → 15M Sweep → 1M Entry</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-teal-700 bg-teal-900/40 text-teal-200 font-bold">
            📊 {layersPassed}/{totalLayers} stages
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
            doctrineScore >= 90 ? "bg-green-900/40 border-green-700 text-green-200"
            : doctrineScore >= 70 ? "bg-yellow-900/40 border-yellow-700 text-yellow-200"
            : doctrineScore >= 40 ? "bg-orange-900/40 border-orange-700 text-orange-200"
            : "bg-red-900/40 border-red-700 text-red-200"
          }`}>
            Score {doctrineScore}/100
          </span>
        </div>
      </div>

      {zones && (
        <div className="p-3 rounded-lg bg-black border border-teal-800/40 space-y-2">
          <p className="text-[10px] text-teal-300 uppercase tracking-wider font-bold">📐 CRT Range Zones</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-gray-500 text-[10px]">50% Midpoint (CE)</p>
              <p className="font-bold text-white tabular-nums">{zones.ce ? formatPrice(zones.ce) : "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-[10px]">OTE Low (61.8%)</p>
              <p className="font-bold text-amber-200 tabular-nums">{zones.oteLow ? formatPrice(zones.oteLow) : "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-[10px]">OTE High (79%)</p>
              <p className="font-bold text-amber-200 tabular-nums">{zones.oteHigh ? formatPrice(zones.oteHigh) : "—"}</p>
            </div>
          </div>
        </div>
      )}

      <ProbabilityMeter layersPassed={layersPassed} totalLayers={totalLayers} doctrineScore={doctrineScore} />

      <div className="space-y-1">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Stage Scoreboard</p>
        {stages.map((s, i) => (
          <LayerRow key={s.name} stageName={s.name} layer={s.layer} index={i} />
        ))}
      </div>

      {narrative && (
        <div className="p-3 rounded-lg bg-black border border-teal-900/40 space-y-1.5">
          <p className="text-[10px] text-teal-300 uppercase tracking-wider font-bold">📖 The Narrative</p>
          <p className="text-xs text-gray-300 leading-relaxed">{narrative}</p>
        </div>
      )}

      {entry.ready && (
        <div className="p-3 rounded-lg bg-teal-950/20 border border-teal-800 space-y-2">
          <p className="text-[10px] text-teal-300 uppercase tracking-wider font-bold">💰 Trade Plan</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {data.entryPrice && <div><p className="text-gray-500 text-[10px]">Entry</p><p className="font-bold text-yellow-400 tabular-nums">{formatPrice(data.entryPrice)}</p></div>}
            {data.stopLoss && <div><p className="text-gray-500 text-[10px]">Stop Loss</p><p className="font-bold text-red-400 tabular-nums">{formatPrice(data.stopLoss)}</p></div>}
            {data.targetPrice && <div><p className="text-gray-500 text-[10px]">Target</p><p className="font-bold text-green-400 tabular-nums">{formatPrice(data.targetPrice)}</p></div>}
          </div>
        </div>
      )}
    </div>
  );
}