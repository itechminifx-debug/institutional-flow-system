export const INSTITUTIONAL_CYCLES = [
  {
    key: "accumulation",
    label: "Accumulation",
    emoji: "🟦",
    description: "Institutions building positions quietly. Wait.",
    color: "bg-blue-900/40 text-blue-300",
  },
  {
    key: "manipulation",
    label: "Manipulation",
    emoji: "🟨",
    description: "Price sweeping liquidity — traps retail. Watch for sweeps.",
    color: "bg-yellow-900/40 text-yellow-300",
  },
  {
    key: "distribution",
    label: "Distribution",
    emoji: "🟥",
    description: "Institutions exiting — real move begins. Prepare entry.",
    color: "bg-red-900/40 text-red-300",
  },
  {
  key: "re_accumulation",
  label: "Re-accumulation",
  emoji: "🔁",
  description:
    "Institutions build again after a big move. Retail thinks it's a trend change — it's not.",
  color: "bg-purple-900/40 text-purple-300",
},
];

export function cycleInfo(key) {
  return INSTITUTIONAL_CYCLES.find((c) => c.key === key) || null;
}

export function fvgInfo(present, direction) {
  if (!present) return { label: "No FVG", color: "text-gray-500" };
  if (direction === "bullish")
    return { label: "Bullish FVG", color: "text-green-400" };
  if (direction === "bearish")
    return { label: "Bearish FVG", color: "text-red-400" };
  return { label: "FVG", color: "text-gray-400" };
}

export function obInfo(present, type) {
  if (!present) return { label: "No OB", color: "text-gray-500" };
  if (type === "bullish")
    return { label: "Bullish OB", color: "text-green-400" };
  if (type === "bearish")
    return { label: "Bearish OB", color: "text-red-400" };
  return { label: "OB", color: "text-gray-400" };
}