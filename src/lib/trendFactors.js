export const TREND_FACTORS = [
  {
    key: "structure",
    number: 1,
    name: "Structure",
    bullish: "HH + HL",
    bearish: "LH + LL",
  },
  {
    key: "ema50",
    number: 2,
    name: "EMA 50",
    bullish: "Price above",
    bearish: "Price below",
  },
  {
    key: "flip_zones",
    number: 3,
    name: "Flip Zones",
    bullish: "RFZ broken",
    bearish: "SFZ broken",
  },
  {
    key: "liquidity",
    number: 4,
    name: "Liquidity",
    bullish: "Lows swept",
    bearish: "Highs swept",
  },
  {
    key: "fvgs",
    number: 5,
    name: "FVGs",
    bullish: "Bullish FVGs filled",
    bearish: "Bearish FVGs filled",
  },
  {
    key: "block_breakers",
    number: 6,
    name: "Block Breakers",
    bullish: "Breaker up",
    bearish: "Breaker down",
  },
  {
    key: "candles",
    number: 7,
    name: "Candles",
    bullish: "Large green bodies",
    bearish: "Large red bodies",
  },
  {
    key: "alignment",
    number: 8,
    name: "Alignment",
    bullish: "All TFs aligned up",
    bearish: "All TFs aligned down",
  },
  {
    key: "momentum",
    number: 9,
    name: "Momentum",
    bullish: "Strong bullish",
    bearish: "Strong bearish",
  },
  {
    key: "pullbacks",
    number: 10,
    name: "Pullbacks",
    bullish: "Hold at support",
    bearish: "Hold at resistance",
  },
];

// Compute verdict from counts
export function computeVerdict(bullishCount, bearishCount) {
  const total = bullishCount + bearishCount;
  if (total === 0) return { label: "No Data", key: "none", emoji: "⚪" };

  const bullRatio = bullishCount / total;

  if (bullRatio >= 0.9) return { label: "Strong Uptrend", key: "strong-up", emoji: "🟢🟢" };
  if (bullRatio >= 0.7) return { label: "Uptrend", key: "up", emoji: "🟢" };
  if (bullRatio > 0.3 && bullRatio < 0.7)
    return { label: "Sideways", key: "sideways", emoji: "⚪" };
  if (bullRatio <= 0.1) return { label: "Strong Downtrend", key: "strong-down", emoji: "🔴🔴" };
  return { label: "Downtrend", key: "down", emoji: "🔴" };
}

// Verdict styling
export function verdictStyle(key) {
  switch (key) {
    case "strong-up":
      return { bg: "bg-green-900/40", border: "border-green-600", text: "text-green-300" };
    case "up":
      return { bg: "bg-green-950/40", border: "border-green-800", text: "text-green-400" };
    case "sideways":
      return { bg: "bg-gray-900", border: "border-gray-700", text: "text-gray-300" };
    case "down":
      return { bg: "bg-red-950/40", border: "border-red-800", text: "text-red-400" };
    case "strong-down":
      return { bg: "bg-red-900/40", border: "border-red-600", text: "text-red-300" };
    default:
      return { bg: "bg-gray-900", border: "border-gray-800", text: "text-gray-500" };
  }
}