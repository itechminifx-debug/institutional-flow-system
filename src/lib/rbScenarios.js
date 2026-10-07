// ============================================================
// RB SCENARIOS — Institutional Flow System
// Classifies a setup into a scenario across all 5 systems.
// ============================================================

export const RB_SCENARIOS = {
  // ---- Negotiation (legacy) ----
  STRONG_BULLISH: {
    key: "strong_bullish",
    label: "Strong Bullish RB",
    emoji: "🎯",
    direction: "buy",
    conviction: "high",
    color: "bg-green-900/50 border-green-600 text-green-200",
    badge: "bg-green-900/40 text-green-300",
    description:
      "High-quality bullish rejection block. Displacement is strong, zone is fresh, alignment is clear.",
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
      "High-quality bearish rejection block. Displacement is strong, zone is fresh, alignment is clear.",
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
      "Bullish rejection block with moderate quality. Wait for additional confirmation.",
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
      "Bearish rejection block with moderate quality. Wait for additional confirmation.",
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
      "Bullish rejection block failed. Zone flipped to resistance.",
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
      "Bearish rejection block failed. Zone flipped to support.",
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
    description: "Not enough context to classify.",
    action: "Complete the setup",
  },

  // ---- Rejection Block (new system) ----
  RB_ALL_FLIPPED_UP: {
    key: "rb_all_flipped_up",
    label: "All RBs Flipped ↑",
    emoji: "🔥",
    direction: "buy",
    conviction: "high",
    color: "bg-green-950/60 border-green-600 text-green-200",
    badge: "bg-green-900/40 text-green-300",
    description:
      "Every listed RB has been flipped upward. Maximum bullish continuation.",
    action: "Confirmed BUY",
  },
  RB_ALL_FLIPPED_DOWN: {
    key: "rb_all_flipped_down",
    label: "All RBs Flipped ↓",
    emoji: "🔥",
    direction: "sell",
    conviction: "high",
    color: "bg-red-950/60 border-red-600 text-red-200",
    badge: "bg-red-900/40 text-red-300",
    description:
      "Every listed RB has been flipped downward. Maximum bearish continuation.",
    action: "Confirmed SELL",
  },
  RB_STRONG_BUY: {
    key: "rb_strong_buy",
    label: "Strong RB Break ↑",
    emoji: "🏆",
    direction: "buy",
    conviction: "high",
    color: "bg-green-950/50 border-green-700 text-green-200",
    badge: "bg-green-900/40 text-green-300",
    description: "Close broke the active RB upward with strength.",
    action: "BUY",
  },
  RB_STRONG_SELL: {
    key: "rb_strong_sell",
    label: "Strong RB Break ↓",
    emoji: "🏆",
    direction: "sell",
    conviction: "high",
    color: "bg-red-950/50 border-red-700 text-red-200",
    badge: "bg-red-900/40 text-red-300",
    description: "Close broke the active RB downward with strength.",
    action: "SELL",
  },
  RB_REVERSAL_BUY: {
    key: "rb_reversal_buy",
    label: "Reversal — BUY",
    emoji: "🔄",
    direction: "buy",
    conviction: "medium",
    color: "bg-purple-950/50 border-purple-700 text-purple-200",
    badge: "bg-purple-900/40 text-purple-300",
    description:
      "Condition RB was swept and reclaimed. BUY reversal candidate.",
    action: "BUY on confirmation",
  },
  RB_REVERSAL_SELL: {
    key: "rb_reversal_sell",
    label: "Reversal — SELL",
    emoji: "🔄",
    direction: "sell",
    conviction: "medium",
    color: "bg-purple-950/50 border-purple-700 text-purple-200",
    badge: "bg-purple-900/40 text-purple-300",
    description:
      "Condition RB was swept and reclaimed. SELL reversal candidate.",
    action: "SELL on confirmation",
  },
  RB_BLOCKED: {
    key: "rb_blocked",
    label: "RB Blocked",
    emoji: "🚫",
    direction: null,
    conviction: "low",
    color: "bg-yellow-950/50 border-yellow-700 text-yellow-200",
    badge: "bg-yellow-900/40 text-yellow-300",
    description:
      "An RB sits in the path before the target. Consider Safe TP.",
    action: "Reduce target or wait",
  },

  // ---- BOS + RB ----
  BOS_RB_PASSED: {
    key: "bos_rb_passed",
    label: "BOS + RB Passed",
    emoji: "✅",
    direction: null,
    conviction: "high",
    color: "bg-green-950/50 border-green-700 text-green-200",
    badge: "bg-green-900/40 text-green-300",
    description: "Checklist passed — the BOS+RB setup is valid.",
    action: "Trade it",
  },
  BOS_RB_PARTIAL: {
    key: "bos_rb_partial",
    label: "BOS + RB Partial",
    emoji: "⚠️",
    direction: null,
    conviction: "medium",
    color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
    badge: "bg-yellow-900/40 text-yellow-300",
    description: "Checklist partially passed — wait for confirmation.",
    action: "Wait",
  },

  // ---- Premium / Discount ----
  PREMIUM_DISCOUNT_BUY: {
    key: "premium_discount_buy",
    label: "Discount BUY",
    emoji: "🟢",
    direction: "buy",
    conviction: "high",
    color: "bg-green-950/50 border-green-700 text-green-200",
    badge: "bg-green-900/40 text-green-300",
    description: "Close landed in the discount side — buyers defended.",
    action: "BUY",
  },
  PREMIUM_DISCOUNT_SELL: {
    key: "premium_discount_sell",
    label: "Premium SELL",
    emoji: "🔴",
    direction: "sell",
    conviction: "high",
    color: "bg-red-950/50 border-red-700 text-red-200",
    badge: "bg-red-900/40 text-red-300",
    description: "Close landed in the premium side — sellers defended.",
    action: "SELL",
  },

  // ---- Liquidity Zone ----
  LZ_ACTIVE_RB: {
    key: "lz_active_rb",
    label: "Liquidity Zone Active",
    emoji: "🎯",
    direction: null,
    conviction: "medium",
    color: "bg-blue-950/50 border-blue-700 text-blue-200",
    badge: "bg-blue-900/40 text-blue-300",
    description: "Price is negotiating with an RB inside the liquidity zone.",
    action: "Monitor",
  },
};

// ============================================================
// Classify a setup into a scenario
// ============================================================
export function classifyScenario(setup) {
  if (!setup) return RB_SCENARIOS.INCOMPLETE;

  const type = setup.setup_type || "negotiation";

  // ---- Rejection Block ----
  if (type === "rejection_block") {
    if (setup.all_rbs_flipped) {
      return setup.all_rbs_flipped_direction === "up"
        ? RB_SCENARIOS.RB_ALL_FLIPPED_UP
        : RB_SCENARIOS.RB_ALL_FLIPPED_DOWN;
    }
    if (setup.reversal_detected) {
      return setup.reversal_direction === "BUY"
        ? RB_SCENARIOS.RB_REVERSAL_BUY
        : RB_SCENARIOS.RB_REVERSAL_SELL;
    }
    if (setup.has_blockers) {
      return RB_SCENARIOS.RB_BLOCKED;
    }
    if (setup.verdict === "BUY" && setup.strength === "strong") {
      return RB_SCENARIOS.RB_STRONG_BUY;
    }
    if (setup.verdict === "SELL" && setup.strength === "strong") {
      return RB_SCENARIOS.RB_STRONG_SELL;
    }
    if (setup.verdict === "BUY") return RB_SCENARIOS.WEAK_BULLISH;
    if (setup.verdict === "SELL") return RB_SCENARIOS.WEAK_BEARISH;
    return RB_SCENARIOS.INCOMPLETE;
  }

  // ---- BOS + RB ----
  if (type === "bos_rb") {
    if (setup.checklist_passed) return RB_SCENARIOS.BOS_RB_PASSED;
    if (
      setup.checklist_score !== null &&
      setup.checklist_score !== undefined
    ) {
      return RB_SCENARIOS.BOS_RB_PARTIAL;
    }
    return RB_SCENARIOS.INCOMPLETE;
  }

  // ---- Premium / Discount ----
  if (type === "premium_discount") {
    if (setup.htf_bias === "bullish") return RB_SCENARIOS.PREMIUM_DISCOUNT_BUY;
    if (setup.htf_bias === "bearish")
      return RB_SCENARIOS.PREMIUM_DISCOUNT_SELL;
    return RB_SCENARIOS.INCOMPLETE;
  }

  // ---- Liquidity Zone ----
  if (type === "liquidity_zone") {
    return RB_SCENARIOS.LZ_ACTIVE_RB;
  }

  // ---- Negotiation (legacy) ----
  const score = setup.rb_quality_score || 0;
  const bias = setup.d1_bias;
  const fvgDir = setup.fvg_direction;

  if (score === 0) return RB_SCENARIOS.INCOMPLETE;

  const isBullish = bias === "bullish";
  const isBearish = bias === "bearish";
  const fvgConfirmsBullish = fvgDir === "bullish";
  const fvgConfirmsBearish = fvgDir === "bearish";

  if (score >= 10) {
    if (isBullish && (fvgConfirmsBullish || score >= 11)) {
      return RB_SCENARIOS.STRONG_BULLISH;
    }
    if (isBearish && (fvgConfirmsBearish || score >= 11)) {
      return RB_SCENARIOS.STRONG_BEARISH;
    }
  }

  if (score >= 7 && score <= 9) {
    if (isBullish) return RB_SCENARIOS.WEAK_BULLISH;
    if (isBearish) return RB_SCENARIOS.WEAK_BEARISH;
  }

  if (score < 7) {
    if (isBullish) return RB_SCENARIOS.FAILED_BULLISH;
    if (isBearish) return RB_SCENARIOS.FAILED_BEARISH;
  }

  return RB_SCENARIOS.INCOMPLETE;
}

export function scenarioBannerStyle(scenario) {
  if (!scenario) return "";
  return `${scenario.color}`;
}