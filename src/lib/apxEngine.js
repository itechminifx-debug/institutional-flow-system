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

  const passed = gates.filter(g => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    narrative: hasRange ? `Dealing range ${l} – ${h}.` : "Context missing.",
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
      detail: pullbackPct !== null ? `Pullback ${(pullbackPct * 100).toFixed(1)}%` : "❌ Missing entry/impulse",
    });
  }

  if (setupType === "shallow") {
    gates.push({
      key: "sh_max_pull",
      label: "Pullback ≤ 50% of impulse",
      pass: pullbackPct !== null && pullbackPct <= 0.50,
      detail: pullbackPct !== null ? `Pullback ${(pullbackPct * 100).toFixed(1)}%` : "❌ Missing entry/impulse",
    });
    const tapped = (ema !== null && entry !== null && Math.abs(entry - ema) < 0.001) || ema50Tapped;
    gates.push({
      key: "sh_tap",
      label: "Tapped CE or 50 EMA",
      pass: tapped,
      detail: tapped ? "✅ Tapped." : "❌ No tap.",
    });
  }

  if (setupType === "turtle_soup") {
    const swept = sweep !== null && h !== null && l !== null && (sweep > h || sweep < l);
    gates.push({
      key: "ts_sweep",
      label: "Sweep beyond range",
      pass: swept,
      detail: swept ? "✅ Swept." : "❌ No sweep.",
    });
    gates.push({
      key: "ts_close_back",
      label: "Closed back inside",
      pass: !!sweepClosedBackInside,
      detail: sweepClosedBackInside ? "✅ Closed inside." : "❌ No close back.",
    });
  }

  const passed = gates.filter(g => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    narrative: `Liquidity check for ${setupType}.`,
  };
}

// ============================================================
// LAYER 3: STRUCTURE
// ============================================================
export function evaluateStructure({
  direction,
  inducementLevel,
  inducementBroken,
  mssLevel,
  mssConfirmed,
  fvgHigh,
  fvgLow,
}) {
  const gates = [];
  
  gates.push({
    key: "inducement",
    label: "Inducement broken",
    pass: !!inducementBroken,
    detail: inducementBroken ? "✅ Broken." : "❌ Not broken.",
  });

  gates.push({
    key: "mss",
    label: "MSS confirmed",
    pass: !!mssConfirmed,
    detail: mssConfirmed ? "✅ Confirmed." : "❌ Not confirmed.",
  });

  const fvgH = num(fvgHigh);
  const fvgL = num(fvgLow);
  gates.push({
    key: "fvg",
    label: "FVG marked",
    pass: fvgH !== null && fvgL !== null,
    detail: fvgH !== null && fvgL !== null ? `FVG ${fvgL} – ${fvgH}` : "❌ Missing FVG.",
  });

  const passed = gates.filter(g => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    narrative: "Structure checks.",
  };
}

// ============================================================
// LAYER 4: ENTRY
// ============================================================
export function evaluateEntry({
  direction,
  entryPrice,
  stopLoss,
  targetPrice,
}) {
  const gates = [];
  const entry = num(entryPrice);
  const sl = num(stopLoss);
  const tp = num(targetPrice);

  gates.push({
    key: "entry",
    label: "Entry set",
    pass: entry !== null,
    detail: entry ? `Entry ${entry}` : "❌ Missing.",
  });

  let slValid = false;
  if (entry !== null && sl !== null) {
    slValid = direction === "long" ? sl < entry : sl > entry;
  }
  gates.push({
    key: "sl",
    label: "SL correct side",
    pass: slValid,
    detail: slValid ? `✅ SL ${sl}` : "❌ Wrong side.",
  });

  let tpValid = false;
  if (entry !== null && tp !== null) {
    tpValid = direction === "long" ? tp > entry : tp < entry;
  }
  gates.push({
    key: "tp",
    label: "TP correct side",
    pass: tpValid,
    detail: tpValid ? `✅ TP ${tp}` : "❌ Wrong side.",
  });

  let rr = 0;
  if (entry !== null && sl !== null && tp !== null && slValid && tpValid) {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    rr = risk > 0 ? reward / risk : 0;
  }
  gates.push({
    key: "rr",
    label: "RR ≥ 2",
    pass: rr >= 2,
    detail: rr > 0 ? `1:${rr.toFixed(2)}` : "❌ Cannot compute.",
  });

  const passed = gates.filter(g => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    narrative: rr > 0 ? `Execution R:R 1:${rr.toFixed(2)}.` : "Entry missing.",
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
    zones: context.zones, // 👈 ADD THIS LINE
    layersPassed,
    totalLayers: 4,
    doctrineScore,
    narrative: narrativeParts.join(" "),
    entryPrice,
    stopLoss,
    targetPrice,
  };
}