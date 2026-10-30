"use client";

import { formatPrice } from "@/lib/formatNumbers";

function StagePanel({ title, emoji, stage, accent = "sky" }) {
  const accentMap = {
    sky: "border-sky-800/60 bg-sky-950/20",
    blue: "border-blue-800/60 bg-blue-950/20",
    orange: "border-orange-800/60 bg-orange-950/20",
    purple: "border-purple-800/60 bg-purple-950/20",
    emerald: "border-emerald-800/60 bg-emerald-950/20",
  };
  const cls = accentMap[accent] || accentMap.sky;
  const passedCount = stage?.filter(g => g.pass).length || 0;
  const totalCount = stage?.length || 0;

  return (
    <div className={`ml-8 p-3 rounded-lg border space-y-2 ${cls}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-gray-200">{emoji} {title}</p>
        <span className={`text-[10px] font-bold ${passedCount === totalCount ? "text-green-300" : "text-yellow-300"}`}>
          {passedCount === totalCount ? "READY" : "WAIT"} · {passedCount}/{totalCount}
        </span>
      </div>
      <div className="space-y-1">
        {stage?.map((g, i) => (
          <div key={i} className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${
            g.pass ? "bg-green-950/20 border border-green-800/50" : "bg-red-950/20 border border-red-800/50"
          }`}>
            <span className="text-sm leading-none mt-0.5">{g.pass ? "✅" : "❌"}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${g.pass ? "text-green-200" : "text-red-200"}`}>{g.label}</p>
              {g.detail && <p className={`mt-0.5 ${g.pass ? "text-green-300/80" : "text-red-300/80"}`}>{g.detail}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CrimCard({ data }) {
  if (!data) return null;

  const {
    direction, rcHigh, rcLow, sweepExtreme, idmLevel, chochLevel, entryPrice, stopLoss, takeProfit,
    gates, levels, trade, allGatesPass
  } = data;

  const isBull = direction === "bullish";
  const verdict = allGatesPass && trade ? (isBull ? "BUY" : "SELL") : "WAIT";
  const verdictColor = verdict === "BUY" ? "bg-green-900/40 border-green-600 text-green-200" : verdict === "SELL" ? "bg-red-900/40 border-red-600 text-red-200" : "bg-yellow-950/40 border-yellow-700 text-yellow-200";

  // Parse for the visual
  const H = parseFloat(rcHigh);
  const L = parseFloat(rcLow);
  const wExt = parseFloat(sweepExtreme);
  const idm = parseFloat(idmLevel);
  const choch = parseFloat(chochLevel);
  const entry = parseFloat(entryPrice);
  const tp = parseFloat(takeProfit);

  // If range is invalid, show a simple empty state
  if (isNaN(H) || isNaN(L) || H <= L) {
    return <div className="p-4 rounded-lg bg-gray-900 border border-sky-800 text-gray-400">Enter valid RC High/Low to see the visual.</div>;
  }

  const pad = (H - L) * 0.2;
  const top = Math.max(H, wExt || H) + pad;
  const bottom = Math.min(L, wExt || L) - pad;
  const span = top - bottom;
  const height = 340;

  const y = (p) => {
    if (isNaN(p)) return null;
    return 20 + (height - 40) * (1 - (p - bottom) / span);
  };

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-sky-800 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-sky-300">🎯 CRIM — CRT + IDM + MSS</h2>
          <p className="text-xs text-gray-500 mt-0.5">Reference Candle → Sweep → IDM → MSS → Entry</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full border-2 font-bold ${verdictColor}`}>
          {verdict === "WAIT" ? "⏳" : isBull ? "🟢" : "🔴"} {verdict}
        </span>
      </div>

      {/* VISUAL LADDER */}
      <div className="p-3 rounded-lg bg-black/60 border border-sky-800/60 relative overflow-hidden" style={{ height: `${height}px` }}>
        {/* Premium/Discount Shading */}
        {levels?.ce && (
          <>
            <div className="absolute left-0 right-0 bg-red-950/20" style={{ top: `${y(H)}px`, height: `${y(levels.ce) - y(H)}px` }} />
            <div className="absolute left-0 right-0 bg-green-950/20" style={{ top: `${y(levels.ce)}px`, height: `${y(L) - y(levels.ce)}px` }} />
          </>
        )}

        {/* RC High / Low Lines */}
        <div className="absolute left-0 right-0 flex items-center" style={{ top: `${y(H)}px` }}>
          <div className="flex-1 border-t border-gray-400" />
          <span className="text-[10px] text-gray-300 font-bold px-1 bg-gray-900/90 rounded">RC HIGH {formatPrice(H)}</span>
          <div className="flex-1 border-t border-gray-400" />
        </div>
        <div className="absolute left-0 right-0 flex items-center" style={{ top: `${y(L)}px` }}>
          <div className="flex-1 border-t border-gray-400" />
          <span className="text-[10px] text-gray-300 font-bold px-1 bg-gray-900/90 rounded">RC LOW {formatPrice(L)}</span>
          <div className="flex-1 border-t border-gray-400" />
        </div>

        {/* OTE Band */}
        {levels?.oteZoneLow && levels?.oteZoneHigh && (
          <div className="absolute left-0 right-0 border-y-2 border-dashed border-sky-500/70 bg-sky-900/20" style={{ top: `${y(levels.oteZoneHigh)}px`, height: `${y(levels.oteZoneLow) - y(levels.oteZoneHigh)}px` }}>
            <span className="absolute right-2 top-1 text-[9px] text-sky-200 font-bold bg-sky-950/80 px-1 rounded">OTE 62–79%</span>
          </div>
        )}

        {/* 50% CE */}
        {levels?.ce && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${y(levels.ce)}px` }}>
            <div className="flex-1 border-t-2 border-yellow-400" />
            <span className="text-[10px] text-yellow-200 font-bold px-1 bg-yellow-900/80 rounded">50% CE {formatPrice(levels.ce)}</span>
            <div className="flex-1 border-t-2 border-yellow-400" />
          </div>
        )}

        {/* Sweep */}
        {wExt && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${y(wExt)}px` }}>
            <div className="flex-1 border-t border-red-500" />
            <span className="text-[10px] text-red-200 font-bold px-1 bg-red-900/80 rounded">SWEEP {formatPrice(wExt)}</span>
            <div className="flex-1 border-t border-red-500" />
          </div>
        )}

        {/* IDM */}
        {idm && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${y(idm)}px` }}>
            <div className="flex-1 border-t border-dashed border-purple-400" />
            <span className="text-[10px] text-purple-200 font-bold px-1 bg-purple-900/80 rounded">IDM {formatPrice(idm)}</span>
            <div className="flex-1 border-t border-dashed border-purple-400" />
          </div>
        )}

        {/* CHoCH */}
        {choch && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${y(choch)}px` }}>
            <div className="flex-1 border-t border-dashed border-orange-400" />
            <span className="text-[10px] text-orange-200 font-bold px-1 bg-orange-900/80 rounded">CHoCH {formatPrice(choch)}</span>
            <div className="flex-1 border-t border-dashed border-orange-400" />
          </div>
        )}

        {/* Entry / SL / TP */}
        {entry && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${y(entry)}px` }}>
            <div className="flex-1 border-t border-yellow-400" />
            <span className="text-[10px] text-yellow-200 font-bold px-1 bg-yellow-900/80 rounded">ENTRY {formatPrice(entry)}</span>
            <div className="flex-1 border-t border-yellow-400" />
          </div>
        )}
        {stopLoss && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${y(stopLoss)}px` }}>
            <div className="flex-1 border-t border-red-500" />
            <span className="text-[10px] text-red-200 font-bold px-1 bg-red-900/80 rounded">SL {formatPrice(stopLoss)}</span>
            <div className="flex-1 border-t border-red-500" />
          </div>
        )}
        {tp && (
          <div className="absolute left-0 right-0 flex items-center" style={{ top: `${y(tp)}px` }}>
            <div className="flex-1 border-t border-green-500" />
            <span className="text-[10px] text-green-200 font-bold px-1 bg-green-900/80 rounded">TP {formatPrice(tp)}</span>
            <div className="flex-1 border-t border-green-500" />
          </div>
        )}
      </div>

      <StagePanel title="Part 1: Context (CRT)" emoji="🌍" stage={gates?.context} accent="blue" />
      <StagePanel title="Part 2: Seek & Destroy" emoji="⚡" stage={gates?.sweep} accent="orange" />
      <StagePanel title="Part 3: Structure (IDM + MSS)" emoji="🔍" stage={gates?.structure} accent="purple" />
      <StagePanel title="Part 4: Entry & Risk" emoji="🎯" stage={gates?.entry} accent="emerald" />

      {trade && allGatesPass && (
        <div className="p-4 rounded-lg bg-sky-950/30 border-2 border-sky-700 space-y-3">
          <p className="text-xs font-bold text-sky-200">💰 Trade Setup</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><p className="text-xs text-gray-500">Entry</p><p className="font-bold tabular-nums text-yellow-400">{formatPrice(entry)}</p></div>
            <div><p className="text-xs text-gray-500">Stop Loss</p><p className="font-bold tabular-nums text-red-400">{formatPrice(stopLoss)}</p></div>
            <div><p className="text-xs text-gray-500">Target (RC)</p><p className="font-bold tabular-nums text-green-400">{formatPrice(tp)}</p></div>
            <div><p className="text-xs text-gray-500">RR</p><p className={`font-bold tabular-nums ${trade.rr >= 2 ? "text-green-300" : "text-yellow-300"}`}>1:{trade.rr?.toFixed(2)}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}