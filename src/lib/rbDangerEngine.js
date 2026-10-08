// ============================================================
// RB DANGER ENGINE
// ============================================================
// Scores every RB in a trade path by how likely it is to
// reject the trade. 0–10 + tier + reason.
//
// HARD RULES:
//   Price currently INSIDE a path RB → 9/10 minimum (Critical)
//   Price within 25% of path from a path RB → 7/10 minimum (High)
// ============================================================

export const DEFAULT_DANGER_WEIGHTS = {
  sizeVsAtr: 2.0,
  freshness: 1.5,
  distanceToEntry: 1.5,
  distanceToTp: 0.8,
  zonePosition: 1.2,
  ema50Agreement: 1.0,
  wickSize: 1.5,
  reclaimDepth: 1.5,
  alreadyFlipped: -2.0,
};

export const DANGER_TIERS = {
  critical: {
    key: "critical",
    min: 8,
    label: "Critical",
    emoji: "🔴",
    color: "bg-red-950/50 border-red-600 text-red-200",
    badge: "bg-red-900/40 text-red-300",
    action: "Exit before it — safe TP required",
  },
  high: {
    key: "high",
    min: 6,
    label: "High",
    emoji: "🟠",
    color: "bg-orange-950/50 border-orange-600 text-orange-200",
    badge: "bg-orange-900/40 text-orange-300",
    action: "Consider safe TP before the RB",
  },
  medium: {
    key: "medium",
    min: 4,
    label: "Medium",
    emoji: "🟡",
    color: "bg-yellow-950/50 border-yellow-600 text-yellow-200",
    badge: "bg-yellow-900/40 text-yellow-300",
    action: "Monitor — could stall",
  },
  low: {
    key: "low",
    min: 2,
    label: "Low",
    emoji: "🟢",
    color: "bg-green-950/50 border-green-600 text-green-200",
    badge: "bg-green-900/40 text-green-300",
    action: "Likely clears",
  },
  clear: {
    key: "clear",
    min: 0,
    label: "Clear",
    emoji: "⚪",
    color: "bg-gray-950/50 border-gray-600 text-gray-200",
    badge: "bg-gray-800 text-gray-300",
    action: "No meaningful resistance",
  },
};

export function dangerTierFor(score) {
  if (score >= 8) return DANGER_TIERS.critical;
  if (score >= 6) return DANGER_TIERS.high;
  if (score >= 4) return DANGER_TIERS.medium;
  if (score >= 2) return DANGER_TIERS.low;
  return DANGER_TIERS.clear;
}

// helpers
function clamp01(x) {
  if (isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
function sizeVsAtrSignal(rbSize, atr) {
  if (!atr || atr <= 0) return 0.3;
  const ratio = rbSize / atr;
  return clamp01(ratio / 2);
}
function freshnessSignal(rank) {
  if (rank === "current") return 1.0;
  if (rank === "previous") return 0.66;
  if (rank === "oldest") return 0.33;
  return 0.15;
}
function distanceToEntrySignal(distanceToR) {
  return clamp01(1 - distanceToR);
}
function distanceToTpSignal(distanceFromTpR) {
  return clamp01(1 - distanceFromTpR);
}
function zonePositionSignal(zonePosition) {
  if (zonePosition === "inside") return 1.0;
  if (zonePosition === "above" || zonePosition === "below") return 0.6;
  return 0.3;
}
function ema50Signal({ direction, position, verdict }) {
  if (!direction || direction === "unknown") return 0.5;
  if (!verdict) return 0.5;
  if (verdict === "BUY") {
    if (direction === "rising" && position === "above") return 0.3;
    if (direction === "falling" || position === "below") return 0.9;
  }
  if (verdict === "SELL") {
    if (direction === "falling" && position === "below") return 0.3;
    if (direction === "rising" || position === "above") return 0.9;
  }
  return 0.5;
}
function wickSizeSignal(rbSize, wickSize) {
  if (!rbSize || rbSize <= 0) return 0.5;
  return clamp01(wickSize / rbSize);
}
function reclaimDepthSignal(close, rbLow, rbHigh) {
  const rbSize = rbHigh - rbLow;
  if (rbSize <= 0) return 0.5;
  const fromLow = (close - rbLow) / rbSize;
  const fromHigh = (rbHigh - close) / rbSize;
  const depth = Math.min(fromLow, fromHigh);
  return clamp01(depth);
}
function alreadyFlippedSignal(close, rbLow, rbHigh, verdict) {
  if (verdict === "BUY" && close > rbHigh) return 1.0;
  if (verdict === "SELL" && close < rbLow) return 1.0;
  return 0.0;
}

// ============================================================
// SCORE ONE RB
// ============================================================
export function scoreRbDanger({
  rb,
  verdict,
  entry,
  tp,
  close,
  atr,
  pipSize = 0.01,
  rank = "older",
  zonePosition = "inside",
  ema = { direction: "unknown", position: "unknown" },
  weights = DEFAULT_DANGER_WEIGHTS,
  isInsideNow = false, // NEW: price currently inside this RB
}) {
  if (!rb || !verdict || !entry || !tp) return null;

  const rbLow = parseFloat(rb.low);
  const rbHigh = parseFloat(rb.high);
  const rbSize = rbHigh - rbLow;
  const e = parseFloat(entry);
  const t = parseFloat(tp);
  const c = parseFloat(close);

  const fullPathPrice = Math.abs(t - e);
  const fullPathPips = fullPathPrice / pipSize;
  const isBull = verdict === "BUY";

  // CORRECTED distances
  const toEntryPrice = isBull ? rbLow - e : e - rbHigh;
  const toTpPrice = isBull ? t - rbHigh : rbLow - t;
  const distanceToEntryR =
    fullPathPrice > 0 ? toEntryPrice / fullPathPrice : 0;
  const distanceToTpFromTpR =
    fullPathPrice > 0 ? toTpPrice / fullPathPrice : 0;

  const s = {
    sizeVsAtr: sizeVsAtrSignal(rbSize, atr),
    freshness: freshnessSignal(rank),
    distanceToEntry: distanceToEntrySignal(distanceToEntryR),
    distanceToTp: distanceToTpSignal(distanceToTpFromTpR),
    zonePosition: zonePositionSignal(zonePosition),
    ema50Agreement: ema50Signal({ ...ema, verdict }),
    wickSize: wickSizeSignal(rbSize, rbSize),
    reclaimDepth: reclaimDepthSignal(c, rbLow, rbHigh),
    alreadyFlipped: alreadyFlippedSignal(c, rbLow, rbHigh, verdict),
  };

  let raw = 0;
  let totalWeight = 0;
  for (const [key, value] of Object.entries(s)) {
    const w = weights[key] ?? 0;
    raw += value * w;
    totalWeight += Math.abs(w);
  }

  const normalized = totalWeight > 0 ? raw / totalWeight : 0;
  let score = Math.round(Math.max(0, Math.min(10, normalized * 10)) * 10) / 10;

  // HARD FLOORS
  if (isInsideNow) {
    score = Math.max(score, 9.0);
  } else if (distanceToEntryR >= 0 && distanceToEntryR <= 0.25) {
    score = Math.max(score, 7.0);
  }

  const tier = dangerTierFor(score);

  // reasons
  const reasons = [];
  if (isInsideNow) reasons.push("price inside this RB now");
  if (s.sizeVsAtr > 0.6) reasons.push(`size ${Math.round(rbSize)} vs ATR ${atr}`);
  if (s.freshness >= 0.66) reasons.push(`${rank} RB`);
  if (s.distanceToEntry > 0.6) reasons.push("close to entry");
  if (s.distanceToTp > 0.6) reasons.push("well before TP");
  if (s.ema50Agreement > 0.7) reasons.push("against EMA 50");
  if (s.reclaimDepth > 0.4) reasons.push("deep reclaim");
  if (s.alreadyFlipped > 0.5) reasons.push("already flipped → weaker");
  const reason = reasons.length > 0 ? reasons.join(" · ") : "Standard resistance";

  return {
    rbId: rb.id,
    rbLow,
    rbHigh,
    ce: rb.ce,
    score,
    tier,
    reason,
    signals: s,
    isInsideNow,
    distanceToEntryPips: Math.round(distanceToEntryR * fullPathPips * 100) / 100,
    distanceToTpPips: Math.round(distanceToTpFromTpR * fullPathPips * 100) / 100,
  };
}

// ============================================================
// SCORE THE WHOLE PATH
// ============================================================
export function scorePathDanger({
  pathRbs,
  verdict,
  entry,
  tp,
  close,
  atr,
  pipSize = 0.01,
  zonePositionMap = {},
  rankMap = {},
  ema = { direction: "unknown", position: "unknown" },
  weights = DEFAULT_DANGER_WEIGHTS,
}) {
  if (!Array.isArray(pathRbs) || pathRbs.length === 0) {
    return {
      rbs: [],
      topScore: 0,
      topTier: DANGER_TIERS.clear,
      average: 0,
      summary: "No RBs in the path — clear runway.",
    };
  }

  const c = parseFloat(close);

  const scored = pathRbs
    .map((rb) => {
      const low = parseFloat(rb.low);
      const high = parseFloat(rb.high);
      const isInsideNow =
        !isNaN(c) && c >= low && c <= high;

      return scoreRbDanger({
        rb,
        verdict,
        entry,
        tp,
        close,
        atr,
        pipSize,
        rank: rankMap[rb.id] || "older",
        zonePosition: zonePositionMap[rb.id] || "inside",
        ema,
        weights,
        isInsideNow,
      });
    })
    .filter(Boolean);

  scored.sort((a, b) => b.score - a.score);

  const topScore = scored[0]?.score ?? 0;
  const topTier = dangerTierFor(topScore);
  const average =
    scored.length > 0
      ? Math.round(
          (scored.reduce((a, b) => a + b.score, 0) / scored.length) * 10
        ) / 10
      : 0;

  let summary = "";
  if (topScore >= 8) {
    summary = `Critical RB in path (score ${topScore}/10) — take safe TP before it.`;
  } else if (topScore >= 6) {
    summary = `High-danger RB in path (score ${topScore}/10) — consider reducing target.`;
  } else if (topScore >= 4) {
    summary = `Moderate danger (score ${topScore}/10) — monitor.`;
  } else {
    summary = `Path looks clear (top ${topScore}/10).`;
  }

  return {
    rbs: scored,
    topScore,
    topTier,
    average,
    summary,
  };
}

// ============================================================
// PATH DANGER BANNER
// ============================================================
export function pathDangerBanner(pathDanger, direction) {
  if (!pathDanger) return null;
  const { topScore } = pathDanger;

  if (topScore >= 8) {
    return {
      key: "critical",
      label: "🚨 High-risk path",
      emoji: "🚨",
      color: "bg-red-950/50 border-red-600 text-red-200",
      description: `Critical RB ahead (score ${topScore}/10). The ${
        direction === "BUY" ? "BUY" : "SELL"
      } may reject there — take a safer TP or skip.`,
    };
  }
  if (topScore >= 6) {
    return {
      key: "high",
      label: "⚠️ RB likely to reject",
      emoji: "⚠️",
      color: "bg-orange-950/50 border-orange-600 text-orange-200",
      description: `High-danger RB in path (score ${topScore}/10). Consider the safe TP.`,
    };
  }
  if (topScore >= 4) {
    return {
      key: "medium",
      label: "Medium danger ahead",
      emoji: "🟡",
      color: "bg-yellow-950/50 border-yellow-600 text-yellow-200",
      description: `Moderate resistance in path (score ${topScore}/10). Monitor price at the RB.`,
    };
  }
  return null;
}