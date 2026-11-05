// ============================================================
// CRT (CANDLE RANGE THEORY) ENGINE
// ============================================================

export const CRT_BIASES = [
  { key: "bullish", label: "Bullish", emoji: "🟢" },
  { key: "bearish", label: "Bearish", emoji: "🔴" },
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
export function computeCrtZones({ crtHigh, crtLow, direction }) {
  const h = num(crtHigh);
  const l = num(crtLow);

  const range = h !== null && l !== null && h > l ? h - l : null;
  
  // 50% Midpoint (CE)
  const ce = range !== null ? l + (0.5 * range) : null;
  
  // OTE (61.8% to 79% of the range)
  let oteLow = null;
  let oteHigh = null;
  
  if (range !== null) {
    if (direction === "long") {
      oteHigh = h - (0.618 * range);
      oteLow  = h - (0.79 * range);
    } else {
      oteLow  = l + (0.618 * range);
      oteHigh = l + (0.79 * range);
    }
  }

  return {
    range,
    ce: round(ce),
    oteLow: round(oteLow),
    oteHigh: round(oteHigh),
  };
}

// ============================================================
// AUTO-TRADE CALCULATOR
// ============================================================
export function computeCrtAutoTrade({
  direction,
  crtHigh, crtLow,
  sweepLevel,
  fvgHigh, fvgLow,
}) {
  const h = num(crtHigh);
  const l = num(crtLow);
  const sweep = num(sweepLevel);
  const fvgH = num(fvgHigh);
  const fvgL = num(fvgLow);

  if (!h || !l) return null;

  const range = h - l;
  let entry, sl, tp;

  if (direction === "long") {
    // Entry: FVG High (if available) or 79% OTE
    entry = fvgH !== null ? fvgH : (h - (0.79 * range));
    // SL: Below 15M Sweep (or CRT Low), with 10% buffer
    const slBase = sweep !== null ? Math.min(sweep, l) : l;
    sl = slBase - (range * 0.05);
    
    // TP: 1:2.5 RR, or target CRT High
    const risk = Math.abs(entry - sl);
    const calculatedTp = entry + (risk * 2.5);
    tp = calculatedTp > h ? calculatedTp : h; // Target CRT high if closer
  } else {
    // Entry: FVG Low (if available) or 79% OTE
    entry = fvgL !== null ? fvgL : (l + (0.79 * range));
    // SL: Above 15M Sweep (or CRT High), with 5% buffer
    const slBase = sweep !== null ? Math.max(sweep, h) : h;
    sl = slBase + (range * 0.05);
    
    // TP: 1:2.5 RR, or target CRT Low
    const risk = Math.abs(sl - entry);
    const calculatedTp = entry - (risk * 2.5);
    tp = calculatedTp < l ? calculatedTp : l; // Target CRT low if closer
  }

  const riskPips = Math.round(Math.abs(entry - sl) * 10000);
  const rewardPips = Math.round(Math.abs(tp - entry) * 10000);

  return {
    entry: round(entry),
    stopLoss: round(sl),
    targetPrice: round(tp),
    riskPips,
    rewardPips,
  };
}

// ============================================================
// LAYER EVALUATORS
// ============================================================
export function evaluateContext({ direction, crtHigh, crtLow }) {
  const h = num(crtHigh);
  const l = num(crtLow);
  const hasRange = h !== null && l !== null && h > l;

  const gates = [{
    key: "range",
    label: "CRT Range defined",
    pass: hasRange,
    detail: hasRange ? `Range: ${l} – ${h}` : "❌ Need High > Low.",
  }];

  const zones = computeCrtZones({ crtHigh, crtLow, direction });

  const passed = gates.filter(g => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    narrative: hasRange ? `CRT Range valid.` : "Context missing.",
    zones,
  };
}

export function evaluateLiquidity({ sweepLevel, sweepConfirmed, crtHigh, crtLow }) {
  const sweep = num(sweepLevel);
  const h = num(crtHigh);
  const l = num(crtLow);
  
  const gates = [{
    key: "sweep",
    label: "15M Liquidity Sweep confirmed",
    pass: !!sweepConfirmed && sweep !== null,
    detail: sweepConfirmed ? `Swept at ${sweep}.` : "❌ No sweep confirmed.",
  }];

  const passed = gates.filter(g => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    narrative: passed === gates.length ? "Liquidity swept." : "Waiting for sweep.",
  };
}

export function evaluateStructure({ mssConfirmed, inducementBroken, fvgHigh, fvgLow, obHigh, obLow }) {
  const fvgH = num(fvgHigh);
  const fvgL = num(fvgLow);
  const obH = num(obHigh);
  const obL = num(obLow);

  const hasPoi = (fvgH !== null && fvgL !== null) || (obH !== null && obL !== null);

  const gates = [
    { key: "mss", label: "1M CHoCH / MSS", pass: !!mssConfirmed, detail: mssConfirmed ? "Confirmed." : "❌ Not confirmed." },
    { key: "inducement", label: "Inducement (IDM) swept", pass: !!inducementBroken, detail: inducementBroken ? "Broken." : "❌ Not broken." },
    { key: "poi", label: "FVG / OB / RB marked", pass: hasPoi, detail: hasPoi ? "POI Valid." : "❌ Need FVG or OB." },
  ];

  const passed = gates.filter(g => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    narrative: passed === gates.length ? "Structure valid." : "Structure incomplete.",
  };
}

export function evaluateEntry({ direction, entryPrice, stopLoss, targetPrice }) {
  const entry = num(entryPrice);
  const sl = num(stopLoss);
  const tp = num(targetPrice);

  const gates = [
    { key: "entry", label: "Entry set", pass: entry !== null, detail: entry ? `Entry ${entry}` : "Missing." },
  ];

  let slValid = false;
  if (entry !== null && sl !== null) slValid = direction === "long" ? sl < entry : sl > entry;
  gates.push({ key: "sl", label: "SL correct", pass: slValid, detail: slValid ? `SL ${sl}` : "Wrong side." });

  let tpValid = false;
  if (entry !== null && tp !== null) tpValid = direction === "long" ? tp > entry : tp < entry;
  gates.push({ key: "tp", label: "TP correct", pass: tpValid, detail: tpValid ? `TP ${tp}` : "Wrong side." });

  let rr = 0;
  if (entry !== null && sl !== null && tp !== null && slValid && tpValid) {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    rr = risk > 0 ? reward / risk : 0;
  }
  gates.push({ key: "rr", label: "RR ≥ 2", pass: rr >= 2, detail: rr > 0 ? `1:${rr.toFixed(2)}` : "Invalid." });

  const passed = gates.filter(g => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    narrative: passed === gates.length ? `Execution valid.` : "Entry incomplete.",
  };
}

export function evaluateCrt(input) {
  const context = evaluateContext(input);
  const liquidity = evaluateLiquidity(input);
  const structure = evaluateStructure(input);
  const entry = evaluateEntry(input);

  const allReady = context.ready && liquidity.ready && structure.ready && entry.ready;
  const layersPassed = [context, liquidity, structure, entry].filter(l => l.ready).length;
  const doctrineScore = Math.round((context.score + liquidity.score + structure.score + entry.score) / 4);
  const narrativeParts = [context.narrative, liquidity.narrative, structure.narrative, entry.narrative].filter(Boolean);

  return {
    context, liquidity, structure, entry,
    zones: context.zones,
    layersPassed, totalLayers: 4, doctrineScore,
    narrative: narrativeParts.join(" "),
    entryPrice: input.entryPrice,
    stopLoss: input.stopLoss,
    targetPrice: input.targetPrice,
  };
}