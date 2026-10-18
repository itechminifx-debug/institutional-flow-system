// ============================================================
// LQE — LIQUIDITY ENGINE
// Tracks the full ICT sequence: Context -> Sweep -> Structure -> Array -> Delivery.
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

export const PD_ARRAY_TYPES = [
  { key: "fvg", label: "Fair Value Gap", emoji: "📊" },
  { key: "ob", label: "Order Block", emoji: "🧱" },
  { key: "rejection_block", label: "Rejection Block", emoji: "📍" },
  { key: "breaker", label: "Breaker Block", emoji: "🔨" },
  { key: "unicorn", label: "Unicorn (OB+FVG)", emoji: "🦄" },
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

  // Bias
  const hasBias = dailyBias === "bullish" || dailyBias === "bearish";
  gates.push({
    key: "bias",
    label: "Daily bias set",
    pass: hasBias,
    detail: hasBias ? `Bias: ${dailyBias}` : "Missing daily bias.",
  });

  // Time
  const isKillZone = session === "london" || session === "ny_am";
  gates.push({
    key: "time",
    label: "Inside a Kill Zone",
    pass: isKillZone,
    detail: isKillZone ? `Session: ${session.toUpperCase()}` : "Outside high-probability windows.",
  });

  // Premium/Discount
  let inZone = null;
  const rHigh = num(dealingRangeHigh);
  const rLow = num(dealingRangeLow);
  const current = num(currentPrice);

  if (rHigh !== null && rLow !== null && current !== null && rHigh > rLow) {
    const ce = computeCe(rHigh, rLow);
    if (dailyBias === "bullish") inZone = current < ce;
    else if (dailyBias === "bearish") inZone = current > ce;
  }

  gates.push({
    key: "zone",
    label: "Price in correct zone",
    pass: inZone === true,
    detail: inZone === null ? "Need Range and Current Price." : inZone ? `Correct ${dailyBias === "bullish" ? "discount" : "premium"} zone.` : "Wrong zone.",
  });

  const passed = gates.filter(g => g.pass).length;
  return { ready: passed === gates.length, gates, score: Math.round((passed / gates.length) * 100) };
}

// ============================================================
// STEP 2: LIQUIDITY SWEEP
// ============================================================
export function evaluateSweep({ dailyBias, sweepType, sweepLevel, sweepConfirmed, smtDivergence }) {
  const gates = [];

  gates.push({
    key: "sweep",
    label: "Liquidity Swept",
    pass: !!sweepLevel,
    detail: sweepLevel ? `Swept at ${sweepLevel}` : "No sweep.",
  });

  // Direction Check
  const correctDir = (dailyBias === "bullish" && sweepType === "ssl") || (dailyBias === "bearish" && sweepType === "bsl");
  gates.push({
    key: "direction",
    label: "Sweep is against bias",
    pass: correctDir,
    detail: correctDir ? "Swept opposing liquidity." : "Sweep conflicts with bias.",
  });

  gates.push({
    key: "confirmed",
    label: "Sweep Confirmed (Close back inside)",
    pass: !!sweepConfirmed,
    detail: sweepConfirmed ? "Confirmed by close." : "Waiting for close confirmation.",
  });

  // SMT Divergence (Bonus)
  if (smtDivergence) {
    gates.push({
      key: "smt",
      label: "SMT Divergence (Bonus)",
      pass: true,
      bonus: true,
      detail: "Correlated pair failed to sweep. High probability.",
    });
  }

  const blocking = gates.filter(g => !g.bonus);
  const passed = blocking.filter(g => g.pass).length;
  return { ready: passed === blocking.length, gates, score: Math.round((passed / blocking.length) * 100) };
}

// ============================================================
// STEP 3: STRUCTURE SHIFT & DISPLACEMENT
// ============================================================
export function evaluateStructure({ mssConfirmed, chochConfirmed, displacementPresent, displacementAtrMultiple }) {
  const gates = [];

  gates.push({
    key: "mss",
    label: "MSS Confirmed",
    pass: !!mssConfirmed,
    detail: mssConfirmed ? "Market Structure Shift confirmed." : "No MSS.",
  });

  gates.push({
    key: "choch",
    label: "LTF CHoCH Confirmed",
    pass: !!chochConfirmed,
    detail: chochConfirmed ? "CHoCH confirmed." : "No CHoCH.",
  });

  gates.push({
    key: "displacement",
    label: "Displacement Present",
    pass: !!displacementPresent,
    detail: displacementPresent ? "Strong body, leaving FVG." : "No displacement.",
  });

  const passed = gates.filter(g => g.pass).length;
  return { ready: passed === gates.length, gates, score: Math.round((passed / gates.length) * 100) };
}

// ============================================================
// STEP 4 & 5: PD ARRAY & ENTRY MATH
// ============================================================
export function computeLqeTrade({ dailyBias, pdArrayHigh, pdArrayLow, sweepLevel, targetPrice, accountSize = 0, riskPercent = 1 }) {
  const zHigh = num(pdArrayHigh);
  const zLow = num(pdArrayLow);
  const dol = num(targetPrice);
  const sweep = num(sweepLevel);

  if (!zHigh || !zLow || !dol) return null;

  const entry = computeCe(zHigh, zLow);
  if (!entry) return null;

  // Stop goes beyond the sweep extreme
  let sl;
  if (dailyBias === "bullish") sl = sweep !== null ? sweep : zLow;
  else sl = sweep !== null ? sweep : zHigh;

  const slValid = (dailyBias === "bullish" && sl < entry) || (dailyBias === "bearish" && sl > entry);
  if (!slValid) return { invalid: true, invalidReason: "Stop is on wrong side of entry." };

  const risk = Math.abs(entry - sl);
  const reward = Math.abs(dol - entry);
  const rr = risk > 0 ? reward / risk : 0;

  // OTE (Optimal Trade Entry) - 70.5% retracement of the displacement leg
  // For a long: sl + ((entry - sl) * 0.705)
  const oteEntry = dailyBias === "bullish" ? sl + ((entry - sl) * 0.705) : sl - ((entry - sl) * 0.705);

  const trade = {
    direction: dailyBias === "bullish" ? "BUY" : "SELL",
    entry,
    oteEntry,
    sl,
    tp: dol,
    rr,
    invalid: false,
  };

  if (accountSize > 0 && risk > 0) {
    const riskAmount = (accountSize * (riskPercent || 1)) / 100;
    trade.riskAmount = Math.round(riskAmount * 100) / 100;
  }

  return trade;
}

// ============================================================
// FULL EVALUATION (The Sequence Validator)
// ============================================================
export function evaluateLqe({
  dailyBias, session, dealingRangeHigh, dealingRangeLow, currentPrice,
  sweepType, sweepLevel, sweepConfirmed, smtDivergence,
  mssConfirmed, chochConfirmed, displacementPresent, displacementAtrMultiple,
  pdArrayType, pdArrayHigh, pdArrayLow, isRejectionBlock,
  targetPrice, targetLiquidityType,
  accountSize = 0, riskPercent = 1
}) {
  const context = evaluateContext({ dailyBias, session, dealingRangeHigh, dealingRangeLow, currentPrice });
  const sweep = evaluateSweep({ dailyBias, sweepType, sweepLevel, sweepConfirmed, smtDivergence });
  const structure = evaluateStructure({ mssConfirmed, chochConfirmed, displacementPresent, displacementAtrMultiple });
  
  const isReady = context.ready && sweep.ready && structure.ready;
  let trade = null;

  if (isReady) {
    trade = computeLqeTrade({ dailyBias, pdArrayHigh, pdArrayLow, sweepLevel, targetPrice, accountSize, riskPercent });
  }

  const reasons = [];
  if (!context.ready) context.gates.filter(g => !g.pass).forEach(g => reasons.push(`Context: ${g.label}`));
  if (!sweep.ready) sweep.gates.filter(g => !g.pass && !g.bonus).forEach(g => reasons.push(`Sweep: ${g.label}`));
  if (!structure.ready) structure.gates.filter(g => !g.pass).forEach(g => reasons.push(`Structure: ${g.label}`));

  return {
    context, sweep, structure, trade,
    preEntryReady: isReady && trade && !trade.invalid,
    reasons,
  };
}