// Rejection Block Quality Score — 0 to 10 total
//
// Sweep of key level: 0-2
// Wick-to-body ratio: 0-2
// Displacement: 0-3
// Timeframe alignment: 0-2
// Freshness: 0-1
//
// Rule from IFS: only trade if score >= 8

export const QUALITY_FIELDS = [
  {
    key: "sweep",
    label: "Sweep of Key Level",
    max: 2,
    why: "Did it sweep a major high/low, or just a minor wick?",
    options: [
      { value: 0, label: "No sweep / minor wick" },
      { value: 1, label: "Swept a minor level" },
      { value: 2, label: "Swept a major high/low ✅" },
    ],
  },
  {
    key: "wick_body",
    label: "Wick-to-Body Ratio",
    max: 2,
    why: "Is the wick at least 3x the body? 5x+ is exceptional.",
    options: [
      { value: 0, label: "< 2x body" },
      { value: 1, label: "3x - 4x body" },
      { value: 2, label: "5x+ body ✅" },
    ],
  },
  {
    key: "displacement",
    label: "Displacement",
    max: 3,
    why: "Did the next candle move aggressively? Strongest signal of intent.",
    options: [
      { value: 0, label: "Weak (no follow-through)" },
      { value: 1, label: "Moderate (0.3x ATR)" },
      { value: 2, label: "Strong (0.6x ATR)" },
      { value: 3, label: "Exceptional (> 1x ATR) ✅" },
    ],
  },
  {
    key: "alignment",
    label: "Timeframe Alignment",
    max: 2,
    why: "Is the zone visible on multiple timeframes?",
    options: [
      { value: 0, label: "Single timeframe only" },
      { value: 1, label: "2 timeframes aligned" },
      { value: 2, label: "H4 + H1 + D1 aligned ✅" },
    ],
  },
  {
    key: "freshness",
    label: "Freshness",
    max: 1,
    why: "Is it the first touch, or has it been mitigated?",
    options: [
      { value: 0, label: "Already mitigated / retested" },
      { value: 1, label: "First touch — fresh ✅" },
    ],
  },
];

export function computeQualityScore(scores) {
  return QUALITY_FIELDS.reduce(
    (sum, f) => sum + (parseInt(scores[f.key]) || 0),
    0
  );
}

export function qualityLabel(score) {
  if (score >= 9) return { label: "A+ Setup", emoji: "🏆", color: "text-green-300" };
  if (score >= 8) return { label: "A Setup", emoji: "✅", color: "text-green-400" };
  if (score >= 6) return { label: "B Setup", emoji: "⚠️", color: "text-yellow-400" };
  if (score >= 4) return { label: "C Setup", emoji: "🟠", color: "text-orange-400" };
  return { label: "D Setup", emoji: "🔴", color: "text-red-400" };
}

export function passesQualityGate(score) {
  return score >= 8;
}