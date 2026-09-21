// Aggregate stats from a list of trades
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

  // Group by pair
  const byPair = {};
  closed.forEach((t) => {
    const p = t.pair || "Unknown";
    if (!byPair[p]) byPair[p] = { won: 0, lost: 0, be: 0, total: 0 };
    byPair[p][t.status] = (byPair[p][t.status] || 0) + 1;
    byPair[p].total += 1;
  });

  // Rule adherence: what % of closed trades had partial + BE applied
  const partialCount = closed.filter((t) => t.partial_taken).length;
  const beCount = closed.filter((t) => t.sl_moved_to_be).length;
  const ruleAdherence =
    closed.length > 0
      ? ((partialCount + beCount) / (closed.length * 2)) * 100
      : 0;

  // Emotion breakdown
  const byEmotion = {};
  closed.forEach((t) => {
    const e = t.emotion || "Unspecified";
    if (!byEmotion[e]) byEmotion[e] = { won: 0, lost: 0, be: 0, total: 0 };
    byEmotion[e][t.status] = (byEmotion[e][t.status] || 0) + 1;
    byEmotion[e].total += 1;
  });

  // Best & worst pair (by win rate, min 1 trade)
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

  return {
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
    partialCount,
    beCount,
    ruleAdherence,
    byPair,
    byEmotion,
    bestPair,
    worstPair,
  };
}