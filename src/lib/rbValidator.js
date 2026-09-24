// ============================================================
// REJECTION BLOCK VALIDATOR
// Institutional Flow System
// ============================================================
// Validates whether a candle formation is a valid Rejection Block
// Rule: the CURRENT candle must create the wick (sweep + rejection)
// ============================================================

export const DEFAULT_PARAMS = {
  swingLookback: 5,
  wickRatioMin: 2.0,
  displacementMultiplier: 0.6,
  atrPeriod: 14,
};

// ============================================================
// CORE VALIDATION
// ============================================================
export function validateRejectionBlock({
  direction, // 'rfz' (bearish) or 'sfz' (bullish)
  swingPrice,
  c1, // { open, high, low, close }
  c2, // { open, high, low, close }
  c3, // { open, high, low, close }
  atr,
  wickRatioMin = 2.0,
  displacementMultiplier = 0.6,
}) {
  const errors = [];

  // --- Validate inputs ---
  if (!swingPrice || !c1 || !c2 || !c3 || !atr) {
    return {
      isValid: false,
      invalidReason: "Missing required inputs",
      errors: ["All candle OHLC, swing price, and ATR are required"],
    };
  }

  const isRFZ = direction === "rfz";

  // --- 1. Determine which candle made the wick ---
  // For RFZ: the higher high of C1 vs C2
  // For SFZ: the lower low of C1 vs C2
  const c1Extreme = isRFZ ? c1.high : c1.low;
  const c2Extreme = isRFZ ? c2.high : c2.low;

  const c2MadeWick = isRFZ
    ? c2.high > c1.high
    : c2.low < c1.low;

  const c1MadeWick = isRFZ
    ? c1.high > swingPrice
    : c1.low < swingPrice;

  const previousCandleMadeBoth =
    isRFZ
      ? c1.high > c2.high && c1.low < c2.low
      : c1.low < c2.low && c1.high > c2.high;

  // --- 2. Sweep check: current candle must exceed swing ---
  const sweepOccurred = isRFZ
    ? c2.high > swingPrice
    : c2.low < swingPrice;

  // --- 3. Close back inside check ---
  const closeInside = isRFZ
    ? c2.close < swingPrice
    : c2.close > swingPrice;

  // --- 4. Wick-to-body ratio ---
  const bodySize = Math.abs(c2.close - c2.open);
  const wickSize = isRFZ
    ? c2.high - Math.max(c2.open, c2.close) // upper wick
    : Math.min(c2.open, c2.close) - c2.low; // lower wick

  const wickBodyRatio = bodySize > 0 ? wickSize / bodySize : 999;
  const wickRatioOk = wickBodyRatio >= wickRatioMin;

  // --- 5. Displacement check ---
  const displacementActual = isRFZ
    ? c2.close - c3.close // bearish displacement (positive if C3 lower)
    : c3.close - c2.close; // bullish displacement (positive if C3 higher)

  const displacementThreshold = atr * displacementMultiplier;
  const displacementOk = displacementActual >= displacementThreshold;

  // --- Compile invalidity reasons ---
  if (!c2MadeWick) {
    errors.push(
      isRFZ
        ? "Current candle did not make a higher high"
        : "Current candle did not make a lower low"
    );
  }
  if (c1MadeWick) {
    errors.push(
      isRFZ
        ? "Previous candle already made the swing high"
        : "Previous candle already made the swing low"
    );
  }
  if (previousCandleMadeBoth) {
    errors.push("Previous candle made both extremes — no fresh sweep");
  }
  if (!sweepOccurred) {
    errors.push("No sweep of the previous swing");
  }
  if (!closeInside) {
    errors.push(
      isRFZ
        ? "Candle did not close back below the swing"
        : "Candle did not close back above the swing"
    );
  }
  if (!wickRatioOk) {
    errors.push(
      `Wick-to-body ratio ${wickBodyRatio.toFixed(2)}x below minimum ${wickRatioMin}x`
    );
  }
  if (!displacementOk) {
    errors.push(
      `Displacement ${displacementActual.toFixed(2)} below threshold ${displacementThreshold.toFixed(2)}`
    );
  }

  const isValid = errors.length === 0;

  // --- Zone computation ---
  // RFZ: zone = from wick tip (c2.high) down to body close (c2.close)
  // SFZ: zone = from wick tip (c2.low) up to body close (c2.close)
  const zoneHigh = isRFZ ? c2.high : c2.close;
  const zoneLow = isRFZ ? c2.close : c2.low;
  const cePrice =
    Math.round(((zoneHigh + zoneLow) / 2) * 100) / 100;

  // --- Confidence score (0-10) ---
  let score = 0;
  if (c2MadeWick) score += 2;
  if (!c1MadeWick) score += 1;
  if (!previousCandleMadeBoth) score += 1;
  if (sweepOccurred) score += 2;
  if (closeInside) score += 1;

  // Wick strength bonus
  if (wickBodyRatio >= 5) score += 2;
  else if (wickBodyRatio >= 3) score += 1;

  // Displacement bonus
  if (displacementActual >= atr * 1.0) score += 1;
  else if (displacementActual >= atr * 0.6) score += 0.5;

  const confidenceScore = Math.min(10, Math.round(score));

  return {
    isValid,
    invalidReason: errors.length > 0 ? errors[0] : null,
    errors,

    // Component results
    sweepOccurred,
    closeInside,
    wickRatioOk,
    displacementOk,
    c1MadeWick,
    c2MadeWick,
    previousCandleMadeBoth,

    // Computed values
    wickSize,
    bodySize,
    wickBodyRatio: Math.round(wickBodyRatio * 100) / 100,
    displacementActual: Math.round(displacementActual * 100) / 100,
    displacementThreshold:
      Math.round(displacementThreshold * 100) / 100,

    // Zone
    zoneHigh,
    zoneLow,
    cePrice,

    // Score
    confidenceScore,
  };
}

// ============================================================
// Helpers
// ============================================================
export function confidenceLabel(score) {
  if (score >= 9)
    return { label: "A+ Rejection Block", emoji: "🏆", color: "text-green-300" };
  if (score >= 7)
    return { label: "A Rejection Block", emoji: "✅", color: "text-green-400" };
  if (score >= 5)
    return { label: "B Rejection Block", emoji: "⚠️", color: "text-yellow-400" };
  if (score >= 3)
    return { label: "C Rejection Block", emoji: "🟠", color: "text-orange-400" };
  return { label: "Weak / Invalid", emoji: "🔴", color: "text-red-400" };
}

export const TIMEFRAME_PRESETS = ["D1", "H4", "H1", "M30", "M15", "M5"];