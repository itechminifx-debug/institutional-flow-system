// ============================================================
// NEGOTIATION ENGINE — MSS + RB + CE + Verdict + Flip
// ============================================================
// The CE is the single reference point for the negotiation.
//   - Close below CE repeatedly = defending side losing
//   - Fail to close beyond RB = attacking side winning
//   - Close beyond RB = verdict reached
//   - Two failed attempts = verdict flips
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
      "RB forms inside the MSS zone. The base configuration — standard negotiation.",
    expectedBehavior: "Bounce or break at the zone",
    tradeDirection: "with_mss",
  },
  {
    key: "rb_above_mss",
    label: "RB Above MSS (Bearish)",
    emoji: "🔺",
    color: "bg-red-950/40 border-red-700 text-red-200",
    badge: "bg-red-900/40 text-red-300",
    strength: "strong",
    description:
      "RB forms above the MSS zone. Sellers defending a premium level.",
    expectedBehavior: "Sellers hold premium — bearish continuation",
    tradeDirection: "sell",
  },
  {
    key: "rb_below_mss",
    label: "RB Below MSS (Bullish)",
    emoji: "🔻",
    color: "bg-green-950/40 border-green-700 text-green-200",
    badge: "bg-green-900/40 text-green-300",
    strength: "strong",
    description:
      "RB forms below the MSS zone. Buyers defending a discount level.",
    expectedBehavior: "Buyers hold discount — bullish continuation",
    tradeDirection: "buy",
  },
  {
    key: "nested_rb_in_mss",
    label: "Nested RB in MSS",
    emoji: "⚡",
    color: "bg-orange-950/40 border-orange-700 text-orange-200",
    badge: "bg-orange-900/40 text-orange-300",
    strength: "extreme",
    description:
      "Multiple RBs inside the MSS zone. Compounding defense — compression grows.",
    expectedBehavior: "Compressed zone — bigger breakout when it comes",
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
      "An MSS forms inside the RB zone. Micro-structure inside macro-defense.",
    expectedBehavior: "Rare and powerful — often flips",
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
      "MSS forms inside the RB and flips the zone. The flip is the new trade.",
    expectedBehavior: "Trade the flip — opposite direction",
    tradeDirection: "flip",
  },
];

export function configurationInfo(key) {
  return CONFIGURATIONS.find((c) => c.key === key) || null;
}

// ============================================================
// AUTO-DETECT CONFIGURATION
// Based on MSS + RB positions
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

  // Check if RB is inside the MSS zone
  const rbInsideMSS = rbLow >= mssLow && rbHigh <= mssHigh;
  const rbAboveMSS = rbLow > mssHigh;
  const rbBelowMSS = rbHigh < mssLow;

  // Highest priority first
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
      reason: `${nestedRbCount} nested RBs — compounding defense`,
    };
  }

  if (rbInsideMSS) {
    return {
      key: "rb_inside_mss",
      reason: "RB is inside the MSS zone — base configuration",
    };
  }

  if (rbAboveMSS) {
    return {
      key: "rb_above_mss",
      reason: "RB is above the MSS zone — premium defense (bearish)",
    };
  }

  if (rbBelowMSS) {
    return {
      key: "rb_below_mss",
      reason: "RB is below the MSS zone — discount defense (bullish)",
    };
  }

  return {
    key: null,
    reason: "Could not detect configuration",
  };
}

// ============================================================
// COMPUTE NEGOTIATION RESULT
// ============================================================
export function computeNegotiation({
  mssDirection,
  rbZoneHigh,
  rbZoneLow,
  verdictClose,
  attempts,
  verdictFlipped,
}) {
  if (!rbZoneHigh || !rbZoneLow) {
    return {
      ce: null,
      verdict: "unknown",
      reason: "Missing RB zone",
    };
  }

  const rbHigh = parseFloat(rbZoneHigh);
  const rbLow = parseFloat(rbZoneLow);
  const ce = Math.round(((rbHigh + rbLow) / 2) * 100) / 100;

  // Direction: bearish = RFZ (SELL), bullish = SFZ (BUY)
  const isBearish = mssDirection === "bearish";

  let verdict = "negotiating";
  let reason = "No verdict yet";

  if (verdictClose) {
    const close = parseFloat(verdictClose);

    // RFZ: close below zone low = confirmed
    // SFZ: close above zone high = confirmed
    if (isBearish) {
      if (close < rbLow) {
        verdict = "confirmed";
        reason = `Closed at ${close.toFixed(2)}, below RB low ${rbLow.toFixed(2)} — bearish confirmed`;
      } else if (close > rbHigh) {
        verdict = "failed";
        reason = `Closed at ${close.toFixed(2)}, above RB high ${rbHigh.toFixed(2)} — RB failed`;
      } else {
        verdict = "negotiating";
        reason = `Closed at ${close.toFixed(2)}, inside RB (${rbLow.toFixed(2)} – ${rbHigh.toFixed(2)}) — still negotiating`;
      }
    } else {
      if (close > rbHigh) {
        verdict = "confirmed";
        reason = `Closed at ${close.toFixed(2)}, above RB high ${rbHigh.toFixed(2)} — bullish confirmed`;
      } else if (close < rbLow) {
        verdict = "failed";
        reason = `Closed at ${close.toFixed(2)}, below RB low ${rbLow.toFixed(2)} — RB failed`;
      } else {
        verdict = "negotiating";
        reason = `Closed at ${close.toFixed(2)}, inside RB (${rbLow.toFixed(2)} – ${rbHigh.toFixed(2)}) — still negotiating`;
      }
    }
  }

  // Two-attempt rule
  const attemptCount = parseInt(attempts) || 0;
  const flipped = verdictFlipped || attemptCount >= 2;

  if (flipped) {
    verdict = "failed";
    reason = `${attemptCount} attempts by the defending side failed. Verdict flipped.`;
  }

  return {
    ce,
    rbHigh,
    rbLow,
    verdict,
    reason,
    attempts: attemptCount,
    flipped,
  };
}

// ============================================================
// TRADE PARAMETERS
// ============================================================
export function computeNegotiationTrade({
  mssDirection,
  rbZoneHigh,
  rbZoneLow,
  accountSize = 0,
  riskPercent = 1,
}) {
  if (!rbZoneHigh || !rbZoneLow) return null;

  const rbHigh = parseFloat(rbZoneHigh);
  const rbLow = parseFloat(rbZoneLow);
  const ce = Math.round(((rbHigh + rbLow) / 2) * 100) / 100;

  const isBearish = mssDirection === "bearish";

  // Entry = CE
  // SL = beyond the far edge of the RB zone
  // TP = 2R from entry
  const entry = ce;
  const sl = isBearish ? rbHigh : rbLow;
  const risk = Math.abs(entry - sl);
  const tp = isBearish ? entry - risk * 2 : entry + risk * 2;

  const rr = 2; // 2R by default

  // Lot size
  const riskAmount = (accountSize * riskPercent) / 100;
  const lotSize =
    risk > 0 ? Math.max(0.01, Math.round((riskAmount / risk) * 100) / 100) : 0;

  return {
    direction: isBearish ? "SELL" : "BUY",
    entry,
    sl,
    tp,
    risk,
    rr,
    lotSize,
    riskAmount,
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