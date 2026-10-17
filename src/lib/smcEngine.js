// ============================================================
// SMC / ICT ENGINE
// ============================================================
// Evaluates the 6-Step Complete Entry Model from the ICT Course.
// 1. Context (Bias & Premium/Discount)
// 2. Time (Kill Zones)
// 3. Liquidity (Sweep)
// 4. Confirmation (CHoCH on displacement)
// 5. Entry (PD Array)
// 6. Target (DOL)
// ============================================================

import { computeCe } from "@/lib/liquidityZoneEngine"; // Reusing your existing helper

export const SMC_SESSIONS = [
  { key: "asian", label: "Asian (Accumulation)", hint: "Sets the range. Avoid trading the chop." },
  { key: "london", label: "London KZ (2-5 AM EST)", hint: "Judas Swing / Manipulation. Highest probability." },
  { key: "ny_am", label: "NY AM KZ (7-10 AM EST)", hint: "Distribution. Silver Bullet window at 10 AM." },
  { key: "ny_pm", label: "NY PM", hint: "Secondary window. Often continuation or late reversal." },
];

export const SWEEP_TYPES = [
  { key: "bsl", label: "BSL (Buy-Side Liquidity)", emoji: "🔵", detail: "Swept a high. Expect a move DOWN." },
  { key: "ssl", label: "SSL (Sell-Side Liquidity)", emoji: "🟠", detail: "Swept a low. Expect a move UP." },
];

export const PD_ARRAY_TYPES = [
  { key: "fvg", label: "Fair Value Gap (FVG)", emoji: "📊" },
  { key: "ob", label: "Order Block (OB)", emoji: "🧱" },
  { key: "unicorn", label: "Unicorn (OB + FVG)", emoji: "🦄", detail: "Highest priority array." },
  { key: "breaker", label: "Breaker Block", emoji: "🔨" },
];

export const DOL_TYPES = [
  { key: "bsl", label: "BSL (Untapped Highs)", emoji: "🎯" },
  { key: "ssl", label: "SSL (Untapped Lows)", emoji: "🎯" },
  { key: "eqh_eql", label: "EQH/EQL (Magnet)", emoji: "🧲" },
  { key: "pdh_pdl", label: "PDH/PDL (Prior Day)", emoji: "📅" },
];

// ============================================================
// HELPERS
// ============================================================
function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

// ============================================================
// EVALUATION FUNCTIONS
// ============================================================

// Step 1 & 2: Context & Time
export function evaluateContext({ dailyBias, session, dealingRangeHigh, dealingRangeLow, currentPrice }) {
  const gates = [];

  // 1. Bias
  const hasBias = dailyBias === "bullish" || dailyBias === "bearish";
  gates.push({
    key: "bias",
    label: "Daily Bias is set",
    pass: hasBias,
    detail: hasBias ? `Bias: ${dailyBias}` : "No daily bias. Context missing.",
  });

  // 2. Time
  const isKillZone = session === "london" || session === "ny_am";
  gates.push({
    key: "time",
    label: "Inside a Kill Zone",
    pass: isKillZone,
    detail: isKillZone ? `Session: ${session.toUpperCase()}` : "Outside high-probability windows. Reduce risk or skip.",
  });

  // 3. Premium/Discount
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
    label: "Price in correct zone (Discount for Bull, Premium for Bear)",
    pass: inZone === true,
    detail: inZone === null 
      ? "Need Dealing Range and Current Price to evaluate." 
      : inZone 
        ? `Price is in the correct ${dailyBias === "bullish" ? "discount" : "premium"} zone.` 
        : `⚠️ Price is in the wrong zone. Do not chase.`,
  });

  const blocking = gates.filter(g => !g.bonus);
  const passed = blocking.filter(g => g.pass).length;
  const ready = passed === blocking.length;

  return { ready, gates, score: Math.round((passed / blocking.length) * 100) };
}

// Step 3: Liquidity
export function evaluateLiquidity({ dailyBias, sweepHappened, sweepType, sweepLevel }) {
  const gates = [];

  gates.push({
    key: "sweep",
    label: "Liquidity swept",
    pass: !!sweepHappened,
    detail: sweepHappened ? `Swept at ${sweepLevel}` : "No liquidity sweep yet. Wait.",
  });

  // Direction check
  let correctDirection = false;
  if (sweepType && dailyBias) {
    if (dailyBias === "bullish" && sweepType === "ssl") correctDirection = true;
    if (dailyBias === "bearish" && sweepType === "bsl") correctDirection = true;
  }

  gates.push({
    key: "direction",
    label: "Sweep is against the intended trade direction",
    pass: correctDirection,
    detail: correctDirection 
      ? "Swept opposing liquidity. Good." 
      : `⚠️ Sweep type (${sweepType}) conflicts with bias (${dailyBias}).`,
  });

  const passed = gates.filter(g => g.pass).length;
  return { ready: passed === gates.length, gates, score: Math.round((passed / gates.length) * 100) };
}

// Step 4 & 5: Confirmation & Entry
export function evaluateEntry({ chochConfirmed, displacementPresent, poiHigh, poiLow, dealingRangeHigh, dealingRangeLow, currentPrice }) {
  const gates = [];

  gates.push({
    key: "choch",
    label: "CHoCH Confirmed",
    pass: !!chochConfirmed,
    detail: chochConfirmed ? "Structure shift confirmed." : "Waiting for CHoCH.",
  });

  gates.push({
    key: "displacement",
    label: "Displacement present",
    pass: !!displacementPresent,
    detail: displacementPresent ? "Strong move leaving an FVG." : "⚠️ No displacement. Move may be weak.",
  });

  const hasZone = num(poiHigh) !== null && num(poiLow) !== null;
  gates.push({
    key: "poi",
    label: "PD Array marked",
    pass: hasZone,
    detail: hasZone ? `Zone: ${poiLow} - ${poiHigh}` : "No PD Array marked.",
  });

  const passed = gates.filter(g => g.pass).length;
  return { ready: passed === gates.length, gates, score: Math.round((passed / gates.length) * 100) };
}

// Step 6: Trade Math
export function computeSmcTrade({ dailyBias, poiHigh, poiLow, sweepLevel, dolPrice, accountSize = 0, riskPercent = 1 }) {
  const zHigh = num(poiHigh);
  const zLow = num(poiLow);
  const dol = num(dolPrice);
  const sweep = num(sweepLevel);

  if (!zHigh || !zLow || !dol) return null;

  const entry = computeCe(zHigh, zLow);
  if (!entry) return null;

  // Stop goes beyond the sweep extreme
  let sl;
  if (dailyBias === "bullish") {
    sl = sweep !== null ? sweep : zLow;
  } else {
    sl = sweep !== null ? sweep : zHigh;
  }

  // Validation
  const slValid = (dailyBias === "bullish" && sl < entry) || (dailyBias === "bearish" && sl > entry);
  if (!slValid) {
    return { invalid: true, invalidReason: "Stop loss is on the wrong side of entry." };
  }

  const risk = Math.abs(entry - sl);
  const reward = Math.abs(dol - entry);
  const rr = risk > 0 ? reward / risk : 0;

  const trade = {
    direction: dailyBias === "bullish" ? "BUY" : "SELL",
    entry,
    sl,
    tp: dol,
    rr,
    invalid: false,
  };

  // Basic lot size calc (assuming 1 pip = 0.0001)
  if (accountSize > 0 && risk > 0) {
    const riskAmount = (accountSize * (riskPercent || 1)) / 100;
    trade.riskAmount = Math.round(riskAmount * 100) / 100;
  }

  return trade;
}

// ============================================================
// FULL EVALUATION
// ============================================================
export function evaluateSmc({
  dailyBias, session, dealingRangeHigh, dealingRangeLow, currentPrice,
  sweepHappened, sweepType, sweepLevel,
  chochConfirmed, displacementPresent,
  poiHigh, poiLow, dolPrice, dolType,
  accountSize = 0, riskPercent = 1
}) {
  const context = evaluateContext({ dailyBias, session, dealingRangeHigh, dealingRangeLow, currentPrice });
  const liquidity = evaluateLiquidity({ dailyBias, sweepHappened, sweepType, sweepLevel });
  const entry = evaluateEntry({ chochConfirmed, displacementPresent, poiHigh, poiLow, dealingRangeHigh, dealingRangeLow, currentPrice });
  
  const isReady = context.ready && liquidity.ready && entry.ready;
  let trade = null;

  if (isReady) {
    trade = computeSmcTrade({ dailyBias, poiHigh, poiLow, sweepLevel, dolPrice, accountSize, riskPercent });
  }

  // Build reasons for WAIT
  const reasons = [];
  if (!context.ready) context.gates.filter(g => !g.pass && !g.bonus).forEach(g => reasons.push(`Context: ${g.label}`));
  if (!liquidity.ready) liquidity.gates.filter(g => !g.pass).forEach(g => reasons.push(`Liquidity: ${g.label}`));
  if (!entry.ready) entry.gates.filter(g => !g.pass).forEach(g => reasons.push(`Entry: ${g.label}`));

  return {
    context, liquidity, entry, trade,
    preEntryReady: isReady && trade && !trade.invalid,
    reasons,
  };
}