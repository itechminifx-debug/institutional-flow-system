// ============================================================
// APX (APEX) — INSTITUTIONAL FLOW ENGINE
// ============================================================
// Sequence: Context → Liquidity → Structure → Entry
// Setup Types: Standard, Shallow, Turtle Soup
// ============================================================

export const APX_SETUP_TYPES = [
  { key: "standard",    label: "Standard",    emoji: "🎯" },
  { key: "shallow",     label: "Shallow",     emoji: "⚡" },
  { key: "turtle_soup", label: "Turtle Soup", emoji: "🐢" },
];

export const APX_BIASES = [
  { key: "bullish", label: "Bullish", emoji: "🟢" },
  { key: "bearish", label: "Bearish", emoji: "🔴" },
];

export const APX_DIRECTIONS = [
  { key: "long",  label: "Long",  emoji: "⬆️" },
  { key: "short", label: "Short", emoji: "⬇️" },
];

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function round(v, dp = 4) {
  if (v === null || !Number.isFinite(v)) return null;
  return Math.round(v * 10 ** dp) / 10 ** dp;
}

// ============================================================
// ZONE MATH
// ============================================================
export function computeApxZones({ rangeHigh, rangeLow, impulseHigh, impulseLow, direction }) {
  const h  = num(rangeHigh);
  const l  = num(rangeLow);
  const iH = num(impulseHigh);
  const iL = num(impulseLow);

  const dealingRange = h !== null && l !== null && h > l ? h - l : null;
  const impulseRange = iH !== null && iL !== null && iH > iL ? iH - iL : null;

  const ce = dealingRange !== null ? (h + l) / 2 : null;
  const premiumLow  = dealingRange !== null ? l + 0.5 * dealingRange : null;
  const premiumHigh = dealingRange !== null ? h : null;
  const discountLow  = dealingRange !== null ? l : null;
  const discountHigh = dealingRange !== null ? l + 0.5 * dealingRange : null;

  let oteLow = null;
  let oteHigh = null;
  if (impulseRange !== null) {
    if (direction === "long") {
      oteHigh = iH - 0.618 * impulseRange;
      oteLow  = iH - 0.79  * impulseRange;
    } else if (direction === "short") {
      oteLow  = iL + 0.618 * impulseRange;
      oteHigh = iL + 0.79  * impulseRange;
    }
  }

  return {
    dealingRange,
    impulseRange,
    ce: round(ce),
    premiumLow: round(premiumLow),
    premiumHigh: round(premiumHigh),
    discountLow: round(discountLow),
    discountHigh: round(discountHigh),
    oteLow: round(oteLow),
    oteHigh: round(oteHigh),
  };
}

// ============================================================
// LAYER 1: CONTEXT & ZONES
// ============================================================
export function evaluateContext({
  setupType,
  bias,
  direction,
  rangeHigh,
  rangeLow,
  impulseHigh,
  impulseLow,
}) {
  const gates = [];

  gates.push({
    key: "setup_type",
    label: "Setup type selected",
    pass: !!setupType,
    detail: setupType ? `Setup: ${setupType}` : "❌ No setup selected.",
  });

  gates.push({
    key: "bias",
    label: "HTF bias set",
    pass: bias === "bullish" || bias === "bearish",
    detail: bias ? `Bias: ${bias}` : "❌ No bias.",
  });

  gates.push({
    key: "direction",
    label: "Direction set",
    pass: direction === "long" || direction === "short",
    detail: direction ? `Direction: ${direction}` : "❌ No direction.",
  });

  const h = num(rangeHigh);
  const l = num(rangeLow);
  const iH = num(impulseHigh);
  const iL = num(impulseLow);

  const hasRange = h !== null && l !== null && h > l;
  gates.push({
    key: "range",
    label: "Dealing range defined",
    pass: hasRange,
    detail: hasRange ? `Range: ${l} – ${h}` : "❌ Need range high > low.",
  });

  const hasImpulse = iH !== null && iL !== null && iH > iL;
  gates.push({
    key: "impulse",
    label: "Impulse leg defined (for OTE)",
    pass: hasImpulse,
    detail: hasImpulse ? `Impulse: ${iL} – ${iH}` : "❌ Need impulse high > low.",
  });

  // Calculate the zones right here
  const zones = computeApxZones({ rangeHigh, rangeLow, impulseHigh, impulseLow, direction });

  const passed = gates.filter(g => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    narrative: hasRange ? `Dealing range ${l} – ${h}.` : "Context missing.",
    zones, // 👈 Return the math to the engine
  };
}

// ============================================================
// LAYER 2: LIQUIDITY
// ============================================================
export function evaluateLiquidity({
  setupType,
  direction,
  rangeHigh,
  rangeLow,
  impulseHigh,
  impulseLow,
  sweepLevel,
  sweepClosedBackInside,
  displacementRange,
  atrValue,
  ema50Value,
  ema50Tapped,
  entryPrice,
}) {
  const gates = [];

  const h = num(rangeHigh);
  const l = num(rangeLow);
  const iH = num(impulseHigh);
  const iL = num(impulseLow);
  const entry = num(entryPrice);
  const sweep = num(sweepLevel);
  const disp = num(displacementRange);
  const atr = num(atrValue);
  const ema = num(ema50Value);

  const iRange = iH !== null && iL !== null && iH > iL ? iH - iL : null;
  let pullbackPct = null;
  if (iRange && entry) {
    if (direction === "long") pullbackPct = (iH - entry) / iRange;
    if (direction === "short") pullbackPct = (entry - iL) / iRange;
  }

  if (setupType === "standard") {
    gates.push({
      key: "std_deep_zone",
      label: "Pullback ≥ 62% of impulse",
      pass: pullbackPct !== null && pullbackPct >= 0.62,
      detail: pullbackPct !== null ? `Pullback ${(pullbackPct * 100).toFixed(1)}%` : "Missing entry/impulse",
    });
  }

  if (setupType === "shallow") {
    gates.push({
      key: "sh_max_pull",
      label: "Pullback ≤ 50% of impulse",
      pass: pullbackPct !== null && pullbackPct <= 0.50,
      detail: pullbackPct !== null ? `Pullback ${(pullbackPct * 100).toFixed(1)}%` : "Missing entry/impulse",
    });
    const tapped = (ema !== null && entry !== null && Math.abs(entry - ema) < 0.001) || ema50Tapped;
    gates.push({
      key: "sh_tap",
      label: "Tapped CE or 50 EMA",
      pass: tapped,
      detail: tapped ? "Tapped." : "No tap.",
    });
  }

  if (setupType === "turtle_soup") {
    const swept = sweep !== null && h !== null && l !== null && (sweep > h || sweep < l);
    gates.push({
      key: "ts_sweep",
      label: "Sweep beyond range",
      pass: swept,
      detail: swept ? "Swept." : "No sweep.",
    });
    gates.push({
      key: "ts_close_back",
      label: "Closed back inside",
      pass: !!sweepClosedBackInside,
      detail: sweepClosedBackInside ? "Closed inside." : "No close back.",
    });
  }

  const passed = gates.filter(g => g.pass).length;
  const isReady = passed === gates.length;
  
  // Create a dynamic narrative based on the setup type
  let narrative = "";
  if (isReady) {
    narrative = `Liquidity valid for ${setupType}.`;
  } else {
    const failedGates = gates.filter(g => !g.pass).map(g => g.detail);
    narrative = failedGates.join(" ");
  }

  return {
    ready: isReady,
    gates,
    score: Math.round((passed / gates.length) * 100),
    narrative, // 👈 Dynamic narrative
  };
}

// ============================================================
// FULL EVALUATION
// ============================================================
export function evaluateApx({
  setupType,
  bias,
  direction,
  rangeHigh,
  rangeLow,
  impulseHigh,
  impulseLow,
  sweepLevel,
  sweepClosedBackInside,
  displacementRange,
  atrValue,
  inducementLevel,
  inducementBroken,
  mssLevel,
  mssConfirmed,
  fvgHigh,
  fvgLow,
  ema50Value,
  ema50Tapped,
  entryPrice,
  stopLoss,
  targetPrice,
}) {
  const context = evaluateContext({ setupType, bias, direction, rangeHigh, rangeLow, impulseHigh, impulseLow });
  const liquidity = evaluateLiquidity({ setupType, direction, rangeHigh, rangeLow, impulseHigh, impulseLow, sweepLevel, sweepClosedBackInside, displacementRange, atrValue, ema50Value, ema50Tapped, entryPrice });
  const structure = evaluateStructure({ direction, inducementLevel, inducementBroken, mssLevel, mssConfirmed, fvgHigh, fvgLow });
  const entry = evaluateEntry({ direction, entryPrice, stopLoss, targetPrice });

  const allReady = context.ready && liquidity.ready && structure.ready && entry.ready;
  
  const layersPassed = [context, liquidity, structure, entry].filter(l => l.ready).length;
  const doctrineScore = Math.round((context.score + liquidity.score + structure.score + entry.score) / 4);

  const narrativeParts = [
    context.narrative,
    liquidity.narrative,
    structure.narrative,
    entry.narrative,
  ].filter(Boolean);

 return {
    context,
    liquidity,
    structure,
    entry,
    zones: context.zones, // Now it will correctly pass the calculated objects
    layersPassed,
    totalLayers: 4,
    doctrineScore,
    narrative: narrativeParts.join(" "),
    entryPrice,
    stopLoss,
    targetPrice,
  };
}