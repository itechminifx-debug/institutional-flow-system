// ============================================================
// REJECTION BLOCK NEGOTIATION ENGINE
// ============================================================
// ZONES HOLD ORDERS. REJECTION BLOCKS MAKE DECISIONS.
//
// Zones (FVG / OB / Liquidity / MSS / BOS) are containers of
// institutional orders. Price goes into a zone to fill them.
// After the orders are filled, the Rejection Block decides.
//
// MULTIPLE RBs
// ------------------------------------------------------------
// There can be MULTIPLE Rejection Blocks around a zone:
//   - inside the zone
//   - above the zone
//   - below the zone
//   - any combination of the three
//
// Each RB gets its own position label. RBs are ranked by
// freshness (current → previous → oldest).
//
// The "active RB" is the one price is currently approaching:
//   1. RB whose range contains the close price, OR
//   2. RB whose CE is closest to the close price
//
// The verdict runs on the ACTIVE RB.
//
// VERDICT (RB is the dealing range)
// ------------------------------------------------------------
//   Close ABOVE RB high → BUY  (strong) — RB broken ↑
//   Close BELOW RB low  → SELL (strong) — RB broken ↓
//   Close in PREMIUM (above CE, inside RB) → SELL (normal)
//   Close in DISCOUNT (below CE, inside RB) → BUY  (normal)
//   Close = CE → WAIT
//
// ENTRY = CE of the active RB.
// SL    = beyond the RB wick extreme + ATR buffer.
// TP    = 2R from entry.
// ============================================================

// ============================================================
// ZONE TYPES
// ============================================================
export const ZONE_TYPES = [
  { key: "fvg", label: "Fair Value Gap", emoji: "🟦" },
  { key: "ob", label: "Order Block", emoji: "🟪" },
  { key: "liquidity", label: "Liquidity Zone", emoji: "💧" },
  { key: "mss", label: "Market Structure Shift", emoji: "🔄" },
  { key: "bos", label: "Break of Structure", emoji: "📈" },
];

export function zoneTypeInfo(key) {
  return ZONE_TYPES.find((z) => z.key === key) || ZONE_TYPES[0];
}

// ============================================================
// CE — 50% of any range
// ============================================================
export function computeCe(high, low) {
  const h = parseFloat(high);
  const l = parseFloat(low);
  if (isNaN(h) || isNaN(l)) return null;
  return Math.round(((h + l) / 2) * 100) / 100;
}

// ============================================================
// RB POSITION vs ZONE
// ============================================================
export function detectRbVsZone({ zoneHigh, zoneLow, rbHigh, rbLow }) {
  const zH = parseFloat(zoneHigh);
  const zL = parseFloat(zoneLow);
  const rH = parseFloat(rbHigh);
  const rL = parseFloat(rbLow);
  if (isNaN(zH) || isNaN(zL) || isNaN(rH) || isNaN(rL)) return null;

  if (rL > zH) return "above";
  if (rH < zL) return "below";
  return "inside";
}

export function rbVsZoneInfo(position) {
  const map = {
    inside: {
      key: "inside",
      label: "Inside the Zone",
      emoji: "🎯",
      color: "bg-blue-900/40 text-blue-300 border-blue-700",
      meaning:
        "The RB sits inside the zone. Negotiation is happening within the order-filled zone — this is where the fight is settled.",
    },
    above: {
      key: "above",
      label: "Above the Zone",
      emoji: "🔺",
      color: "bg-purple-900/40 text-purple-300 border-purple-700",
      meaning:
        "The RB sits above the zone. Zone orders were filled — negotiation is now happening above. Price is deciding whether to break higher.",
    },
    below: {
      key: "below",
      label: "Below the Zone",
      emoji: "🔻",
      color: "bg-orange-900/40 text-orange-300 border-orange-700",
      meaning:
        "The RB sits below the zone. Zone orders were filled — negotiation is now happening below. Price is deciding whether to break lower.",
    },
  };
  return map[position] || map.inside;
}

// ============================================================
// RB HIERARCHY — rank by order added (newest = current)
// ============================================================
export function rankRejectionBlocks(rbs) {
  if (!Array.isArray(rbs) || rbs.length === 0) return [];

  const sorted = [...rbs].sort((a, b) => {
    const ta = a.addedAt ? new Date(a.addedAt).getTime() : 0;
    const tb = b.addedAt ? new Date(b.addedAt).getTime() : 0;
    return tb - ta;
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
      description: "Freshest — first target",
    },
    previous: {
      label: "Previous RB",
      emoji: "🟡",
      color: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
      description: "Older — still valid",
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
// ACTIVE RB — the RB price is currently approaching
// ============================================================
export function findActiveRb(rbs, currentPrice) {
  if (!Array.isArray(rbs) || rbs.length === 0) return null;
  const price = parseFloat(currentPrice);
  if (isNaN(price)) return rankRejectionBlocks(rbs)[0] || null;

  const ranked = rankRejectionBlocks(rbs);

  // 1. RB whose range contains the price
  for (const rb of ranked) {
    const high = parseFloat(rb.high);
    const low = parseFloat(rb.low);
    if (isNaN(high) || isNaN(low)) continue;
    if (price >= low && price <= high) return rb;
  }

  // 2. Otherwise: closest RB by distance to its CE
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
// VERDICT — runs on the active RB
// ============================================================
export function judgeRejectionBlock({ rbHigh, rbLow, closePrice }) {
  const high = parseFloat(rbHigh);
  const low = parseFloat(rbLow);
  const close = parseFloat(closePrice);
  if (isNaN(high) || isNaN(low) || isNaN(close)) return null;

  const ce = Math.round(((high + low) / 2) * 100) / 100;

  if (close > high) {
    return {
      verdict: "BUY",
      side: "above",
      ce,
      rbBroken: "up",
      strength: "strong",
      reason:
        "Closed ABOVE the RB high — buyers broke through. Strong continuation up.",
    };
  }

  if (close < low) {
    return {
      verdict: "SELL",
      side: "below",
      ce,
      rbBroken: "down",
      strength: "strong",
      reason:
        "Closed BELOW the RB low — sellers broke through. Strong continuation down.",
    };
  }

  const tolerance = Math.abs(ce) * 0.0001;

  if (Math.abs(close - ce) <= tolerance) {
    return {
      verdict: "WAIT",
      side: "at-ce",
      ce,
      rbBroken: null,
      strength: "weak",
      reason: "Price closed at the CE — indecision. Wait for a clear close.",
    };
  }

  if (close > ce) {
    return {
      verdict: "SELL",
      side: "premium",
      ce,
      rbBroken: null,
      strength: "normal",
      reason: "Closed in the PREMIUM (above CE, inside RB) — sellers defended.",
    };
  }

  return {
    verdict: "BUY",
    side: "discount",
    ce,
    rbBroken: null,
    strength: "normal",
    reason: "Closed in the DISCOUNT (below CE, inside RB) — buyers defended.",
  };
}

export function premiumDiscountVerdict(result) {
  if (!result) {
    return {
      label: "No verdict",
      emoji: "⚪",
      color: "bg-gray-900/40 border-gray-700 text-gray-300",
      description: "Fill in zone, RB, and close to see the verdict.",
      brokenBadge: null,
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
  const base = map[result.verdict] || map.WAIT;

  if (result.rbBroken === "up") {
    base.brokenBadge = {
      label: "RB broken ↑",
      color: "bg-green-900/40 text-green-300",
    };
  } else if (result.rbBroken === "down") {
    base.brokenBadge = {
      label: "RB broken ↓",
      color: "bg-red-900/40 text-red-300",
    };
  } else {
    base.brokenBadge = null;
  }

  return base;
}

export function strengthInfo(strength) {
  const map = {
    strong: {
      label: "Strong",
      emoji: "🏆",
      color: "bg-green-900/40 text-green-300",
    },
    normal: {
      label: "Normal",
      emoji: "✅",
      color: "bg-blue-900/40 text-blue-300",
    },
    weak: {
      label: "Weak",
      emoji: "⚠️",
      color: "bg-yellow-900/40 text-yellow-300",
    },
  };
  return map[strength] || map.weak;
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
// TRADE CALCULATOR
// ============================================================
export function computeRejectionBlockTrade({
  rbHigh,
  rbLow,
  verdict,
  accountSize = 0,
  riskPercent = 1,
  bufferMultiplier = 0.3,
  atr = 0,
}) {
  const high = parseFloat(rbHigh);
  const low = parseFloat(rbLow);
  if (isNaN(high) || isNaN(low)) return null;
  if (verdict !== "BUY" && verdict !== "SELL") return null;

  const ce = Math.round(((high + low) / 2) * 100) / 100;
  const isBull = verdict === "BUY";

  const entry = ce;
  const wickExtreme = isBull ? low : high;
  const buffer = atr > 0 ? atr * bufferMultiplier : 0;
  const sl = isBull ? wickExtreme - buffer : wickExtreme + buffer;

  const risk = Math.abs(entry - sl);
  const tp = isBull ? entry + risk * 2 : entry - risk * 2;

  const riskAmount = (accountSize * riskPercent) / 100;
  const lotSize =
    risk > 0
      ? Math.max(0.01, Math.round((riskAmount / risk) * 100) / 100)
      : 0;

  return {
    direction: verdict,
    entry,
    sl,
    tp,
    risk,
    reward: risk * 2,
    rr: 2,
    lotSize,
    riskAmount,
    buffer,
    wickExtreme,
    ce,
    slSource: buffer > 0 ? "wick+buffer" : "wick",
  };
}