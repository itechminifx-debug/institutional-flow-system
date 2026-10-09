// ============================================================
// SHARED TRADE CALCULATOR
// ============================================================
// Computes entry, SL, TP, lot size, risk $, RR, and pips
// for ANY setup system (negotiation, BOS+RB, premium/discount,
// liquidity zone, rejection block).
//
// Each system provides:
//   - entry (usually the CE)
//   - slReference (the wick extreme / zone edge)
//   - direction ('BUY' | 'SELL')
//   - atr (optional, for buffer)
//   - accountSize + riskPercent
//   - pipSize
//
// The engine produces a consistent trade payload for the UI.
// ============================================================

export const PIP_SIZE_DEFAULT = 0.01;
export const RR_TARGET_DEFAULT = 2;

// ============================================================
// MAIN CALCULATOR
// ============================================================
export function computeTrade({
  direction,       // 'BUY' | 'SELL'
  entry,           // number (usually the CE)
  slReference,     // number — the wick extreme / zone edge
  atr = 0,         // optional — for buffer
  bufferMultiplier = 0.3,
  accountSize = 0,
  riskPercent = 1,
  pipSize = PIP_SIZE_DEFAULT,
  rrTarget = RR_TARGET_DEFAULT,
  // Optional: force the entry to CE (calculated from a zone)
  zoneHigh,
  zoneLow,
}) {
  if (direction !== "BUY" && direction !== "SELL") return null;

  // Resolve entry
  let resolvedEntry = parseFloat(entry);

  // If zone given and no entry, use the CE
  if ((isNaN(resolvedEntry) || !resolvedEntry) && zoneHigh && zoneLow) {
    const h = parseFloat(zoneHigh);
    const l = parseFloat(zoneLow);
    if (!isNaN(h) && !isNaN(l)) {
      resolvedEntry = Math.round(((h + l) / 2) * 100) / 100;
    }
  }

  const slRef = parseFloat(slReference);
  if (isNaN(resolvedEntry) || isNaN(slRef)) return null;

  const isBull = direction === "BUY";
  const p = parseFloat(pipSize) || PIP_SIZE_DEFAULT;
  const atrVal = parseFloat(atr) || 0;
  const buffer = atrVal > 0 ? atrVal * bufferMultiplier : 0;

  // Stop Loss beyond the SL reference
  const sl = isBull ? slRef - buffer : slRef + buffer;

  const risk = Math.abs(resolvedEntry - sl);
  if (risk === 0) return null;

  // Take Profit
  const tp = isBull
    ? resolvedEntry + risk * rrTarget
    : resolvedEntry - risk * rrTarget;

  // Lot sizing
  const riskAmount = (parseFloat(accountSize) * parseFloat(riskPercent)) / 100;
  const lotSize =
    risk > 0
      ? Math.max(0.01, Math.round((riskAmount / risk) * 100) / 100)
      : 0;

  // Pips
  const slPips = Math.round((Math.abs(resolvedEntry - sl) / p) * 100) / 100;
  const tpPips = Math.round((Math.abs(tp - resolvedEntry) / p) * 100) / 100;

  return {
    direction,
    entry: Math.round(resolvedEntry * 100) / 100,
    sl: Math.round(sl * 100) / 100,
    tp: Math.round(tp * 100) / 100,
    risk: Math.round(risk * 100) / 100,
    reward: Math.round(risk * rrTarget * 100) / 100,
    rr: rrTarget,
    lotSize,
    riskAmount: Math.round(riskAmount * 100) / 100,
    buffer: Math.round(buffer * 100) / 100,
    slReference: slRef,
    wickExtreme: slRef,
    slSource: buffer > 0 ? "reference+buffer" : "reference",
    pipSize: p,
    slPips,
    tpPips,
  };
}

// ============================================================
// TRADE VALIDATION
// ============================================================
// Returns { ok, errors[], warnings[] } for a computed trade.
export function validateTrade({ trade, verdict, minRR = 1 }) {
  const errors = [];
  const warnings = [];

  if (!trade) {
    errors.push("Trade could not be computed — check entry and SL.");
    return { ok: false, errors, warnings };
  }

  const isBull = trade.direction === "BUY";

  // Direction must match SL placement
  if (isBull && trade.sl >= trade.entry) {
    errors.push("For a BUY, Stop Loss must be below entry.");
  }
  if (!isBull && trade.sl <= trade.entry) {
    errors.push("For a SELL, Stop Loss must be above entry.");
  }

  // Direction must match TP placement
  if (isBull && trade.tp <= trade.entry) {
    errors.push("For a BUY, Take Profit must be above entry.");
  }
  if (!isBull && trade.tp >= trade.entry) {
    errors.push("For a SELL, Take Profit must be below entry.");
  }

  // RR check
  if (trade.rr < minRR) {
    warnings.push(`RR is below 1:${minRR} (currently 1:${trade.rr}).`);
  }

  // Verdict must agree
  if (verdict && verdict !== "WAIT" && verdict !== trade.direction) {
    errors.push(
      `Verdict (${verdict}) does not match trade direction (${trade.direction}).`
    );
  }

  return { ok: errors.length === 0, errors, warnings };
}

// ============================================================
// TRADE BADGE COLORS — for UI
// ============================================================
export function tradeBadgeColors(direction) {
  return direction === "BUY"
    ? {
        text: "text-green-400",
        bg: "bg-green-900/40",
        border: "border-green-700",
      }
    : {
        text: "text-red-400",
        bg: "bg-red-900/40",
        border: "border-red-700",
      };
}