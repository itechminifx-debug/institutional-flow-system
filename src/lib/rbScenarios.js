// ============================================================
// RB SCENARIOS — Institutional Flow System
// Auto-classifies a rejection block into one of 6 scenarios
// based on quality score, bias, FVG, and context
// ============================================================

export const RB_SCENARIOS = {
  STRONG_BULLISH: {
    key: "strong_bullish",
    label: "Strong Bullish RB",
    emoji: "🎯",
    direction: "buy",
    conviction: "high",
    color: "bg-green-900/50 border-green-600 text-green-200",
    badge: "bg-green-900/40 text-green-300",
    description:
      "High-quality bullish rejection block. Displacement is strong, zone is fresh, alignment is clear. Enter on body close confirmation.",
    action: "High conviction BUY",
  },
  STRONG_BEARISH: {
    key: "strong_bearish",
    label: "Strong Bearish RB",
    emoji: "🎯",
    direction: "sell",
    conviction: "high",
    color: "bg-red-900/50 border-red-600 text-red-200",
    badge: "bg-red-900/40 text-red-300",
    description:
      "High-quality bearish rejection block. Displacement is strong, zone is fresh, alignment is clear. Enter on body close confirmation.",
    action: "High conviction SELL",
  },
  WEAK_BULLISH: {
    key: "weak_bullish",
    label: "Weak Bullish RB",
    emoji: "⚠️",
    direction: "buy",
    conviction: "medium",
    color: "bg-yellow-900/40 border-yellow-700 text-yellow-200",
    badge: "bg-yellow-900/40 text-yellow-300",
    description:
      "Bullish rejection block with moderate quality. Wait for additional confirmation before entry — a strong body close or H1 shift.",
    action: "Wait for confirmation",
  },
  WEAK_BEARISH: {
    key: "weak_bearish",
    label: "Weak Bearish RB",
    emoji: "⚠️",
    direction: "sell",
    conviction: "medium",
    color: "bg-yellow-900/40 border-yellow-700 text-yellow-200",
    badge: "bg-yellow-900/40 text-yellow-300",
    description:
      "Bearish rejection block with moderate quality. Wait for additional confirmation before entry — a strong body close or H1 shift.",
    action: "Wait for confirmation",
  },
  FAILED_BULLISH: {
    key: "failed_bullish",
    label: "Failed Bullish RB",
    emoji: "🔴",
    direction: "sell",
    conviction: "low",
    color: "bg-red-950/60 border-red-800 text-red-200",
    badge: "bg-red-900/40 text-red-300",
    description:
      "Bullish rejection block failed. Zone flipped to resistance. Consider SELL setups instead — sellers have taken control.",
    action: "Flip to resistance — SELL",
  },
  FAILED_BEARISH: {
    key: "failed_bearish",
    label: "Failed Bearish RB",
    emoji: "🟢",
    direction: "buy",
    conviction: "low",
    color: "bg-green-950/60 border-green-800 text-green-200",
    badge: "bg-green-900/40 text-green-300",
    description:
      "Bearish rejection block failed. Zone flipped to support. Consider BUY setups instead — buyers have taken control.",
    action: "Flip to support — BUY",
  },
  INCOMPLETE: {
    key: "incomplete",
    label: "Context Incomplete",
    emoji: "❓",
    direction: null,
    conviction: "unknown",
    color: "bg-gray-900 border-gray-700 text-gray-300",
    badge: "bg-gray-800 text-gray-300",
    description:
      "Not enough context to classify this rejection block. Add quality scores and FVG info to unlock scenario detection.",
    action: "Complete the setup",
  },
};

// ============================================================
// Classify a setup into a scenario
// ============================================================
export function classifyScenario(setup) {
  if (!setup) return RB_SCENARIOS.INCOMPLETE;

  const score = setup.rb_quality_score || 0;
  const bias = setup.d1_bias;
  const fvgDir = setup.fvg_direction;

  // Not enough data
  if (score === 0) return RB_SCENARIOS.INCOMPLETE;

  // Determine effective direction
  const isBullish = bias === "bullish";
  const isBearish = bias === "bearish";

  // FVG agreement (soft check — doesn't block classification)
  const fvgConfirmsBullish = fvgDir === "bullish";
  const fvgConfirmsBearish = fvgDir === "bearish";

  // STRONG: score 10+ AND FVG agrees (or FVG missing but score is elite 11+)
  if (score >= 10) {
    if (isBullish && (fvgConfirmsBullish || score >= 11)) {
      return RB_SCENARIOS.STRONG_BULLISH;
    }
    if (isBearish && (fvgConfirmsBearish || score >= 11)) {
      return RB_SCENARIOS.STRONG_BEARISH;
    }
  }

  // WEAK: score 7-9
  if (score >= 7 && score <= 9) {
    if (isBullish) return RB_SCENARIOS.WEAK_BULLISH;
    if (isBearish) return RB_SCENARIOS.WEAK_BEARISH;
  }

  // FAILED: score < 7
  if (score < 7) {
    if (isBullish) return RB_SCENARIOS.FAILED_BULLISH;
    if (isBearish) return RB_SCENARIOS.FAILED_BEARISH;
  }

  return RB_SCENARIOS.INCOMPLETE;
}

// ============================================================
// Scenario banner component helpers
// ============================================================
export function scenarioBannerStyle(scenario) {
  if (!scenario) return "";
  return `${scenario.color}`;
}