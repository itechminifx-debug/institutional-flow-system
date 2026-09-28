// ============================================================
// SWEEP PREDICTION HELPERS
// Tracks proximity of price to liquidity pools
// ============================================================

// Sweep status thresholds (in ATR multiples)
export const SWEEP_THRESHOLDS = {
  likely: 2.0,     // within 2× ATR → sweep likely
  imminent: 1.0,   // within 1× ATR → sweep imminent
};

// Compute sweep status for a single level
export function computeSweepStatus(livePrice, levelPrice, atr) {
  if (livePrice == null || levelPrice == null) {
    return {
      status: "unknown",
      distance: null,
      atrMultiple: null,
      label: "No data",
      emoji: "•",
      color: "bg-gray-900 text-gray-500",
      description: "Waiting for live price",
    };
  }

  const distance = Math.abs(livePrice - levelPrice);
  const atrMultiple = atr > 0 ? distance / atr : null;

  // Already at or beyond the level → sweep occurred
  // (we consider it "occurred" if price is within 0.1× ATR)
  if (atrMultiple !== null && atrMultiple <= 0.1) {
    return {
      status: "occurred",
      distance,
      atrMultiple,
      label: "Sweep Occurred",
      emoji: "✓",
      color: "bg-purple-900/40 text-purple-200 border-purple-600",
      description: "Price has reached this pool — watch for reversal",
    };
  }

  // Within 1× ATR → imminent
  if (atrMultiple !== null && atrMultiple <= SWEEP_THRESHOLDS.imminent) {
    return {
      status: "imminent",
      distance,
      atrMultiple,
      label: "Sweep Imminent",
      emoji: "🔥",
      color: "bg-red-900/50 text-red-200 border-red-600",
      description: "Price is within 1× ATR — sweep is imminent",
    };
  }

  // Within 2× ATR → likely
  if (atrMultiple !== null && atrMultiple <= SWEEP_THRESHOLDS.likely) {
    return {
      status: "likely",
      distance,
      atrMultiple,
      label: "Sweep Likely",
      emoji: "⚡",
      color: "bg-orange-900/40 text-orange-200 border-orange-700",
      description: "Price is within 2× ATR — watch closely",
    };
  }

  // Far away
  return {
    status: "far",
    distance,
    atrMultiple,
    label: "Far",
    emoji: "•",
    color: "bg-gray-900 text-gray-400 border-gray-700",
    description: "Price is far from this pool",
  };
}

// Format ATR multiple for display
export function formatAtrMultiple(multiple) {
  if (multiple === null || multiple === undefined) return "—";
  return `${multiple.toFixed(2)}× ATR`;
}

// Get the nearest sweep candidate from a list of levels
export function getNearestSweep(levels, livePrice, atr) {
  if (!levels || levels.length === 0 || livePrice == null) return null;

  const unswept = levels.filter((l) => !l.swept);
  if (unswept.length === 0) return null;

  const withStatus = unswept.map((l) => ({
    ...l,
    sweep: computeSweepStatus(livePrice, l.price, atr),
  }));

  // Sort by distance (closest first)
  withStatus.sort((a, b) => {
    const dA = a.sweep.distance ?? Infinity;
    const dB = b.sweep.distance ?? Infinity;
    return dA - dB;
  });

  return withStatus[0];
}

// Get all levels that are currently in "likely" or "imminent" status
export function getActiveSweeps(levels, livePrice, atr) {
  if (!levels || levels.length === 0 || livePrice == null) return [];

  return levels
    .filter((l) => !l.swept)
    .map((l) => ({
      ...l,
      sweep: computeSweepStatus(livePrice, l.price, atr),
    }))
    .filter(
      (l) =>
        l.sweep.status === "likely" ||
        l.sweep.status === "imminent" ||
        l.sweep.status === "occurred"
    )
    .sort((a, b) => {
      const rank = { occurred: 3, imminent: 2, likely: 1, far: 0 };
      const rA = rank[a.sweep.status] || 0;
      const rB = rank[b.sweep.status] || 0;
      if (rA !== rB) return rB - rA;
      return (a.sweep.distance ?? Infinity) - (b.sweep.distance ?? Infinity);
    });
}

// Determine if a Telegram alert should fire for this level + status
export function shouldAlert(level, newStatus) {
  if (newStatus === "likely" && !level.sweep_alert_sent_likely) {
    return { alert: true, column: "sweep_alert_sent_likely" };
  }
  if (newStatus === "imminent" && !level.sweep_alert_sent_imminent) {
    return { alert: true, column: "sweep_alert_sent_imminent" };
  }
  if (newStatus === "occurred" && !level.sweep_alert_sent_occurred) {
    return { alert: true, column: "sweep_alert_sent_occurred" };
  }
  return { alert: false, column: null };
}