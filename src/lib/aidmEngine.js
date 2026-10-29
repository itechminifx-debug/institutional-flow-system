// ============================================================
// AIDM — APEX-IDM ENGINE
// ============================================================
// Sequence: Map → Time & Trap → Structure Shift → Sniper Entry → Risk & Targets
// Direction-aware: Bullish → Discount OTE. Bearish → Premium OTE.
// ============================================================

export const AIDM_DIRECTIONS = [
  { key: "bullish", label: "🟢 Bullish", hint: "Buy in Discount" },
  { key: "bearish", label: "🔴 Bearish", hint: "Sell in Premium" },
];

export const AIDM_SESSIONS = [
  { key: "london", label: "London (02:00–05:00 EST)", hint: "Judas swing window" },
  { key: "ny_am",  label: "New York AM (07:00–10:00 EST)", hint: "Heaviest volume" },
];

export const AIDM_TIMEFRAMES = ["Daily", "4H", "1H", "15M", "5M", "1M"];

export const AIDM_EVENT_TYPES = [
  "sweep", "mss", "poi_tap", "entry", "partial", "be", "trail", "exit", "invalidation",
];

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function fmt(v) {
  return v === null || v === undefined ? "—" : v.toString();
}

// ============================================================
// LEVELS — CE / 62 / 79 / OTE zone / POI side
// ============================================================
export function computeApexLevels({ rangeHigh, rangeLow, direction }) {
  const H = num(rangeHigh);
  const L = num(rangeLow);

  const valid = H !== null && L !== null && H > 0 && L > 0 && H > L;

  if (!valid) {
    return {
      valid: false,
      direction,
      rangeHigh: H,
      rangeLow: L,
      rangeSize: null,
      ce: null,
      ote62: null,
      ote79: null,
      oteZoneLow: null,
      oteZoneHigh: null,
      poiZone: null,
    };
  }

  const size = H - L;
  const ce = (H + L) / 2;

  let ote62, ote79, poiZone;
  if (direction === "bullish") {
    ote62 = L + size * 0.62;
    ote79 = L + size * 0.79;
    poiZone = "discount";
  } else {
    ote62 = H - size * 0.62;
    ote79 = H - size * 0.79;
    poiZone = "premium";
  }

  return {
    valid: true,
    direction,
    rangeHigh: H,
    rangeLow: L,
    rangeSize: size,
    ce,
    ote62,
    ote79,
    oteZoneLow: Math.min(ote62, ote79),
    oteZoneHigh: Math.max(ote62, ote79),
    poiZone,
  };
}

// ============================================================
// PART 1 — MAP
// ============================================================
export function evaluateAidmMap({
  direction,
  rangeHigh,
  rangeLow,
  currentPrice,
}) {
  const gates = [];

  const dirOk = direction === "bullish" || direction === "bearish";
  gates.push({
    key: "direction",
    label: "Direction set",
    pass: dirOk,
    detail: dirOk ? `Direction: ${direction}` : "No direction selected.",
  });

  const levels = computeApexLevels({ rangeHigh, rangeLow, direction });

  gates.push({
    key: "range",
    label: "Range High / Low valid",
    pass: levels.valid,
    detail: levels.valid
      ? `Range ${fmt(levels.rangeLow)} – ${fmt(levels.rangeHigh)}`
      : "Enter a valid High > Low range.",
  });

  gates.push({
    key: "ce",
    label: "50% CE computed",
    pass: levels.ce !== null,
    detail: levels.ce !== null ? `CE ${fmt(levels.ce)}` : "CE cannot be computed.",
  });

  gates.push({
    key: "ote",
    label: "62% / 79% OTE computed",
    pass: levels.ote62 !== null && levels.ote79 !== null,
    detail: levels.ote62 !== null
      ? `OTE ${fmt(levels.oteZoneLow)} – ${fmt(levels.oteZoneHigh)}`
      : "OTE cannot be computed.",
  });

  gates.push({
    key: "poi_zone",
    label: "POI in correct zone",
    pass: levels.poiZone !== null,
    detail: levels.poiZone
      ? `POI in ${levels.poiZone.toUpperCase()} (${direction === "bullish" ? "below" : "above"} CE)`
      : "POI zone unknown.",
  });

  const cur = num(currentPrice);
  const priceInRange = levels.valid && cur !== null && cur >= levels.rangeLow && cur <= levels.rangeHigh;
  gates.push({
    key: "price_in_range",
    label: "Current price inside range",
    pass: priceInRange,
    warning: cur === null,
    detail:
      cur === null
        ? "⚠️ No current price entered."
        : !levels.valid
        ? "Need valid range to check price position."
        : priceInRange
        ? `Price ${fmt(cur)} is inside the range.`
        : `⚠️ Price ${fmt(cur)} is outside the range.`,
  });

  const blocking = gates.filter(g => !g.warning);
  const passed = blocking.filter(g => g.pass).length;

  return {
    ready: passed === blocking.length,
    score: Math.round((passed / blocking.length) * 100),
    gates,
    levels,
  };
}

// ============================================================
// PART 2 — TIME & TRAP
// ============================================================
export function evaluateAidmTrap({
  session,
  sweptErl,
  liquiditySweptType,
  direction,
}) {
  const gates = [];

  const sessionOk = session === "london" || session === "ny_am";
  gates.push({
    key: "session",
    label: "Inside kill zone",
    pass: sessionOk,
    detail: sessionOk
      ? `Session: ${session === "london" ? "London" : "New York AM"}`
      : "Outside London / NY AM kill zone.",
  });

  gates.push({
    key: "sweep",
    label: "ERL swept (BSL or SSL)",
    pass: !!sweptErl,
    detail: sweptErl ? "Liquidity taken." : "⏳ Waiting for ERL sweep.",
  });

  const expectedSweep = direction === "bearish" ? "bsl" : "ssl";
  const sweepMatch = sweptErl && liquiditySweptType === expectedSweep;
  gates.push({
    key: "sweep_side",
    label: `Swept side matches direction`,
    pass: sweepMatch,
    warning: !sweptErl,
    detail: !sweptErl
      ? "⚠️ Sweep not confirmed yet."
      : sweepMatch
      ? `${expectedSweep.toUpperCase()} swept — correct for ${direction}.`
      : `❌ ${direction} setup expects ${expectedSweep.toUpperCase()}, but ${liquiditySweptType?.toUpperCase() || "?"} was swept.`,
  });

  const blocking = gates.filter(g => !g.warning);
  const passed = blocking.filter(g => g.pass).length;

  return {
    ready: passed === blocking.length,
    score: Math.round((passed / blocking.length) * 100),
    gates,
  };
}

// ============================================================
// PART 3 — STRUCTURE SHIFT
// ============================================================
export function evaluateAidmStructure({
  mssConfirmed,
  mssLevel,
  fvgHigh,
  fvgLow,
  structureFlipped,
}) {
  const gates = [];

  gates.push({
    key: "mss",
    label: "MSS confirmed (displacement CHoCH)",
    pass: !!mssConfirmed,
    detail: mssConfirmed ? "Displacement MSS confirmed." : "⏳ Waiting for MSS with displacement.",
  });

  const level = num(mssLevel);
  gates.push({
    key: "mss_level",
    label: "MSS level recorded",
    pass: level !== null,
    detail: level !== null ? `MSS at ${fmt(level)}.` : "No MSS price level entered.",
  });

  const fvgH = num(fvgHigh);
  const fvgL = num(fvgLow);
  const hasFvg = fvgH !== null && fvgL !== null && fvgH > fvgL;
  gates.push({
    key: "fvg",
    label: "FVG bounds marked",
    pass: hasFvg,
    detail: hasFvg ? `FVG ${fmt(fvgL)} – ${fmt(fvgH)}` : "No FVG recorded.",
  });

  gates.push({
    key: "htf",
    label: "No HTF veto (structure not flipped)",
    pass: !structureFlipped,
    warning: !!structureFlipped,
    detail: structureFlipped
      ? "⚠️ HTF veto active — structure flipped against HTF bias."
      : "HTF structure intact.",
  });

  const blocking = gates.filter(g => !g.warning);
  const passed = blocking.filter(g => g.pass).length;

  return {
    ready: passed === blocking.length,
    score: Math.round((passed / blocking.length) * 100),
    gates,
  };
}

// ============================================================
// PART 4 — SNIPER ENTRY
// ============================================================
export function evaluateAidmEntry({
  direction,
  entryPrice,
  stopLoss,
}) {
  const gates = [];

  const entry = num(entryPrice);
  const sl = num(stopLoss);

  gates.push({
    key: "entry",
    label: "Entry price set",
    pass: entry !== null,
    detail: entry !== null ? `Entry ${fmt(entry)}.` : "No entry price.",
  });

  gates.push({
    key: "sl",
    label: "Stop loss set",
    pass: sl !== null,
    detail: sl !== null ? `SL ${fmt(sl)}.` : "No stop loss.",
  });

  let sideOk = false;
  if (entry !== null && sl !== null) {
    if (direction === "bullish") sideOk = sl < entry;
    else if (direction === "bearish") sideOk = sl > entry;
  }
  gates.push({
    key: "sl_side",
    label: "SL on correct side of entry",
    pass: sideOk,
    detail:
      entry === null || sl === null
        ? "Need entry and SL."
        : sideOk
        ? `SL ${fmt(sl)} is on the correct side for a ${direction} trade.`
        : `❌ SL ${fmt(sl)} is on the wrong side for ${direction}.`,
  });

  const passed = gates.filter(g => g.pass).length;
  return {
    ready: passed === gates.length,
    score: Math.round((passed / gates.length) * 100),
    gates,
  };
}

// ============================================================
// TRADE MATH
// ============================================================
export function computeAidmTrade({
  direction,
  entryPrice,
  stopLoss,
  takeProfit1,
  takeProfit2,
  accountSize = 0,
  riskPercent = 1,
  pipSize = 0.0001,
  contractSize = 100000,
}) {
  const entry = num(entryPrice);
  const sl = num(stopLoss);
  const tp1 = num(takeProfit1);
  const tp2 = num(takeProfit2);

  if (entry === null || sl === null) {
    return { invalid: true, invalidReason: "Entry and SL required." };
  }

  const slValid =
    (direction === "bullish" && sl < entry) ||
    (direction === "bearish" && sl > entry);

  if (!slValid) {
    return { invalid: true, invalidReason: "Stop loss is on the wrong side of entry." };
  }

  const risk = Math.abs(entry - sl);
  const riskPips = risk / pipSize;

  const trade = {
    invalid: false,
    direction: direction === "bullish" ? "BUY" : "SELL",
    entry,
    sl,
    tp1: tp1,
    tp2: tp2,
    riskPips: Math.round(riskPips * 10) / 10,
  };

  if (tp1 !== null) {
    const reward1 = Math.abs(tp1 - entry);
    trade.rrTp1 = risk > 0 ? reward1 / risk : 0;
  }
  if (tp2 !== null) {
    const reward2 = Math.abs(tp2 - entry);
    trade.rrTp2 = risk > 0 ? reward2 / risk : 0;
  }

  const acc = num(accountSize);
  const rp = num(riskPercent);
  if (acc !== null && acc > 0 && rp !== null && rp > 0 && risk > 0) {
    const riskAmount = acc * (rp / 100);
    trade.riskAmount = Math.round(riskAmount * 100) / 100;
    const pipValuePerLot = contractSize * pipSize;
    const lots = riskAmount / (riskPips * pipValuePerLot);
    trade.lotSize = Math.round(lots * 100) / 100;
  }

  return trade;
}

// ============================================================
// FULL EVALUATION
// ============================================================
export function evaluateAidm({
  direction = "bullish",
  rangeHigh,
  rangeLow,
  currentPrice,
  session,
  sweptErl = false,
  liquiditySweptType,
  mssConfirmed = false,
  mssLevel,
  fvgHigh,
  fvgLow,
  structureFlipped = false,
  entryPrice,
  stopLoss,
  takeProfit1,
  takeProfit2,
  accountSize = 0,
  riskPercent = 1,
  pipSize = 0.0001,
  contractSize = 100000,
}) {
  const map = evaluateAidmMap({
    direction,
    rangeHigh,
    rangeLow,
    currentPrice,
  });

  const trap = evaluateAidmTrap({
    session,
    sweptErl,
    liquiditySweptType,
    direction,
  });

  const structure = evaluateAidmStructure({
    mssConfirmed,
    mssLevel,
    fvgHigh,
    fvgLow,
    structureFlipped,
  });

  const entry = evaluateAidmEntry({
    direction,
    entryPrice,
    stopLoss,
  });

  const allReady = map.ready && trap.ready && structure.ready && entry.ready;

  let trade = null;
  if (allReady) {
    trade = computeAidmTrade({
      direction,
      entryPrice,
      stopLoss,
      takeProfit1,
      takeProfit2,
      accountSize,
      riskPercent,
      pipSize,
      contractSize,
    });
  } else {
    trade = computeAidmTrade({
      direction,
      entryPrice,
      stopLoss,
      takeProfit1,
      takeProfit2,
      accountSize,
      riskPercent,
      pipSize,
      contractSize,
    });
  }

  const reasons = [];
  if (!map.ready)      map.gates.filter(g => !g.pass && !g.warning).forEach(g => reasons.push(`Map: ${g.label}`));
  if (!trap.ready)     trap.gates.filter(g => !g.pass && !g.warning).forEach(g => reasons.push(`Time & Trap: ${g.label}`));
  if (!structure.ready) structure.gates.filter(g => !g.pass && !g.warning).forEach(g => reasons.push(`Structure: ${g.label}`));
  if (!entry.ready)    entry.gates.filter(g => !g.pass).forEach(g => reasons.push(`Entry: ${g.label}`));

  const levels = map.levels;

  return {
    // Card-friendly top-level fields
    direction,
    rangeHigh: levels.rangeHigh,
    rangeLow:  levels.rangeLow,
    ce:        levels.ce,
    ote62:     levels.ote62,
    ote79:     levels.ote79,
    poiZone:   levels.poiZone,
    currentPrice,
    entryPrice,
    stopLoss,
    targetPrice: takeProfit2 ?? takeProfit1,

    structureFlipped,

    // Per-stage
    context:   { ready: map.ready,       score: map.score,       gates: map.gates },
    wick:      { ready: trap.ready,      score: trap.score,      gates: trap.gates },
    structure: { ready: structure.ready, score: structure.score, gates: structure.gates },
    entry:     { ready: entry.ready,     score: entry.score,     gates: entry.gates },

    trade,
    preEntryReady: allReady && trade && !trade.invalid,
    reasons,
  };
}