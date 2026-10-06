// ============================================================
// LIQUIDITY ZONE NEGOTIATION ENGINE
// ============================================================
// A Liquidity Zone is a stack of rejected wicks — a pool.
// Inside it, multiple Rejection Blocks (RBs) compete for price.
// The CE is the negotiation line. The body close is the verdict.
//
// ZONE CONSTRUCTION
// ------------------------------------------------------------
// Upper Wick Zone (built from upper wicks):
//   - Green candle → bottom = close, top = upper wick tip
//   - Red candle   → bottom = open,  top = upper wick tip
//   - Zone Low  = lowest of (green closes, red opens)
//   - Zone High = highest of all upper wick tips
//
// Lower Wick Zone (vice versa):
//   - Green candle → top = open,     bottom = lower wick tip
//   - Red candle   → top = close,    bottom = lower wick tip
//   - Zone High = highest of (green opens, red closes)
//   - Zone Low  = lowest of all lower wick tips
//
// PRIORITY HIERARCHY
// ------------------------------------------------------------
//   1. Current RB  — freshest orders (first target)
//   2. Previous RB — older orders (secondary)
//   3. Oldest RB   — weakest (least likely to react)
//
// VERDICT (same premium/discount rule as before)
// ------------------------------------------------------------
//   Close above CE → BUY   (premium)
//   Close below CE → SELL  (discount)
//   Close at CE    → WAIT
//
// ATR FILTER
// ------------------------------------------------------------
//   ATR rising  → trade
//   ATR falling → wait
// ============================================================

// ============================================================
// ZONE CONSTRUCTION
// ============================================================
// candle = { type: 'green' | 'red', open, close, wickTip }
//   - For UPPER wick zones: wickTip = the upper wick extreme
//   - For LOWER wick zones: wickTip = the lower wick extreme
// ============================================================
export function computeUpperWickZone(candles) {
  if (!Array.isArray(candles) || candles.length === 0) return null;

  const clean = candles
    .map((c) => ({
      type: c.type,
      open: parseFloat(c.open),
      close: parseFloat(c.close),
      wickTip: parseFloat(c.wickTip),
    }))
    .filter(
      (c) =>
        (c.type === "green" || c.type === "red") &&
        !isNaN(c.open) &&
        !isNaN(c.close) &&
        !isNaN(c.wickTip)
    );

  if (clean.length === 0) return null;

  // Bottoms: green → close, red → open
  const bottoms = clean.map((c) => (c.type === "green" ? c.close : c.open));
  // Tops: every upper wick tip
  const tops = clean.map((c) => c.wickTip);

  const zoneLow = Math.min(...bottoms);
  const zoneHigh = Math.max(...tops);

  return {
    zoneHigh: Math.round(zoneHigh * 100) / 100,
    zoneLow: Math.round(zoneLow * 100) / 100,
    count: clean.length,
    kind: "upper",
  };
}

export function computeLowerWickZone(candles) {
  if (!Array.isArray(candles) || candles.length === 0) return null;

  const clean = candles
    .map((c) => ({
      type: c.type,
      open: parseFloat(c.open),
      close: parseFloat(c.close),
      wickTip: parseFloat(c.wickTip),
    }))
    .filter(
      (c) =>
        (c.type === "green" || c.type === "red") &&
        !isNaN(c.open) &&
        !isNaN(c.close) &&
        !isNaN(c.wickTip)
    );

  if (clean.length === 0) return null;

  // Tops: green → open, red → close
  const tops = clean.map((c) => (c.type === "green" ? c.open : c.close));
  // Bottoms: every lower wick tip
  const bottoms = clean.map((c) => c.wickTip);

  const zoneHigh = Math.max(...tops);
  const zoneLow = Math.min(...bottoms);

  return {
    zoneHigh: Math.round(zoneHigh * 100) / 100,
    zoneLow: Math.round(zoneLow * 100) / 100,
    count: clean.length,
    kind: "lower",
  };
}

// ============================================================
// CE — 50% of a zone (used for both zone and RB)
// ============================================================
export function computeCe(high, low) {
  const h = parseFloat(high);
  const l = parseFloat(low);
  if (isNaN(h) || isNaN(l)) return null;
  return Math.round(((h + l) / 2) * 100) / 100;
}

// ============================================================
// RB HIERARCHY — rank by order added (newest = current)
// ============================================================
// rbs: array of { id, high, low, addedAt }
// Returns same array with .rank = 'current' | 'previous' | 'oldest' | 'older'
// ============================================================
export function rankRejectionBlocks(rbs) {
  if (!Array.isArray(rbs) || rbs.length === 0) return [];

  const sorted = [...rbs].sort((a, b) => {
    const ta = a.addedAt ? new Date(a.addedAt).getTime() : 0;
    const tb = b.addedAt ? new Date(b.addedAt).getTime() : 0;
    return tb - ta; // newest first
  });

  return sorted.map((rb, i) => {
    let rank;
    if (i === 0) rank = "current";
    else if (i === 1) rank = "previous";
    else if (i === 2) rank = "oldest";
    else rank = "older";
    return { ...rb, rank };
  });
}

export function rbRankInfo(rank) {
  const map = {
    current: {
      label: "Current RB",
      emoji: "🎯",
      color: "bg-green-900/40 text-green-300 border-green-700",
      description: "Freshest orders — first target",
    },
    previous: {
      label: "Previous RB",
      emoji: "🟡",
      color: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
      description: "Older orders — still valid",
    },
    oldest: {
      label: "Oldest RB",
      emoji: "⚪",
      color: "bg-gray-800/60 text-gray-300 border-gray-600",
      description: "Weakest — least likely to react",
    },
    older: {
      label: "Older RB",
      emoji: "⚪",
      color: "bg-gray-800/60 text-gray-400 border-gray-700",
      description: "Historical RB",
    },
  };
  return map[rank] || map.older;
}

// ============================================================
// ACTIVE RB — the one price is currently negotiating with
// ============================================================
// Rule: walk the ranked list (current → previous → oldest)
// and return the first RB whose zone contains currentPrice.
// If none contains it, return the closest one.
// ============================================================
export function findActiveRb(rbs, currentPrice) {
  if (!Array.isArray(rbs) || rbs.length === 0) return null;
  const price = parseFloat(currentPrice);
  if (isNaN(price)) return null;

  const ranked = rankRejectionBlocks(rbs);

  // First: an RB whose range contains the price
  for (const rb of ranked) {
    const high = parseFloat(rb.high);
    const low = parseFloat(rb.low);
    if (isNaN(high) || isNaN(low)) continue;
    if (price >= low && price <= high) return rb;
  }

  // Fallback: closest RB by distance to its CE
  let closest = null;
  let minDist = Infinity;
  for (const rb of ranked) {
    const high = parseFloat(rb.high);
    const low = parseFloat(rb.low);
    if (isNaN(high) || isNaN(low)) continue;
    const ce = (high + low) / 2;
    const dist = Math.abs(price - ce);
    if (dist < minDist) {
      minDist = dist;
      closest = rb;
    }
  }
  return closest;
}

// ============================================================
// VERDICT — same premium/discount rule as before
// ============================================================
export function judgeZoneNegotiation({ activeRb, closePrice }) {
  if (!activeRb) return null;

  const high = parseFloat(activeRb.high);
  const low = parseFloat(activeRb.low);
  const close = parseFloat(closePrice);
  if (isNaN(high) || isNaN(low) || isNaN(close)) return null;

  const ce = Math.round(((high + low) / 2) * 100) / 100;
  const tolerance = Math.abs(ce) * 0.0001;

  if (Math.abs(close - ce) <= tolerance) {
    return {
      verdict: "WAIT",
      side: "at-ce",
      ce,
      reason: "Price closed at the CE — indecision. Wait for a clear close.",
      strength: "weak",
    };
  }

  if (close > ce) {
    return {
      verdict: "BUY",
      side: "premium",
      ce,
      reason:
        "Closed in the PREMIUM (above CE) of the active RB — buyers won the negotiation. BUY.",
      strength: "normal",
    };
  }

  return {
    verdict: "SELL",
    side: "discount",
    ce,
    reason:
      "Closed in the DISCOUNT (below CE) of the active RB — sellers won the negotiation. SELL.",
    strength: "normal",
  };
}

export function premiumDiscountVerdict(result) {
  if (!result) {
    return {
      label: "No verdict",
      emoji: "⚪",
      color: "bg-gray-900/40 border-gray-700 text-gray-300",
      description: "Fill in the zone, RBs, and close price to see the verdict.",
    };
  }
  const map = {
    BUY: {
      label: "BUY",
      emoji: "🟢",
      color: "bg-green-950/50 border-green-600 text-green-200",
      description: result.reason,
    },
    SELL: {
      label: "SELL",
      emoji: "🔴",
      color: "bg-red-950/50 border-red-600 text-red-200",
      description: result.reason,
    },
    WAIT: {
      label: "WAIT",
      emoji: "⚠️",
      color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
      description: result.reason,
    },
  };
  return map[result.verdict] || map.WAIT;
}

// ============================================================
// ATR FILTER
// ============================================================
export function atrFilter(atrCurrent, atrPrior) {
  const c = parseFloat(atrCurrent);
  const p = parseFloat(atrPrior);
  if (isNaN(c) || isNaN(p)) {
    return {
      key: "flat",
      label: "ATR unknown",
      emoji: "⚪",
      color: "bg-gray-900/40 border-gray-700 text-gray-300",
      description: "Enter ATR current and prior to compare.",
      tradeable: false,
    };
  }

  const change = ((c - p) / (p || 1)) * 100;

  if (change > 2) {
    return {
      key: "rising",
      label: "ATR Rising",
      emoji: "📈",
      color: "bg-green-950/40 border-green-700 text-green-200",
      description: `Volatility expanding (+${change.toFixed(1)}%) — trade.`,
      tradeable: true,
    };
  }
  if (change < -2) {
    return {
      key: "falling",
      label: "ATR Falling",
      emoji: "📉",
      color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
      description: `Volatility contracting (${change.toFixed(
        1
      )}%) — wait for expansion.`,
      tradeable: false,
    };
  }
  return {
    key: "flat",
    label: "ATR Flat",
    emoji: "➡️",
    color: "bg-blue-950/40 border-blue-800 text-blue-200",
    description: "Volatility stable — proceed with standard rules.",
    tradeable: true,
  };
}

// ============================================================
// CHECKLIST — 10 questions, 7+ to pass
// ============================================================
export const LIQUIDITY_ZONE_CHECKLIST = [
  {
    key: "zone_present",
    number: 1,
    label: "Is there a Liquidity Zone?",
    hint: "A stack of rejected wicks built from candle bodies + wick tips",
  },
  {
    key: "rbs_marked",
    number: 2,
    label: "Are the Rejection Blocks marked?",
    hint: "Every wick inside the zone is a potential RB",
  },
  {
    key: "current_rb_prioritized",
    number: 3,
    label: "Is the current RB prioritized?",
    hint: "Always start with the freshest RB",
  },
  {
    key: "ce_calculated",
    number: 4,
    label: "Is the CE calculated?",
    hint: "50% midpoint of the active RB",
  },
  {
    key: "atr_ok",
    number: 5,
    label: "Is the ATR rising or stable?",
    hint: "ATR falling = wait for expansion",
  },
  {
    key: "price_entered",
    number: 6,
    label: "Has price entered the zone?",
    hint: "The pool is being tested",
  },
  {
    key: "price_at_rb_ce",
    number: 7,
    label: "Has price reached the RB and CE?",
    hint: "Negotiation is happening at the CE",
  },
  {
    key: "body_closed",
    number: 8,
    label: "Has the body closed?",
    hint: "The verdict is the body close — not the wick",
  },
  {
    key: "close_clear",
    number: 9,
    label: "Is the close above or below the CE?",
    hint: "Above = premium = BUY. Below = discount = SELL",
  },
  {
    key: "risk_ok",
    number: 10,
    label: "Is the risk 1–2%?",
    hint: "Position sizing rules respected",
  },
];

export const LIQUIDITY_ZONE_PASS_THRESHOLD = 7;

export function computeChecklistScore(answers) {
  return LIQUIDITY_ZONE_CHECKLIST.filter((q) => answers[q.key]).length;
}

export function zoneChecklistVerdict(score) {
  if (score >= 9) {
    return {
      key: "extreme",
      label: "Extreme Confluence",
      emoji: "🏆",
      color: "bg-green-950/50 border-green-600 text-green-200",
      description: "Full alignment — highest-probability zone trade",
      passed: true,
    };
  }
  if (score >= LIQUIDITY_ZONE_PASS_THRESHOLD) {
    return {
      key: "high",
      label: "Passed",
      emoji: "✅",
      color: "bg-green-950/40 border-green-700 text-green-200",
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
      description: "Partial alignment — wait for confirmation",
      passed: false,
    };
  }
  return {
    key: "low",
    label: "Failed — Skip",
    emoji: "🔴",
    color: "bg-red-950/40 border-red-700 text-red-200",
    description: "Too many boxes unchecked — not a valid zone trade",
    passed: false,
  };
}