// ============================================================
// PREMIUM / DISCOUNT NEGOTIATION ENGINE
// ============================================================
// Applies to ANY zone (Rejection Block, FVG, Order Block, etc.)
//
// The zone IS the dealing range. Its CE (50%) is the pivot.
//
// VERDICT
// ------------------------------------------------------------
//   Close ABOVE zone high  → BUY  (strong)  — zone broken upward
//   Close BELOW zone low   → SELL (strong)  — zone broken downward
//   Close in PREMIUM (above CE, inside zone) → SELL (normal)
//   Close in DISCOUNT (below CE, inside zone) → BUY  (normal)
//   Close = CE → WAIT
//
// Premium = sellers. Discount = buyers.
// ============================================================

// ============================================================
// CE (50% of the zone)
// ============================================================
export function computeCe(zoneHigh, zoneLow) {
  const high = parseFloat(zoneHigh);
  const low = parseFloat(zoneLow);
  if (isNaN(high) || isNaN(low)) return null;
  return Math.round(((high + low) / 2) * 100) / 100;
}

// ============================================================
// SIDE OF CE — premium / discount / at-ce
// ============================================================
export function detectSideOfCe(closePrice, ce) {
  const close = parseFloat(closePrice);
  const pivot = parseFloat(ce);
  if (isNaN(close) || isNaN(pivot)) return null;

  const tolerance = Math.abs(pivot) * 0.0001;
  if (Math.abs(close - pivot) <= tolerance) return "at-ce";
  return close > pivot ? "premium" : "discount";
}

// ============================================================
// ZONE APPROACH — where was price BEFORE approaching the zone?
// ============================================================
export function detectZoneApproach(priorPrice, zoneHigh, zoneLow) {
  const prior = parseFloat(priorPrice);
  const high = parseFloat(zoneHigh);
  const low = parseFloat(zoneLow);
  if (isNaN(prior) || isNaN(high) || isNaN(low)) return null;

  if (prior > high) return "above";
  if (prior < low) return "below";
  return "inside";
}

// ============================================================
// ZONE POSITION — where did price CLOSE relative to the zone?
// ============================================================
export function detectZonePosition(closePrice, zoneHigh, zoneLow) {
  const close = parseFloat(closePrice);
  const high = parseFloat(zoneHigh);
  const low = parseFloat(zoneLow);
  if (isNaN(close) || isNaN(high) || isNaN(low)) return null;

  if (close > high) return "above";
  if (close < low) return "below";
  return "inside";
}

// ============================================================
// JUDGE NEGOTIATION — the core verdict
// ============================================================
export function judgeNegotiation({
  zoneType,
  zoneHigh,
  zoneLow,
  priorPrice,
  closePrice,
}) {
  const high = parseFloat(zoneHigh);
  const low = parseFloat(zoneLow);
  const close = parseFloat(closePrice);
  if (isNaN(high) || isNaN(low) || isNaN(close)) return null;

  const ce = Math.round(((high + low) / 2) * 100) / 100;
  const approach = detectZoneApproach(priorPrice, high, low);

  // CASE 1 — Close above the zone high (broke upward)
  if (close > high) {
    return {
      verdict: "BUY",
      reason:
        "Closed ABOVE the zone high — buyers broke through the entire zone. Strong continuation up.",
      premiumDiscount: "premium",
      zonePosition: "above",
      approach,
      strength: "strong",
      ce,
      zoneBroken: "up",
    };
  }

  // CASE 2 — Close below the zone low (broke downward)
  if (close < low) {
    return {
      verdict: "SELL",
      reason:
        "Closed BELOW the zone low — sellers broke through the entire zone. Strong continuation down.",
      premiumDiscount: "discount",
      zonePosition: "below",
      approach,
      strength: "strong",
      ce,
      zoneBroken: "down",
    };
  }

  // Inside the zone
  const tolerance = Math.abs(ce) * 0.0001;

  // CASE 5 — Exactly at CE
  if (Math.abs(close - ce) <= tolerance) {
    return {
      verdict: "WAIT",
      reason:
        "Price closed at the CE — indecision. Wait for a clear close above or below.",
      premiumDiscount: "at-ce",
      zonePosition: "inside",
      approach,
      strength: "weak",
      ce,
      zoneBroken: null,
    };
  }

  // CASE 3 — Close in premium (above CE, inside zone) → SELL
  if (close > ce) {
    return {
      verdict: "SELL",
      reason:
        "Closed in the PREMIUM (above CE, inside zone) — sellers defended. SELL.",
      premiumDiscount: "premium",
      zonePosition: "inside",
      approach,
      strength: "normal",
      ce,
      zoneBroken: null,
    };
  }

  // CASE 4 — Close in discount (below CE, inside zone) → BUY
  return {
    verdict: "BUY",
    reason:
      "Closed in the DISCOUNT (below CE, inside zone) — buyers defended. BUY.",
    premiumDiscount: "discount",
    zonePosition: "inside",
    approach,
    strength: "normal",
    ce,
    zoneBroken: null,
  };
}

// ============================================================
// VERDICT BADGE — includes "RB broken" badge when applicable
// ============================================================
export function premiumDiscountVerdict(result) {
  if (!result) {
    return {
      label: "No verdict",
      emoji: "⚪",
      color: "bg-gray-900/40 border-gray-700 text-gray-300",
      description: "Fill in the zone and close to see the verdict.",
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

  if (result.zoneBroken === "up") {
    base.brokenBadge = {
      label: "RB broken ↑",
      color: "bg-green-900/40 text-green-300",
    };
  } else if (result.zoneBroken === "down") {
    base.brokenBadge = {
      label: "RB broken ↓",
      color: "bg-red-900/40 text-red-300",
    };
  } else {
    base.brokenBadge = null;
  }

  return base;
}

// ============================================================
// STRENGTH BADGE
// ============================================================
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