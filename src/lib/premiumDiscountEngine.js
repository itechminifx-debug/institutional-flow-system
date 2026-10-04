// ============================================================
// PREMIUM / DISCOUNT NEGOTIATION ENGINE
// ============================================================
// Applies to ANY zone (Rejection Block, FVG, Order Block, etc.)
//
// The CE (50% of the zone) is the pivot:
//   - Above CE = PREMIUM  → sellers' territory
//   - Below CE = DISCOUNT → buyers' territory
//
// Rule: WHERE PRICE CLOSES relative to the CE + the zone edges
// determines CONTINUATION or REVERSAL.
//
// Resistance zone approach:
//   - Close in DISCOUNT          → BUY  (continuation up)
//   - Close in PREMIUM           → SELL (reversal)
//   - Close ABOVE zone high      → BUY  (strong continuation up)
//
// Support zone approach:
//   - Close in PREMIUM           → SELL (continuation down)
//   - Close in DISCOUNT          → BUY  (reversal)
//   - Close BELOW zone low       → SELL (strong continuation down)
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

  const tolerance = Math.abs(pivot) * 0.0001; // 0.01% tolerance
  if (Math.abs(close - pivot) <= tolerance) return "at-ce";
  return close > pivot ? "premium" : "discount";
}

// ============================================================
// ZONE APPROACH — where was price BEFORE it approached the zone?
// ============================================================
// Returns: 'above' | 'below' | 'inside' | null
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
// Returns: 'above' | 'inside' | 'below' | null
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
// Inputs:
//   zoneType    → 'resistance' | 'support'
//   zoneHigh    → top of zone
//   zoneLow     → bottom of zone
//   priorPrice  → price before approaching the zone
//   closePrice  → price after the negotiation (the close)
//
// Returns:
//   {
//     verdict:    'BUY' | 'SELL' | 'WAIT',
//     reason:     human-readable explanation,
//     premiumDiscount: 'premium' | 'discount' | 'at-ce',
//     zonePosition: 'above' | 'inside' | 'below',
//     strength:   'strong' | 'normal' | 'weak',
//     ce:         the CE price
//   }
// ============================================================
export function judgeNegotiation({
  zoneType,
  zoneHigh,
  zoneLow,
  priorPrice,
  closePrice,
}) {
  const ce = computeCe(zoneHigh, zoneLow);
  if (ce === null) return null;

  const sideOfCe = detectSideOfCe(closePrice, ce);
  const zonePosition = detectZonePosition(closePrice, zoneHigh, zoneLow);
  const approach = detectZoneApproach(priorPrice, zoneHigh, zoneLow);

  if (!sideOfCe || !zonePosition) return null;

  // Default: wait
  let verdict = "WAIT";
  let reason = "Not enough info — check zone and close.";
  let strength = "weak";

  // ============================================================
  // RESISTANCE ZONE
  // ============================================================
  if (zoneType === "resistance") {
    if (zonePosition === "above") {
      // Close above resistance → strong continuation up
      verdict = "BUY";
      strength = "strong";
      reason =
        "Closed ABOVE the resistance zone — sellers fully failed, buyers broke out. Strong continuation up.";
    } else if (zonePosition === "inside" && sideOfCe === "discount") {
      // Close inside but below CE → continuation up
      verdict = "BUY";
      strength = "normal";
      reason =
        "Closed in the DISCOUNT (below CE) — sellers failed to hold the resistance. Continuation up.";
    } else if (zonePosition === "inside" && sideOfCe === "premium") {
      // Close inside but above CE → reversal down
      verdict = "SELL";
      strength = "normal";
      reason =
        "Closed in the PREMIUM (above CE) — sellers rejected the negotiation. Reversal down.";
    } else if (zonePosition === "below") {
      // Close below resistance → strong reversal down (sellers took over)
      verdict = "SELL";
      strength = "strong";
      reason =
        "Closed BELOW the resistance zone — sellers rejected and drove price down. Strong reversal / continuation down.";
    }
  }

  // ============================================================
  // SUPPORT ZONE
  // ============================================================
  else if (zoneType === "support") {
    if (zonePosition === "below") {
      // Close below support → strong continuation down
      verdict = "SELL";
      strength = "strong";
      reason =
        "Closed BELOW the support zone — buyers fully failed, sellers broke down. Strong continuation down.";
    } else if (zonePosition === "inside" && sideOfCe === "premium") {
      // Close inside but above CE → continuation down
      verdict = "SELL";
      strength = "normal";
      reason =
        "Closed in the PREMIUM (above CE) — buyers failed to hold the support. Continuation down.";
    } else if (zonePosition === "inside" && sideOfCe === "discount") {
      // Close inside but below CE → reversal up
      verdict = "BUY";
      strength = "normal";
      reason =
        "Closed in the DISCOUNT (below CE) — buyers rejected the negotiation. Reversal up.";
    } else if (zonePosition === "above") {
      // Close above support → strong reversal up
      verdict = "BUY";
      strength = "strong";
      reason =
        "Closed ABOVE the support zone — buyers rejected and drove price up. Strong reversal / continuation up.";
    }
  }

  return {
    verdict,
    reason,
    premiumDiscount: sideOfCe,
    zonePosition,
    approach,
    strength,
    ce,
  };
}

// ============================================================
// VERDICT BADGE METADATA — for UI rendering
// ============================================================
export function premiumDiscountVerdict(result) {
  if (!result) {
    return {
      label: "No verdict",
      emoji: "⚪",
      color: "bg-gray-900/40 border-gray-700 text-gray-300",
      description: "Fill in the zone and close to see the verdict.",
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
// STRENGTH BADGE — separate indicator
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