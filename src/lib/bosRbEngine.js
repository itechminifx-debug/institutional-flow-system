// ============================================================
// BOS + RB CONFLUENCE ENGINE
// ============================================================
// The BOS + RB setup trades CONTINUATION, not reversal.
//
// Structure:
//   1. Liquidity raid (stop sweep)
//   2. BOS (break of structure with displacement)
//   3. Residual wick (Rejection Block at origin)
//   4. Retracement to RB
//   5. Entry at RB or FVG
// ============================================================

export const BOS_RB_CHECKLIST = [
  {
    key: "htf_confirmed",
    number: 1,
    label: "Is the HTF bias confirmed?",
    hint: "Higher timeframe trend is clear and aligns with the BOS",
  },
  {
    key: "bos_occurred",
    number: 2,
    label: "Has a BOS occurred?",
    hint: "A swing high/low was broken with a body close",
  },
  {
    key: "liquidity_raid",
    number: 3,
    label: "Was there a liquidity raid before the BOS?",
    hint: "Price swept stops before the break",
  },
  {
    key: "displacement",
    number: 4,
    label: "Was there displacement after the BOS?",
    hint: "Strong impulsive candle (≥ 1× ATR body)",
  },
  {
    key: "rb_present",
    number: 5,
    label: "Is there a Rejection Block at the origin?",
    hint: "Long wick at the origin of the BOS move",
  },
  {
    key: "rb_aligned",
    number: 6,
    label: "Does the RB align with the BOS direction?",
    hint: "The RB points the same way as the BOS",
  },
  {
    key: "entry_confirmed",
    number: 7,
    label: "Is there an FVG or lower-TF shift for entry?",
    hint: "Precision entry trigger on lower timeframe",
  },
  {
    key: "sl_beyond_wick",
    number: 8,
    label: "Is the stop beyond the wick extreme?",
    hint: "SL is placed beyond the RB wick, not inside",
  },
  {
    key: "rr_ok",
    number: 9,
    label: "Is the risk-to-reward at least 1:2?",
    hint: "2R minimum",
  },
  {
    key: "calm",
    number: 10,
    label: "Am I calm and disciplined?",
    hint: "Mindset is clear — no FOMO, no tilt",
  },
];

export const CHECKLIST_PASS_THRESHOLD = 7;

// ============================================================
// AUTO-CHECKS — some answers can be inferred
// ============================================================
export function autoDetectChecklist({
  htfBias,
  bosLevel,
  bosClose,
  displacementAtr,
  liquidityRaid,
  rbZoneHigh,
  rbZoneLow,
  fvgPresent,
  lowerTfShift,
  stopLoss,
  entryPrice,
  takeProfit,
}) {
  const auto = {};

  // Q1: HTF bias confirmed (only if provided)
  auto.htf_confirmed = !!htfBias;

  // Q2: BOS occurred (level + close present)
  auto.bos_occurred = !!(bosLevel && bosClose);

  // Q3: Liquidity raid
  auto.liquidity_raid = !!liquidityRaid;

  // Q4: Displacement ≥ 1× ATR
  auto.displacement = (parseFloat(displacementAtr) || 0) >= 1.0;

  // Q5: RB present
  auto.rb_present = !!(rbZoneHigh && rbZoneLow);

  // Q6: RB aligned with BOS direction
  // Bullish BOS = close above level → RB should be below (support)
  // Bearish BOS = close below level → RB should be above (resistance)
  if (bosLevel && bosClose && rbZoneHigh && rbZoneLow) {
    const level = parseFloat(bosLevel);
    const close = parseFloat(bosClose);
    const rbHigh = parseFloat(rbZoneHigh);
    const rbLow = parseFloat(rbZoneLow);

    if (close > level) {
      // Bullish BOS → RB should be at or below the BOS level
      auto.rb_aligned = rbHigh <= level * 1.005; // 0.5% tolerance
    } else if (close < level) {
      // Bearish BOS → RB should be at or above the BOS level
      auto.rb_aligned = rbLow >= level * 0.995;
    } else {
      auto.rb_aligned = false;
    }
  } else {
    auto.rb_aligned = false;
  }

  // Q7: FVG or lower-TF shift
  auto.entry_confirmed = !!(fvgPresent || lowerTfShift);

  // Q8: SL beyond wick extreme
  if (stopLoss && rbZoneHigh && rbZoneLow) {
    const sl = parseFloat(stopLoss);
    const rbHigh = parseFloat(rbZoneHigh);
    const rbLow = parseFloat(rbZoneLow);
    // For a BUY (bullish BOS), SL must be below RB low
    // For a SELL (bearish BOS), SL must be above RB high
    // We don't know direction here, so check either extreme
    auto.sl_beyond_wick = sl < rbLow || sl > rbHigh;
  } else {
    auto.sl_beyond_wick = false;
  }

  // Q9: RR ≥ 1:2
  if (entryPrice && stopLoss && takeProfit) {
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    const rr = risk > 0 ? reward / risk : 0;
    auto.rr_ok = rr >= 2;
  } else {
    auto.rr_ok = false;
  }

  // Q10: Calm — manual only
  auto.calm = false;

  return auto;
}

// ============================================================
// COMPUTE CHECKLIST SCORE
// ============================================================
export function computeChecklistScore(answers) {
  return BOS_RB_CHECKLIST.filter((q) => answers[q.key]).length;
}

export function checklistVerdict(score) {
  if (score >= 9) {
    return {
      key: "extreme",
      label: "Extreme Confluence",
      emoji: "🏆",
      color: "bg-green-950/50 border-green-600 text-green-200",
      badge: "bg-green-900/40 text-green-300",
      description: "Full alignment — highest-probability BOS+RB setup",
      passed: true,
    };
  }
  if (score >= CHECKLIST_PASS_THRESHOLD) {
    return {
      key: "high",
      label: "Passed",
      emoji: "✅",
      color: "bg-green-950/40 border-green-700 text-green-200",
      badge: "bg-green-900/40 text-green-300",
      description: "Checklist passed — trade is valid",
      passed: true,
    };
  }
  if (score >= 5) {
    return {
      key: "medium",
      label: "Partial — Wait",
      emoji: "⚠️",
      color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
      badge: "bg-yellow-900/40 text-yellow-300",
      description: "Partial alignment — wait for more confirmation",
      passed: false,
    };
  }
  return {
    key: "low",
    label: "Failed — Skip",
    emoji: "🔴",
    color: "bg-red-950/40 border-red-700 text-red-200",
    badge: "bg-red-900/40 text-red-300",
    description: "Too many boxes unchecked — not a valid BOS+RB",
    passed: false,
  };
}

// ============================================================
// TRADE PARAMETERS
// ============================================================
export function computeBosRbTrade({
  htfBias,
  rbZoneHigh,
  rbZoneLow,
  useCe = true,
  accountSize = 0,
  riskPercent = 1,
  bufferMultiplier = 0.3,
  atr = 0,
}) {
  if (!rbZoneHigh || !rbZoneLow) return null;

  const rbHigh = parseFloat(rbZoneHigh);
  const rbLow = parseFloat(rbZoneLow);
  const ce = Math.round(((rbHigh + rbLow) / 2) * 100) / 100;

  const isBullish = htfBias === "bullish";
  const direction = isBullish ? "BUY" : "SELL";

  const entry = useCe ? ce : isBullish ? rbLow : rbHigh;

  // SL = beyond the wick extreme (opposite side)
  const wickExtreme = isBullish ? rbLow : rbHigh;
  const buffer = atr > 0 ? atr * bufferMultiplier : 0;
  const sl = isBullish ? wickExtreme - buffer : wickExtreme + buffer;

  const risk = Math.abs(entry - sl);
  const tp = isBullish ? entry + risk * 2 : entry - risk * 2;

  const riskAmount = (accountSize * riskPercent) / 100;
  const lotSize =
    risk > 0
      ? Math.max(0.01, Math.round((riskAmount / risk) * 100) / 100)
      : 0;

  return {
    direction,
    entry,
    sl,
    tp,
    risk,
    rr: 2,
    lotSize,
    riskAmount,
    buffer,
  };
}

// ============================================================
// DETECT BOS DIRECTION
// ============================================================
export function detectBosDirection(bosLevel, bosClose) {
  if (!bosLevel || !bosClose) return null;
  const level = parseFloat(bosLevel);
  const close = parseFloat(bosClose);
  if (isNaN(level) || isNaN(close)) return null;
  return close > level ? "bullish" : "bearish";
}