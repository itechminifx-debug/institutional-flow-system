// ============================================================
// RB VERDICT — The Negotiation Rule
// ============================================================
// An RB is only CONFIRMED when Candle 3 closes BEYOND the zone.
//   - Close beyond (below for RFZ, above for SFZ) → confirmed
//   - Close inside the zone → negotiating (not a signal)
//   - Close on the wrong side (above for RFZ, below for SFZ) → failed
// ============================================================

export const VERDICTS = {
  confirmed: {
    key: "confirmed",
    label: "Confirmed",
    emoji: "✅",
    color: "bg-green-950/40 border-green-700 text-green-200",
    badge: "bg-green-900/40 text-green-300",
    description:
      "Candle 3 closed beyond the zone — the RB is confirmed. Trade direction is valid.",
  },
  negotiating: {
    key: "negotiating",
    label: "Negotiating",
    emoji: "⚠️",
    color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
    badge: "bg-yellow-900/40 text-yellow-300",
    description:
      "Candle 3 closed inside the zone — no verdict yet. Wait for the next close.",
  },
  failed: {
    key: "failed",
    label: "Failed",
    emoji: "🔴",
    color: "bg-red-950/40 border-red-700 text-red-200",
    badge: "bg-red-900/40 text-red-300",
    description:
      "Candle 3 closed on the wrong side — the RB has failed. Flip the direction.",
  },
  unknown: {
    key: "unknown",
    label: "Unknown",
    emoji: "•",
    color: "bg-gray-900 border-gray-700 text-gray-400",
    badge: "bg-gray-800 text-gray-400",
    description: "Verdict cannot be computed — check inputs.",
  },
};

export function verdictInfo(key) {
  return VERDICTS[key] || VERDICTS.unknown;
}

// ============================================================
// Compute the verdict from Candle 3's close vs the RB zone
// ============================================================
export function computeRBVerdict({ direction, zoneHigh, zoneLow, closeCandle3 }) {
  if (!zoneHigh || !zoneLow || closeCandle3 == null) {
    return {
      verdict: "unknown",
      reason: "Missing zone or close price",
      close: null,
    };
  }

  const zHigh = parseFloat(zoneHigh);
  const zLow = parseFloat(zoneLow);
  const close = parseFloat(closeCandle3);

  if (isNaN(zHigh) || isNaN(zLow) || isNaN(close)) {
    return {
      verdict: "unknown",
      reason: "Invalid values",
      close: null,
    };
  }

  // RFZ — bearish rejection — verdict = close BELOW zone low
  if (direction === "rfz") {
    if (close < zLow) {
      return {
        verdict: "confirmed",
        reason: `Candle 3 closed at ${close.toFixed(2)}, below zone low ${zLow.toFixed(2)} — bearish confirmed`,
        close,
      };
    }
    if (close > zHigh) {
      return {
        verdict: "failed",
        reason: `Candle 3 closed at ${close.toFixed(2)}, above zone high ${zHigh.toFixed(2)} — RB failed, flip to bullish`,
        close,
      };
    }
    return {
      verdict: "negotiating",
      reason: `Candle 3 closed at ${close.toFixed(2)}, inside zone (${zLow.toFixed(2)} – ${zHigh.toFixed(2)}) — no verdict yet`,
      close,
    };
  }

  // SFZ — bullish rejection — verdict = close ABOVE zone high
  if (direction === "sfz") {
    if (close > zHigh) {
      return {
        verdict: "confirmed",
        reason: `Candle 3 closed at ${close.toFixed(2)}, above zone high ${zHigh.toFixed(2)} — bullish confirmed`,
        close,
      };
    }
    if (close < zLow) {
      return {
        verdict: "failed",
        reason: `Candle 3 closed at ${close.toFixed(2)}, below zone low ${zLow.toFixed(2)} — RB failed, flip to bearish`,
        close,
      };
    }
    return {
      verdict: "negotiating",
      reason: `Candle 3 closed at ${close.toFixed(2)}, inside zone (${zLow.toFixed(2)} – ${zHigh.toFixed(2)}) — no verdict yet`,
      close,
    };
  }

  return {
    verdict: "unknown",
    reason: "Direction must be 'rfz' or 'sfz'",
    close: null,
  };
}

// ============================================================
// Compute verdict from an entire setup object (uses rejection zone)
// ============================================================
export function computeVerdictFromSetup(setup, closeCandle3) {
  if (!setup || !setup.rejection_block_zone) {
    return {
      verdict: "unknown",
      reason: "Setup has no rejection zone",
      close: null,
    };
  }

  const zone = setup.rejection_block_zone.replace(/\s/g, "").split("-");
  if (zone.length !== 2) {
    return {
      verdict: "unknown",
      reason: "Zone format invalid",
      close: null,
    };
  }

  const a = parseFloat(zone[0]);
  const b = parseFloat(zone[1]);
  if (isNaN(a) || isNaN(b)) {
    return {
      verdict: "unknown",
      reason: "Zone values invalid",
      close: null,
    };
  }

  const zLow = Math.min(a, b);
  const zHigh = Math.max(a, b);
  const direction = setup.d1_bias === "bullish" ? "sfz" : "rfz";

  return computeRBVerdict({
    direction,
    zoneHigh: zHigh,
    zoneLow: zLow,
    closeCandle3,
  });
}

// ============================================================
// TWO-ATTEMPT RULE
// ============================================================
// If the defending side fails to close beyond the zone after
// TWO attempts, the verdict flips to the other side.
// ============================================================

export function computeAttemptVerdict({ attempts, direction }) {
  const n = parseInt(attempts) || 0;

  if (n === 0) {
    return {
      status: "fresh",
      label: "No Attempts Yet",
      emoji: "⚪",
      color: "bg-gray-900 border-gray-700 text-gray-300",
      description: "Price has not yet tested the zone",
    };
  }

  if (n === 1) {
    return {
      status: "attempt_1",
      label: "Attempt 1 — Negotiating",
      emoji: "⚠️",
      color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
      description:
        "First close inside the zone. One more attempt allowed before the verdict flips.",
    };
  }

  if (n === 2) {
    return {
      status: "attempt_2",
      label: "Attempt 2 — Verdict Flips",
      emoji: "🔄",
      color: "bg-orange-950/40 border-orange-700 text-orange-200",
      description:
        "Second close inside the zone. The defending side has failed. Verdict flips to the opposite direction.",
    };
  }

  return {
    status: "over",
    label: "Verdict Flipped",
    emoji: "🔴",
    color: "bg-red-950/40 border-red-700 text-red-200",
    description:
      "The defending side failed both attempts. Flip direction.",
  };
}

// ============================================================
// POST-VERDICT CONSOLIDATION
// ============================================================
// After the verdict, watch for:
//   - Consolidation near the zone = re-accumulation (pending orders)
//   - New close beyond = confirmed
//   - Close back inside = invalidated
// ============================================================

export function computePostVerdictState({
  priceNow,
  zoneHigh,
  zoneLow,
  verdict,
  direction,
}) {
  if (!priceNow || !zoneHigh || !zoneLow) {
    return {
      state: "unknown",
      label: "Unknown",
      emoji: "•",
      color: "bg-gray-900 border-gray-700 text-gray-400",
      description: "Waiting for price data",
    };
  }

  const p = parseFloat(priceNow);
  const zH = parseFloat(zoneHigh);
  const zL = parseFloat(zoneLow);

  const isInside = p >= zL && p <= zH;
  const nearZoneBuffer = (zH - zL) * 0.5;
  const isNear = Math.abs(p - zL) <= nearZoneBuffer || Math.abs(p - zH) <= nearZoneBuffer;

  // Re-accumulation = consolidating near the zone after a verdict
  if (verdict && isNear && !isInside) {
    return {
      state: "re_accumulation",
      label: "Re-accumulation",
      emoji: "🔁",
      color: "bg-purple-950/40 border-purple-700 text-purple-200",
      description:
        "Price is consolidating near the zone after the verdict. Pending orders being filled. Watch for the next close.",
    };
  }

  // Confirmed = price closed beyond the zone in the verdict direction
  if (verdict === "confirmed") {
    if (direction === "rfz" && p < zL) {
      return {
        state: "confirmed",
        label: "Confirmed — Extended",
        emoji: "✅",
        color: "bg-green-950/40 border-green-700 text-green-200",
        description: "Price extended beyond the zone in the verdict direction.",
      };
    }
    if (direction === "sfz" && p > zH) {
      return {
        state: "confirmed",
        label: "Confirmed — Extended",
        emoji: "✅",
        color: "bg-green-950/40 border-green-700 text-green-200",
        description: "Price extended beyond the zone in the verdict direction.",
      };
    }
  }

  // Invalidated = price closed back inside or on the wrong side
  if (verdict === "failed" || isInside) {
    return {
      state: "invalidated",
      label: "Invalidated",
      emoji: "🔴",
      color: "bg-red-950/40 border-red-700 text-red-200",
      description:
        "Price returned inside the zone. The verdict is being challenged.",
    };
  }

  return {
    state: "active",
    label: "Active",
    emoji: "🟢",
    color: "bg-gray-900 border-gray-700 text-gray-300",
    description: "Monitoring post-verdict state",
  };
}

// Combine everything into a single verdict status
export function computeFullVerdict({
  direction,
  zoneHigh,
  zoneLow,
  closeCandle3,
  attempts,
  verdictFlipped,
}) {
  const baseVerdict = computeRBVerdict({
    direction,
    zoneHigh,
    zoneLow,
    closeCandle3,
  });

  const attemptInfo = computeAttemptVerdict({ attempts, direction });

  const isFlipped = verdictFlipped || attempts >= 2;

  return {
    ...baseVerdict,
    attempts: parseInt(attempts) || 0,
    attemptInfo,
    flipped: isFlipped,
    finalVerdict: isFlipped ? "failed" : baseVerdict.verdict,
  };
}