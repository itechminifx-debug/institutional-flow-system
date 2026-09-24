// ============================================================
// STATS ENGINE — Institutional Flow System
// Aggregates all trade performance metrics including
// Rejection Block Quality and Trap correlation
// ============================================================

export function computeStats(trades) {
  const safe = trades || [];
  const closed = safe.filter((t) => t.status !== "open");
  const open = safe.filter((t) => t.status === "open");

  const won = closed.filter((t) => t.status === "won").length;
  const lost = closed.filter((t) => t.status === "lost").length;
  const be = closed.filter((t) => t.status === "be").length;

  const winRate = closed.length > 0 ? (won / closed.length) * 100 : 0;

  const winners = closed.filter((t) => t.status === "won");
  const avgRR =
    winners.length > 0
      ? winners.reduce((sum, t) => sum + (t.rr_ratio || 0), 0) /
        winners.length
      : 0;

  const totalPips = closed.reduce(
    (sum, t) => sum + (parseFloat(t.result_pips) || 0),
    0
  );
  const totalPercent = closed.reduce(
    (sum, t) => sum + (parseFloat(t.result_percent) || 0),
    0
  );

  // ---------------- By Pair ----------------
  const byPair = {};
  closed.forEach((t) => {
    const p = t.pair || "Unknown";
    if (!byPair[p]) byPair[p] = { won: 0, lost: 0, be: 0, total: 0 };
    byPair[p][t.status] = (byPair[p][t.status] || 0) + 1;
    byPair[p].total += 1;
  });

  // ---------------- Rule Adherence ----------------
  const partialCount = closed.filter((t) => t.partial_taken).length;
  const beCount = closed.filter((t) => t.sl_moved_to_be).length;
  const ruleAdherence =
    closed.length > 0
      ? ((partialCount + beCount) / (closed.length * 2)) * 100
      : 0;

  // ---------------- By Emotion ----------------
  const byEmotion = {};
  closed.forEach((t) => {
    const e = t.emotion || "Unspecified";
    if (!byEmotion[e]) byEmotion[e] = { won: 0, lost: 0, be: 0, total: 0 };
    byEmotion[e][t.status] = (byEmotion[e][t.status] || 0) + 1;
    byEmotion[e].total += 1;
  });

  // ---------------- Best & Worst Pair ----------------
  let bestPair = null;
  let worstPair = null;
  let bestRate = -1;
  let worstRate = 101;
  Object.entries(byPair).forEach(([pair, stats]) => {
    if (stats.total < 1) return;
    const rate = (stats.won / stats.total) * 100;
    if (rate > bestRate) {
      bestRate = rate;
      bestPair = { pair, rate: Math.round(rate), ...stats };
    }
    if (rate < worstRate) {
      worstRate = rate;
      worstPair = { pair, rate: Math.round(rate), ...stats };
    }
  });

  // ---------------- Rejection Block Quality Correlation ----------------
  const scoredTrades = closed.filter(
    (t) => (t.rb_quality_score || 0) > 0
  );

  const highQuality = scoredTrades.filter(
    (t) => (t.rb_quality_score || 0) >= 9
  );
  const mediumQuality = scoredTrades.filter(
    (t) => (t.rb_quality_score || 0) >= 7 && (t.rb_quality_score || 0) < 9
  );
  const lowQuality = scoredTrades.filter(
    (t) => (t.rb_quality_score || 0) < 7
  );

  const highQualityWinRate =
    highQuality.length > 0
      ? (highQuality.filter((t) => t.status === "won").length /
          highQuality.length) *
        100
      : 0;
  const mediumQualityWinRate =
    mediumQuality.length > 0
      ? (mediumQuality.filter((t) => t.status === "won").length /
          mediumQuality.length) *
        100
      : 0;
  const lowQualityWinRate =
    lowQuality.length > 0
      ? (lowQuality.filter((t) => t.status === "won").length /
          lowQuality.length) *
        100
      : 0;

  const avgQualityScore =
    scoredTrades.length > 0
      ? scoredTrades.reduce(
          (sum, t) => sum + (t.rb_quality_score || 0),
          0
        ) / scoredTrades.length
      : 0;

  // ---------------- Trap Correlation ----------------
  const trapTrades = closed.filter((t) => t.trap_type);
  const nonTrapTrades = closed.filter((t) => !t.trap_type);

  const trapWinRate =
    trapTrades.length > 0
      ? (trapTrades.filter((t) => t.status === "won").length /
          trapTrades.length) *
        100
      : 0;

  const nonTrapWinRate =
    nonTrapTrades.length > 0
      ? (nonTrapTrades.filter((t) => t.status === "won").length /
          nonTrapTrades.length) *
        100
      : 0;

  const byTrap = {};
  trapTrades.forEach((t) => {
    const key = t.trap_type;
    if (!byTrap[key]) byTrap[key] = { won: 0, lost: 0, be: 0, total: 0 };
    byTrap[key][t.status] = (byTrap[key][t.status] || 0) + 1;
    byTrap[key].total += 1;
  });

  return {
    // Overall
    totalTrades: safe.length,
    openCount: open.length,
    closedCount: closed.length,
    won,
    lost,
    be,
    winRate,
    avgRR,
    totalPips,
    totalPercent,

    // Rule adherence
    partialCount,
    beCount,
    ruleAdherence,

    // By category
    byPair,
    byEmotion,
    bestPair,
    worstPair,

    // Rejection Block Quality
    scoredTradesCount: scoredTrades.length,
    highQualityCount: highQuality.length,
    mediumQualityCount: mediumQuality.length,
    lowQualityCount: lowQuality.length,
    highQualityWinRate,
    mediumQualityWinRate,
    lowQualityWinRate,
    avgQualityScore,

    // Trap correlation
    trapTradesCount: trapTrades.length,
    nonTrapTradesCount: nonTrapTrades.length,
    trapWinRate,
    nonTrapWinRate,
    byTrap,
  };
}