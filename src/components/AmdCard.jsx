"use client";

import { formatPrice } from "@/lib/formatNumbers";
import { amdTypeInfo, AMD_CHECKLIST } from "@/lib/amdEngine";

function PhaseBadge({ phase }) {
  const map = {
    A: { label: "Accumulation", cls: "bg-blue-900/40 text-blue-300 border-blue-700", emoji: "🟦" },
    M: { label: "Manipulation", cls: "bg-red-900/40 text-red-300 border-red-700", emoji: "🟥" },
    D: { label: "Distribution", cls: "bg-green-900/40 text-green-300 border-green-700", emoji: "🟩" },
    X: { label: "Mindset", cls: "bg-purple-900/40 text-purple-300 border-purple-700", emoji: "🧠" },
  };
  const info = map[phase] || map.A;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${info.cls}`}>
      {info.emoji} {info.label}
    </span>
  );
}

function GateRow({ gate, meta }) {
  const pass = gate?.pass;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${pass ? "bg-green-950/20 border-green-800" : "bg-red-950/20 border-red-800"}`}>
      <span className="text-lg leading-none mt-0.5">{pass ? "✅" : "❌"}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-bold ${pass ? "text-green-200" : "text-red-200"}`}>
            {meta.number}. {meta.label}
          </p>
          <PhaseBadge phase={meta.phase} />
        </div>
        <p className={`text-xs mt-0.5 ${pass ? "text-green-300/90" : "text-red-300/90"}`}>
          {gate?.detail || "—"}
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Multi-Timeframe panel
// ------------------------------------------------------------
function MultiTimeframePanel({ multiTf }) {
  if (!multiTf) return null;
  return (
    <div className="ml-8 p-3 rounded-lg bg-indigo-950/20 border border-indigo-800 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-indigo-200">
          🌐 Multi-Timeframe — {multiTf.passed}/{multiTf.total}
        </p>
        {multiTf.ready ? (
          <span className="text-[10px] font-bold text-green-300">✅ ALIGNED</span>
        ) : (
          <span className="text-[10px] text-indigo-300/70">Waiting for alignment</span>
        )}
      </div>
      <div className="space-y-1">
        {multiTf.gates.map((g, i) => (
          <div
            key={g.key || i}
            className={`flex items-center justify-between gap-2 px-2 py-1 rounded text-xs bg-black/40 border ${
              g.pass ? "border-green-700" : "border-gray-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs">{g.pass ? "✅" : "⏳"}</span>
              <span className={g.pass ? "text-green-200" : "text-gray-400"}>
                {g.label}
              </span>
            </div>
            <span className="text-[10px] text-gray-500">{g.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Displacement quality badge
// ------------------------------------------------------------
function DisplacementBadge({ displacement }) {
  if (!displacement) return null;
  const quality = displacement.quality;
  const cls = {
    strong: "bg-orange-950/30 border-orange-700 text-orange-200",
    normal: "bg-green-950/30 border-green-700 text-green-200",
    weak: "bg-yellow-950/30 border-yellow-700 text-yellow-200",
    "wrong-direction": "bg-red-950/30 border-red-700 text-red-200",
    unknown: "bg-gray-900/40 border-gray-700 text-gray-300",
  }[quality] || "bg-gray-900/40 border-gray-700 text-gray-300";

  return (
    <div className={`ml-8 p-2 rounded-lg border text-xs ${cls}`}>
      <p className="font-bold">{displacement.detail}</p>
    </div>
  );
}

// ------------------------------------------------------------
// FVG Ladder
// ------------------------------------------------------------
function FvgLadder({ fvgs }) {
  if (!fvgs || fvgs.length === 0) return null;
  return (
    <div className="ml-8 p-3 rounded-lg bg-blue-950/20 border border-blue-800 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-blue-200">
          📊 FVG Ladder — {fvgs.length} FVG{fvgs.length === 1 ? "" : "s"} marked
        </p>
        <span className="text-[10px] text-blue-300/70">Active is auto-detected</span>
      </div>
      <div className="space-y-1">
        {fvgs.map((f, i) => (
          <div
            key={f.id || i}
            className={`flex items-center justify-between gap-2 px-2 py-1 rounded text-xs ${
              f.isActive ? "bg-blue-900/40 border border-blue-600" : "bg-black/40 border border-gray-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 tabular-nums">#{i + 1}</span>
              <span className={f.isActive ? "font-bold text-blue-200" : "text-gray-300"}>
                {formatPrice(f.low)} – {formatPrice(f.high)}
              </span>
              <span className="text-gray-500">CE {formatPrice(f.zoneCe)}</span>
            </div>
            {f.isActive && <span className="text-[10px] font-bold text-blue-200">🎯 ACTIVE</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Order Block Ladder
// ------------------------------------------------------------
function ObLadder({ orderBlocks }) {
  if (!orderBlocks || orderBlocks.length === 0) return null;
  return (
    <div className="ml-8 p-3 rounded-lg bg-teal-950/20 border border-teal-800 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-teal-200">
          🧱 Order Block Ladder — {orderBlocks.length} OB{orderBlocks.length === 1 ? "" : "s"} marked
        </p>
        <span className="text-[10px] text-teal-300/70">Active is auto-detected</span>
      </div>
      <div className="space-y-1">
        {orderBlocks.map((o, i) => (
          <div
            key={o.id || i}
            className={`flex items-center justify-between gap-2 px-2 py-1 rounded text-xs ${
              o.isActive ? "bg-teal-900/40 border border-teal-600" : "bg-black/40 border border-gray-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 tabular-nums">#{i + 1}</span>
              <span className={o.isActive ? "font-bold text-teal-200" : "text-gray-300"}>
                {formatPrice(o.low)} – {formatPrice(o.high)}
              </span>
              <span className="text-gray-500">CE {formatPrice(o.zoneCe)}</span>
            </div>
            {o.isActive && <span className="text-[10px] font-bold text-teal-200">🎯 ACTIVE</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Liquidity Sides panel
// ------------------------------------------------------------
function LiquiditySidesPanel({ liquiditySides }) {
  if (!liquiditySides) return null;
  const { bsl, ssl, draw, drawMatches, detail } = liquiditySides;
  if (!bsl && !ssl) return null;

  const drawLabel =
    draw === "bsl" ? "🔵 Buy-Side (BSL)" : draw === "ssl" ? "🟠 Sell-Side (SSL)" : "—";

  return (
    <div className="ml-8 p-3 rounded-lg bg-cyan-950/20 border border-cyan-800 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-cyan-200">💧 Liquidity Sides</p>
        <span className="text-[10px] text-cyan-300/70">Where stops rest · what got swept</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {bsl && (
          <div className={`p-2 rounded border ${bsl.swept ? "bg-green-950/30 border-green-700" : "bg-blue-950/30 border-blue-700"}`}>
            <p className={`text-[10px] font-bold ${bsl.swept ? "text-green-300" : "text-blue-300"}`}>
              {bsl.swept ? "✅ SWEPT" : "🎯 TARGET"} · BSL
            </p>
            <p className="font-bold tabular-nums text-white mt-0.5">{formatPrice(bsl.level)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Buy stops above</p>
          </div>
        )}
        {ssl && (
          <div className={`p-2 rounded border ${ssl.swept ? "bg-green-950/30 border-green-700" : "bg-orange-950/30 border-orange-700"}`}>
            <p className={`text-[10px] font-bold ${ssl.swept ? "text-green-300" : "text-orange-300"}`}>
              {ssl.swept ? "✅ SWEPT" : "🎯 TARGET"} · SSL
            </p>
            <p className="font-bold tabular-nums text-white mt-0.5">{formatPrice(ssl.level)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Sell stops below</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-cyan-800/50 text-xs">
        <span className="text-gray-400">Draw on Liquidity:</span>
        <span className={`font-bold ${drawMatches === true ? "text-green-300" : drawMatches === false ? "text-red-300" : "text-gray-300"}`}>
          {drawLabel}
          {drawMatches === true && " ✓ aligned"}
          {drawMatches === false && " ✗ mismatch"}
        </span>
      </div>

      {detail && <p className="text-[10px] text-cyan-300/70 italic">{detail}</p>}
    </div>
  );
}

// ------------------------------------------------------------
// MSS Sequence panel
// ------------------------------------------------------------
function MssSequencePanel({ mssSequence }) {
  if (!mssSequence) return null;
  const { tipTest, sweep, retest, contested } = mssSequence;
  const total = 3;
  const done = [tipTest, sweep, retest].filter(Boolean).length;

  return (
    <div className="ml-8 p-3 rounded-lg bg-purple-950/20 border border-purple-800 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-purple-200">🎯 MSS Sequence — {done}/{total}</p>
        {contested ? (
          <span className="text-[10px] font-bold text-yellow-300">⚠️ CONTESTED — WAIT</span>
        ) : done === total ? (
          <span className="text-[10px] font-bold text-green-300">✅ SEQUENCE COMPLETE</span>
        ) : (
          <span className="text-[10px] text-purple-300/70">Waiting for full sequence</span>
        )}
      </div>
      <div className="space-y-1">
        {[
          { k: "1. Tip test — wick touched MSS candle extreme", v: tipTest },
          { k: "2. Sweep — body closed past MSS", v: sweep },
          { k: "3. Final retest — wick touched MSS + close stayed", v: retest },
        ].map((row, i) => (
          <div key={i} className={`flex items-center justify-between gap-2 px-2 py-1 rounded text-xs bg-black/40 border ${row.v ? "border-green-700" : "border-gray-800"}`}>
            <div className="flex items-center gap-2">
              <span className="text-xs">{row.v ? "✅" : "⏳"}</span>
              <span className={row.v ? "text-green-200" : "text-gray-400"}>{row.k}</span>
            </div>
            {row.v && <span className="text-[10px] text-green-400">done</span>}
          </div>
        ))}
        {contested && (
          <div className="flex items-center gap-2 px-2 py-1 rounded text-xs bg-yellow-950/40 border border-yellow-700">
            <span className="text-xs">⚠️</span>
            <span className="text-yellow-200">Contested — a close went the wrong way</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Zones Visited panel
// ------------------------------------------------------------
function ZonesVisitedPanel({ verdictCloses, fvgs, orderBlocks }) {
  if (!verdictCloses) return null;
  const hasFvgs = fvgs && fvgs.length > 0;
  const hasObs = orderBlocks && orderBlocks.length > 0;
  if (!hasFvgs && !hasObs) return null;

  const visited = verdictCloses.zonesVisited || {};
  const visitedFvgs = visited.fvgs || {};
  const visitedObs = visited.obs || {};
  const visitedRb = visited.rb || false;

  const total = (fvgs?.length || 0) + (orderBlocks?.length || 0) + 1;
  const done =
    Object.values(visitedFvgs).filter(Boolean).length +
    Object.values(visitedObs).filter(Boolean).length +
    (visitedRb ? 1 : 0);

  return (
    <div className="ml-8 p-3 rounded-lg bg-yellow-950/20 border border-yellow-800 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-yellow-200">🗺️ Zones Visited — {done}/{total}</p>
        {verdictCloses.allZonesVisited ? (
          <span className="text-[10px] font-bold text-green-300">✅ ALL ZONES VISITED</span>
        ) : (
          <span className="text-[10px] text-yellow-300/70">Waiting for price to fill all zones</span>
        )}
      </div>
      <div className="space-y-1">
        {hasFvgs && fvgs.map((f, i) => {
          const isVisited = visitedFvgs[f.id];
          return (
            <div key={f.id || i} className="flex items-center justify-between gap-2 px-2 py-1 rounded text-xs bg-black/40 border border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-xs">{isVisited ? "✅" : "⏳"}</span>
                <span className={isVisited ? "text-green-200" : "text-gray-400"}>
                  FVG #{i + 1} — {formatPrice(f.low)} – {formatPrice(f.high)}
                </span>
              </div>
              {isVisited && <span className="text-[10px] text-green-400">visited</span>}
            </div>
          );
        })}
        {hasObs && orderBlocks.map((o, i) => {
          const isVisited = visitedObs[o.id];
          return (
            <div key={o.id || i} className="flex items-center justify-between gap-2 px-2 py-1 rounded text-xs bg-black/40 border border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-xs">{isVisited ? "✅" : "⏳"}</span>
                <span className={isVisited ? "text-green-200" : "text-gray-400"}>
                  OB #{i + 1} — {formatPrice(o.low)} – {formatPrice(o.high)}
                </span>
              </div>
              {isVisited && <span className="text-[10px] text-green-400">visited</span>}
            </div>
          );
        })}
        <div className="flex items-center justify-between gap-2 px-2 py-1 rounded text-xs bg-black/40 border border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xs">{visitedRb ? "✅" : "⏳"}</span>
            <span className={visitedRb ? "text-green-200" : "text-gray-400"}>Rejection Block (active)</span>
          </div>
          {visitedRb && <span className="text-[10px] text-green-400">visited</span>}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Reaction Timeline
// ------------------------------------------------------------
function reactionStyle(type) {
  const map = {
    entry: { emoji: "🎯", cls: "bg-green-900/40 border-green-600 text-green-200", label: "ENTRY" },
    rb_breakout: { emoji: "🚀", cls: "bg-green-900/40 border-green-600 text-green-200", label: "RB BREAKOUT" },
    rb_discount: { emoji: "🟢", cls: "bg-green-900/40 border-green-700 text-green-200", label: "RB DISCOUNT" },
    rb_premium: { emoji: "🟡", cls: "bg-yellow-900/40 border-yellow-700 text-yellow-200", label: "RB PREMIUM" },
    rb_wrong_side: { emoji: "🔴", cls: "bg-red-900/40 border-red-700 text-red-200", label: "RB WRONG SIDE" },
    tip_test: { emoji: "🎯", cls: "bg-purple-900/40 border-purple-700 text-purple-200", label: "TIP TEST" },
    sweep: { emoji: "🌊", cls: "bg-blue-900/40 border-blue-700 text-blue-200", label: "SWEEP" },
    retest: { emoji: "🔁", cls: "bg-purple-900/40 border-purple-700 text-purple-200", label: "RETEST" },
    contested: { emoji: "⚠️", cls: "bg-yellow-900/40 border-yellow-700 text-yellow-200", label: "CONTESTED" },
    filled: { emoji: "🟩", cls: "bg-blue-900/40 border-blue-700 text-blue-200", label: "FILLED" },
    held: { emoji: "🟡", cls: "bg-yellow-900/40 border-yellow-700 text-yellow-200", label: "HELD" },
    broke: { emoji: "🔴", cls: "bg-red-900/40 border-red-700 text-red-200", label: "BROKE" },
    unclassified: { emoji: "⚪", cls: "bg-gray-900/40 border-gray-700 text-gray-300", label: "—" },
  };
  return map[type] || map.unclassified;
}

function ReactionTimeline({ verdictCloses }) {
  if (!verdictCloses || !verdictCloses.ranked || verdictCloses.ranked.length === 0) return null;
  return (
    <div className="ml-8 p-3 rounded-lg bg-purple-950/20 border border-purple-800 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-purple-200">
          📋 Reaction Timeline — {verdictCloses.count} close{verdictCloses.count === 1 ? "" : "s"}
        </p>
        {verdictCloses.finalClose && (
          <span className="text-[10px] font-bold text-green-300">✅ FINAL ENTRY DETECTED</span>
        )}
      </div>
      <div className="space-y-1">
        {verdictCloses.ranked.map((r, i) => {
          const style = reactionStyle(r.reactionType);
          const close = r.candle?.close;
          return (
            <div
              key={r.id || i}
              className={`flex items-center justify-between gap-2 px-2 py-1 rounded text-xs border ${
                r.isFinal ? "bg-green-950/40 border-green-600 ring-1 ring-green-700" : "bg-black/40 border-gray-800"
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-gray-500 tabular-nums">#{r.sequenceNumber}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${style.cls}`}>
                  {style.emoji} {style.label}
                </span>
                <span className="text-gray-300">
                  Close {close !== null && close !== undefined ? formatPrice(close) : "—"}
                </span>
              </div>
              {r.isFinal && <span className="text-[10px] font-bold text-green-300">🎯 FINAL</span>}
            </div>
          );
        })}
      </div>
      {verdictCloses.ranked.length > 0 && (
        <div className="pt-2 border-t border-purple-800/50 space-y-1">
          {verdictCloses.ranked.filter((r) => r.detail).slice(-3).map((r, i) => (
            <p key={i} className="text-[10px] text-gray-400 italic">
              #{r.sequenceNumber}: {r.detail}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Wick retest / Inducement badges
// ------------------------------------------------------------
function WickRetestBadge({ wickRetest }) {
  if (!wickRetest || !wickRetest.pass) return null;
  return (
    <div className="ml-8 p-3 rounded-lg bg-purple-950/30 border border-purple-700 space-y-1">
      <p className="text-xs font-bold text-purple-200">🎯 {wickRetest.detail}</p>
      {wickRetest.emaConfluence && wickRetest.emaDetail && (
        <p className="text-xs text-purple-300">✨ {wickRetest.emaDetail}</p>
      )}
    </div>
  );
}

function InducementBadge({ inducement }) {
  if (!inducement || !inducement.swept) return null;
  return (
    <div className="ml-8 p-3 rounded-lg bg-orange-950/30 border border-orange-700 space-y-1">
      <p className="text-xs font-bold text-orange-200">🪤 {inducement.detail}</p>
      <p className="text-[10px] text-orange-300/80 italic">
        The fake trap was swept — retail was lured before the real move.
      </p>
    </div>
  );
}

// ------------------------------------------------------------
// IRL / ERL panel
// ------------------------------------------------------------
function IrlErlPanel({ data }) {
  if (!data) return null;
  const range = data.range;
  const irl = data.irl;
  const erl = data.erl;
  const aligned = data.aligned;
  return (
    <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-800 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-purple-200">📐 Dealing Range — IRL / ERL</p>
        {aligned && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-300 font-semibold">
            ✓ Aligned
          </span>
        )}
      </div>
      {range && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div><p className="text-gray-500">Range High</p><p className="font-bold tabular-nums text-purple-300">{formatPrice(range.dealingHigh)}</p></div>
          <div><p className="text-gray-500">Range Low</p><p className="font-bold tabular-nums text-purple-300">{formatPrice(range.dealingLow)}</p></div>
          <div><p className="text-gray-500">Range CE</p><p className="font-bold tabular-nums text-blue-300">{formatPrice(range.dealingCe)}</p></div>
        </div>
      )}
      {irl && (
        <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-purple-800/50">
          <div><p className="text-gray-500">IRL High</p><p className="font-bold tabular-nums text-green-300">{formatPrice(irl.high)}</p></div>
          <div><p className="text-gray-500">IRL Low</p><p className="font-bold tabular-nums text-green-300">{formatPrice(irl.low)}</p></div>
          <div><p className="text-gray-500">IRL CE</p><p className="font-bold tabular-nums text-green-300">{formatPrice(irl.ce)}</p></div>
        </div>
      )}
      {erl && (
        <div className="text-xs">
          <p className="text-gray-500">ERL (External Range Liquidity)</p>
          <p className="font-bold tabular-nums text-yellow-300">{formatPrice(erl.price)}</p>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Warnings panel
// ------------------------------------------------------------
function WarningPanel({ warnings }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div className="p-3 rounded-lg bg-red-950/40 border border-red-700 space-y-2">
      <p className="text-xs font-bold text-red-200">
        ⚠️ {warnings.length} warning{warnings.length === 1 ? "" : "s"} detected
      </p>
      <div className="space-y-1">
        {warnings.map((w) => (
          <div key={w.key} className="text-xs">
            <p className="font-semibold text-red-200">{w.label}</p>
            <p className="text-red-300/90">{w.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Main card
// ------------------------------------------------------------
export default function AmdCard({ data, trade, irlErl, warnings }) {
  if (!data) return null;

  const {
    sequenceType, gates, score, checklistVerdict, verdictDisplay, verdict,
    reasons, wickRetest, inducement, liquiditySides, displacement, multiTf,
    fvgs, orderBlocks, verdictCloses,
  } = data;
  const typeInfo = amdTypeInfo(sequenceType);

  const verdictColor =
    verdict === "BUY"
      ? "bg-green-900/40 border-green-600 text-green-200"
      : verdict === "SELL"
      ? "bg-red-900/40 border-red-600 text-red-200"
      : "bg-yellow-950/40 border-yellow-700 text-yellow-200";

  const verdictEmoji = verdict === "BUY" ? "🟢" : verdict === "SELL" ? "🔴" : "⏳";

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-blue-800 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-blue-300">
            {typeInfo.emoji} AMD — {typeInfo.label}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{typeInfo.hint}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-1 rounded-full border font-bold ${checklistVerdict.color}`}>
            {checklistVerdict.emoji} {score}/10
          </span>
          <span className={`text-xs px-3 py-1 rounded-full border-2 font-bold ${verdictColor}`}>
            {verdictEmoji} {verdict}
          </span>
        </div>
      </div>

      {/* Multi-TF panel — top of card */}
      <MultiTimeframePanel multiTf={multiTf} />

      {/* 10-gate checklist */}
      <div className="space-y-2">
        {AMD_CHECKLIST.map((meta) => (
          <div key={meta.key}>
            <GateRow gate={gates[meta.key]} meta={meta} />

            {meta.key === "range" && <DisplacementBadge displacement={displacement} />}

            {meta.key === "sweep" && <LiquiditySidesPanel liquiditySides={liquiditySides} />}

            {meta.key === "fvg" && (
              <>
                <FvgLadder fvgs={fvgs} />
                <ObLadder orderBlocks={orderBlocks} />
              </>
            )}

            {meta.key === "rb" && (
              <>
                <ZonesVisitedPanel
                  verdictCloses={verdictCloses}
                  fvgs={fvgs}
                  orderBlocks={orderBlocks}
                />
                <MssSequencePanel mssSequence={verdictCloses?.mssSequence} />
              </>
            )}

            {meta.key === "entry" && (
              <>
                <ReactionTimeline verdictCloses={verdictCloses} />
                <WickRetestBadge wickRetest={wickRetest} />
                <InducementBadge inducement={inducement} />
              </>
            )}
          </div>
        ))}
      </div>

      {/* ATR badge */}
      {gates.atr_falling && (
        <div className="p-2 rounded-lg bg-blue-950/30 border border-blue-900 text-xs text-blue-200">
          <span className="font-bold">
            {gates.atr_falling.data?.atrState === "falling"
              ? "📉"
              : gates.atr_falling.data?.atrState === "flat"
              ? "➡️"
              : "📈"}{" "}
            ATR {gates.atr_falling.data?.atrState || "—"}
          </span>
          <span className="opacity-80 ml-2">{gates.atr_falling.detail}</span>
        </div>
      )}

      {/* Verdict panel */}
      {verdictDisplay && (
        <div className={`p-3 rounded-lg border-2 space-y-1 ${verdictDisplay.color}`}>
          <p className="text-xs opacity-80 font-semibold">🎯 Verdict — RB negotiation</p>
          <p className="text-xl font-bold">{verdictDisplay.emoji} {verdictDisplay.label}</p>
          <p className="text-xs opacity-90">{verdictDisplay.description}</p>
        </div>
      )}

      {/* Entry Card */}
      {trade && (verdict === "BUY" || verdict === "SELL") && (
        <div className="p-4 rounded-lg bg-blue-950/30 border-2 border-blue-700 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-bold text-blue-200">💰 Entry Card</p>
            <span className={`text-xs px-2 py-1 rounded-full font-bold ${trade.direction === "BUY" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>
              {trade.direction}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div><p className="text-xs text-gray-500">Entry (CE)</p><p className="font-bold tabular-nums text-yellow-400">{formatPrice(trade.entry)}</p></div>
            <div><p className="text-xs text-gray-500">Stop Loss</p><p className="font-bold tabular-nums text-red-400">{formatPrice(trade.sl)}</p></div>
            <div>
              <p className="text-xs text-gray-500">Take Profit</p>
              <p className="font-bold tabular-nums text-green-400">{formatPrice(trade.tp)}</p>
              {trade.tpSource && <p className="text-[10px] text-gray-500">{trade.tpSource}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-500">RR</p>
              <p className={`font-bold tabular-nums ${trade.rr >= 2 ? "text-green-300" : "text-yellow-300"}`}>
                1:{trade.rr?.toFixed(2) ?? "—"}
              </p>
            </div>
            {trade.slPips !== undefined && trade.slPips !== null && (
              <div><p className="text-xs text-gray-500">SL distance</p><p className="font-bold tabular-nums text-red-300">{trade.slPips} pips</p></div>
            )}
            {trade.tpPips !== undefined && trade.tpPips !== null && (
              <div><p className="text-xs text-gray-500">TP distance</p><p className="font-bold tabular-nums text-green-300">{trade.tpPips} pips</p></div>
            )}
            {trade.lotSize !== undefined && trade.lotSize !== null && (
              <div><p className="text-xs text-gray-500">Lot size</p><p className="font-bold tabular-nums text-white">{trade.lotSize}</p></div>
            )}
            {trade.riskAmount !== undefined && trade.riskAmount !== null && (
              <div><p className="text-xs text-gray-500">Risk amount</p><p className="font-bold tabular-nums text-white">{formatPrice(trade.riskAmount)}</p></div>
            )}
          </div>

          {trade.rr !== undefined && trade.rr < 2 && (
            <p className="text-xs text-yellow-300 pt-2 border-t border-blue-800/50">
              ⚠️ RR is below 2:1 — the AMD setup is valid, but the reward is thin. Consider a further target.
            </p>
          )}
        </div>
      )}

      {irlErl && <IrlErlPanel data={irlErl} />}
      <WarningPanel warnings={warnings} />

      {!checklistVerdict.passed && reasons && reasons.length > 0 && (
        <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-800">
          <p className="text-xs font-semibold text-yellow-200">
            ⚠️ AMD checklist incomplete — {reasons.length} gate{reasons.length === 1 ? "" : "s"} failing:
          </p>
          <ul className="text-xs text-yellow-200 space-y-1 mt-2 ml-4 list-disc">
            {reasons.map((r, i) => (<li key={i}>{r}</li>))}
          </ul>
        </div>
      )}
    </div>
  );
}