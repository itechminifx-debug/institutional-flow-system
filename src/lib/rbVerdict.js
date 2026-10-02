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