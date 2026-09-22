// Compute confluence score (0-100) based on alignment
export function computeConfluence(data) {
  const {
    bias,
    d1_direction,
    d1_rejection_block,
    d1_zone_low,
    d1_zone_high,
    d1_liquidity,
    h4_direction,
    h4_rejection_block,
    h4_zone_low,
    h4_zone_high,
    h4_liquidity,
    h1_direction,
    h1_rejection_block,
    h1_zone_low,
    h1_zone_high,
    h1_liquidity,
  } = data;

  const expectedDir = bias === "bullish" ? "uptrend" : "downtrend";

  let score = 0;
  const breakdown = [];

  // Direction alignment (45 points)
  if (d1_direction === expectedDir) {
    score += 15;
    breakdown.push("✅ D1 direction aligned");
  } else {
    breakdown.push("❌ D1 direction misaligned");
  }

  if (h4_direction === expectedDir) {
    score += 15;
    breakdown.push("✅ H4 direction aligned");
  } else {
    breakdown.push("❌ H4 direction misaligned");
  }

  if (h1_direction === expectedDir) {
    score += 15;
    breakdown.push("✅ H1 direction aligned");
  } else {
    breakdown.push("❌ H1 direction misaligned");
  }

  // Rejection blocks (30 points)
  if (d1_rejection_block) {
    score += 10;
    breakdown.push("✅ D1 rejection block present");
  }
  if (h4_rejection_block) {
    score += 10;
    breakdown.push("✅ H4 rejection block present");
  }
  if (h1_rejection_block) {
    score += 10;
    breakdown.push("✅ H1 rejection block present");
  }

  // Liquidity (15 points)
  if (d1_liquidity) score += 5;
  if (h4_liquidity) score += 5;
  if (h1_liquidity) score += 5;

  // Zone overlap (10 points)
  const d1Zone = { low: d1_zone_low, high: d1_zone_high };
  const h4Zone = { low: h4_zone_low, high: h4_zone_high };
  const h1Zone = { low: h1_zone_low, high: h1_zone_high };

  const zonesValid = [d1Zone, h4Zone, h1Zone].every(
    (z) => z.low != null && z.high != null
  );

  let overlap = null;
  if (zonesValid) {
    const overlapLow = Math.max(d1Zone.low, h4Zone.low, h1Zone.low);
    const overlapHigh = Math.min(d1Zone.high, h4Zone.high, h1Zone.high);

    if (overlapLow <= overlapHigh) {
      score += 10;
      overlap = { low: overlapLow, high: overlapHigh };
      breakdown.push("✅ 3-timeframe zone overlap");
    } else {
      breakdown.push("❌ Zones do not overlap");
    }
  }

  // Verdict
  let verdict;
  let emoji;
  if (score >= 85) {
    verdict = "High Probability";
    emoji = "🟢🟢";
  } else if (score >= 65) {
    verdict = "Medium-High";
    emoji = "🟢";
  } else if (score >= 45) {
    verdict = "Medium";
    emoji = "🟡";
  } else if (score >= 25) {
    verdict = "Low";
    emoji = "🟠";
  } else {
    verdict = "Skip";
    emoji = "🔴";
  }

  // Suggested entry = overlap zone, or average of H4
  const suggestedEntryLow = overlap ? overlap.low : h4Zone.low;
  const suggestedEntryHigh = overlap ? overlap.high : h4Zone.high;

  // Suggested SL = beyond D1 rejection block
  const suggestedSl = bias === "bullish" ? d1Zone.low : d1Zone.high;

  // Suggested TP = 2R
  const entryAvg = (suggestedEntryLow + suggestedEntryHigh) / 2;
  const risk = Math.abs(entryAvg - suggestedSl);
  const suggestedTp = bias === "bullish" ? entryAvg + risk * 2 : entryAvg - risk * 2;

  const rrRatio = risk > 0 ? Math.round((Math.abs(suggestedTp - entryAvg) / risk) * 100) / 100 : 0;

  return {
    score,
    verdict,
    emoji,
    breakdown,
    overlap,
    suggestedEntryLow,
    suggestedEntryHigh,
    suggestedSl,
    suggestedTp,
    rrRatio,
  };
}

export function verdictColor(verdict) {
  const map = {
    "High Probability": "text-green-400 border-green-700 bg-green-950/40",
    "Medium-High": "text-green-300 border-green-800 bg-green-950/30",
    Medium: "text-yellow-400 border-yellow-700 bg-yellow-950/30",
    Low: "text-orange-400 border-orange-700 bg-orange-950/30",
    Skip: "text-red-400 border-red-700 bg-red-950/30",
  };
  return map[verdict] || "text-gray-400 border-gray-700 bg-gray-900";
}