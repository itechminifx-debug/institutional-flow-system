// ============================================================
// NEGOTIATION ENGINE — MSS + RB + CE + Battle Zone + Verdict
// ============================================================
// The Negotiation is the Battle.
//   - MSS zone = bulls' stronghold
//   - RB zone = bears' stronghold
//   - Two decisive closes decide the verdict:
//       1. Close above MSS High → Bullish confirmed
//       2. Close below RB Low → Bearish flip
//   - Everything in between = battle zone, no verdict
// ============================================================

export const CONFIGURATIONS = [
  {
    key: "rb_inside_mss",
    label: "RB Inside MSS",
    emoji: "🎯",
    color: "bg-blue-950/40 border-blue-700 text-blue-200",
    badge: "bg-blue-900/40 text-blue-300",
    strength: "standard",
    description:
      "RB forms inside the MSS zone. The base configuration — same battlefield.",
    expectedBehavior: "Bounce or break at the zone",
    tradeDirection: "with_mss",
  },
  {
    key: "rb_above_mss",
    label: "RB Above MSS",
    emoji: "🔺",
    color: "bg-red-950/40 border-red-700 text-red-200",
    badge: "bg-red-900/40 text-red-300",
    strength: "strong",
    description:
      "RB forms above the MSS zone. Premium defense — bears' stronghold above.",
    expectedBehavior: "Battle between MSS and RB above",
    tradeDirection: "flip_likely",
  },
  {
    key: "rb_below_mss",
    label: "RB Below MSS",
    emoji: "🔻",
    color: "bg-green-950/40 border-green-700 text-green-200",
    badge: "bg-green-900/40 text-green-300",
    strength: "strong",
    description:
      "RB forms below the MSS zone. Discount defense — bears' stronghold below.",
    expectedBehavior: "Battle between MSS and RB below",
    tradeDirection: "with_mss",
  },
  {
    key: "nested_rb_in_mss",
    label: "Nested RB in MSS",
    emoji: "⚡",
    color: "bg-orange-950/40 border-orange-700 text-orange-200",
    badge: "bg-orange-900/40 text-orange-300",
    strength: "extreme",
    description:
      "Multiple RBs inside the MSS zone. Compressed battlefield — bigger breakout.",
    expectedBehavior: "Compression before the verdict",
    tradeDirection: "with_mss",
  },
  {
    key: "nested_mss_in_rb",
    label: "Nested MSS in RB",
    emoji: "🔥",
    color: "bg-purple-950/40 border-purple-700 text-purple-200",
    badge: "bg-purple-900/40 text-purple-300",
    strength: "rare",
    description:
      "An MSS forms inside the RB zone. Micro-battle inside macro-battle.",
    expectedBehavior: "Rare — often flips",
    tradeDirection: "flip_likely",
  },
  {
    key: "mss_nested_in_rb_flip",
    label: "MSS Nested in RB → Flip",
    emoji: "🔄",
    color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
    badge: "bg-yellow-900/40 text-yellow-300",
    strength: "extreme",
    description:
      "MSS inside the RB and flips. Trade the flip — the second battle.",
    expectedBehavior: "Trade the flip direction",
    tradeDirection: "flip",
  },
];

export function configurationInfo(key) {
  return CONFIGURATIONS.find((c) => c.key === key) || null;
}

// ============================================================
// AUTO-DETECT CONFIGURATION
// ============================================================
export function detectConfiguration({
  mssZoneHigh,
  mssZoneLow,
  rbZoneHigh,
  rbZoneLow,
  nestedRbCount = 0,
  nestedMssInRb = false,
  rbFlipped = false,
}) {
  if (!mssZoneHigh || !mssZoneLow || !rbZoneHigh || !rbZoneLow) {
    return { key: null, reason: "Missing zone data" };
  }

  const mssHigh = parseFloat(mssZoneHigh);
  const mssLow = parseFloat(mssZoneLow);
  const rbHigh = parseFloat(rbZoneHigh);
  const rbLow = parseFloat(rbZoneLow);

  const rbInsideMSS = rbLow >= mssLow && rbHigh <= mssHigh;
  const rbAboveMSS = rbLow > mssHigh;
  const rbBelowMSS = rbHigh < mssLow;

  if (rbFlipped) {
    return {
      key: "mss_nested_in_rb_flip",
      reason: "RB has flipped — trade the flip",
    };
  }

  if (nestedMssInRb) {
    return {
      key: "nested_mss_in_rb",
      reason: "MSS is inside the RB — rare configuration",
    };
  }

  if (nestedRbCount >= 2) {
    return {
      key: "nested_rb_in_mss",
      reason: `${nestedRbCount} nested RBs — compressed battlefield`,
    };
  }

  if (rbInsideMSS) {
    return {
      key: "rb_inside_mss",
      reason: "RB is inside the MSS zone — same battlefield",
    };
  }

  if (rbAboveMSS) {
    return {
      key: "rb_above_mss",
      reason: "RB is above the MSS zone — premium defense",
    };
  }

  if (rbBelowMSS) {
    return {
      key: "rb_below_mss",
      reason: "RB is below the MSS zone — discount defense",
    };
  }

  return {
    key: null,
    reason: "Could not detect configuration",
  };
}

// ============================================================
// BATTLE ZONE — The unified negotiation logic
// ============================================================
// The MSS zone and RB zone form a battlefield.
// Two decisive closes:
//   1. Close above MSS High → Bullish confirmed
//   2. Close below RB Low   → Bearish flip
// Everything else = battle zone, no verdict
// ============================================================
export function computeBattleZone({
  mssZoneHigh,
  mssZoneLow,
  rbZoneHigh,
  rbZoneLow,
  verdictClose,
  attempts,
}) {
  if (!mssZoneHigh || !mssZoneLow || !rbZoneHigh || !rbZoneLow) {
    return {
      state: "incomplete",
      label: "Battle Zone Incomplete",
      emoji: "•",
      color: "bg-gray-900 border-gray-700 text-gray-400",
      description: "Enter MSS and RB zones to compute the battle",
    };
  }

  const mssHigh = parseFloat(mssZoneHigh);
  const mssLow = parseFloat(mssZoneLow);
  const rbHigh = parseFloat(rbZoneHigh);
  const rbLow = parseFloat(rbZoneLow);

  // Determine which is above which
  const upperZone = mssHigh >= rbHigh
    ? { name: "MSS", high: mssHigh, low: mssLow }
    : { name: "RB", high: rbHigh, low: rbLow };
  const lowerZone = upperZone.name === "MSS"
    ? { name: "RB", high: rbHigh, low: rbLow }
    : { name: "MSS", high: mssHigh, low: mssLow };

  // Decisive bullish close
  const bullishTarget = Math.max(mssHigh, rbHigh);
  // Decisive bearish close
  const bearishTarget = Math.min(mssLow, rbLow);

  if (!verdictClose) {
    return {
      state: "waiting",
      label: "Awaiting Close",
      emoji: "⏳",
      color: "bg-gray-900 border-gray-700 text-gray-300",
      description: `Enter the verdict close. Watch for close above ${bullishTarget.toFixed(2)} or below ${bearishTarget.toFixed(2)}.`,
      bullishTarget,
      bearishTarget,
      upperZone,
      lowerZone,
    };
  }

  const close = parseFloat(verdictClose);

  if (close > bullishTarget) {
    return {
      state: "bullish_confirmed",
      label: "Bullish Confirmed",
      emoji: "🟢",
      color: "bg-green-950/40 border-green-700 text-green-200",
      badge: "bg-green-900/40 text-green-300",
      description: `Close above ${bullishTarget.toFixed(2)} — bulls won the battle. Trade BUY.`,
      direction: "BUY",
      bullishTarget,
      bearishTarget,
      upperZone,
      lowerZone,
    };
  }

  if (close < bearishTarget) {
    return {
      state: "bearish_confirmed",
      label: "Bearish Confirmed",
      emoji: "🔴",
      color: "bg-red-950/40 border-red-700 text-red-200",
      badge: "bg-red-900/40 text-red-300",
      description: `Close below ${bearishTarget.toFixed(2)} — bears won the battle. Trade SELL.`,
      direction: "SELL",
      bullishTarget,
      bearishTarget,
      upperZone,
      lowerZone,
    };
  }

  // Inside the battle zone
  const insideUpper = close >= upperZone.low && close <= upperZone.high;
  const insideLower = close >= lowerZone.low && close <= lowerZone.high;
  const between = !insideUpper && !insideLower;

  if (insideUpper) {
    return {
      state: "inside_upper",
      label: `Inside ${upperZone.name} Zone`,
      emoji: "⚠️",
      color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
      description: `Close is inside the ${upperZone.name} zone. No decisive verdict. Wait for a close above ${bullishTarget.toFixed(2)} or below ${bearishTarget.toFixed(2)}.`,
      bullishTarget,
      bearishTarget,
      upperZone,
      lowerZone,
    };
  }

  if (insideLower) {
    return {
      state: "inside_lower",
      label: `Inside ${lowerZone.name} Zone`,
      emoji: "⚠️",
      color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
      description: `Close is inside the ${lowerZone.name} zone. No decisive verdict. Wait for a close above ${bullishTarget.toFixed(2)} or below ${bearishTarget.toFixed(2)}.`,
      bullishTarget,
      bearishTarget,
      upperZone,
      lowerZone,
    };
  }

  if (between) {
    return {
      state: "battle_zone",
      label: "Battle Zone Active",
      emoji: "⚔️",
      color: "bg-orange-950/40 border-orange-700 text-orange-200",
      description: `Close is between ${upperZone.name} and ${lowerZone.name}. The battle continues. Wait for a decisive close.`,
      bullishTarget,
      bearishTarget,
      upperZone,
      lowerZone,
    };
  }

  return {
    state: "waiting",
    label: "Awaiting Verdict",
    emoji: "⏳",
    color: "bg-gray-900 border-gray-700 text-gray-300",
    description: "Continue waiting for the decisive close.",
    bullishTarget,
    bearishTarget,
    upperZone,
    lowerZone,
  };
}

// ============================================================
// TRADE PARAMETERS — Battle Zone version
// ============================================================
export function computeNegotiationTrade({
  direction,
  mssDirection,
  rbZoneHigh,
  rbZoneLow,
  mssZoneHigh,
  mssZoneLow,
  accountSize = 0,
  riskPercent = 1,
  bufferMultiplier = 0.3,
}) {
  if (!rbZoneHigh || !rbZoneLow) return null;

  const rbHigh = parseFloat(rbZoneHigh);
  const rbLow = parseFloat(rbZoneLow);
  const mssHigh = mssZoneHigh ? parseFloat(mssZoneHigh) : null;
  const mssLow = mssZoneLow ? parseFloat(mssZoneLow) : null;

  const ce = Math.round(((rbHigh + rbLow) / 2) * 100) / 100;

  const tradeDirection =
    direction || (mssDirection === "bearish" ? "SELL" : "BUY");
  const isBuy = tradeDirection === "BUY";

  // Entry = CE
  // SL = beyond the wick extreme (MSS or RB high/low, whichever is safer)
  const entry = ce;
  let sl;
  if (isBuy) {
    // SL below the lower extreme (RB low or MSS low)
    const lowerExtreme = Math.min(
      rbLow,
      mssLow != null ? mssLow : rbLow
    );
    sl = lowerExtreme;
  } else {
    // SL above the upper extreme (RB high or MSS high)
    const upperExtreme = Math.max(
      rbHigh,
      mssHigh != null ? mssHigh : rbHigh
    );
    sl = upperExtreme;
  }

  const risk = Math.abs(entry - sl);
  const buffer = risk * bufferMultiplier;
  const adjustedSl = isBuy ? sl - buffer : sl + buffer;
  const adjustedRisk = Math.abs(entry - adjustedSl);

  const tp = isBuy
    ? entry + adjustedRisk * 2
    : entry - adjustedRisk * 2;

  const rr = 2;

  const riskAmount = (accountSize * riskPercent) / 100;
  const lotSize =
    adjustedRisk > 0
      ? Math.max(0.01, Math.round((riskAmount / adjustedRisk) * 100) / 100)
      : 0;

  return {
    direction: tradeDirection,
    entry,
    sl: adjustedSl,
    tp,
    risk: adjustedRisk,
    rr,
    lotSize,
    riskAmount,
    buffer,
  };
}

// ============================================================
// STRENGTH LABEL
// ============================================================
export function strengthInfo(strength) {
  const map = {
    standard: {
      label: "Standard",
      emoji: "•",
      color: "bg-gray-800 text-gray-300",
    },
    strong: {
      label: "Strong",
      emoji: "⚡",
      color: "bg-orange-900/40 text-orange-300",
    },
    extreme: {
      label: "Extreme",
      emoji: "🔥",
      color: "bg-red-900/40 text-red-300",
    },
    rare: {
      label: "Rare",
      emoji: "💎",
      color: "bg-purple-900/40 text-purple-300",
    },
  };
  return map[strength] || map.standard;
}

// ============================================================
// NEXT RB ALIGNMENT
// ============================================================
export function computeNextRBAlignment({
  direction,
  takeProfit,
  nextRbHigh,
  nextRbLow,
  tolerancePercent = 5,
}) {
  if (!takeProfit || !nextRbHigh || !nextRbLow) {
    return {
      state: "none",
      label: "No Next RB",
      emoji: "•",
      color: "bg-gray-900 border-gray-700 text-gray-400",
      description: "Enter the next rejection block to check alignment",
    };
  }

  const tp = parseFloat(takeProfit);
  const nHigh = parseFloat(nextRbHigh);
  const nLow = parseFloat(nextRbLow);

  if (isNaN(tp) || isNaN(nHigh) || isNaN(nLow)) {
    return {
      state: "none",
      label: "Invalid Values",
      emoji: "•",
      color: "bg-gray-900 border-gray-700 text-gray-400",
      description: "Check the RB values",
    };
  }

  const rbTop = Math.max(nHigh, nLow);
  const rbBottom = Math.min(nHigh, nLow);
  const rbMid = (rbTop + rbBottom) / 2;

  if (direction === "SELL") {
    if (tp >= rbBottom && tp <= rbTop) {
      return {
        state: "aligns",
        label: "Perfect Alignment",
        emoji: "🎯",
        color: "bg-green-950/40 border-green-700 text-green-200",
        badge: "bg-green-900/40 text-green-300",
        description: `2R TP lands inside the next RB — realistic target`,
        rbTop,
        rbBottom,
        rbMid,
      };
    }
    if (tp > rbTop) {
      return {
        state: "before",
        label: "TP Before Next RB",
        emoji: "⚠️",
        color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
        description: `2R TP is above the next RB — may not reach it`,
        rbTop,
        rbBottom,
        rbMid,
      };
    }
    return {
      state: "past",
      label: "TP Past Next RB",
      emoji: "🔴",
      color: "bg-red-950/40 border-red-700 text-red-200",
      description: `2R TP is below the next RB — may be blocked`,
      rbTop,
      rbBottom,
      rbMid,
    };
  }

  // BUY direction
  if (tp >= rbBottom && tp <= rbTop) {
    return {
      state: "aligns",
      label: "Perfect Alignment",
      emoji: "🎯",
      color: "bg-green-950/40 border-green-700 text-green-200",
      description: `2R TP lands inside the next RB — realistic target`,
      rbTop,
      rbBottom,
      rbMid,
    };
  }
  if (tp < rbBottom) {
    return {
      state: "before",
      label: "TP Before Next RB",
      emoji: "⚠️",
      color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
      description: `2R TP is below the next RB — may not reach it`,
      rbTop,
      rbBottom,
      rbMid,
    };
  }
  return {
    state: "past",
    label: "TP Past Next RB",
    emoji: "🔴",
    color: "bg-red-950/40 border-red-700 text-red-200",
    description: `2R TP is above the next RB — may be blocked`,
    rbTop,
    rbBottom,
    rbMid,
  };
}