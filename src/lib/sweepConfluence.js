// ============================================================
// SWEEP CONFLUENCE — Institutional Flow System
// ============================================================
// Measures how strong a setup is based on 4 layers:
//   1. Sweep confirmed (RB formed inside liquidity sweep)
//   2. Timeframe alignment (via Confluence Analyzer)
//   3. EMA 50 alignment
//   4. Freshness + quality (via RB Quality Score)
//
// Result: Effectiveness Tier
//   Moderate → RB only
//   High → RB + Sweep
//   Very High → RB + Sweep + TF alignment
//   Extreme → RB + Sweep + TF + EMA 50
// ============================================================

export const EFFECTIVENESS_TIERS = {
  none: {
    key: "none",
    label: "No Tier",
    emoji: "—",
    color: "bg-gray-900 text-gray-500",
    badge: "bg-gray-800 text-gray-400",
    multiplier: 1.0,
    description: "Setup is incomplete — not enough data to tier.",
  },
  moderate: {
    key: "moderate",
    label: "Moderate",
    emoji: "🥉",
    color: "bg-gray-900 border-gray-700 text-gray-300",
    badge: "bg-gray-800 text-gray-300",
    multiplier: 1.0,
    description:
      "Rejection Block alone. No sweep confirmed. May be random — trade with caution.",
  },
  high: {
    key: "high",
    label: "High",
    emoji: "🥈",
    color: "bg-blue-950/40 border-blue-700 text-blue-200",
    badge: "bg-blue-900/40 text-blue-300",
    multiplier: 1.2,
    description:
      "Rejection Block + Sweep. Liquidity collected, orders filled. Strong institutional footprint.",
  },
  very_high: {
    key: "very_high",
    label: "Very High",
    emoji: "🥇",
    color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
    badge: "bg-yellow-900/40 text-yellow-300",
    multiplier: 1.5,
    description:
      "Rejection Block + Sweep + Timeframe alignment. Multiple timeframes agree. High-probability zone.",
  },
  extreme: {
    key: "extreme",
    label: "Extreme",
    emoji: "🏆",
    color: "bg-green-950/40 border-green-700 text-green-200",
    badge: "bg-green-900/40 text-green-300",
    multiplier: 2.0,
    description:
      "Rejection Block + Sweep + TF alignment + EMA 50. Full confluence. The exact moment institutions completed their orders.",
  },
};

export function tierInfo(key) {
  return EFFECTIVENESS_TIERS[key] || EFFECTIVENESS_TIERS.none;
}

// ============================================================
// Compute sweep overlap
// Does the RB zone overlap the sweep price?
// ============================================================
export function computeSweepOverlap(sweepPrice, zone) {
  if (!sweepPrice || !zone || zone.low == null || zone.high == null) {
    return false;
  }

  const price = parseFloat(sweepPrice);
  if (isNaN(price)) return false;

  return price >= zone.low && price <= zone.high;
}

// ============================================================
// Compute effectiveness tier
// ============================================================
export function computeEffectivenessTier({
  sweepConfirmed,
  tfAligned,
  emaAligned,
}) {
  if (!sweepConfirmed) {
    return EFFECTIVENESS_TIERS.moderate;
  }
  if (sweepConfirmed && !tfAligned && !emaAligned) {
    return EFFECTIVENESS_TIERS.high;
  }
  if (sweepConfirmed && tfAligned && !emaAligned) {
    return EFFECTIVENESS_TIERS.very_high;
  }
  if (sweepConfirmed && tfAligned && emaAligned) {
    return EFFECTIVENESS_TIERS.extreme;
  }
  return EFFECTIVENESS_TIERS.high;
}

// ============================================================
// Score contribution (0-3 points)
// ============================================================
export function effectivenessScore(tier) {
  switch (tier?.key) {
    case "extreme":
      return 3;
    case "very_high":
      return 2;
    case "high":
      return 1;
    default:
      return 0;
  }
}

// ============================================================
// Auto-compute all tier inputs from a setup object
// ============================================================
export function computeTierFromSetup(setup) {
  if (!setup) return EFFECTIVENESS_TIERS.none;

  // 1. Sweep confirmed = sweep_overlap flag OR sweep_price inside zone
  let sweepConfirmed = !!setup.sweep_overlap;

  // Fallback: check if sweep_price is inside rejection zone
  if (!sweepConfirmed && setup.sweep_price && setup.rejection_block_zone) {
    const zone = parseZone(setup.rejection_block_zone);
    sweepConfirmed = computeSweepOverlap(setup.sweep_price, zone);
  }

  // 2. TF aligned = RB quality score's alignment factor is at max (2)
  const tfAligned = (setup.rb_alignment_score || 0) >= 2;

  // 3. EMA aligned = EMA 50 position matches D1 bias
  //    Bullish bias + price below EMA = support = aligned
  //    Bearish bias + price above EMA = resistance = aligned
  const emaAligned =
    (setup.d1_bias === "bearish" && setup.ema50_position === "above") ||
    (setup.d1_bias === "bullish" && setup.ema50_position === "below");

  return computeEffectivenessTier({
    sweepConfirmed,
    tfAligned,
    emaAligned,
  });
}

// Helper: parse a zone string "209000-209500"
function parseZone(zoneString) {
  if (!zoneString) return null;
  const cleaned = zoneString.replace(/\s/g, "");
  const parts = cleaned.split("-");
  if (parts.length !== 2) return null;
  const a = parseFloat(parts[0]);
  const b = parseFloat(parts[1]);
  if (isNaN(a) || isNaN(b)) return null;
  return { low: Math.min(a, b), high: Math.max(a, b) };
}