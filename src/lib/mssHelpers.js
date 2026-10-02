// ============================================================
// MSS HELPERS — Market Structure Shift
// ============================================================
// MSS = the break of the last opposing swing (with close beyond)
//   Bullish MSS: in a downtrend, price closes ABOVE the last swing high
//   Bearish MSS: in an uptrend, price closes BELOW the last swing low
// ============================================================

export const MSS_STATES = {
  bullish: {
    key: "bullish",
    label: "Bullish MSS",
    emoji: "🟢",
    color: "bg-green-950/40 border-green-700 text-green-200",
    badge: "bg-green-900/40 text-green-300",
    description: "Price broke above the last swing high — trend reversing up",
    tradeBias: "buy",
  },
  bearish: {
    key: "bearish",
    label: "Bearish MSS",
    emoji: "🔴",
    color: "bg-red-950/40 border-red-700 text-red-200",
    badge: "bg-red-900/40 text-red-300",
    description: "Price broke below the last swing low — trend reversing down",
    tradeBias: "sell",
  },
};

export function mssInfo(key) {
  return MSS_STATES[key] || null;
}

// Validate MSS logic
// For bullish MSS, the broken level was a swing high, and price closed ABOVE it
// For bearish MSS, the broken level was a swing low, and price closed BELOW it
export function validateMSS({
  direction,
  brokenLevel,
  closePrice,
}) {
  const errors = [];

  if (!brokenLevel || !closePrice) {
    return {
      isValid: false,
      errors: ["Broken level and close price are required"],
    };
  }

  const level = parseFloat(brokenLevel);
  const close = parseFloat(closePrice);

  if (direction === "bullish") {
    if (close <= level) {
      errors.push("Bullish MSS requires close ABOVE the broken level");
    }
  } else if (direction === "bearish") {
    if (close >= level) {
      errors.push("Bearish MSS requires close BELOW the broken level");
    }
  } else {
    errors.push("Direction must be 'bullish' or 'bearish'");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Check if the recent price swing direction conflicts with the MSS
// If uptrend and bearish MSS → reversal confirmed
// If downtrend and bullish MSS → reversal confirmed
// If uptrend and bullish MSS → continuation (BOS, not MSS)
// If downtrend and bearish MSS → continuation (BOS, not MSS)
export function mssType(previousTrend, mssDirection) {
  if (
    (previousTrend === "uptrend" && mssDirection === "bearish") ||
    (previousTrend === "downtrend" && mssDirection === "bullish")
  ) {
    return "reversal";
  }
  return "continuation";
}

// ============================================================
// MSS ZONES — Structural Zone Logic
// ============================================================

// Compute the zone from an MSS event
// Bullish MSS: zone from swing high wick (broken level) → breaking close
// Bearish MSS: zone from swing low wick (broken level) → breaking close
export function computeMSSZone({ direction, brokenLevel, closePrice }) {
  if (!brokenLevel || !closePrice) return null;

  const broken = parseFloat(brokenLevel);
  const close = parseFloat(closePrice);

  if (isNaN(broken) || isNaN(close)) return null;

  // Zone spans from min to max
  return {
    zoneHigh: Math.max(broken, close),
    zoneLow: Math.min(broken, close),
    zoneSize: Math.abs(close - broken),
  };
}

// Get zone status info
export function zoneStatusInfo(status) {
  const map = {
    active: {
      key: "active",
      label: "Active",
      emoji: "🟢",
      color: "bg-green-950/40 border-green-800 text-green-200",
      badge: "bg-green-900/40 text-green-300",
      description: "Zone is live — future RBs here are valid",
    },
    mitigated: {
      key: "mitigated",
      label: "Mitigated",
      emoji: "🟡",
      color: "bg-yellow-950/40 border-yellow-800 text-yellow-200",
      badge: "bg-yellow-900/40 text-yellow-300",
      description: "Price has returned once — still watchable",
    },
    invalidated: {
      key: "invalidated",
      label: "Invalidated",
      emoji: "⚫",
      color: "bg-gray-900 border-gray-800 text-gray-400",
      badge: "bg-gray-800 text-gray-400",
      description: "A newer opposite MSS replaced this zone",
    },
  };
  return map[status] || map.active;
}

// Check if an RB zone overlaps an MSS zone
// RB zone = "209300-209700" or { low, high }
export function rbInsideMSSZone(rbZone, mssZone) {
  if (!rbZone || !mssZone) return false;

  let rbLow, rbHigh;
  if (typeof rbZone === "string") {
    const parts = rbZone.replace(/\s/g, "").split("-");
    if (parts.length !== 2) return false;
    const a = parseFloat(parts[0]);
    const b = parseFloat(parts[1]);
    if (isNaN(a) || isNaN(b)) return false;
    rbLow = Math.min(a, b);
    rbHigh = Math.max(a, b);
  } else {
    rbLow = rbZone.low;
    rbHigh = rbZone.high;
  }

  // Check if RB zone overlaps MSS zone
  return rbLow <= mssZone.zoneHigh && rbHigh >= mssZone.zoneLow;
}

// Is a price inside an MSS zone?
export function priceInMSSZone(price, mssZone) {
  if (price == null || !mssZone) return false;
  const p = parseFloat(price);
  if (isNaN(p)) return false;
  return p >= mssZone.zoneLow && p <= mssZone.zoneHigh;
}

// Distance from live price to the nearest zone edge
export function distanceToMSSZone(price, mssZone) {
  if (price == null || !mssZone) return null;
  const p = parseFloat(price);
  if (isNaN(p)) return null;

  if (p >= mssZone.zoneLow && p <= mssZone.zoneHigh) {
    return 0; // inside the zone
  }

  const distToLow = Math.abs(p - mssZone.zoneLow);
  const distToHigh = Math.abs(p - mssZone.zoneHigh);
  return Math.min(distToLow, distToHigh);
}

// Sort zones by distance from price (closest first)
export function sortZonesByDistance(zones, livePrice) {
  if (!zones || livePrice == null) return zones || [];

  return [...zones].sort((a, b) => {
    const dA = distanceToMSSZone(livePrice, a) ?? Infinity;
    const dB = distanceToMSSZone(livePrice, b) ?? Infinity;
    return dA - dB;
  });
}

// Does a newer MSS invalidate an older zone?
// Opposite direction = invalidates
// Same direction = reinforces (does not invalidate)
export function shouldInvalidate(oldZone, newMssDirection) {
  if (!oldZone) return false;
  if (oldZone.zone_status !== "active") return false;
  if (oldZone.direction !== newMssDirection) return true;
  return false;
}
// ============================================================
// NESTED RRB — COMPRESSION LOGIC
// ============================================================

// Compute compression level from nested RRB count
export function computeCompressionLevel(count) {
  const n = parseInt(count) || 0;
  if (n >= 4) return "extreme";
  if (n === 3) return "high";
  if (n === 2) return "medium";
  return "low";
}

// Get info for a compression level
export function compressionInfo(level) {
  const map = {
    extreme: {
      key: "extreme",
      label: "Extreme Compression",
      emoji: "🔥🔥",
      color: "bg-red-900/50 text-red-100 border-red-600",
      badge: "bg-red-900/40 text-red-300",
      description:
        "4+ nested RRBs — massive institutional defense. The break will be explosive.",
    },
    high: {
      key: "high",
      label: "High Compression",
      emoji: "🔥",
      color: "bg-orange-900/40 text-orange-200 border-orange-700",
      badge: "bg-orange-900/40 text-orange-300",
      description:
        "3 nested RRBs — tripled defense. Strong institutional commitment.",
    },
    medium: {
      key: "medium",
      label: "Medium Compression",
      emoji: "⚡",
      color: "bg-yellow-900/40 text-yellow-200 border-yellow-700",
      badge: "bg-yellow-900/40 text-yellow-300",
      description:
        "2 nested RRBs — doubled defense. Sellers (or buyers) doubling down.",
    },
    low: {
      key: "low",
      label: "Single Defense",
      emoji: "•",
      color: "bg-gray-800 text-gray-300 border-gray-700",
      badge: "bg-gray-800 text-gray-300",
      description: "1 RRB — single layer of defense.",
    },
  };
  return map[level] || map.low;
}

// Check if a new RRB zone overlaps the MSS zone
export function rrbInsideMSSZone(rbZoneHigh, rbZoneLow, mssZone) {
  if (!mssZone || !rbZoneHigh || !rbZoneLow) return false;

  const rbHigh = parseFloat(rbZoneHigh);
  const rbLow = parseFloat(rbZoneLow);

  if (isNaN(rbHigh) || isNaN(rbLow)) return false;

  // Overlap = rbLow <= mssHigh AND rbHigh >= mssLow
  return rbLow <= mssZone.zoneHigh && rbHigh >= mssZone.zoneLow;
}

// Check if a new RRB is nested inside a previous RRB
export function rrbNestedInRRB(newRB, existingRRBs) {
  if (!newRB || !existingRRBs || existingRRBs.length === 0) return false;

  const nHigh = parseFloat(newRB.rb_zone_high);
  const nLow = parseFloat(newRB.rb_zone_low);

  return existingRRBs.some((existing) => {
    const eHigh = parseFloat(existing.rb_zone_high);
    const eLow = parseFloat(existing.rb_zone_low);
    // Nested = new RRB is inside OR overlaps the existing RRB
    return nLow <= eHigh && nHigh >= eLow;
  });
}

// Detect if a new RB zone should be logged as a nested RRB
// Returns: { shouldLog: bool, reason: string, overlappingRRBs: [] }
export function detectNestedRRB({ rbZoneHigh, rbZoneLow, mssZone, existingRRBs }) {
  if (!mssZone) {
    return {
      shouldLog: false,
      reason: "No MSS zone to attach to",
      overlappingRRBs: [],
    };
  }

  // Check if RB is inside the MSS zone
  const insideMSS = rrbInsideMSSZone(rbZoneHigh, rbZoneLow, mssZone);
  if (!insideMSS) {
    return {
      shouldLog: false,
      reason: "RB zone is not inside the MSS zone",
      overlappingRRBs: [],
    };
  }

  // Find overlapping RRBs
  const rbHigh = parseFloat(rbZoneHigh);
  const rbLow = parseFloat(rbZoneLow);

  const overlappingRRBs = (existingRRBs || []).filter((existing) => {
    const eHigh = parseFloat(existing.rb_zone_high);
    const eLow = parseFloat(existing.rb_zone_low);
    return rbLow <= eHigh && rbHigh >= eLow;
  });

  // Should log if it's inside the MSS zone (always valid)
  return {
    shouldLog: true,
    reason:
      overlappingRRBs.length > 0
        ? `Nested inside ${overlappingRRBs.length} existing RRB(s) — double defense`
        : "First RRB inside the MSS zone",
    overlappingRRBs,
  };
}

// Compute CE from a nested RRB zone
export function computeNestedRBCE(rbZoneHigh, rbZoneLow) {
  const high = parseFloat(rbZoneHigh);
  const low = parseFloat(rbZoneLow);
  if (isNaN(high) || isNaN(low)) return null;
  return Math.round(((high + low) / 2) * 100) / 100;
}