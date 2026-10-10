"use client";

import { formatPrice } from "@/lib/formatNumbers";
import { sequenceTypeInfo } from "@/lib/liquiditySequenceEngine";

// ------------------------------------------------------------
// Small helpers
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
          {step?.label || "—"}
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

function alignmentBadge(alignment) {
  switch (alignment) {
    case "inside":
      return {
        cls: "bg-green-900/40 border-green-700 text-green-200",
        label: "🎯 Inside FVG",
      };
    case "above":
      return {
        cls: "bg-blue-900/40 border-blue-700 text-blue-200",
        label: "⬆️ Above FVG",
      };
    case "below":
      return {
        cls: "bg-blue-900/40 border-blue-700 text-blue-200",
        label: "⬇️ Below FVG",
      };
    default:
      return {
        cls: "bg-gray-800/60 border-gray-600 text-gray-300",
        label: "No alignment",
      };
  }
}

function positionBadge(position) {
  switch (position) {
    case "premium":
      return {
        cls: "bg-red-900/40 border-red-700 text-red-200",
        label: "🔺 Premium",
      };
    case "discount":
      return {
        cls: "bg-green-900/40 border-green-700 text-green-200",
        label: "🔻 Discount",
      };
    case "equilibrium":
      return {
        cls: "bg-gray-800/60 border-gray-600 text-gray-300",
        label: "⚖️ Equilibrium",
      };
    default:
      return {
        cls: "bg-gray-800/60 border-gray-600 text-gray-300",
        label: "—",
      };
  }
}

// ------------------------------------------------------------
// Main card
// ------------------------------------------------------------

export default function LiquiditySequenceCard({ data }) {
  if (!data) return null;

  const {
    sequenceType,
    verdict,
    steps,
    premiumDiscount,
    conflict,
    trade,
    reasons,
    allPassed,
  } = data;

  const seqInfo = sequenceTypeInfo(sequenceType);

  const verdictColor =
    verdict === "BUY"
      ? "bg-green-900/40 border-green-600 text-green-200"
      : verdict === "SELL"
      ? "bg-red-900/40 border-red-600 text-red-200"
      : "bg-gray-800/60 border-gray-600 text-gray-300";

  const verdictEmoji =
    verdict === "BUY" ? "🟢" : verdict === "SELL" ? "🔴" : "⏳";

  const pdBadge = positionBadge(premiumDiscount?.position);
  const rbBadge = alignmentBadge(steps?.rb?.alignment);

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-blue-800 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-blue-300">
            {seqInfo.emoji} Liquidity Sequence —{" "}
            {sequenceType === "support" ? "Support" : "Resistance"}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Zone → Sweep → MSS → FVG → RB → Close → Premium/Discount verdict
          </p>
        </div>
        <span
          className={`text-xs px-3 py-1 rounded-full border-2 font-bold ${verdictColor}`}
        >
          {verdictEmoji} {verdict}
        </span>
      </div>

      {/* Step checklist — 6 gates */}
      <div className="space-y-2">
        <StepRow step={steps.liquidity} />
        <StepRow step={steps.sweep} />
        <StepRow step={steps.mss} />
        <StepRow step={steps.fvg} />
        <StepRow step={steps.rb} />
        <StepRow step={steps.close} />
      </div>

      {/* Premium / Discount panel */}
      {premiumDiscount && premiumDiscount.position !== "unknown" && (
        <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-semibold text-indigo-200">
              ⚖️ Premium / Discount — negotiation inside the RB
            </p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border font-bold ${pdBadge.cls}`}
            >
              {pdBadge.label}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-gray-500">RB CE</p>
              <p className="font-bold tabular-nums text-indigo-200">
                {premiumDiscount.ce !== null
                  ? formatPrice(premiumDiscount.ce)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Close</p>
              <p className="font-bold tabular-nums text-indigo-200">
                {premiumDiscount.close !== null
                  ? formatPrice(premiumDiscount.close)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">From CE</p>
              <p className="font-bold tabular-nums text-indigo-200">
                {premiumDiscount.pipsFromCe !== null
                  ? `${premiumDiscount.pipsFromCe} pips`
                  : "—"}
              </p>
            </div>
          </div>
          <p className="text-xs text-indigo-300/90">
            {premiumDiscount.detail}
          </p>
        </div>
      )}

      {/* RB alignment panel — show badge even if not all passed */}
      {steps?.rb?.rb && steps?.fvg?.fvg && (
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs px-3 py-2 rounded-lg bg-gray-800/40 border border-gray-700">
          <span className="text-gray-400">
            RB <span className="tabular-nums">{steps.rb.rb.low}</span> –{" "}
            <span className="tabular-nums">{steps.rb.rb.high}</span> · FVG{" "}
            <span className="tabular-nums">{steps.fvg.fvg.low}</span> –{" "}
            <span className="tabular-nums">{steps.fvg.fvg.high}</span>
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-bold ${rbBadge.cls}`}
          >
            {rbBadge.label}
          </span>
        </div>
      )}

      {/* Conflict banner */}
      {conflict && (
        <div className="p-3 rounded-lg bg-yellow-950/40 border border-yellow-700 space-y-1">
          <p className="text-sm font-bold text-yellow-200">
            ⚠️ {conflict.label}
          </p>
          <p className="text-xs text-yellow-300">{conflict.detail}</p>
        </div>
      )}

      {/* Trade block — only if verdict is BUY or SELL */}
      {(verdict === "BUY" || verdict === "SELL") && trade && (
        <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800 space-y-2">
          <p className="text-xs font-semibold text-blue-300">
            🎯 Entry Card — all systems aligned
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Entry (RB CE)</p>
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
                1:{trade.rr}
              </p>
            </div>
            {trade.slPips !== null && (
              <div>
                <p className="text-xs text-gray-500">SL distance</p>
                <p className="font-bold tabular-nums text-red-300">
                  {trade.slPips} pips
                </p>
              </div>
            )}
            {trade.tpPips !== null && (
              <div>
                <p className="text-xs text-gray-500">TP distance</p>
                <p className="font-bold tabular-nums text-green-300">
                  {trade.tpPips} pips
                </p>
              </div>
            )}
          </div>

          {trade.rr < 2 && (
            <p className="text-xs text-yellow-300 pt-1 border-t border-blue-800/50">
              ⚠️ RR is below 2:1 — consider a further target.
            </p>
          )}
        </div>
      )}

      {/* Reasons block — when not passed */}
      {!allPassed && reasons.length > 0 && (
        <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-800">
          <p className="text-xs font-semibold text-yellow-200">
            ⚠️ System not yet aligned — {reasons.length} blocker
            {reasons.length === 1 ? "" : "s"}:
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