// ============================================================
// IRL / ERL ENGINE
// ============================================================
// Auto-derives Internal Range Liquidity (IRL) and External Range
// Liquidity (ERL) from the zones you already enter on each page.
//
// DEALING RANGE:
//   High = highest of (current zone high, next zone high)
//   Low  = lowest of (current zone low, next zone low)
//
// IRL (Internal):  the zone you're currently trading
// ERL (External):  the TP target (or the next zone beyond entry)
//
// RANGE POSITION:
//   Above the range high  → beyond range (breakout)
//   In the premium half   → sellers' territory
//   At equilibrium (CE)   → indecision
//   In the discount half  → buyers' territory
//   Below the range low   → beyond range (breakdown)
// ============================================================

// ============================================================
// BUILD DEALING RANGE FROM ZONES
// ============================================================
export function computeDealingRange({ currentZone, nextZone }) {
  const highs = [];
  const lows = [];

  if (currentZone?.high && !isNaN(parseFloat(currentZone.high))) {
    highs.push(parseFloat(currentZone.high));
  }
  if (currentZone?.low && !isNaN(parseFloat(currentZone.low))) {
    lows.push(parseFloat(currentZone.low));
  }
  if (nextZone?.high && !isNaN(parseFloat(nextZone.high))) {
    highs.push(parseFloat(nextZone.high));
  }
  if (nextZone?.low && !isNaN(parseFloat(nextZone.low))) {
    lows.push(parseFloat(nextZone.low));
  }

  if (highs.length === 0 || lows.length === 0) return null;

  const high = Math.max(...highs);
  const low = Math.min(...lows);
  if (high <= low) return null;

  const ce = Math.round(((high + low) / 2) * 100) / 100;
  const size = Math.round((high - low) * 100) / 100;

  return {
    dealingHigh: Math.round(high * 100) / 100,
    dealingLow: Math.round(low * 100) / 100,
    dealingCe: ce,
    dealingSize: size,
  };
}

// ============================================================
// RANGE POSITION — where does price sit?
// ============================================================
export function detectRangePosition({ closePrice, dealingHigh, dealingLow }) {
  const close = parseFloat(closePrice);
  const high = parseFloat(dealingHigh);
  const low = parseFloat(dealingLow);
  if (isNaN(close) || isNaN(high) || isNaN(low)) return null;

  if (close > high) return "above-range";
  if (close < low) return "below-range";

  const ce = (high + low) / 2;
  const tolerance = Math.abs(ce) * 0.0001;
  if (Math.abs(close - ce) <= tolerance) return "at-eq";
  if (close > ce) return "premium";
  return "discount";
}

export function rangePositionInfo(position) {
  const map = {
    "above-range": {
      key: "above-range",
      label: "Above Range",
      emoji: "🔺",
      color: "bg-green-900/40 text-green-300 border-green-700",
      meaning: "Close is above the dealing range high — breakout continuation.",
    },
    premium: {
      key: "premium",
      label: "Premium Half",
      emoji: "🔴",
      color: "bg-red-900/40 text-red-300 border-red-700",
      meaning:
        "Price is in the premium half of the range — sellers' territory.",
    },
    "at-eq": {
      key: "at-eq",
      label: "At Equilibrium",
      emoji: "⚖️",
      color: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
      meaning: "Price is at the range CE — indecision. Wait for a close.",
    },
    discount: {
      key: "discount",
      label: "Discount Half",
      emoji: "🟢",
      color: "bg-green-900/40 text-green-300 border-green-700",
      meaning:
        "Price is in the discount half of the range — buyers' territory.",
    },
    "below-range": {
      key: "below-range",
      label: "Below Range",
      emoji: "🔻",
      color: "bg-red-900/40 text-red-300 border-red-700",
      meaning: "Close is below the dealing range low — breakdown continuation.",
    },
  };
  return map[position] || map["at-eq"];
}

// ============================================================
// BUILD IRL / ERL PAYLOAD
// ============================================================
// Combines range + zone + TP into the full narrative.
export function computeIrlErl({
  currentZone,        // { high, low, label } — the zone you're trading
  nextZone,           // { high, low, label } — the next zone (optional)
  closePrice,
  trade,              // { direction, entry, tp } — from the trade calculator
}) {
  const range = computeDealingRange({ currentZone, nextZone });
  if (!range) return null;

  const position = detectRangePosition({
    closePrice,
    dealingHigh: range.dealingHigh,
    dealingLow: range.dealingLow,
  });
  const positionInfo = position ? rangePositionInfo(position) : null;

  // IRL = the zone you're trading
  const irl = currentZone?.high && currentZone?.low
    ? {
        high: parseFloat(currentZone.high),
        low: parseFloat(currentZone.low),
        ce: Math.round(
          ((parseFloat(currentZone.high) + parseFloat(currentZone.low)) / 2) *
            100
        ) / 100,
        label: currentZone.label || "Current Zone",
      }
    : null;

  // ERL = the TP target (or the next zone beyond entry)
  const irlCe = irl?.ce ?? null;
  let erl = null;

  if (trade?.tp !== undefined && trade.tp !== null) {
    erl = {
      price: Math.round(parseFloat(trade.tp) * 100) / 100,
      source: "2R target",
    };
  } else if (nextZone?.high && nextZone?.low) {
    // For BUY, ERL = next zone high; for SELL, ERL = next zone low
    const isBull = trade?.direction === "BUY";
    erl = {
      price: isBull
        ? Math.round(parseFloat(nextZone.high) * 100) / 100
        : Math.round(parseFloat(nextZone.low) * 100) / 100,
      source: isBull ? "Next zone high" : "Next zone low",
    };
  }

  // Alignment check — is the IRL→ERL move aligned with the direction?
  let aligned = null;
  if (irl?.ce !== null && erl?.price !== null && trade?.direction) {
    if (trade.direction === "BUY") {
      // For BUY, ERL should be above the IRL CE
      aligned = erl.price > irlCe;
    } else if (trade.direction === "SELL") {
      // For SELL, ERL should be below the IRL CE
      aligned = erl.price < irlCe;
    }
  }

  return {
    range,
    position,
    positionInfo,
    irl,
    erl,
    aligned, // true / false / null
    direction: trade?.direction || null,
  };
}

// ============================================================
// BADGE HELPERS FOR UI
// ============================================================
export function irlErlAlignmentBadge(aligned) {
  if (aligned === true) {
    return {
      key: "aligned",
      label: "IRL → ERL aligned ✅",
      emoji: "✅",
      color: "bg-green-900/40 text-green-300 border-green-700",
      description:
        "The internal zone is targeting a valid external level in the trade direction.",
    };
  }
  if (aligned === false) {
    return {
      key: "misaligned",
      label: "IRL → ERL misaligned ⚠️",
      emoji: "⚠️",
      color: "bg-red-900/40 text-red-300 border-red-700",
      description:
        "The trade's TP is on the wrong side of the IRL — the target conflicts with the direction.",
    };
  }
  return {
    key: "unknown",
    label: "IRL / ERL unknown",
    emoji: "⚪",
    color: "bg-gray-900/40 text-gray-300 border-gray-700",
    description:
      "Enter a zone and a close price to derive the dealing range.",
  };
}