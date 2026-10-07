// ============================================================
// RB AUTO-SCANNER
// ============================================================
// Takes a list of candles (OHLC) and returns every Rejection
// Block detected across all adjacent swing pairs, ranked and
// with full verdicts.
//
// RULE:
//   For every adjacent pair (i, i+1):
//     wickTip(i) < wickTip(i+1) → Resistance RB (rising)
//     wickTip(i) > wickTip(i+1) → Support RB   (falling)
//
// The wick tip for each candle is auto-detected as the longer
// wick (upper or lower) relative to the body.
// ============================================================

import {
  computeCe,
  judgeRejectionBlock,
  detectAllRbsFlipped,
  checkConditions,
  conditionSummary,
  computeRejectionBlockTrade,
  computePips,
  detectReversal,
  computeNextOpportunityTrade,
  PIP_SIZE_DEFAULT,
} from "@/lib/rejectionBlockEngine";

// ============================================================
// WICK DETECTION
// ============================================================
export function detectWick({ open, high, low, close }) {
  const o = parseFloat(open);
  const h = parseFloat(high);
  const l = parseFloat(low);
  const c = parseFloat(close);
  if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) return null;

  const upperWick = h - Math.max(o, c);
  const lowerWick = Math.min(o, c) - l;
  const bodySize = Math.abs(c - o);

  const isUpperLonger = upperWick > lowerWick;

  return {
    type: isUpperLonger ? "upper" : "lower",
    tip: isUpperLonger ? h : l,
    upperWick: Math.round(upperWick * 100) / 100,
    lowerWick: Math.round(lowerWick * 100) / 100,
    bodySize: Math.round(bodySize * 100) / 100,
    wickSize: Math.round((isUpperLonger ? upperWick : lowerWick) * 100) / 100,
  };
}

// ============================================================
// CANDLE PARSER
// ============================================================
// Accepts CSV text (one candle per line)
// Format: time,open,high,low,close  (time optional)
// Or: open,high,low,close
// ============================================================
export function parseCandlesCSV(text) {
  if (!text || typeof text !== "string") return [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  const candles = [];
  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 4) continue;

    // Detect format: if 5+ fields, assume time,open,high,low,close
    // If 4 fields, assume open,high,low,close
    let open, high, low, close, time;
    if (parts.length >= 5) {
      time = parts[0];
      open = parseFloat(parts[1]);
      high = parseFloat(parts[2]);
      low = parseFloat(parts[3]);
      close = parseFloat(parts[4]);
    } else {
      open = parseFloat(parts[0]);
      high = parseFloat(parts[1]);
      low = parseFloat(parts[2]);
      close = parseFloat(parts[3]);
    }

    if (
      isNaN(open) ||
      isNaN(high) ||
      isNaN(low) ||
      isNaN(close) ||
      high < low
    ) {
      continue;
    }

    candles.push({ time: time || null, open, high, low, close });
  }

  return candles;
}

// ============================================================
// MAIN SCANNER
// ============================================================
export function scanCandles({
  candles,
  currentClose,
  pipSize = PIP_SIZE_DEFAULT,
  accountSize = 0,
  riskPercent = 1,
  atr = 0,
  requireWickBodyRatio = 0.5, // wick must be >= 0.5× body to be significant
}) {
  if (!Array.isArray(candles) || candles.length < 2) {
    return {
      rbs: [],
      best: null,
      allFlipped: null,
      counts: { total: 0, resistance: 0, support: 0 },
      reason: "Need at least 2 candles.",
    };
  }

  // Compute wick info per candle
  const wickInfos = candles.map((c) => detectWick(c));

  // Sliding window: every adjacent pair
  const candidateRBs = [];

  for (let i = 0; i < wickInfos.length - 1; i++) {
    const w1 = wickInfos[i];
    const w2 = wickInfos[i + 1];
    if (!w1 || !w2) continue;

    // Skip if wick not significant enough on either candle
    const minSize = requireWickBodyRatio;
    if (w1.bodySize > 0 && w1.wickSize / w1.bodySize < minSize) continue;
    if (w2.bodySize > 0 && w2.wickSize / w2.bodySize < minSize) continue;

    // Must be same wick type
    if (w1.type !== w2.type) continue;

    // Skip equal tips
    if (w1.tip === w2.tip) continue;

    // Determine swing direction
    const isUp = w1.tip < w2.tip;
    const autoType = isUp ? "resistance" : "support";

    const rbLow = Math.round(Math.min(w1.tip, w2.tip) * 100) / 100;
    const rbHigh = Math.round(Math.max(w1.tip, w2.tip) * 100) / 100;
    const ce = Math.round(((rbLow + rbHigh) / 2) * 100) / 100;
    const swingSize = Math.round(Math.abs(w2.tip - w1.tip) * 100) / 100;

    candidateRBs.push({
      id: `rb-${i}-${i + 1}`,
      candle1Index: i,
      candle2Index: i + 1,
      candle1Time: candles[i].time,
      candle2Time: candles[i + 1].time,
      wickType: w1.type,
      swingDirection: isUp ? "up" : "down",
      autoType,
      rbLow,
      rbHigh,
      ce,
      swingSize,
      addedAt: new Date(Date.now() - (wickInfos.length - i) * 1000).toISOString(),
    });
  }

  // Sort by freshness (newest first = highest index)
  candidateRBs.sort((a, b) => b.candle2Index - a.candle2Index);
  candidateRBs.forEach((rb, i) => {
    rb.rank = i === 0 ? "current" : i === 1 ? "previous" : i === 2 ? "oldest" : "older";
  });

  // Determine close to use
  const close =
    currentClose !== undefined && currentClose !== null && currentClose !== ""
      ? parseFloat(currentClose)
      : candles[candles.length - 1].close;

  // Analyse each RB
  const rbs = candidateRBs.map((rb) => {
    const verdict = judgeRejectionBlock({
      rbHigh: rb.rbHigh,
      rbLow: rb.rbLow,
      closePrice: close,
    });

    const trade =
      verdict && (verdict.verdict === "BUY" || verdict.verdict === "SELL")
        ? computeRejectionBlockTrade({
            rbHigh: rb.rbHigh,
            rbLow: rb.rbLow,
            verdict: verdict.verdict,
            accountSize,
            riskPercent,
            atr,
            pipSize,
          })
        : null;

    return { ...rb, verdict, trade };
  });

  // Count
  const counts = {
    total: rbs.length,
    resistance: rbs.filter((r) => r.autoType === "resistance").length,
    support: rbs.filter((r) => r.autoType === "support").length,
  };

  // All-flipped check
  const flipped = detectAllRbsFlipped({
    rankedRbs: rbs.map((r) => ({ id: r.id, high: r.rbHigh, low: r.rbLow })),
    closePrice: close,
  });

  // Choose the best RB
  // Priority: strong verdicts first, then nearest to close
  const scored = rbs.map((r) => {
    let score = 0;
    if (r.verdict?.strength === "strong") score += 100;
    else if (r.verdict?.strength === "normal") score += 50;
    if (r.rank === "current") score += 20;
    else if (r.rank === "previous") score += 10;
    // Proximity: closer to close = higher score
    const dist = Math.abs(close - r.ce);
    score += Math.max(0, 30 - dist / 10);
    return { ...r, score: Math.round(score * 100) / 100 };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0] || null;

  return {
    close,
    rbs: scored,
    best,
    allFlipped: flipped,
    counts,
    reason: null,
  };
}

// ============================================================
// SCAN ONE RB IN DETAIL
// ============================================================
export function scanOneRB({
  rb,
  allRbs,
  close,
  priorClose,
  pipSize = PIP_SIZE_DEFAULT,
  accountSize = 0,
  riskPercent = 1,
  atr = 0,
}) {
  if (!rb || !close) return null;

  const negotiation = judgeRejectionBlock({
    rbHigh: rb.rbHigh,
    rbLow: rb.rbLow,
    closePrice: close,
  });

  if (!negotiation) return null;

  const rankedRbs = allRbs.map((r, i) => ({
    id: r.id,
    high: r.rbHigh,
    low: r.rbLow,
    addedAt: new Date(Date.now() - i * 1000).toISOString(),
  }));

  const conditions = checkConditions({
    activeRb: { id: rb.id, high: rb.rbHigh, low: rb.rbLow },
    allRbs: rankedRbs,
    closePrice: close,
    verdict: negotiation.verdict,
  });

  const condSummary = conditionSummary(conditions, negotiation.verdict);

  const trade =
    negotiation.verdict === "BUY" || negotiation.verdict === "SELL"
      ? computeRejectionBlockTrade({
          rbHigh: rb.rbHigh,
          rbLow: rb.rbLow,
          verdict: negotiation.verdict,
          accountSize,
          riskPercent,
          atr,
          pipSize,
        })
      : null;

  const reversal = detectReversal({
    verdict: negotiation.verdict,
    conditionRbs:
      negotiation.verdict === "SELL" ? conditions.below : conditions.above,
    closePrice: close,
    priorClose,
  });

  const nextTrade = reversal
    ? computeNextOpportunityTrade({
        newRb: reversal.newRb,
        newDirection: reversal.newDirection,
        sweepLevel: reversal.sweepLevel,
        accountSize,
        riskPercent,
        atr,
        pipSize,
      })
    : null;

  return {
    negotiation,
    conditions,
    condSummary,
    trade,
    reversal,
    nextTrade,
  };
}