// ============================================================
// MSS HELPERS — Market Structure Shift
// ============================================================
// MSS = the break of the last opposing swing (with close beyond)
//   Bullish MSS: in a downtrend, price closes ABOVE the last swing high
//   Bearish MSS: in an uptrend, price closes BELOW the last swing low
// ============================================================

export const MSS_STATES = {
  bullish: {
    key: "bullish",
    label: "Bullish MSS",
    emoji: "🟢",
    color: "bg-green-950/40 border-green-700 text-green-200",
    badge: "bg-green-900/40 text-green-300",
    description: "Price broke above the last swing high — trend reversing up",
    tradeBias: "buy",
  },
  bearish: {
    key: "bearish",
    label: "Bearish MSS",
    emoji: "🔴",
    color: "bg-red-950/40 border-red-700 text-red-200",
    badge: "bg-red-900/40 text-red-300",
    description: "Price broke below the last swing low — trend reversing down",
    tradeBias: "sell",
  },
};

export function mssInfo(key) {
  return MSS_STATES[key] || null;
}

// Validate MSS logic
// For bullish MSS, the broken level was a swing high, and price closed ABOVE it
// For bearish MSS, the broken level was a swing low, and price closed BELOW it
export function validateMSS({
  direction,
  brokenLevel,
  closePrice,
}) {
  const errors = [];

  if (!brokenLevel || !closePrice) {
    return {
      isValid: false,
      errors: ["Broken level and close price are required"],
    };
  }

  const level = parseFloat(brokenLevel);
  const close = parseFloat(closePrice);

  if (direction === "bullish") {
    if (close <= level) {
      errors.push("Bullish MSS requires close ABOVE the broken level");
    }
  } else if (direction === "bearish") {
    if (close >= level) {
      errors.push("Bearish MSS requires close BELOW the broken level");
    }
  } else {
    errors.push("Direction must be 'bullish' or 'bearish'");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Check if the recent price swing direction conflicts with the MSS
// If uptrend and bearish MSS → reversal confirmed
// If downtrend and bullish MSS → reversal confirmed
// If uptrend and bullish MSS → continuation (BOS, not MSS)
// If downtrend and bearish MSS → continuation (BOS, not MSS)
export function mssType(previousTrend, mssDirection) {
  if (
    (previousTrend === "uptrend" && mssDirection === "bearish") ||
    (previousTrend === "downtrend" && mssDirection === "bullish")
  ) {
    return "reversal";
  }
  return "continuation";
}