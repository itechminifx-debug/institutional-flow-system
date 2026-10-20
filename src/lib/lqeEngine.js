// ============================================================
// LQE — LIQUIDITY ENGINE (FULL CONSOLIDATED + LADDER PATCH)
// Tracks: Context -> Sweep -> Structure -> Ladder -> Delivery.
// ============================================================

import { computeCe } from "@/lib/liquidityZoneEngine";

export const LQE_SESSIONS = [
  { key: "asian", label: "Asian", hint: "Accumulation. Sets the range." },
  { key: "london", label: "London KZ", hint: "Manipulation. Judas Swing." },
  { key: "ny_am", label: "NY AM KZ", hint: "Distribution. Highest volume." },
  { key: "ny_pm", label: "NY PM", hint: "Secondary window." },
];

export const SWEEP_TYPES = [
  { key: "bsl", label: "BSL (Buy-Side)", emoji: "🔵" },
  { key: "ssl", label: "SSL (Sell-Side)", emoji: "🟠" },
];

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

// ============================================================
// STEP 1: CONTEXT & TIME
// ============================================================
export function evaluateContext({ dailyBias, session, dealingRangeHigh, dealingRangeLow, currentPrice }) {
  const gates = [];

  const hasBias = dailyBias === "bullish" || dailyBias === "bearish";
  gates.push({ key: "bias", label: "Daily bias set", pass: hasBias, detail: hasBias ? `Bias: ${dailyBias}` : "Missing daily bias." });

  const isKillZone = session === "london" || session === "ny_am";
  gates.push({ key: "time", label: "Inside a Kill Zone", pass: isKillZone, detail: isKillZone ? `Session: ${session.toUpperCase()}` : "Outside high-probability windows." });

  let inZone = null;
  const rHigh = num(dealingRangeHigh);
  const rLow = num(dealingRangeLow);
  const current = num(currentPrice);

  if (rHigh !== null && rLow !== null && current !== null && rHigh > rLow) {
    const ce = computeCe(rHigh, rLow);
    if (dailyBias === "bullish") inZone = current < ce;
    else if (dailyBias === "bearish") inZone = current > ce;
  }

  gates.push({ key: "zone", label: "Price in correct zone", pass: inZone === true, detail: inZone === null ? "Need Range and Current Price." : inZone ? `Correct ${dailyBias === "bullish" ? "discount" : "premium"} zone.` : "Wrong zone." });

  const passed = gates.filter(g => g.pass).length;
  return { ready: passed === gates.length, gates, score: Math.round((passed / gates.length) * 100) };
}

// ============================================================
// STEP 2: LIQUIDITY SWEEP
// ============================================================
export function evaluateSweep({ dailyBias, sweepType, sweepLevel, sweepConfirmed, smtDivergence }) {
  const gates = [];

  gates.push({ key: "sweep", label: "Liquidity Swept", pass: !!sweepLevel, detail: sweepLevel ? `Swept at ${sweepLevel}` : "No sweep." });

  const correctDir = (dailyBias === "bullish" && sweepType === "ssl") || (dailyBias === "bearish" && sweepType === "bsl");
  gates.push({ key: "direction", label: "Sweep is against bias", pass: correctDir, detail: correctDir ? "Swept opposing liquidity." : "Sweep conflicts with bias." });

  gates.push({ key: "confirmed", label: "Sweep Confirmed (Close back inside)", pass: !!sweepConfirmed, detail: sweepConfirmed ? "Confirmed by close." : "Waiting for close confirmation." });

  if (smtDivergence) {
    gates.push({ key: "smt", label: "SMT Divergence (Bonus)", pass: true, bonus: true, detail: "Correlated pair failed to sweep. High probability." });
  }

  const blocking = gates.filter(g => !g.bonus);
  const passed = blocking.filter(g => g.pass).length;
  return { ready: passed === blocking.length, gates, score: Math.round((passed / blocking.length) * 100) };
}

// ============================================================
// STEP 3: STRUCTURE SHIFT & DISPLACEMENT
// ============================================================
export function evaluateStructure({ mssConfirmed, chochConfirmed, displacementPresent }) {
  const gates = [];
  gates.push({ key: "mss", label: "MSS Confirmed", pass: !!mssConfirmed, detail: mssConfirmed ? "Market Structure Shift confirmed." : "No MSS." });
  gates.push({ key: "choch", label: "LTF CHoCH Confirmed", pass: !!chochConfirmed, detail: chochConfirmed ? "CHoCH confirmed." : "No CHoCH." });
  gates.push({ key: "displacement", label: "Displacement Present", pass: !!displacementPresent, detail: displacementPresent ? "Strong body, leaving FVG." : "No displacement." });

  const passed = gates.filter(g => g.pass).length;
  return { ready: passed === gates.length, gates, score: Math.round((passed / gates.length) * 100) };
}

// ============================================================
// STEP 4: PD ARRAY MATRIX (LADDER)
// ============================================================
export function evaluateLadder({ arrays = [], currentPrice, dailyBias }) {
  const gates = [];
  const current = num(currentPrice);

  // Filter to only valid arrays with price bounds
  const validArrays = arrays.filter(a => num(a.high) !== null && num(a.low) !== null);

  if (validArrays.length === 0) {
    return {
      ready: false,
      gates: [{ key: "no_arrays", label: "No FVGs logged", pass: false, detail: "Add at least one FVG to the ladder." }],
      score: 0,
      ladderInfo: null,
    };
  }

  // Sort by price (highest to lowest)
  const sorted = [...validArrays].sort((a, b) => num(b.high) - num(a.high));
  const topEdge = num(sorted[0].high);
  const bottomEdge = num(sorted[sorted.length - 1].low);

  // Find which FVG current price is inside (if any)
  const activeFVG = sorted.find(a => current !== null && current >= num(a.low) && current <= num(a.high));
  
  // Determine position in ladder
  let position = "outside";
  if (activeFVG) {
    const idx = sorted.indexOf(activeFVG);
    if (idx === 0) position = "top";
    else if (idx === sorted.length - 1) position = "bottom";
    else position = "middle";
  } else if (current !== null) {
    if (current > topEdge) position = "above";
    else if (current < bottomEdge) position = "below";
  }

  // Gate 1: Price must be inside an FVG
  gates.push({
    key: "in_fvg",
    label: "Price is inside an FVG",
    pass: !!activeFVG,
    detail: activeFVG ? `Inside ${activeFVG.direction} FVG (${activeFVG.low} - ${activeFVG.high})` : "Price not inside any FVG.",
  });

  // Gate 2: Must not be in the middle
  gates.push({
    key: "not_middle",
    label: "Not in the middle of the ladder",
    pass: position !== "middle",
    detail: position === "middle" ? "⚠️ Middle of ladder — NO TRADE." : position === "top" ? "At top edge." : position === "bottom" ? "At bottom edge." : "Outside ladder.",
  });

  // Gate 3: Direction alignment
  const directionAligned = activeFVG && (
    (dailyBias === "bullish" && activeFVG.direction === "bullish") ||
    (dailyBias === "bearish" && activeFVG.direction === "bearish")
  );
  gates.push({
    key: "direction",
    label: "FVG direction aligns with bias",
    pass: !!directionAligned,
    detail: directionAligned ? `FVG is ${activeFVG.direction} — aligned.` : "FVG direction conflicts with daily bias.",
  });

  const passed = gates.filter(g => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    ladderInfo: { topEdge, bottomEdge, position, activeFVG, count: sorted.length, sorted },
  };
}

// ============================================================
// STEP 5 & 6: TRADE MATH
// ============================================================
export function computeLqeTrade({ dailyBias, activeFVG, sweepLevel, targetPrice, accountSize = 0, riskPercent = 1 }) {
  if (!activeFVG) return null;
  const zHigh = num(activeFVG.high);
  const zLow = num(activeFVG.low);
  const dol = num(targetPrice);
  const sweep = num(sweepLevel);

  if (!zHigh || !zLow || !dol) return null;

  const entry = computeCe(zHigh, zLow);
  if (!entry) return null;

  let sl = sweep !== null ? sweep : (dailyBias === "bullish" ? zLow : zHigh);

  const slValid = (dailyBias === "bullish" && sl < entry) || (dailyBias === "bearish" && sl > entry);
  if (!slValid) return { invalid: true, invalidReason: "Stop is on wrong side of entry." };

  const risk = Math.abs(entry - sl);
  const reward = Math.abs(dol - entry);
  const rr = risk > 0 ? reward / risk : 0;
  const oteEntry = dailyBias === "bullish" ? sl + ((entry - sl) * 0.705) : sl - ((entry - sl) * 0.705);

  const trade = { direction: dailyBias === "bullish" ? "BUY" : "SELL", entry, oteEntry, sl, tp: dol, rr, invalid: false };

  if (accountSize > 0 && risk > 0) {
    const riskAmount = (accountSize * (riskPercent || 1)) / 100;
    trade.riskAmount = Math.round(riskAmount * 100) / 100;
  }

  return trade;
}

// ============================================================
// FULL EVALUATION
// ============================================================
export function evaluateLqe({
  dailyBias, session, dealingRangeHigh, dealingRangeLow, currentPrice,
  sweepType, sweepLevel, sweepConfirmed, smtDivergence,
  mssConfirmed, chochConfirmed, displacementPresent,
  arrays = [],
  targetPrice, targetLiquidityType,
  accountSize = 0, riskPercent = 1
}) {
  const context = evaluateContext({ dailyBias, session, dealingRangeHigh, dealingRangeLow, currentPrice });
  const sweep = evaluateSweep({ dailyBias, sweepType, sweepLevel, sweepConfirmed, smtDivergence });
  const structure = evaluateStructure({ mssConfirmed, chochConfirmed, displacementPresent });
  const ladder = evaluateLadder({ arrays, currentPrice, dailyBias });

  const isReady = context.ready && sweep.ready && structure.ready && ladder.ready;
  let trade = null;

  if (isReady && ladder.ladderInfo?.activeFVG) {
    trade = computeLqeTrade({ 
      dailyBias, 
      activeFVG: ladder.ladderInfo.activeFVG, 
      sweepLevel, 
      targetPrice, 
      accountSize, 
      riskPercent 
    });
  }

  const reasons = [];
  if (!context.ready) context.gates.filter(g => !g.pass).forEach(g => reasons.push(`Context: ${g.label}`));
  if (!sweep.ready) sweep.gates.filter(g => !g.pass && !g.bonus).forEach(g => reasons.push(`Sweep: ${g.label}`));
  if (!structure.ready) structure.gates.filter(g => !g.pass).forEach(g => reasons.push(`Structure: ${g.label}`));
  if (!ladder.ready) ladder.gates.filter(g => !g.pass).forEach(g => reasons.push(`Ladder: ${g.label}`));

  return {
    context, sweep, structure, ladder, trade,
    preEntryReady: isReady && trade && !trade.invalid,
    reasons,
  };
}