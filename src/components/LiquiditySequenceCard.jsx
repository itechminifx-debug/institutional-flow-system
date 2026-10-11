"use client";

import { formatPrice } from "@/lib/formatNumbers";
import { sequenceTypeInfo } from "@/lib/liquiditySequenceEngine";

// ------------------------------------------------------------
// Single step row
// ------------------------------------------------------------

function StepRow({ step }) {
  const pass = step?.pass;
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
        <p
          className={`text-sm font-bold ${
            pass ? "text-green-200" : "text-red-200"
          }`}
        >
          {step?.number}. {step?.label || "—"}
        </p>
        <p
          className={`text-xs mt-0.5 ${
            pass ? "text-green-300/90" : "text-red-300/90"
          }`}
        >
          {step?.detail || "—"}
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// IRL / ERL mini-panel
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

      <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-purple-800/50">
        {irl && (
          <>
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
          </>
        )}
      </div>

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
// Warning list panel
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

export default function LiquiditySequenceCard({
  data,
  trade,
  irlErl,
  warnings,
}) {
  if (!data) return null;

  const {
    sequenceType,
    steps,
    allPassed,
    verdict,
    verdictDisplay,
    atr,
    reasons,
  } = data;
  const seqInfo = sequenceTypeInfo(sequenceType);

  const verdictColor =
    verdict === "BUY"
      ? "bg-green-900/40 border-green-600 text-green-200"
      : verdict === "SELL"
      ? "bg-red-900/40 border-red-600 text-red-200"
      : "bg-yellow-950/40 border-yellow-700 text-yellow-200";

  const verdictEmoji =
    verdict === "BUY" ? "🟢" : verdict === "SELL" ? "🔴" : "⚠️";

  const stepList = [
    steps.liquidity,
    steps.sweep,
    steps.mss,
    steps.fvg,
    steps.rb,
    steps.close,
  ];

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-blue-800 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-blue-300">
            {seqInfo.emoji} Liquidity Sequence —{" "}
            {sequenceType === "support" ? "Support" : "Resistance"}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{seqInfo.hint}</p>
        </div>
        <span
          className={`text-xs px-3 py-1 rounded-full border-2 font-bold ${verdictColor}`}
        >
          {verdictEmoji} {verdict}
        </span>
      </div>

      {/* 6-step checklist */}
      <div className="space-y-2">
        {stepList.map((s) => (
          <StepRow key={s.key} step={s} />
        ))}
      </div>

      {/* ATR badge */}
      {atr && (
        <div className={`p-2 rounded-lg border text-xs ${atr.color}`}>
          <span className="font-bold">
            {atr.emoji} {atr.label}
          </span>
          <span className="opacity-80 ml-2">{atr.description}</span>
        </div>
      )}

      {/* Verdict panel */}
      {allPassed && verdictDisplay && (
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

      {/* ENTRY / SL / TP block — the payoff */}
      {trade && (verdict === "BUY" || verdict === "SELL") && (
        <div className="p-4 rounded-lg bg-blue-950/30 border-2 border-blue-700 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-bold text-blue-200">
              💰 Entry Card
            </p>
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
              ⚠️ RR is below 2:1 — the sequence is valid, but the reward is
              thin. Consider a further target.
            </p>
          )}
        </div>
      )}

      {/* IRL / ERL panel */}
      {irlErl && <IrlErlPanel data={irlErl} />}

      {/* Warnings panel */}
      <WarningPanel warnings={warnings} />

      {/* Reasons — when not all passed */}
      {!allPassed && reasons && reasons.length > 0 && (
        <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-800">
          <p className="text-xs font-semibold text-yellow-200">
            ⚠️ Sequence incomplete — {reasons.length} step
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