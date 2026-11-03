// ============================================================
// APX (Apex) — INSTITUTIONAL FLOW ENGINE
// ============================================================
// Sequence: Bias → Dealing Range → Liquidity (Sweep/OTE) →
//           Inducement / MSS / FVG → Entry → SL/TP
//
// Setup types:
//   • standard    — deep pullback (>= 62% of impulse) into Premium/Discount
//   • shallow     — pullback <= 50%, taps CE / 50 EMA, tight SL
//   • turtle_soup — sweep beyond dealing range, close back inside,
//                   displacement >= ATR (or 50% of impulse), reversal MSS
//
// OTE is measured from the IMPULSE LEG (not the dealing range).
// Dealing range drives CE / Premium / Discount only.
// ============================================================

export const APX_SETUP_TYPES = [
  { key: "standard",    label: "Standard",    emoji: "🎯", hint: "Deep pullback (≥ 62% of impulse) into Premium/Discount." },
  { key: "shallow",     label: "Shallow",     emoji: "⚡", hint: "Pullback ≤ 50% of impulse. Taps CE or 50 EMA. Tight SL." },
  { key: "turtle_soup", label: "Turtle Soup", emoji: "🐢", hint: "Sweep beyond dealing range, close back inside, reversal MSS." },
];

export const APX_BIASES = [
  { key: "bullish", label: "Bullish", emoji: "🟢" },
  { key: "bearish", label: "Bearish", emoji: "🔴" },
];

export const APX_DIRECTIONS = [
  { key: "long",  label: "Long",  emoji: "⬆️", hint: "Bullish continuation." },
  { key: "short", label: "Short", emoji: "⬇️", hint: "Bearish continuation." },
];

const DEEP_ZONE_MIN        = 0.62;
const SHALLOW_MAX          = 0.50;
const SHALLOW_HARD_CAP     = 0.62;
const STANDARD_HARD_FLOOR  = 0.50;
const TS_DISPLACEMENT_PROXY = 0.50;
const MIN_RR = 2;

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function fmt(v) {
  return v === null || v === undefined ? "—" : v.toString();
}

function round(v, dp = 4) {
  if (v === null || !Number.isFinite(v)) return null;
  return Math.round(v * 10 ** dp) / 10 ** dp;
}

// ------------------------------------------------------------
// ZONE MATH
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// STAGE 1 — CONTEXT
// ------------------------------------------------------------
export function evaluateApxContext({ setupType, bias, direction, rangeHigh, rangeLow, impulseHigh, impulseLow }) {
  const gates = [];

  gates.push({
    key: "setup_type",
    label: "Setup type selected",
    pass: setupType === "standard" || setupType === "shallow" || setupType === "turtle_soup",
    detail: setupType ? `Setup: ${setupType.replace("_", " ")}.` : "No setup type selected.",
  });

  gates.push({
    key: "bias",
    label: "HTF bias set",
    pass: bias === "bullish" || bias === "bearish",
    detail: bias ? `Bias: ${bias}.` : "No bias. Cannot trade without HTF context.",
  });

  gates.push({
    key: "direction",
    label: "Direction set",
    pass: direction === "long" || direction === "short",
    detail: direction ? `Direction: ${direction}.` : "No direction selected.",
  });

  const zones = computeApxZones({ rangeHigh, rangeLow, impulseHigh, impulseLow, direction });
  const hasRange = zones.dealingRange !== null;

  gates.push({
    key: "dealing_range",
    label: "Dealing range defined",
    pass: hasRange,
    detail: hasRange
      ? `Range: ${fmt(num(rangeLow))} – ${fmt(num(rangeHigh))} · CE ${fmt(zones.ce)}`
      : "Dealing range needs high > low.",
  });

  const hasImpulse = zones.impulseRange !== null;
  gates.push({
    key: "impulse_leg",
    label: "Impulse leg defined (for OTE)",
    pass: hasImpulse,
    detail: hasImpulse
      ? `Impulse: ${fmt(num(impulseLow))} – ${fmt(num(impulseHigh))} · OTE ${fmt(zones.oteLow)} – ${fmt(zones.oteHigh)}`
      : "Impulse leg needs high > low.",
  });

  const passed = gates.filter((g) => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    zones,
  };
}

// ------------------------------------------------------------
// STAGE 2 — LIQUIDITY
// ------------------------------------------------------------
export function evaluateApxLiquidity({
  setupType, direction, rangeHigh, rangeLow,
  sweepLevel, sweepClosedBackInside, displacementRange, atrValue,
  ema50Value, ema50Tapped, entryPrice,
  impulseHigh, impulseLow,
  zones,
}) {
  const gates = [];

  const entry = num(entryPrice);
  const h = num(rangeHigh);
  const l = num(rangeLow);
  const sweep = num(sweepLevel);
  const disp = num(displacementRange);
  const atr = num(atrValue);
  const ema = num(ema50Value);
  const iH = num(impulseHigh);
  const iL = num(impulseLow);
  const impulseRange = zones?.impulseRange ?? (iH !== null && iL !== null && iH > iL ? iH - iL : null);

  // Pullback % (retrace of impulse to entry)
  let pullbackPct = null;
  if (impulseRange !== null && entry !== null && iH !== null && iL !== null) {
    if (direction === "long") pullbackPct = (iH - entry) / impulseRange;
    else if (direction === "short") pullbackPct = (entry - iL) / impulseRange;
  }

  // ---- Standard ----
  if (setupType === "standard") {
    gates.push({
      key: "std_deep_zone",
      label: "Pullback ≥ 62% of impulse (deep zone)",
      pass: pullbackPct !== null && pullbackPct >= DEEP_ZONE_MIN,
      detail: pullbackPct !== null
        ? `Pullback ${(pullbackPct * 100).toFixed(1)}% of impulse.`
        : "Need entry + impulse leg to compute pullback depth.",
    });

    let zoneOk = false;
    if (entry !== null && zones?.ce != null) {
      if (direction === "short") zoneOk = entry >= zones.ce;
      else if (direction === "long") zoneOk = entry <= zones.ce;
    }
    gates.push({
      key: "std_zone",
      label: direction === "short" ? "Entry inside Premium" : "Entry inside Discount",
      pass: zoneOk,
      detail: zoneOk
        ? `Entry ${fmt(entry)} is on the ${direction === "short" ? "premium" : "discount"} side of CE ${fmt(zones?.ce)}.`
        : `⚠️ Entry ${fmt(entry)} is not in the correct half of the range.`,
    });
  }

  // ---- Shallow ----
  if (setupType === "shallow") {
    gates.push({
      key: "sh_max_pull",
      label: "Pullback ≤ 50% of impulse",
      pass: pullbackPct !== null && pullbackPct <= SHALLOW_MAX,
      detail: pullbackPct !== null
        ? `Pullback ${(pullbackPct * 100).toFixed(1)}%.`
        : "Need entry + impulse leg to compute pullback depth.",
    });

    const rangeTol = zones?.dealingRange ? 0.005 * zones.dealingRange : 0;
    const nearCE = zones?.ce != null && entry !== null && Math.abs(entry - zones.ce) <= rangeTol;
    const nearEMA = ema !== null && entry !== null && Math.abs(entry - ema) <= rangeTol;
    const tapped = nearCE || nearEMA || !!ema50Tapped;
    gates.push({
      key: "sh_tap",
      label: "Tapped CE or 50 EMA",
      pass: tapped,
      detail: tapped
        ? `Tap: ${[nearCE && "CE", nearEMA && "50 EMA", ema50Tapped && !nearCE && !nearEMA && "(manual)"].filter(Boolean).join(" ")}`
        : "Pullback did not tap CE or 50 EMA.",
    });
  }

  // ---- Turtle Soup ----
  if (setupType === "turtle_soup") {
    const swept = sweep !== null && h !== null && l !== null && (sweep > h || sweep < l);
    gates.push({
      key: "ts_sweep",
      label: "Sweep beyond dealing range extreme",
      pass: swept,
      detail: swept
        ? `Sweep ${fmt(sweep)} beyond ${sweep > h ? "range high" : "range low"}.`
        : "Sweep level not beyond the dealing range.",
    });

    gates.push({
      key: "ts_close_back",
      label: "Sweep candle closed back inside range",
      pass: !!sweepClosedBackInside,
      detail: sweepClosedBackInside ? "Closed back inside — trap confirmed." : "❌ Sweep candle must close back inside.",
    });

    let dispOk = false;
    let dispDetail = "Displacement range not entered.";
    if (disp !== null) {
      if (atr !== null) {
        dispOk = disp >= atr;
        dispDetail = dispOk
          ? `Displacement ${fmt(disp)} ≥ ATR ${fmt(atr)}.`
          : `Displacement ${fmt(disp)} < ATR ${fmt(atr)}.`;
      } else {
        const proxyMin = TS_DISPLACEMENT_PROXY * (impulseRange || 0);
        dispOk = proxyMin > 0 && disp >= proxyMin;
        dispDetail = dispOk
          ? `Displacement ${fmt(disp)} ≥ 50% of impulse (no ATR).`
          : "Displacement below 50% of impulse (no ATR provided).";
      }
    }
    gates.push({
      key: "ts_displacement",
      label: "Displacement ≥ ATR (or 50% impulse)",
      pass: dispOk,
      detail: dispDetail,
    });
  }

  // ---- OTE position (bonus, never blocks) ----
  const inOte = entry !== null && zones?.oteLow != null && zones?.oteHigh != null
    ? entry >= Math.min(zones.oteLow, zones.oteHigh) && entry <= Math.max(zones.oteLow, zones.oteHigh)
    : false;
  gates.push({
    key: "ote_position",
    label: "Entry inside OTE band",
    pass: inOte,
    warning: !inOte,
    bonus: true,
    detail: inOte
      ? `Entry inside OTE ${fmt(zones?.oteLow)} – ${fmt(zones?.oteHigh)}.`
      : "Entry outside OTE band. Not required, but strengthens the setup.",
  });

  const blocking = gates.filter((g) => !g.warning && !g.bonus);
  const passed = blocking.filter((g) => g.pass).length;
  return {
    ready: passed === blocking.length,
    gates,
    score: Math.round((passed / blocking.length) * 100),
    pullbackPct: round(pullbackPct, 4),
  };
}

// ------------------------------------------------------------
// STAGE 3 — INDUCEMENT / MSS / FVG
// ------------------------------------------------------------
export function evaluateApxStructure({
  direction, inducementLevel, inducementBroken,
  mssLevel, mssConfirmed, fvgHigh, fvgLow,
}) {
  const gates = [];
  const ind = num(inducementLevel);
  const mss = num(mssLevel);
  const fvgH = num(fvgHigh);
  const fvgL = num(fvgLow);

  gates.push({
    key: "inducement",
    label: "Inducement identified",
    pass: ind !== null,
    detail: ind !== null ? `Inducement at ${fmt(ind)}.` : "No inducement level entered.",
  });

  gates.push({
    key: "inducement_broken",
    label: "Inducement broken",
    pass: !!inducementBroken,
    detail: inducementBroken ? "Inducement taken." : "⏳ Waiting for inducement sweep.",
  });

  gates.push({
    key: "mss",
    label: "MSS confirmed",
    pass: !!mssConfirmed,
    detail: mssConfirmed ? "Market structure shifted." : "⏳ Waiting for MSS confirmation.",
  });

  gates.push({
    key: "mss_level",
    label: "MSS level recorded",
    pass: mss !== null,
    detail: mss !== null ? `MSS at ${fmt(mss)}.` : "No MSS price level entered.",
  });

  const hasFvg = fvgH !== null && fvgL !== null && fvgH > fvgL;
  gates.push({
    key: "fvg",
    label: "FVG bounds marked",
    pass: hasFvg,
    detail: hasFvg ? `FVG ${fmt(fvgL)} – ${fmt(fvgH)}.` : "FVG required as the entry zone.",
  });

  let fvgSideOk = false;
  if (hasFvg && mss !== null) {
    if (direction === "long") fvgSideOk = fvgL > mss || fvgH > mss;
    else if (direction === "short") fvgSideOk = fvgH < mss || fvgL < mss;
  }
  gates.push({
    key: "fvg_side",
    label: "FVG on correct side of MSS",
    pass: fvgSideOk,
    detail: fvgSideOk ? "FVG sits between MSS and entry." : "⚠️ FVG is on the wrong side of MSS.",
  });

  const passed = gates.filter((g) => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
  };
}

// ------------------------------------------------------------
// STAGE 4 — ENTRY
// ------------------------------------------------------------
export function evaluateApxEntry({
  direction, setupType, entryPrice, stopLoss, targetPrice,
  inducementLevel, mssLevel, impulseHigh, impulseLow,
}) {
  const gates = [];
  const entry = num(entryPrice);
  const sl = num(stopLoss);
  const tp = num(targetPrice);
  const ind = num(inducementLevel);
  const mss = num(mssLevel);
  const iH = num(impulseHigh);
  const iL = num(impulseLow);

  gates.push({
    key: "entry",
    label: "Entry price set",
    pass: entry !== null,
    detail: entry !== null ? `Entry: ${fmt(entry)}.` : "No entry price entered.",
  });

  gates.push({
    key: "sl_set",
    label: "Stop loss set",
    pass: sl !== null,
    detail: sl !== null ? `SL: ${fmt(sl)}.` : "No stop loss entered.",
  });

  gates.push({
    key: "tp_set",
    label: "Target set",
    pass: tp !== null,
    detail: tp !== null ? `TP: ${fmt(tp)}.` : "No target entered.",
  });

  let slSideOk = false;
  if (entry !== null && sl !== null) {
    if (direction === "long") slSideOk = sl < entry;
    else if (direction === "short") slSideOk = sl > entry;
  }
  gates.push({
    key: "sl_side",
    label: "SL on correct side of entry",
    pass: slSideOk,
    detail: slSideOk ? `SL ${fmt(sl)} is on the correct side.` : "❌ SL is on the wrong side of entry.",
  });

  let slBeyond = false;
  if (entry !== null && sl !== null) {
    if (direction === "long") {
      const extreme = [ind, mss, iL].filter((v) => v !== null);
      const floor = extreme.length ? Math.min(...extreme) : entry;
      slBeyond = sl < floor;
    } else if (direction === "short") {
      const extreme = [ind, mss, iH].filter((v) => v !== null);
      const ceiling = extreme.length ? Math.max(...extreme) : entry;
      slBeyond = sl > ceiling;
    }
  }
  gates.push({
    key: "sl_beyond_extreme",
    label: "SL beyond inducement/MSS extreme",
    pass: slBeyond,
    detail: slBeyond ? "SL clears the structural extreme." : "❌ SL must be beyond the inducement/MSS extreme.",
  });

  let tpSideOk = false;
  if (entry !== null && tp !== null) {
    if (direction === "long") tpSideOk = tp > entry;
    else if (direction === "short") tpSideOk = tp < entry;
  }
  gates.push({
    key: "tp_side",
    label: "TP in correct direction",
    pass: tpSideOk,
    detail: tpSideOk ? `TP ${fmt(tp)} is on the correct side.` : "❌ TP is on the wrong side of entry.",
  });

  let rr = null;
  if (entry !== null && sl !== null && tp !== null) {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    rr = risk > 0 ? reward / risk : null;
  }
  gates.push({
    key: "rr",
    label: "RR ≥ 2",
    pass: rr !== null && rr >= MIN_RR,
    detail: rr !== null ? `RR 1:${rr.toFixed(2)}.` : "Need entry + SL + TP to compute RR.",
  });

  if (setupType === "shallow") {
    const iRange = iH !== null && iL !== null && iH > iL ? iH - iL : null;
    const tight = iRange !== null && entry !== null && sl !== null
      ? Math.abs(entry - sl) <= 0.25 * iRange
      : false;
    gates.push({
      key: "sh_tight_sl",
      label: "SL tight (≤ 25% of impulse leg)",
      pass: tight,
      detail: tight ? "SL is tight for a shallow setup." : "⚠️ SL too wide for a shallow setup.",
    });
  }

  const passed = gates.filter((g) => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    rr,
  };
}

// ------------------------------------------------------------
// TRADE MATH
// ------------------------------------------------------------
export function computeApxTrade({ direction, entryPrice, stopLoss, targetPrice, riskPercent = 1 }) {
  const entry = num(entryPrice);
  const sl = num(stopLoss);
  const tp = num(targetPrice);
  if (entry === null || sl === null || tp === null) return null;

  const slValid = (direction === "long" && sl < entry) || (direction === "short" && sl > entry);
  if (!slValid) {
    return { invalid: true, invalidReason: "Stop loss is on the wrong side of entry." };
  }

  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  const rr = risk > 0 ? reward / risk : 0;

  return {
    direction: direction === "long" ? "BUY" : "SELL",
    entry, sl, tp, rr, riskPercent,
    invalid: false,
  };
}

// ------------------------------------------------------------
// FULL EVALUATION
// ------------------------------------------------------------
export function evaluateApx(input = {}) {
  const {
    setupType, bias, direction, pair, timeframeStack,
    rangeHigh, rangeLow, impulseHigh, impulseLow,
    sweepLevel, sweepClosedBackInside, displacementRange, atrValue,
    inducementLevel, inducementBroken, mssLevel, mssConfirmed,
    fvgHigh, fvgLow, ema50Value, ema50Tapped,
    entryPrice, stopLoss, targetPrice, riskPercent = 1,
  } = input;

  const context = evaluateApxContext({
    setupType, bias, direction, rangeHigh, rangeLow, impulseHigh, impulseLow,
  });

  const liquidity = evaluateApxLiquidity({
    setupType, direction, rangeHigh, rangeLow,
    sweepLevel, sweepClosedBackInside, displacementRange, atrValue,
    ema50Value, ema50Tapped, entryPrice,
    impulseHigh, impulseLow,
    zones: context.zones,
  });

  const structure = evaluateApxStructure({
    direction, inducementLevel, inducementBroken, mssLevel, mssConfirmed,
    fvgHigh, fvgLow,
  });

  const entry = evaluateApxEntry({
    direction, setupType, entryPrice, stopLoss, targetPrice,
    inducementLevel, mssLevel, impulseHigh, impulseLow,
  });

  const allReady = context.ready && liquidity.ready && structure.ready && entry.ready;

  let trade = null;
  if (allReady) {
    trade = computeApxTrade({ direction, entryPrice, stopLoss, targetPrice, riskPercent });
  }

  const reasons = [];
  const addReasons = (stage, arr) =>
    arr.filter((g) => !g.pass && !g.warning && !g.bonus)
       .forEach((g) => reasons.push(`${stage}: ${g.label}`));

  if (!context.ready)   addReasons("Context",   context.gates);
  if (!liquidity.ready) addReasons("Liquidity", liquidity.gates);
  if (!structure.ready) addReasons("Structure", structure.gates);
  if (!entry.ready)     addReasons("Entry",     entry.gates);

  return {
    setupType, bias, direction, pair, timeframeStack,
    zones: context.zones,
    context, liquidity, structure, entry, trade,
    preEntryReady: allReady && trade && !trade.invalid,
    reasons,
    candle: {
      rangeHigh: num(rangeHigh),
      rangeLow: num(rangeLow),
      impulseHigh: num(impulseHigh),
      impulseLow: num(impulseLow),
      ce: context.zones.ce,
      oteLow: context.zones.oteLow,
      oteHigh: context.zones.oteHigh,
      sweepLevel: num(sweepLevel),
      mssLevel: num(mssLevel),
      inducementLevel: num(inducementLevel),
      fvgHigh: num(fvgHigh),
      fvgLow: num(fvgLow),
      entryPrice: num(entryPrice),
      stopLoss: num(stopLoss),
      targetPrice: num(targetPrice),
      direction,
    },
  };
}

export default {
  APX_SETUP_TYPES,
  APX_BIASES,
  APX_DIRECTIONS,
  computeApxZones,
  evaluateApxContext,
  evaluateApxLiquidity,
  evaluateApxStructure,
  evaluateApxEntry,
  computeApxTrade,
  evaluateApx,
};