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
//
// RB POSITION can be:
//   - inside the BOS zone
//   - above the BOS zone
//   - below the BOS zone
// Position doesn't affect direction — only BOS direction does.
//
// The BOS sets the direction. The RB is where price negotiates.
// Entry = CE (50% of the RB zone).
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
    label: "Does the RB direction match the BOS direction?",
    hint: "Bullish BOS → bullish RB. Bearish BOS → bearish RB",
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
// RB POSITION DETECTION
// ============================================================
// Returns: 'inside' | 'above' | 'below' | null
// Based on comparing RB zone to BOS zone (bosLevel ↔ bosClose)
// ============================================================
export function detectRbPosition({
  bosLevel,
  bosClose,
  rbZoneHigh,
  rbZoneLow,
}) {
  if (!bosLevel || !bosClose || !rbZoneHigh || !rbZoneLow) return null;

  const level = parseFloat(bosLevel);
  const close = parseFloat(bosClose);
  const rbHigh = parseFloat(rbZoneHigh);
  const rbLow = parseFloat(rbZoneLow);

  if (isNaN(level) || isNaN(close) || isNaN(rbHigh) || isNaN(rbLow)) {
    return null;
  }

  const bosHigh = Math.max(level, close);
  const bosLow = Math.min(level, close);

  // RB inside BOS zone
  if (rbLow >= bosLow && rbHigh <= bosHigh) {
    return "inside";
  }

  // RB above BOS zone
  if (rbLow > bosHigh) {
    return "above";
  }

  // RB below BOS zone
  if (rbHigh < bosLow) {
    return "below";
  }

  // Overlapping — treat as inside
  return "inside";
}

export function rbPositionInfo(position) {
  const map = {
    inside: {
      key: "inside",
      label: "Inside BOS Zone",
      emoji: "🎯",
      color: "bg-blue-900/40 text-blue-300",
      description: "RB forms inside the BOS zone — same level",
    },
    above: {
      key: "above",
      label: "Above BOS Zone",
      emoji: "🔺",
      color: "bg-purple-900/40 text-purple-300",
      description: "RB forms above — price pulls up to it after the BOS",
    },
    below: {
      key: "below",
      label: "Below BOS Zone",
      emoji: "🔻",
      color: "bg-orange-900/40 text-orange-300",
      description: "RB forms below — price pulls down to it after the BOS",
    },
  };
  return map[position] || map.inside;
}

// ============================================================
// RB POSITION RULES (NEW — describes all three positions)
// ============================================================
// Used to render the "RB Position" card on the page.
// Position never affects direction. BOS sets direction.
// ============================================================
export function rbPositionRules(bosDirection) {
  const isBull = bosDirection === "bullish";
  const dir = isBull ? "BUY" : "SELL";

  return [
    {
      key: "above",
      emoji: "🔺",
      label: "RB Above BOS",
      color: "bg-purple-900/30 border-purple-800 text-purple-200",
      arrow: isBull ? "↗" : "↗",
      approach: isBull
        ? "Price breaks up, then pulls UP into the RB above"
        : "Price breaks down, then pulls UP into the RB above",
      direction: dir,
      entry: "CE of RB (50%)",
    },
    {
      key: "inside",
      emoji: "🎯",
      label: "RB Inside BOS",
      color: "bg-blue-900/30 border-blue-800 text-blue-200",
      arrow: "→",
      approach: isBull
        ? "Price breaks up and holds at the BOS zone"
        : "Price breaks down and holds at the BOS zone",
      direction: dir,
      entry: "CE of RB (50%)",
    },
    {
      key: "below",
      emoji: "🔻",
      label: "RB Below BOS",
      color: "bg-orange-900/30 border-orange-800 text-orange-200",
      arrow: isBull ? "↘" : "↘",
      approach: isBull
        ? "Price breaks up, then pulls DOWN into the RB below"
        : "Price breaks down, then pulls DOWN into the RB below",
      direction: dir,
      entry: "CE of RB (50%)",
    },
  ];
}

// ============================================================
// AUTO-CHECKS
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

  auto.htf_confirmed = !!htfBias;
  auto.bos_occurred = !!(bosLevel && bosClose);
  auto.liquidity_raid = !!liquidityRaid;
  auto.displacement = (parseFloat(displacementAtr) || 0) >= 1.0;
  auto.rb_present = !!(rbZoneHigh && rbZoneLow);

  // Q6: RB direction must match BOS direction
  // For a bullish BOS (close > level): RB should be below the level (support)
  // For a bearish BOS (close < level): RB should be above the level (resistance)
  //
  // NOTE: This positional check is kept as-is.
  // A separate, softer rb_direction_ok flag is also computed below.
  if (bosLevel && bosClose && rbZoneHigh && rbZoneLow) {
    const level = parseFloat(bosLevel);
    const close = parseFloat(bosClose);
    const rbHigh = parseFloat(rbZoneHigh);
    const rbLow = parseFloat(rbZoneLow);

    if (close > level) {
      auto.rb_aligned = rbHigh <= level * 1.005;
    } else if (close < level) {
      auto.rb_aligned = rbLow >= level * 0.995;
    } else {
      auto.rb_aligned = false;
    }

    // NEW: softer directional check — ignores position entirely.
    // Valid whenever the RB zone exists and is on the correct side of
    // the wick extreme. Bullish BOS → RB should sit at/below the wick.
    // Bearish BOS → RB should sit at/above the wick.
    if (close > level) {
      auto.rb_direction_ok = rbHigh >= rbLow; // bullish BOS, any RB position OK
    } else if (close < level) {
      auto.rb_direction_ok = rbLow <= rbHigh; // bearish BOS, any RB position OK
    } else {
      auto.rb_direction_ok = false;
    }
  } else {
    auto.rb_aligned = false;
    auto.rb_direction_ok = false;
  }

  auto.entry_confirmed = !!(fvgPresent || lowerTfShift);

  // Q8: SL beyond the wick
  if (stopLoss && rbZoneHigh && rbZoneLow) {
    const sl = parseFloat(stopLoss);
    const rbHigh = parseFloat(rbZoneHigh);
    const rbLow = parseFloat(rbZoneLow);
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

  auto.calm = false;

  return auto;
}

// ============================================================
// CHECKLIST SCORE
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
// Entry = CE (or RB edge) — CE is the default and recommended
// SL = beyond the wick extreme (based on RB position + direction)
// TP = 2R
// ============================================================
export function computeBosRbTrade({
  htfBias,
  rbZoneHigh,
  rbZoneLow,
  rbPosition = "inside",
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

  // Entry = CE (default) or RB edge
  const entry = useCe ? ce : isBullish ? rbLow : rbHigh;

  // SL = beyond the wick extreme
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
    rbPosition,

    // NEW additive fields (do not remove / do not replace originals):
    cePrice: ce,               // always the RB midpoint, even if entry uses an edge
    entryIsCe: !!useCe,        // true when entry === CE
    slSource: buffer > 0 ? "wick+buffer" : "wick",
    wickExtreme,               // the raw wick extreme before buffer
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