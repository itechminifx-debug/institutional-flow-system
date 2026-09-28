// ============================================================
// STOP PLACEMENT ADVISOR
// ============================================================
// Computes a recommended stop loss based on:
//   - Wick extreme (the sweep tip)
//   - Buffer (ATR × 0.2)
// Validates:
//   - OK (1× - 3× ATR)
//   - Too Tight (< 1× ATR)
//   - Too Wide (> 3× ATR)
// ============================================================

export const DEFAULT_BUFFER_MULTIPLIER = 0.2;
export const MIN_ATR_MULTIPLE = 1.0;
export const MAX_ATR_MULTIPLE = 3.0;

// Compute the recommended stop loss
// direction = 'buy' or 'sell'
// wickExtreme = the tip of the rejection wick (highest high for RFZ / lowest low for SFZ)
//   Actually — for a BUY (SFZ), the wick tip is the LOWER wick (lowest low)
//   For a SELL (RFZ), the wick tip is the UPPER wick (highest high)
// For SELL: SL goes ABOVE the wick tip
// For BUY:  SL goes BELOW the wick tip
export function computeRecommendedStop({
  direction,
  wickExtreme,
  atr,
  bufferMultiplier = DEFAULT_BUFFER_MULTIPLIER,
}) {
  if (!wickExtreme || !atr) {
    return {
      valid: false,
      error: "Wick extreme and ATR are required",
    };
  }

  const wick = parseFloat(wickExtreme);
  const a = parseFloat(atr);
  const buffer = a * bufferMultiplier;

  if (isNaN(wick) || isNaN(a) || a <= 0) {
    return {
      valid: false,
      error: "Invalid wick extreme or ATR",
    };
  }

  let sl;
  if (direction === "buy") {
    // BUY: stop loss goes BELOW the wick (below the low)
    sl = wick - buffer;
  } else if (direction === "sell") {
    // SELL: stop loss goes ABOVE the wick (above the high)
    sl = wick + buffer;
  } else {
    return {
      valid: false,
      error: "Direction must be 'buy' or 'sell'",
    };
  }

  return {
    valid: true,
    stopLoss: Math.round(sl * 100) / 100,
    wick,
    buffer: Math.round(buffer * 100) / 100,
    atr: a,
  };
}

// Validate the stop distance relative to ATR
// entry = the entry price (CE)
// stopLoss = the proposed SL
// atr = the ATR
export function validateStopDistance({ entry, stopLoss, atr }) {
  if (!entry || !stopLoss || !atr) {
    return {
      status: "unknown",
      label: "Enter values",
      emoji: "•",
      color: "bg-gray-900 text-gray-500",
      description: "Fill in entry, SL, and ATR",
    };
  }

  const e = parseFloat(entry);
  const s = parseFloat(stopLoss);
  const a = parseFloat(atr);

  if (isNaN(e) || isNaN(s) || isNaN(a) || a <= 0) {
    return {
      status: "unknown",
      label: "Invalid values",
      emoji: "•",
      color: "bg-gray-900 text-gray-500",
      description: "Check your inputs",
    };
  }

  const distance = Math.abs(e - s);
  const atrMultiple = distance / a;

  if (atrMultiple < MIN_ATR_MULTIPLE) {
    return {
      status: "too_tight",
      label: "Too Tight",
      emoji: "⚠️",
      color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
      badge: "bg-yellow-900/40 text-yellow-300",
      distance,
      atrMultiple,
      description: `Distance is ${atrMultiple.toFixed(
        2
      )}× ATR. Below 1× ATR, you're likely to be stopped out by noise.`,
    };
  }

  if (atrMultiple > MAX_ATR_MULTIPLE) {
    return {
      status: "too_wide",
      label: "Too Wide",
      emoji: "🔴",
      color: "bg-red-950/40 border-red-700 text-red-200",
      badge: "bg-red-900/40 text-red-300",
      distance,
      atrMultiple,
      description: `Distance is ${atrMultiple.toFixed(
        2
      )}× ATR. Above 3× ATR, your RR will suffer and risk is too large.`,
    };
  }

  return {
    status: "ok",
    label: "OK",
    emoji: "✅",
    color: "bg-green-950/40 border-green-700 text-green-200",
    badge: "bg-green-900/40 text-green-300",
    distance,
    atrMultiple,
    description: `Distance is ${atrMultiple.toFixed(
      2
    )}× ATR. Within the healthy range (1× to 3× ATR).`,
  };
}

// Compute lot size from risk + stop distance
// accountSize × riskPercent / stopDistance × pipValue
export function computeLotFromStop({
  accountSize,
  riskPercent,
  stopDistance,
  pipValuePerLot = 1,
}) {
  if (!accountSize || !riskPercent || !stopDistance || stopDistance <= 0) {
    return { lotSize: 0, riskAmount: 0 };
  }

  const riskAmount = (accountSize * riskPercent) / 100;
  const lotSize = riskAmount / (stopDistance * pipValuePerLot);

  return {
    lotSize: Math.max(0.01, Math.round(lotSize * 100) / 100),
    riskAmount,
  };
}