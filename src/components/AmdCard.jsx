"use client";

import { formatPrice } from "@/lib/formatNumbers";
import { amdTypeInfo, AMD_CHECKLIST } from "@/lib/amdEngine";

// ------------------------------------------------------------
// Phase badge
// ------------------------------------------------------------
function PhaseBadge({ phase }) {
  const map = {
    A: {
      label: "Accumulation",
      cls: "bg-blue-900/40 text-blue-300 border-blue-700",
      emoji: "🟦",
    },
    M: {
      label: "Manipulation",
      cls: "bg-red-900/40 text-red-300 border-red-700",
      emoji: "🟥",
    },
    D: {
      label: "Distribution",
      cls: "bg-green-900/40 text-green-300 border-green-700",
      emoji: "🟩",
    },
    X: {
      label: "Mindset",
      cls: "bg-purple-900/40 text-purple-300 border-purple-700",
      emoji: "🧠",
    },
  };
  const info = map[phase] || map.A;
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${info.cls}`}
    >
      {info.emoji} {info.label}
    </span>
  );
}

// ------------------------------------------------------------
// Gate row
// ------------------------------------------------------------
function GateRow({ gate, meta }) {
  const pass = gate?.pass;
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${
        pass
          ? "bg-green-950/20 border-green-800"
          : "bg-red-950/20 border-red-800"
      }`}
    >
      <span className="text-lg leading-none mt-0.5">
        {pass ? "✅" : "❌"}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={`text-sm font-bold ${
              pass ? "text-green-200" : "text-red-200"
            }`}
          >
            {meta.number}. {meta.label}
          </p>
          <PhaseBadge phase={meta.phase} />
        </div>
        <p
          className={`text-xs mt-0.5 ${
            pass ? "text-green-300/90" : "text-red-300/90"
          }`}
        >
          {gate?.detail || "—"}
        </p>
      </div>
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
          📊 FVG Ladder — {fvgs.length} FVG
          {fvgs.length === 1 ? "" : "s"} marked
        </p>
        <span className="text-[10px] text-blue-300/70">
          Active is auto-detected
        </span>
      </div>
      <div className="space-y-1">
        {fvgs.map((f, i) => (
          <div
            key={f.id || i}
            className={`flex items-center justify-between gap-2 px-2 py-1 rounded text-xs ${
              f.isActive
                ? "bg-blue-900/40 border border-blue-600"
                : "bg-black/40 border border-gray-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 tabular-nums">
                #{i + 1}
              </span>
              <span
                className={
                  f.isActive ? "font-bold text-blue-200" : "text-gray-300"
                }
              >
                {formatPrice(f.low)} – {formatPrice(f.high)}
              </span>
              <span className="text-gray-500">CE {formatPrice(f.fvgCe)}</span>
            </div>
            {f.isActive && (
              <span className="text-[10px] font-bold text-blue-200">
                🎯 ACTIVE
              </span>
            )}
          </div>
        ))}
      </div>
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
        <p className="text-xs font-bold text-purple-200">
          🎯 MSS Sequence — {done}/{total}
        </p>
        {contested ? (
          <span className="text-[10px] font-bold text-yellow-300">
            ⚠️ CONTESTED — WAIT
          </span>
        ) : done === total ? (
          <span className="text-[10px] font-bold text-green-300">
            ✅ SEQUENCE COMPLETE
          </span>
        ) : (
          <span className="text-[10px] text-purple-300/70">
            Waiting for full sequence
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div
          className={`flex items-center justify-between gap-2 px-2 py-1 rounded text-xs bg-black/40 border ${
            tipTest ? "border-green-700" : "border-gray-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs">{tipTest ? "✅" : "⏳"}</span>
            <span className={tipTest ? "text-green-200" : "text-gray-400"}>
              1. Tip test — wick touched MSS candle extreme
            </span>
          </div>
          {tipTest && (
            <span className="text-[10px] text-green-400">done</span>
          )}
        </div>
        <div
          className={`flex items-center justify-between gap-2 px-2 py-1 rounded text-xs bg-black/40 border ${
            sweep ? "border-green-700" : "border-gray-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs">{sweep ? "✅" : "⏳"}</span>
            <span className={sweep ? "text-green-200" : "text-gray-400"}>
              2. Sweep — body closed past MSS
            </span>
          </div>
          {sweep && (
            <span className="text-[10px] text-green-400">done</span>
          )}
        </div>
        <div
          className={`flex items-center justify-between gap-2 px-2 py-1 rounded text-xs bg-black/40 border ${
            retest ? "border-green-700" : "border-gray-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs">{retest ? "✅" : "⏳"}</span>
            <span className={retest ? "text-green-200" : "text-gray-400"}>
              3. Final retest — wick touched MSS + close stayed
            </span>
          </div>
          {retest && (
            <span className="text-[10px] text-green-400">done</span>
          )}
        </div>
        {contested && (
          <div className="flex items-center justify-between gap-2 px-2 py-1 rounded text-xs bg-yellow-950/40 border border-yellow-700">
            <div className="flex items-center gap-2">
              <span className="text-xs">⚠️</span>
              <span className="text-yellow-200">
                Contested — a close went the wrong way
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Zones Visited panel
// ------------------------------------------------------------
function ZonesVisitedPanel({ verdictCloses, fvgs }) {
  if (!verdictCloses || !fvgs || fvgs.length === 0) return null;

  const visited = verdictCloses.zonesVisited || {};
  const visitedFvgs = visited.fvgs || {};
  const visitedRb = visited.rb || false;

  const total = fvgs.length + 1;
  const done =
    Object.values(visitedFvgs).filter(Boolean).length + (visitedRb ? 1 : 0);

  return (
    <div className="ml-8 p-3 rounded-lg bg-yellow-950/20 border border-yellow-800 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-yellow-200">
          🗺️ Zones Visited — {done}/{total}
        </p>
        {verdictCloses.allZonesVisited ? (
          <span className="text-[10px] font-bold text-green-300">
            ✅ ALL ZONES VISITED
          </span>
        ) : (
          <span className="text-[10px] text-yellow-300/70">
            Waiting for price to fill all zones
          </span>
        )}
      </div>
      <div className="space-y-1">
        {fvgs.map((f, i) => {
          const isVisited = visitedFvgs[f.id];
          return (
            <div
              key={f.id || i}
              className="flex items-center justify-between gap-2 px-2 py-1 rounded text-xs bg-black/40 border border-gray-800"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs">{isVisited ? "✅" : "⏳"}</span>
                <span
                  className={isVisited ? "text-green-200" : "text-gray-400"}
                >
                  FVG #{i + 1} — {formatPrice(f.low)} – {formatPrice(f.high)}
                </span>
              </div>
              {isVisited && (
                <span className="text-[10px] text-green-400">visited</span>
              )}
            </div>
          );
        })}
        <div className="flex items-center justify-between gap-2 px-2 py-1 rounded text-xs bg-black/40 border border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xs">{visitedRb ? "✅" : "⏳"}</span>
            <span className={visitedRb ? "text-green-200" : "text-gray-400"}>
              Rejection Block (active)
            </span>
          </div>
          {visitedRb && (
            <span className="text-[10px] text-green-400">visited</span>
          )}
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
    entry: {
      emoji: "🎯",
      cls: "bg-green-900/40 border-green-600 text-green-200",
      label: "ENTRY",
    },
    rb_breakout: {
      emoji: "🚀",
      cls: "bg-green-900/40 border-green-600 text-green-200",
      label: "RB BREAKOUT",
    },
    rb_discount: {
      emoji: "🟢",
      cls: "bg-green-900/40 border-green-700 text-green-200",
      label: "RB DISCOUNT",
    },
    rb_premium: {
      emoji: "🟡",
      cls: "bg-yellow-900/40 border-yellow-700 text-yellow-200",
      label: "RB PREMIUM",
    },
    rb_wrong_side: {
      emoji: "🔴",
      cls: "bg-red-900/40 border-red-700 text-red-200",
      label: "RB WRONG SIDE",
    },
    tip_test: {
      emoji: "🎯",
      cls: "bg-purple-900/40 border-purple-700 text-purple-200",
      label: "TIP TEST",
    },
    sweep: {
      emoji: "🌊",
      cls: "bg-blue-900/40 border-blue-700 text-blue-200",
      label: "SWEEP",
    },
    retest: {
      emoji: "🔁",
      cls: "bg-purple-900/40 border-purple-700 text-purple-200",
      label: "RETEST",
    },
    contested: {
      emoji: "⚠️",
      cls: "bg-yellow-900/40 border-yellow-700 text-yellow-200",
      label: "CONTESTED",
    },
    filled: {
      emoji: "🟩",
      cls: "bg-blue-900/40 border-blue-700 text-blue-200",
      label: "FILLED",
    },
    held: {
      emoji: "🟡",
      cls: "bg-yellow-900/40 border-yellow-700 text-yellow-200",
      label: "HELD",
    },
    broke: {
      emoji: "🔴",
      cls: "bg-red-900/40 border-red-700 text-red-200",
      label: "BROKE",
    },
    unclassified: {
      emoji: "⚪",
      cls: "bg-gray-900/40 border-gray-700 text-gray-300",
      label: "—",
    },
  };
  return map[type] || map.unclassified;
}

function ReactionTimeline({ verdictCloses }) {
  if (
    !verdictCloses ||
    !verdictCloses.ranked ||
    verdictCloses.ranked.length === 0
  )
    return null;

  return (
    <div className="ml-8 p-3 rounded-lg bg-purple-950/20 border border-purple-800 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-purple-200">
          📋 Reaction Timeline — {verdictCloses.count} close
          {verdictCloses.count === 1 ? "" : "s"}
        </p>
        {verdictCloses.finalClose && (
          <span className="text-[10px] font-bold text-green-300">
            ✅ FINAL ENTRY DETECTED
          </span>
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
                r.isFinal
                  ? "bg-green-950/40 border-green-600 ring-1 ring-green-700"
                  : "bg-black/40 border-gray-800"
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-gray-500 tabular-nums">
                  #{r.sequenceNumber}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${style.cls}`}
                >
                  {style.emoji} {style.label}
                </span>
                <span className="text-gray-300">
                  Close{" "}
                  {close !== null && close !== undefined
                    ? formatPrice(close)
                    : "—"}
                </span>
              </div>
              {r.isFinal && (
                <span className="text-[10px] font-bold text-green-300">
                  🎯 FINAL
                </span>
              )}
            </div>
          );
        })}
      </div>
      {verdictCloses.ranked.length > 0 && (
        <div className="pt-2 border-t border-purple-800/50 space-y-1">
          {verdictCloses.ranked
            .filter((r) => r.detail)
            .slice(-3)
            .map((r, i) => (
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
// Wick retest bonus
// ------------------------------------------------------------
function WickRetestBadge({ wickRetest }) {
  if (!wickRetest || !wickRetest.pass) return null;

  return (
    <div className="ml-8 p-3 rounded-lg bg-purple-950/30 border border-purple-700 space-y-1">
      <p className="text-xs font-bold text-purple-200">
        🎯 {wickRetest.detail}
      </p>
      {wickRetest.emaConfluence && wickRetest.emaDetail && (
        <p className="text-xs text-purple-300">✨ {wickRetest.emaDetail}</p>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// IRL / ERL
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
        <p className="text-xs font-bold text-purple-200">
          📐 Dealing Range — IRL / ERL
        </p>
        {aligned && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-300 font-semibold">
            ✓ Aligned
          </span>
        )}
      </div>

      {range && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-gray-500">Range High</p>
            <p className="font-bold tabular-nums text-purple-300">
              {formatPrice(range.dealingHigh)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Range Low</p>
            <p className="font-bold tabular-nums text-purple-300">
              {formatPrice(range.dealingLow)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Range CE</p>
            <p className="font-bold tabular-nums text-blue-300">
              {formatPrice(range.dealingCe)}
            </p>
          </div>
        </div>
      )}

      {irl && (
        <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-purple-800/50">
          <div>
            <p className="text-gray-500">IRL High</p>
            <p className="font-bold tabular-nums text-green-300">
              {formatPrice(irl.high)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">IRL Low</p>
            <p className="font-bold tabular-nums text-green-300">
              {formatPrice(irl.low)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">IRL CE</p>
            <p className="font-bold tabular-nums text-green-300">
              {formatPrice(irl.ce)}
            </p>
          </div>
        </div>
      )}

      {erl && (
        <div className="text-xs">
          <p className="text-gray-500">ERL (External Range Liquidity)</p>
          <p className="font-bold tabular-nums text-yellow-300">
            {formatPrice(erl.price)}
          </p>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Warnings
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
    sequenceType,
    gates,
    score,
    checklistVerdict,
    verdictDisplay,
    verdict,
    reasons,
    wickRetest,
    fvgs,
    verdictCloses,
  } = data;
  const typeInfo = amdTypeInfo(sequenceType);

  const verdictColor =
    verdict === "BUY"
      ? "bg-green-900/40 border-green-600 text-green-200"
      : verdict === "SELL"
      ? "bg-red-900/40 border-red-600 text-red-200"
      : "bg-yellow-950/40 border-yellow-700 text-yellow-200";

  const verdictEmoji =
    verdict === "BUY" ? "🟢" : verdict === "SELL" ? "🔴" : "⏳";

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
          <span
            className={`text-xs px-2 py-1 rounded-full border font-bold ${checklistVerdict.color}`}
          >
            {checklistVerdict.emoji} {score}/10
          </span>
          <span
            className={`text-xs px-3 py-1 rounded-full border-2 font-bold ${verdictColor}`}
          >
            {verdictEmoji} {verdict}
          </span>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {AMD_CHECKLIST.map((meta) => (
          <div key={meta.key}>
            <GateRow gate={gates[meta.key]} meta={meta} />
            {meta.key === "fvg" && <FvgLadder fvgs={fvgs} />}
            {meta.key === "rb" && (
              <>
                <ZonesVisitedPanel
                  verdictCloses={verdictCloses}
                  fvgs={fvgs}
                />
                <MssSequencePanel
                  mssSequence={verdictCloses?.mssSequence}
                />
              </>
            )}
            {meta.key === "entry" && (
              <>
                <ReactionTimeline verdictCloses={verdictCloses} />
                <WickRetestBadge wickRetest={wickRetest} />
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
        <div
          className={`p-3 rounded-lg border-2 space-y-1 ${verdictDisplay.color}`}
        >
          <p className="text-xs opacity-80 font-semibold">
            🎯 Verdict — RB negotiation
          </p>
          <p className="text-xl font-bold">
            {verdictDisplay.emoji} {verdictDisplay.label}
          </p>
          <p className="text-xs opacity-90">{verdictDisplay.description}</p>
        </div>
      )}

      {/* Entry Card */}
      {trade && (verdict === "BUY" || verdict === "SELL") && (
        <div className="p-4 rounded-lg bg-blue-950/30 border-2 border-blue-700 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-bold text-blue-200">💰 Entry Card</p>
            <span
              className={`text-xs px-2 py-1 rounded-full font-bold ${
                trade.direction === "BUY"
                  ? "bg-green-900/40 text-green-300"
                  : "bg-red-900/40 text-red-300"
              }`}
            >
              {trade.direction}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Entry (CE)</p>
              <p className="font-bold tabular-nums text-yellow-400">
                {formatPrice(trade.entry)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Stop Loss</p>
              <p className="font-bold tabular-nums text-red-400">
                {formatPrice(trade.sl)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Take Profit</p>
              <p className="font-bold tabular-nums text-green-400">
                {formatPrice(trade.tp)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">RR</p>
              <p
                className={`font-bold tabular-nums ${
                  trade.rr >= 2 ? "text-green-300" : "text-yellow-300"
                }`}
              >
                1:{trade.rr?.toFixed(2) ?? "—"}
              </p>
            </div>
            {trade.slPips !== undefined && trade.slPips !== null && (
              <div>
                <p className="text-xs text-gray-500">SL distance</p>
                <p className="font-bold tabular-nums text-red-300">
                  {trade.slPips} pips
                </p>
              </div>
            )}
            {trade.tpPips !== undefined && trade.tpPips !== null && (
              <div>
                <p className="text-xs text-gray-500">TP distance</p>
                <p className="font-bold tabular-nums text-green-300">
                  {trade.tpPips} pips
                </p>
              </div>
            )}
            {trade.lotSize !== undefined && trade.lotSize !== null && (
              <div>
                <p className="text-xs text-gray-500">Lot size</p>
                <p className="font-bold tabular-nums text-white">
                  {trade.lotSize}
                </p>
              </div>
            )}
            {trade.riskAmount !== undefined && trade.riskAmount !== null && (
              <div>
                <p className="text-xs text-gray-500">Risk amount</p>
                <p className="font-bold tabular-nums text-white">
                  {formatPrice(trade.riskAmount)}
                </p>
              </div>
            )}
          </div>

          {trade.rr !== undefined && trade.rr < 2 && (
            <p className="text-xs text-yellow-300 pt-2 border-t border-blue-800/50">
              ⚠️ RR is below 2:1 — the AMD setup is valid, but the reward is
              thin. Consider a further target.
            </p>
          )}
        </div>
      )}

      {/* IRL / ERL */}
      {irlErl && <IrlErlPanel data={irlErl} />}

      {/* Warnings */}
      <WarningPanel warnings={warnings} />

      {/* Reasons */}
      {!checklistVerdict.passed && reasons && reasons.length > 0 && (
        <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-800">
          <p className="text-xs font-semibold text-yellow-200">
            ⚠️ AMD checklist incomplete — {reasons.length} gate
            {reasons.length === 1 ? "" : "s"} failing:
          </p>
          <ul className="text-xs text-yellow-200 space-y-1 mt-2 ml-4 list-disc">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}