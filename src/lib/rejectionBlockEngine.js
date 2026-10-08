// ============================================================
// REJECTION BLOCK NEGOTIATION ENGINE
// ============================================================
// ZONES HOLD ORDERS. REJECTION BLOCKS MAKE DECISIONS.
//
// TWO-CANDLE RB DETECTION — SWEEP + RECLAIM
//   Resistance: candle2.high > candle1.high AND candle2.close < candle1.high
//   Support:    candle2.low  < candle1.low  AND candle2.close > candle1.low
//   Both valid → dual sweep (dead candle).
//
// VERDICT: close inside the active RB (premium / discount / breakout)
// EMA 50: validated; invalid prior → unknown
// ATR:    validated; invalid prior → unknown
// VALIDATION: close must sit inside at least one listed RB
// ============================================================

export const PIP_SIZE_DEFAULT = 0.01;
export const NEAR_EDGE_BUFFER_PIPS = 5;
export const PRIOR_DEVIATION_LIMIT = 0.2; // 20% max deviation current vs prior

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
// CE
// ============================================================
export function computeCe(high, low) {
  const h = parseFloat(high);
  const l = parseFloat(low);
  if (isNaN(h) || isNaN(l)) return null;
  return Math.round(((h + l) / 2) * 100) / 100;
}

// ============================================================
// PIPS
// ============================================================
export function computePips({ entry, sl, tp, pipSize = PIP_SIZE_DEFAULT }) {
  const e = parseFloat(entry);
  const s = parseFloat(sl);
  const t = parseFloat(tp);
  const p = parseFloat(pipSize) || PIP_SIZE_DEFAULT;
  if (isNaN(e) || isNaN(s) || isNaN(t)) return null;
  return {
    slDistance: Math.round((Math.abs(e - s) / p) * 100) / 100,
    tpDistance: Math.round((Math.abs(t - e) / p) * 100) / 100,
    pipSize: p,
  };
}

// ============================================================
// VALIDATION HELPERS
// ============================================================
export function validatePrior(current, prior, limit = PRIOR_DEVIATION_LIMIT) {
  const c = parseFloat(current);
  const p = parseFloat(prior);
  if (isNaN(c) || isNaN(p) || c === 0) {
    return { valid: false, reason: "missing" };
  }
  const deviation = Math.abs(p - c) / Math.abs(c);
  if (deviation > limit) {
    return {
      valid: false,
      reason: "out-of-range",
      deviation: Math.round(deviation * 100) / 100,
    };
  }
  return { valid: true, deviation };
}

export function validateCloseInsideRbs(closePrice, rankedRbs) {
  const close = parseFloat(closePrice);
  if (isNaN(close)) return { valid: false, reason: "missing" };
  if (!Array.isArray(rankedRbs) || rankedRbs.length === 0) {
    return { valid: false, reason: "no-rbs" };
  }
  for (const rb of rankedRbs) {
    const high = parseFloat(rb.high);
    const low = parseFloat(rb.low);
    if (isNaN(high) || isNaN(low)) continue;
    if (close >= low && close <= high) {
      return { valid: true, rbId: rb.id, rbHigh: high, rbLow: low };
    }
  }
  return { valid: false, reason: "not-inside" };
}

export function validateSetupInputs({
  closePrice,
  rankedRbs,
  emaCurrent,
  emaPrior,
  atrCurrent,
  atrPrior,
}) {
  const errors = [];
  const warnings = [];

  // Verdict close must be entered
  const close = parseFloat(closePrice);
  if (isNaN(close)) {
    errors.push({
      field: "closePrice",
      message: "Verdict close is required.",
    });
  } else {
    const inside = validateCloseInsideRbs(close, rankedRbs);
    if (!inside.valid) {
      if (inside.reason === "no-rbs") {
        errors.push({
          field: "rbs",
          message: "Add at least one RB before entering the close.",
        });
      } else if (inside.reason === "not-inside") {
        errors.push({
          field: "closePrice",
          message: `Verdict close (${close}) doesn't sit inside any listed RB. Check your inputs or add the RB that contains it.`,
        });
      }
    }
  }

  if (!Array.isArray(rankedRbs) || rankedRbs.length < 2) {
    errors.push({
      field: "rbs",
      message: "List every RB around the zone — at least 2.",
    });
  }

  if (emaCurrent) {
    const emaCheck = validatePrior(emaCurrent, emaPrior);
    if (!emaCheck.valid) {
      warnings.push({
        field: "ema50Prior",
        message:
          emaCheck.reason === "missing"
            ? "EMA 50 prior missing — EMA filter disabled."
            : `EMA 50 prior (${emaPrior}) looks invalid vs current (${emaCurrent}) — filter disabled.`,
      });
    }
  }

  if (atrCurrent) {
    const atrCheck = validatePrior(atrCurrent, atrPrior);
    if (!atrCheck.valid) {
      warnings.push({
        field: "atrPrior",
        message:
          atrCheck.reason === "missing"
            ? "ATR prior missing — volatility filter disabled."
            : `ATR prior (${atrPrior}) looks invalid vs current (${atrCurrent}) — filter disabled.`,
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================
// RB vs ZONE
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
        "The RB sits inside the zone. Negotiation is happening within the order-filled zone.",
    },
    above: {
      key: "above",
      label: "Above the Zone",
      emoji: "🔺",
      color: "bg-purple-900/40 text-purple-300 border-purple-700",
      meaning:
        "The RB sits above the zone. Zone orders were filled — negotiation is happening above.",
    },
    below: {
      key: "below",
      label: "Below the Zone",
      emoji: "🔻",
      color: "bg-orange-900/40 text-orange-300 border-orange-700",
      meaning:
        "The RB sits below the zone. Zone orders were filled — negotiation is happening below.",
    },
  };
  return map[position] || map.inside;
}

// ============================================================
// RB HIERARCHY
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
// ACTIVE RB
// ============================================================
export function findActiveRb(rbs, currentPrice) {
  if (!Array.isArray(rbs) || rbs.length === 0) return null;
  const price = parseFloat(currentPrice);
  if (isNaN(price)) return rankRejectionBlocks(rbs)[0] || null;

  const ranked = rankRejectionBlocks(rbs);

  for (const rb of ranked) {
    const high = parseFloat(rb.high);
    const low = parseFloat(rb.low);
    if (isNaN(high) || isNaN(low)) continue;
    if (price >= low && price <= high) return rb;
  }

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
// VERDICT
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
// EMA 50 — with validation
// ============================================================
export function computeEmaDirection({ emaPrice, emaPrior, closePrice }) {
  const c = parseFloat(emaPrice);
  const p = parseFloat(emaPrior);
  const close = parseFloat(closePrice);

  if (isNaN(c) || isNaN(p)) {
    return {
      direction: "unknown",
      position: "unknown",
      change: 0,
      aligned: null,
      valid: false,
    };
  }

  const priorCheck = validatePrior(c, p);
  if (!priorCheck.valid) {
    return {
      direction: "unknown",
      position: "unknown",
      change: 0,
      aligned: null,
      valid: false,
      invalidReason: priorCheck.reason,
    };
  }

  const change = ((c - p) / (p || 1)) * 100;
  let direction;
  if (change > 0.02) direction = "rising";
  else if (change < -0.02) direction = "falling";
  else direction = "flat";

  let position = "unknown";
  if (!isNaN(close)) {
    const tolerance = Math.abs(c) * 0.0001;
    if (Math.abs(close - c) <= tolerance) position = "at";
    else position = close > c ? "above" : "below";
  }
  return { direction, position, change, emaPrice: c, emaPrior: p, valid: true };
}

export function emaInfo({ direction, position }) {
  const dirMap = {
    rising: { label: "Rising", emoji: "📈", color: "text-green-300" },
    falling: { label: "Falling", emoji: "📉", color: "text-red-300" },
    flat: { label: "Flat", emoji: "➡️", color: "text-blue-300" },
    unknown: { label: "Unknown", emoji: "⚪", color: "text-gray-400" },
  };
  const posMap = {
    above: { label: "Above", color: "text-green-300" },
    below: { label: "Below", color: "text-red-300" },
    at: { label: "At EMA", color: "text-yellow-300" },
    unknown: { label: "—", color: "text-gray-400" },
  };
  return {
    direction: dirMap[direction] || dirMap.unknown,
    position: posMap[position] || posMap.unknown,
  };
}

export function emaAlignment({ direction, position, verdict }) {
  if (!verdict || verdict === "WAIT") return null;
  if (direction === "unknown" || position === "unknown") return null;

  if (verdict === "BUY") {
    if (direction === "rising" && position === "above") {
      return {
        key: "aligned",
        label: "EMA 50 aligned ✅",
        color: "bg-green-900/40 text-green-300",
        description: "BUY aligned with rising EMA 50, price above.",
      };
    }
    if (direction === "falling" || position === "below") {
      return {
        key: "counter",
        label: "Counter-trend ⚠️",
        color: "bg-yellow-900/40 text-yellow-300",
        description: "BUY against EMA 50 — reduced conviction.",
      };
    }
  }
  if (verdict === "SELL") {
    if (direction === "falling" && position === "below") {
      return {
        key: "aligned",
        label: "EMA 50 aligned ✅",
        color: "bg-green-900/40 text-green-300",
        description: "SELL aligned with falling EMA 50, price below.",
      };
    }
    if (direction === "rising" || position === "above") {
      return {
        key: "counter",
        label: "Counter-trend ⚠️",
        color: "bg-yellow-900/40 text-yellow-300",
        description: "SELL against EMA 50 — reduced conviction.",
      };
    }
  }
  return {
    key: "neutral",
    label: "EMA 50 neutral",
    color: "bg-blue-900/40 text-blue-300",
    description: "EMA 50 flat — no directional bias.",
  };
}

// ============================================================
// CONDITIONS
// ============================================================
export function checkConditions({ activeRb, allRbs, closePrice, verdict }) {
  if (!activeRb || !verdict || verdict === "WAIT") {
    return { above: [], below: [] };
  }
  const close = parseFloat(closePrice);
  if (isNaN(close)) return { above: [], below: [] };

  const activeHigh = parseFloat(activeRb.high);
  const activeLow = parseFloat(activeRb.low);
  if (isNaN(activeHigh) || isNaN(activeLow)) {
    return { above: [], below: [] };
  }

  const above = [];
  const below = [];

  for (const rb of allRbs) {
    if (rb.id === activeRb.id) continue;
    const high = parseFloat(rb.high);
    const low = parseFloat(rb.low);
    if (isNaN(high) || isNaN(low)) continue;
    const ce = Math.round(((high + low) / 2) * 100) / 100;

    let bucket = null;
    if (low > activeHigh) bucket = "above";
    else if (high < activeLow) bucket = "below";
    else continue;

    let tier;
    if (bucket === "above") {
      if (close > high) {
        tier = { key: "confirmed", label: "Confirmed", emoji: "✅",
          color: "bg-green-900/40 text-green-300 border-green-700",
          description: "Close has broken above this RB — path is open." };
      } else if (close >= ce) {
        tier = { key: "caution", label: "Caution", emoji: "⚪",
          color: "bg-blue-900/40 text-blue-300 border-blue-700",
          description: "Close sits in the upper half — still inside this RB." };
      } else if (close >= low) {
        tier = { key: "caution", label: "Caution", emoji: "⚪",
          color: "bg-blue-900/40 text-blue-300 border-blue-700",
          description: "Close sits in the lower half — still inside this RB." };
      } else {
        tier = { key: "blocked", label: "Blocked", emoji: "⚠️",
          color: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
          description: "Close is below this RB — it is a wall above." };
      }
    } else {
      if (close < low) {
        tier = { key: "confirmed", label: "Confirmed", emoji: "✅",
          color: "bg-green-900/40 text-green-300 border-green-700",
          description: "Close has broken below this RB — path is open." };
      } else if (close <= ce) {
        tier = { key: "caution", label: "Caution", emoji: "⚪",
          color: "bg-blue-900/40 text-blue-300 border-blue-700",
          description: "Close sits in the lower half — still inside this RB." };
      } else if (close <= high) {
        tier = { key: "caution", label: "Caution", emoji: "⚪",
          color: "bg-blue-900/40 text-blue-300 border-blue-700",
          description: "Close sits in the upper half — still inside this RB." };
      } else {
        tier = { key: "blocked", label: "Blocked", emoji: "⚠️",
          color: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
          description: "Close is above this RB — it is a wall below." };
      }
    }

    const entry = { id: rb.id, high, low, ce, tier, close };
    if (bucket === "above") above.push(entry);
    else below.push(entry);
  }

  above.sort((a, b) => a.low - b.low);
  below.sort((a, b) => b.high - a.high);

  if (verdict === "BUY") return { above, below: [] };
  if (verdict === "SELL") return { above: [], below };
  return { above, below };
}

export function conditionSummary(conditions, verdict) {
  const list = verdict === "BUY" ? conditions.above : conditions.below;
  const where = verdict === "BUY" ? "above" : "below";

  if (!list || list.length === 0) {
    return {
      key: "none",
      label: "No adjacent RB",
      emoji: "⚪",
      color: "bg-gray-900/40 text-gray-300 border-gray-700",
      description:
        verdict === "BUY"
          ? "No RBs above the active RB — clear path upward."
          : "No RBs below the active RB — clear path downward.",
    };
  }

  const blocked = list.filter((x) => x.tier.key === "blocked").length;
  const confirmed = list.filter((x) => x.tier.key === "confirmed").length;
  const caution = list.filter((x) => x.tier.key === "caution").length;

  if (blocked > 0 && confirmed === 0) {
    return {
      key: "blocked",
      label: `${blocked} RB${blocked === 1 ? "" : "s"} ${where} ⚠️`,
      emoji: "⚠️",
      color: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
      description:
        verdict === "BUY"
          ? "Price must clear these RBs to reach the target above."
          : "Price must clear these RBs to reach the target below.",
    };
  }
  if (confirmed > 0 && blocked === 0 && caution === 0) {
    return {
      key: "clear",
      label: "Path clear ✅",
      emoji: "✅",
      color: "bg-green-900/40 text-green-300 border-green-700",
      description:
        verdict === "BUY"
          ? "Close has already broken above the RBs in the path."
          : "Close has already broken below the RBs in the path.",
    };
  }
  return {
    key: "mixed",
    label: "Mixed conditions",
    emoji: "⚪",
    color: "bg-blue-900/40 text-blue-300 border-blue-700",
    description: "Some RBs confirmed, some still ahead or in progress.",
  };
}

// ============================================================
// ALL RBs FLIPPED
// ============================================================
export function detectAllRbsFlipped({ rankedRbs, closePrice }) {
  if (!Array.isArray(rankedRbs) || rankedRbs.length === 0) {
    return { allFlipped: false, direction: null, count: 0, flippedCount: 0 };
  }
  const close = parseFloat(closePrice);
  if (isNaN(close)) {
    return { allFlipped: false, direction: null, count: 0, flippedCount: 0 };
  }
  let upCount = 0;
  let downCount = 0;
  for (const rb of rankedRbs) {
    const high = parseFloat(rb.high);
    const low = parseFloat(rb.low);
    if (isNaN(high) || isNaN(low)) continue;
    if (close > high) upCount++;
    else if (close < low) downCount++;
  }
  const total = rankedRbs.length;
  const allUp = upCount === total;
  const allDown = downCount === total;
  return {
    allFlipped: allUp || allDown,
    direction: allUp ? "up" : allDown ? "down" : null,
    count: total,
    flippedCount: upCount + downCount,
    upCount,
    downCount,
  };
}

export function allFlippedInfo(flipped) {
  if (!flipped || !flipped.allFlipped) return null;
  if (flipped.direction === "up") {
    return {
      key: "up",
      label: "All RBs flipped ↑",
      emoji: "🔥",
      color: "bg-green-900/50 text-green-200 border-green-600",
      description: `Every listed RB (${flipped.count}) is flipped up.`,
    };
  }
  return {
    key: "down",
    label: "All RBs flipped ↓",
    emoji: "🔥",
    color: "bg-red-900/50 text-red-200 border-red-600",
    description: `Every listed RB (${flipped.count}) is flipped down.`,
  };
}

// ============================================================
// RB COMPLETENESS CHECK
// ============================================================
export function checkRbCompleteness({ rankedRbs, atr }) {
  if (!Array.isArray(rankedRbs) || rankedRbs.length === 0) {
    return {
      complete: false,
      level: "error",
      label: "No RBs listed",
      emoji: "🚫",
      color: "bg-red-950/40 border-red-700 text-red-200",
      description: "Add every RB around the zone.",
      gaps: [],
    };
  }
  const gaps = [];
  const sorted = [...rankedRbs].sort((a, b) => a.low - b.low);
  const atrVal = parseFloat(atr) || 0;

  if (atrVal > 0) {
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].low - sorted[i].high;
      if (gap > atrVal * 2) {
        gaps.push({
          from: { high: sorted[i].high, low: sorted[i].low },
          to: { high: sorted[i + 1].high, low: sorted[i + 1].low },
          gap: Math.round(gap * 100) / 100,
        });
      }
    }
  }

  if (rankedRbs.length < 2) {
    return {
      complete: false,
      level: "warning",
      label: `${rankedRbs.length} RB listed`,
      emoji: "⚠️",
      color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
      description: "Only one RB is listed. List every RB around the zone.",
      gaps: [],
    };
  }
  if (gaps.length > 0) {
    return {
      complete: false,
      level: "warning",
      label: `${gaps.length} possible gap${gaps.length === 1 ? "" : "s"}`,
      emoji: "⚠️",
      color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
      description:
        "Large gap between adjacent RBs — an RB may be missing in the path.",
      gaps,
    };
  }
  return {
    complete: true,
    level: "ok",
    label: "Coverage looks complete",
    emoji: "✅",
    color: "bg-green-950/30 border-green-800 text-green-200",
    description: `${rankedRbs.length} RBs listed — spacing looks consistent.`,
    gaps: [],
  };
}

// ============================================================
// TWO-CANDLE RB DETECTION — SWEEP + RECLAIM
// ============================================================
export function detectRbFromTwoCandles({ candle1, candle2 }) {
  const c1h = parseFloat(candle1?.high);
  const c1l = parseFloat(candle1?.low);
  const c2h = parseFloat(candle2?.high);
  const c2l = parseFloat(candle2?.low);
  const c2c = parseFloat(candle2?.close);

  if (isNaN(c1h) || isNaN(c1l) || isNaN(c2h) || isNaN(c2l) || isNaN(c2c)) {
    return {
      detected: false,
      rbs: [],
      reason: "Enter both candles with OHLC (high, low, close required).",
    };
  }

  const rbs = [];

  // RESISTANCE RB
  if (c2h > c1h && c2c < c1h) {
    const rbLow = Math.round(c1h * 100) / 100;
    const rbHigh = Math.round(c2h * 100) / 100;
    const ce = Math.round(((rbLow + rbHigh) / 2) * 100) / 100;
    rbs.push({
      id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: "resistance",
      rbLow,
      rbHigh,
      ce,
      sweepSize: Math.round((c2h - c1h) * 100) / 100,
      reason: `Resistance RB — Candle 2 swept above ${c1h} (to ${c2h}) and closed back below at ${c2c}.`,
    });
  }

  // SUPPORT RB
  if (c2l < c1l && c2c > c1l) {
    const rbLow = Math.round(c2l * 100) / 100;
    const rbHigh = Math.round(c1l * 100) / 100;
    const ce = Math.round(((rbLow + rbHigh) / 2) * 100) / 100;
    rbs.push({
      id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: "support",
      rbLow,
      rbHigh,
      ce,
      sweepSize: Math.round((c1l - c2l) * 100) / 100,
      reason: `Support RB — Candle 2 swept below ${c1l} (to ${c2l}) and closed back above at ${c2c}.`,
    });
  }

  let reason = "";
  if (rbs.length === 0) {
    if (c2h === c1h && c2l === c1l) {
      reason = "Invalid — wicks are equal.";
    } else if (c2h > c1h && c2c >= c1h) {
      reason = `Invalid resistance — Candle 2 closed at/above Candle 1's high (${c2c} ≥ ${c1h}).`;
    } else if (c2l < c1l && c2c <= c1l) {
      reason = `Invalid support — Candle 2 closed at/below Candle 1's low (${c2c} ≤ ${c1l}).`;
    } else if (c2h <= c1h && c2l >= c1l) {
      reason = "Invalid — Candle 2 did not sweep either of Candle 1's wicks.";
    } else {
      reason = "No valid RB.";
    }
  } else if (rbs.length === 2) {
    reason =
      "⚡ Dual sweep — Candle 2 swept both sides and closed inside. Both RBs valid (dead candle).";
  } else if (rbs.length === 1) {
    reason = rbs[0].reason;
  }

  return { detected: rbs.length > 0, rbs, reason };
}

// ============================================================
// DETECTION vs VERDICT CLOSE
// ============================================================
export function checkDetectionVsClose({
  detection,
  closePrice,
  pipSize = PIP_SIZE_DEFAULT,
  bufferPips = NEAR_EDGE_BUFFER_PIPS,
  activeRbIndex = 0,
}) {
  if (!detection || !detection.detected || !detection.rbs?.length) return null;
  const rb = detection.rbs[activeRbIndex] || detection.rbs[0];
  if (!rb) return null;

  const close = parseFloat(closePrice);
  if (isNaN(close)) return null;

  const p = parseFloat(pipSize) || PIP_SIZE_DEFAULT;
  const buffer = (parseFloat(bufferPips) || NEAR_EDGE_BUFFER_PIPS) * p;

  const rbLow = parseFloat(rb.rbLow);
  const rbHigh = parseFloat(rb.rbHigh);

  if (close >= rbLow && close <= rbHigh) {
    const side = close > rb.ce ? "premium" : close < rb.ce ? "discount" : "at-ce";
    return {
      status: "inside",
      level: "warning",
      label: "Verdict close INSIDE the detected RB",
      emoji: "⚠️",
      color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
      description:
        "The close sits inside the detected RB range. Price is still negotiating.",
      distancePips: 0,
      side,
      action: "wait",
      rbLow,
      rbHigh,
      ce: rb.ce,
      rbType: rb.type,
    };
  }
  if (close > rbHigh) {
    const distancePips = Math.round(((close - rbHigh) / p) * 100) / 100;
    if (close - rbHigh <= buffer) {
      return {
        status: "near-edge-above",
        level: "caution",
        label: "Verdict close NEAR the upper edge",
        emoji: "🟠",
        color: "bg-orange-950/40 border-orange-700 text-orange-200",
        description: "Close is just above the RB's upper edge — momentum weak.",
        distancePips,
        side: "above",
        action: "wait",
        rbLow,
        rbHigh,
        ce: rb.ce,
        rbType: rb.type,
      };
    }
    return {
      status: "beyond-up",
      level: "ok",
      label: "Close beyond the detected RB ↑",
      emoji: "✅",
      color: "bg-green-950/40 border-green-700 text-green-200",
      description: "Close cleared the RB upward — bullish break.",
      distancePips,
      side: "above",
      action: "confirmed",
      rbLow,
      rbHigh,
      ce: rb.ce,
      rbType: rb.type,
    };
  }
  if (close < rbLow) {
    const distancePips = Math.round(((rbLow - close) / p) * 100) / 100;
    if (rbLow - close <= buffer) {
      return {
        status: "near-edge-below",
        level: "caution",
        label: "Verdict close NEAR the lower edge",
        emoji: "🟠",
        color: "bg-orange-950/40 border-orange-700 text-orange-200",
        description: "Close is just below the RB's lower edge — momentum weak.",
        distancePips,
        side: "below",
        action: "wait",
        rbLow,
        rbHigh,
        ce: rb.ce,
        rbType: rb.type,
      };
    }
    return {
      status: "beyond-down",
      level: "ok",
      label: "Close beyond the detected RB ↓",
      emoji: "✅",
      color: "bg-green-950/40 border-green-700 text-green-200",
      description: "Close cleared the RB downward — bearish break.",
      distancePips,
      side: "below",
      action: "confirmed",
      rbLow,
      rbHigh,
      ce: rb.ce,
      rbType: rb.type,
    };
  }
  return null;
}

// ============================================================
// RB-IN-PATH — with corrected distance signs
// ============================================================
export function detectRbsInPath({
  entry,
  sl,
  tp,
  direction,
  rankedRbs,
  pipSize = PIP_SIZE_DEFAULT,
}) {
  if (!entry || !tp || !direction || !Array.isArray(rankedRbs)) {
    return { pathRbs: [], hasBlockers: false, safeTp: null, safeTpPips: null };
  }
  const e = parseFloat(entry);
  const t = parseFloat(tp);
  const p = parseFloat(pipSize) || PIP_SIZE_DEFAULT;
  if (isNaN(e) || isNaN(t)) {
    return { pathRbs: [], hasBlockers: false, safeTp: null, safeTpPips: null };
  }

  const isBull = direction === "BUY";
  const fullRange = Math.abs(t - e);
  const pathRbs = [];

  for (const rb of rankedRbs) {
    const high = parseFloat(rb.high);
    const low = parseFloat(rb.low);
    if (isNaN(high) || isNaN(low)) continue;

    if (isBull) {
      if (low <= e) continue;
      if (low >= t) continue;
    } else {
      if (high >= e) continue;
      if (high <= t) continue;
    }

    // Corrected distance signs
    const toEntryPrice = isBull ? low - e : e - high;
    const toTpPrice = isBull ? t - high : low - t;

    const distanceToEntryPips = Math.round((toEntryPrice / p) * 100) / 100;
    const distanceToTpPips = Math.round((toTpPrice / p) * 100) / 100;
    const ratio = fullRange > 0 ? toEntryPrice / fullRange : 0;

    const safeTp = isBull ? low : high;

    pathRbs.push({
      id: rb.id,
      high,
      low,
      ce: Math.round(((high + low) / 2) * 100) / 100,
      distanceToEntryPips,
      distanceToTpPips,
      distanceRatio: Math.round(ratio * 100) / 100,
      blocksBeforeTp: true,
      safeTp: Math.round(safeTp * 100) / 100,
    });
  }

  if (isBull) pathRbs.sort((a, b) => a.low - b.low);
  else pathRbs.sort((a, b) => b.high - a.high);

  const nearest = pathRbs[0] || null;
  const safeTp = nearest ? nearest.safeTp : null;
  const safeTpPips = nearest
    ? Math.round((Math.abs(safeTp - e) / p) * 100) / 100
    : null;

  return {
    pathRbs,
    hasBlockers: pathRbs.length > 0,
    safeTp,
    safeTpPips,
    nearest: nearest || null,
  };
}

// ============================================================
// BLOCKER INFO — 15% threshold
// ============================================================
export function blockerInfo({ direction, nearest, distanceRatio }) {
  if (!nearest) return null;
  if (distanceRatio !== undefined && distanceRatio < 0.15) {
    return {
      key: "weak",
      label: "Blocked early",
      emoji: "🚫",
      color: "bg-red-950/40 border-red-700 text-red-200",
      description:
        direction === "BUY"
          ? "An RB sits in the first 15% of the path — the BUY may reject early."
          : "An RB sits in the first 15% of the path — the SELL may reject early.",
    };
  }
  return {
    key: "warning",
    label: "RB ahead in path",
    emoji: "⚠️",
    color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
    description:
      "Price may reject at this RB before reaching the full target.",
  };
}

// ============================================================
// NEXT OPPORTUNITY
// ============================================================
export function detectReversal({ verdict, conditionRbs, closePrice, priorClose }) {
  if (!verdict || verdict === "WAIT") return null;
  if (!Array.isArray(conditionRbs) || conditionRbs.length === 0) return null;
  const close = parseFloat(closePrice);
  const prior = parseFloat(priorClose);
  if (isNaN(close)) return null;

  if (verdict === "SELL") {
    for (const rb of conditionRbs) {
      const low = parseFloat(rb.low);
      if (isNaN(low)) continue;
      const swept = !isNaN(prior) && prior < low;
      const reclaimed = close > low;
      if (swept && reclaimed) {
        return {
          detected: true,
          newDirection: "BUY",
          newRb: { high: rb.high, low: rb.low, ce: rb.ce },
          sweepLevel: low,
          reason: "Price swept below the condition RB low and closed back above — BUY reversal candidate.",
        };
      }
      if (close > low && close < rb.high) {
        return {
          detected: true,
          newDirection: "BUY",
          newRb: { high: rb.high, low: rb.low, ce: rb.ce },
          sweepLevel: low,
          reason: "Price closed back inside the condition RB above its low — BUY reversal candidate.",
        };
      }
    }
  }
  if (verdict === "BUY") {
    for (const rb of conditionRbs) {
      const high = parseFloat(rb.high);
      if (isNaN(high)) continue;
      const swept = !isNaN(prior) && prior > high;
      const reclaimed = close < high;
      if (swept && reclaimed) {
        return {
          detected: true,
          newDirection: "SELL",
          newRb: { high: rb.high, low: rb.low, ce: rb.ce },
          sweepLevel: high,
          reason: "Price swept above the condition RB high and closed back below — SELL reversal candidate.",
        };
      }
      if (close < high && close > rb.low) {
        return {
          detected: true,
          newDirection: "SELL",
          newRb: { high: rb.high, low: rb.low, ce: rb.ce },
          sweepLevel: high,
          reason: "Price closed back inside the condition RB below its high — SELL reversal candidate.",
        };
      }
    }
  }
  return null;
}

export function computeNextOpportunityTrade({
  newRb,
  newDirection,
  sweepLevel,
  accountSize = 0,
  riskPercent = 1,
  bufferMultiplier = 0.3,
  atr = 0,
  pipSize = PIP_SIZE_DEFAULT,
}) {
  if (!newRb || !newDirection) return null;
  const high = parseFloat(newRb.high);
  const low = parseFloat(newRb.low);
  if (isNaN(high) || isNaN(low)) return null;
  if (newDirection !== "BUY" && newDirection !== "SELL") return null;

  const ce = Math.round(((high + low) / 2) * 100) / 100;
  const isBull = newDirection === "BUY";
  const entry = ce;

  const sweep = parseFloat(sweepLevel);
  const buffer = atr > 0 ? atr * bufferMultiplier : 0;
  const sl = isBull
    ? (isNaN(sweep) ? low : sweep) - buffer
    : (isNaN(sweep) ? high : sweep) + buffer;

  const risk = Math.abs(entry - sl);
  const tp = isBull ? entry + risk * 2 : entry - risk * 2;

  const riskAmount = (accountSize * riskPercent) / 100;
  const lotSize =
    risk > 0
      ? Math.max(0.01, Math.round((riskAmount / risk) * 100) / 100)
      : 0;

  const pips = computePips({ entry, sl, tp, pipSize });

  return {
    direction: newDirection,
    entry,
    sl,
    tp,
    risk,
    reward: risk * 2,
    rr: 2,
    lotSize,
    riskAmount,
    ce,
    sweepLevel: isNaN(sweep) ? null : sweep,
    newRbHigh: high,
    newRbLow: low,
    pips,
  };
}

// ============================================================
// ZONE LIFECYCLE
// ============================================================
export function zoneStats(visits) {
  if (!Array.isArray(visits) || visits.length === 0) {
    return { total: 0, wins: 0, losses: 0, be: 0, pending: 0, winRate: null };
  }
  let wins = 0, losses = 0, be = 0, pending = 0;
  for (const v of visits) {
    if (v.outcome === "win") wins++;
    else if (v.outcome === "loss") losses++;
    else if (v.outcome === "breakeven") be++;
    else pending++;
  }
  const closed = wins + losses + be;
  const winRate = closed > 0 ? Math.round((wins / closed) * 100) : null;
  return { total: visits.length, wins, losses, be, pending, winRate };
}

export function zoneLifecycleLabel(setup, visits) {
  if (!setup) return null;
  const created = setup.created_at
    ? new Date(setup.created_at).getTime()
    : null;
  const days = created
    ? Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24))
    : null;

  if (setup.closed) {
    return {
      key: "invalidated",
      label: "Zone invalidated",
      emoji: "❌",
      color: "bg-red-900/40 text-red-300 border-red-700",
      description: "This zone is no longer being tracked.",
    };
  }
  if (!visits || visits.length === 0) {
    return {
      key: "new",
      label: "Zone live — no visits yet",
      emoji: "🆕",
      color: "bg-blue-900/40 text-blue-300 border-blue-700",
      description:
        days !== null ? `Live for ${days} day${days === 1 ? "" : "s"}` : "",
    };
  }
  return {
    key: "active",
    label: `Zone live — ${visits.length} visit${visits.length === 1 ? "" : "s"}`,
    emoji: "🟢",
    color: "bg-green-900/40 text-green-300 border-green-700",
    description:
      days !== null ? `Live for ${days} day${days === 1 ? "" : "s"}` : "",
  };
}

// ============================================================
// ATR FILTER — with validation
// ============================================================
export function atrFilter(atrCurrent, atrPrior) {
  const c = parseFloat(atrCurrent);
  const p = parseFloat(atrPrior);

  if (isNaN(c) || isNaN(p)) {
    return {
      key: "unknown",
      label: "ATR unknown",
      emoji: "⚪",
      color: "bg-gray-900/40 border-gray-700 text-gray-300",
      description: "Enter both ATR current and prior.",
      tradeable: false,
      valid: false,
    };
  }

  const priorCheck = validatePrior(c, p);
  if (!priorCheck.valid) {
    return {
      key: "unknown",
      label: "ATR invalid",
      emoji: "⚪",
      color: "bg-gray-900/40 border-gray-700 text-gray-300",
      description: `ATR prior (${p}) looks invalid vs current (${c}) — filter disabled.`,
      tradeable: true,
      valid: false,
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
      valid: true,
    };
  }
  if (change < -2) {
    return {
      key: "falling",
      label: "ATR Falling",
      emoji: "📉",
      color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
      description: `Volatility contracting (${change.toFixed(1)}%) — wait.`,
      tradeable: false,
      valid: true,
    };
  }
  return {
    key: "flat",
    label: "ATR Flat",
    emoji: "➡️",
    color: "bg-blue-950/40 border-blue-800 text-blue-200",
    description: "Volatility stable — proceed.",
    tradeable: true,
    valid: true,
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
  pipSize = PIP_SIZE_DEFAULT,
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

  const pips = computePips({ entry, sl, tp, pipSize });

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
    pips,
  };
}