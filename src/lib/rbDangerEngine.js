// ============================================================
// RB DANGER ENGINE
// ============================================================
// Scores every RB in a trade path by how likely it is to
// reject the trade. Returns a 0–10 danger score + tier + why.
//
// Signals used (all normalized to 0–10 contribution):
//   - Size vs ATR
//   - Freshness (rank)
//   - Distance to entry
//   - Distance to TP
//   - Position vs zone
//   - EMA 50 agreement
//   - Wick size of origin
//   - Reclaim depth (how far inside the body closed)
//   - Already-flipped check
//
// Weights are tunable and defaults are conservative.
// ============================================================

// ============================================================
// DEFAULT WEIGHTS
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
  alreadyFlipped: -2.0, // negative — flips reduce danger
};

// ============================================================
// TIERS
// ============================================================
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

// ============================================================
// HELPERS — normalized 0..1 signal contributions
// ============================================================
function clamp01(x) {
  if (isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

// Size of the RB relative to ATR: 1× ATR = 0.5, 2× ATR = 1.0
function sizeVsAtrSignal(rbSize, atr) {
  if (!atr || atr <= 0) return 0.3; // neutral when ATR missing
  const ratio = rbSize / atr;
  return clamp01(ratio / 2);
}

// Freshness: current = 1.0, previous = 0.66, oldest = 0.33, older = 0.15
function freshnessSignal(rank) {
  if (rank === "current") return 1.0;
  if (rank === "previous") return 0.66;
  if (rank === "oldest") return 0.33;
  return 0.15;
}

// Distance from entry to the near edge of the RB (in R multiples)
// If the RB is very close, it's dangerous. If it's far, less so.
function distanceToEntrySignal(distanceToR, fullPathR) {
  if (fullPathR <= 0) return 0;
  const ratio = distanceToR / fullPathR;
  // 0 = touching entry (very dangerous), 1 = at TP (irrelevant)
  return clamp01(1 - ratio);
}

// Distance from RB to TP: if the RB is just before the TP, it's dangerous.
// If it's far from TP, the trade will exit naturally anyway.
function distanceToTpSignal(rbToTpR, fullPathR) {
  if (fullPathR <= 0) return 0;
  const ratio = rbToTpR / fullPathR;
  // Small ratio = RB is near TP (irrelevant to protecting profit)
  // Large ratio = RB is closer to entry (already captured by distanceToEntry)
  return clamp01(1 - ratio);
}

// Zone position: RB inside the zone is most dangerous.
function zonePositionSignal(zonePosition) {
  if (zonePosition === "inside") return 1.0;
  if (zonePosition === "above" || zonePosition === "below") return 0.6;
  return 0.3;
}

// EMA 50 agreement: if the RB sits against EMA 50 trend, it's weaker.
function ema50Signal({ direction, position, verdict }) {
  if (!direction || direction === "unknown") return 0.5;
  if (!verdict) return 0.5;

  if (verdict === "BUY") {
    if (direction === "rising" && position === "above") return 0.3; // with trend, RB weaker
    if (direction === "falling" || position === "below") return 0.9; // against, RB dangerous
  }
  if (verdict === "SELL") {
    if (direction === "falling" && position === "below") return 0.3;
    if (direction === "rising" || position === "above") return 0.9;
  }
  return 0.5;
}

// Wick size relative to ATR: bigger wick = stronger rejection = more dangerous.
function wickSizeSignal(rbSize, wickSize) {
  if (!rbSize || rbSize <= 0) return 0.5;
  const ratio = wickSize / rbSize;
  return clamp01(ratio);
}

// Reclaim depth: how far inside did the second candle close?
// A deep reclaim = strong rejection = more dangerous.
// We only have the RB range; assume 0.5 neutral when unknown.
function reclaimDepthSignal(close, rbLow, rbHigh) {
  const rbSize = rbHigh - rbLow;
  if (rbSize <= 0) return 0.5;
  // distance from near edge to close, normalized
  const fromLow = (close - rbLow) / rbSize;
  const fromHigh = (rbHigh - close) / rbSize;
  const depth = Math.min(fromLow, fromHigh);
  return clamp01(depth);
}

// Already flipped: if close is already past the RB, it's not a wall.
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
  verdict, // 'BUY' | 'SELL'
  entry,
  tp,
  close,
  atr,
  pipSize = 0.01,
  rank = "older",
  zonePosition = "inside",
  ema = { direction: "unknown", position: "unknown" },
  weights = DEFAULT_DANGER_WEIGHTS,
}) {
  if (!rb || !verdict || !entry || !tp) return null;

  const rbLow = parseFloat(rb.low);
  const rbHigh = parseFloat(rb.high);
  const rbSize = rbHigh - rbLow;
  const e = parseFloat(entry);
  const t = parseFloat(tp);
  const c = parseFloat(close);

  const fullPathPips = Math.abs(t - e) / pipSize;
  const fullPathPrice = Math.abs(t - e);

  const isBull = verdict === "BUY";
  // Distance from entry to the near edge of the RB
  const distanceToEntryPrice = isBull ? rbLow - e : e - rbHigh;
  const distanceToEntryR = fullPathPrice > 0 ? distanceToEntryPrice / fullPathPrice : 0;

  // Distance from RB near edge to TP
  const distanceToTpPrice = isBull ? t - rbLow : rbHigh - t;
  const distanceToTpR = fullPathPrice > 0 ? distanceToTpPrice / fullPathPrice : 0;

  // Signals (each 0..1)
  const s = {
    sizeVsAtr: sizeVsAtrSignal(rbSize, atr),
    freshness: freshnessSignal(rank),
    distanceToEntry: distanceToEntrySignal(distanceToEntryR, 1),
    distanceToTp: distanceToTpSignal(distanceToTpR, 1),
    zonePosition: zonePositionSignal(zonePosition),
    ema50Agreement: ema50Signal({ ...ema, verdict }),
    wickSize: wickSizeSignal(rbSize, rbSize), // no separate wick size — use rb size
    reclaimDepth: reclaimDepthSignal(c, rbLow, rbHigh),
    alreadyFlipped: alreadyFlippedSignal(c, rbLow, rbHigh, verdict),
  };

  // Weighted sum
  let raw = 0;
  let totalWeight = 0;
  for (const [key, value] of Object.entries(s)) {
    const w = weights[key] ?? 0;
    raw += value * w;
    totalWeight += Math.abs(w);
  }

  // Normalize to 0..1 → scale to 0..10
  const normalized = totalWeight > 0 ? raw / totalWeight : 0;
  const score = Math.round(Math.max(0, Math.min(10, normalized * 10)) * 10) / 10;
  const tier = dangerTierFor(score);

  // Build reason
  const reasons = [];
  if (s.sizeVsAtr > 0.6) reasons.push(`size ${Math.round(rbSize)} vs ATR ${atr}`);
  if (s.freshness >= 0.66) reasons.push(`${rank} RB`);
  if (s.distanceToEntry > 0.6) reasons.push("close to entry");
  if (s.distanceToTp > 0.6) reasons.push("well before TP");
  if (s.ema50Agreement > 0.7) reasons.push("against EMA 50");
  if (s.reclaimDepth > 0.4) reasons.push("deep reclaim");
  if (s.alreadyFlipped > 0.5) reasons.push("already flipped → weaker");

  const reason =
    reasons.length > 0 ? reasons.join(" · ") : "Standard resistance";

  return {
    rbId: rb.id,
    rbLow,
    rbHigh,
    ce: rb.ce,
    score,
    tier,
    reason,
    signals: s,
    distanceToEntryPips: Math.round(distanceToEntryR * fullPathPips * 100) / 100,
    distanceToTpPips: Math.round(distanceToTpR * fullPathPips * 100) / 100,
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
  zonePositionMap = {}, // rbId -> "inside" | "above" | "below"
  rankMap = {},         // rbId -> "current" | "previous" | "oldest" | "older"
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

  const scored = pathRbs.map((rb) =>
    scoreRbDanger({
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
    })
  ).filter(Boolean);

  // Sort highest danger first
  scored.sort((a, b) => b.score - a.score);

  const topScore = scored[0]?.score ?? 0;
  const topTier = dangerTierFor(topScore);
  const average =
    scored.length > 0
      ? Math.round((scored.reduce((a, b) => a + b.score, 0) / scored.length) * 10) / 10
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
  const { topScore, topTier } = pathDanger;

  if (topScore >= 8) {
    return {
      key: "critical",
      label: "🚨 High-risk path",
      emoji: "🚨",
      color: "bg-red-950/50 border-red-600 text-red-200",
      description: `Critical RB ahead (${
        direction === "BUY" ? "above" : "below"
      }, score ${topScore}/10). The BUY/SELL may reject there — take a safer TP or skip.`,
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
  return null; // low / clear — no banner
}