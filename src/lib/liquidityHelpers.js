// ============================================================
// LIQUIDITY HELPERS — Institutional Flow System
// ============================================================

export const LEVEL_TYPES = [
  {
    key: "unmitigated_high",
    label: "Unmitigated High",
    emoji: "🔺",
    color: "bg-red-900/40 text-red-300",
    description: "High not yet swept — stops sit above",
    bias: "bearish",
  },
  {
    key: "unmitigated_low",
    label: "Unmitigated Low",
    emoji: "🔻",
    color: "bg-green-900/40 text-green-300",
    description: "Low not yet swept — stops sit below",
    bias: "bullish",
  },
  {
    key: "equal_high",
    label: "Equal High",
    emoji: "🔼",
    color: "bg-red-900/50 text-red-200",
    description: "Double liquidity magnet above",
    bias: "bearish",
  },
  {
    key: "equal_low",
    label: "Equal Low",
    emoji: "🔽",
    color: "bg-green-900/50 text-green-200",
    description: "Double liquidity magnet below",
    bias: "bullish",
  },
  {
    key: "round_number",
    label: "Round Number",
    emoji: "⭕",
    color: "bg-purple-900/40 text-purple-300",
    description: "Psychological level — retail cluster",
    bias: "neutral",
  },
  {
    key: "session_high",
    label: "Session High",
    emoji: "🌅",
    color: "bg-orange-900/40 text-orange-300",
    description: "Asian / London / NY session high",
    bias: "bearish",
  },
  {
    key: "session_low",
    label: "Session Low",
    emoji: "🌆",
    color: "bg-blue-900/40 text-blue-300",
    description: "Asian / London / NY session low",
    bias: "bullish",
  },
];

export const SESSIONS = ["Asian", "London", "New York"];

export function levelInfo(key) {
  return LEVEL_TYPES.find((t) => t.key === key) || null;
}

export function distanceLabel(price, livePrice) {
  if (livePrice == null || price == null) return "—";
  const d = Math.abs(livePrice - price);
  return d.toFixed(2);
}

export function liquidityAround(levels, livePrice) {
  if (livePrice == null) return { above: 0, below: 0 };

  const unswept = levels.filter((l) => !l.swept);
  return {
    above: unswept.filter((l) => l.price > livePrice).length,
    below: unswept.filter((l) => l.price < livePrice).length,
  };
}