// lib/apxEngine.js
// APX (Apex) engine — pure functions, no React, no DB imports.
// Mirrors FWT conventions: computeZones → runGates → scoreSetup → buildApxRecord.

// ------------------------------------------------------------
// Constants
// ------------------------------------------------------------

export const SETUP_TYPES = ['standard', 'shallow', 'turtle_soup'];

export const TRADE_RESULTS = ['active', 'won', 'lost'];

export const DIRECTIONS = ['long', 'short'];

export const BIASES = ['bullish', 'bearish'];

// Deep-zone thresholds (fraction of impulse leg retraced)
const DEEP_ZONE_MIN = 0.62;   // standard must reach >= 62%
const SHALLOW_MAX = 0.50;     // shallow must be <= 50%
const SHALLOW_HARD_CAP = 0.62; // shallow invalid above 62%
const STANDARD_HARD_FLOOR = 0.50; // standard invalid below 50%

// Turtle Soup displacement proxy: >= 50% of prior impulse if ATR missing
const TS_DISPLACEMENT_PROXY = 0.50;

// RR hard floor
const MIN_RR = 2;

// ------------------------------------------------------------
// Small helpers
// ------------------------------------------------------------

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

const round = (v, dp = 8) =>
  isNum(v) ? Math.round(v * 10 ** dp) / 10 ** dp : v;

const rangeOf = (high, low) => {
  if (!isNum(high) || !isNum(low)) return null;
  const r = high - low;
  return r > 0 ? r : null;
};

const pct = (part, whole) => {
  if (!isNum(part) || !isNum(whole) || whole <= 0) return null;
  return part / whole;
};

// ------------------------------------------------------------
// 1. computeZones
//    Dealing range → CE, Premium, Discount.
//    Impulse leg → OTE (retracement of the displacement leg).
//    Direction-agnostic outputs; caller picks the band they need.
// ------------------------------------------------------------

export function computeZones({
  rangeHigh,
  rangeLow,
  impulseHigh,
  impulseLow,
  direction,
} = {}) {
  const dealingRange = rangeOf(rangeHigh, rangeLow);
  const impulseRange = rangeOf(impulseHigh, impulseLow);

  const ce = dealingRange != null ? (rangeHigh + rangeLow) / 2 : null;

  const premiumLow = dealingRange != null ? rangeLow + 0.5 * dealingRange : null;
  const premiumHigh = dealingRange != null ? rangeHigh : null;

  const discountLow = dealingRange != null ? rangeLow : null;
  const discountHigh = dealingRange != null ? rangeLow + 0.5 * dealingRange : null;

  let oteLow = null;
  let oteHigh = null;

  if (impulseRange != null) {
    if (direction === 'long') {
      // retracement of an up-impulse: 0.618–0.79 back from the high
      oteHigh = impulseHigh - 0.618 * impulseRange;
      oteLow = impulseHigh - 0.79 * impulseRange;
    } else if (direction === 'short') {
      // retracement of a down-impulse: 0.618–0.79 back from the low
      oteLow = impulseLow + 0.618 * impulseRange;
      oteHigh = impulseLow + 0.79 * impulseRange;
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
// 2. Gate primitives
//    Each gate returns { pass: boolean, reason: string }.
//    runGates collects them into a named map + flat veto list.
// ------------------------------------------------------------

const gate = (pass, reason = '') => ({ pass: !!pass, reason });

const sideOf = (price, entry, direction) => {
  if (!isNum(price) || !isNum(entry) || !direction) return 'unknown';
  if (price === entry) return 'equal';
  if (direction === 'long') return price < entry ? 'below' : 'above';
  if (direction === 'short') return price > entry ? 'above' : 'below';
  return 'unknown';
};

// ------------------------------------------------------------
// 3. runGates
//    Shared base gates + setup-specific gates + hard vetoes.
//    Returns { pass, vetoes, gates }.
// ------------------------------------------------------------

export function runGates(input = {}) {
  const {
    setupType,
    direction,
    bias,
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
  } = input;

  const zones = computeZones({
    rangeHigh,
    rangeLow,
    impulseHigh,
    impulseLow,
    direction,
  });

  const gates = {};
  const vetoes = [];

  const push = (name, result, { veto = false } = {}) => {
    gates[name] = result;
    if (!result.pass && veto) vetoes.push(result.reason || name);
  };

  // ---- Base gates (every setup) ----
  push('bias', gate(bias === 'bullish' || bias === 'bearish', 'HTF bias not set'), { veto: true });

  push('dealingRange', gate(zones.dealingRange != null, 'Dealing range not defined (high must be > low)'), { veto: true });

  push('mss', gate(!!mssConfirmed && isNum(mssLevel), 'MSS not confirmed / level missing'), { veto: true });

  push('inducement', gate(!!inducementBroken && isNum(inducementLevel), 'Inducement not identified or not broken'), { veto: true });

  // FVG on the correct side of MSS
  let fvgSideOk = false;
  if (isNum(fvgHigh) && isNum(fvgLow) && isNum(mssLevel)) {
    if (direction === 'long') fvgSideOk = fvgLow > mssLevel || fvgHigh > mssLevel;
    else if (direction === 'short') fvgSideOk = fvgHigh < mssLevel || fvgLow < mssLevel;
  }
  push('fvgSide', gate(fvgSideOk, 'FVG bounds missing or FVG on wrong side of MSS'), { veto: true });

  push('direction', gate(DIRECTIONS.includes(direction), 'Direction (long/short) not set'), { veto: true });

  // Entry / SL / TP present
  push(
    'levels',
    gate(isNum(entryPrice) && isNum(stopLoss) && isNum(targetPrice), 'Entry / SL / TP not all set'),
    { veto: true }
  );

  // SL beyond inducement/MSS extreme
  let slBeyondOk = false;
  if (isNum(stopLoss) && isNum(entryPrice)) {
    if (direction === 'long') {
      const extreme = Math.min(
        ...[inducementLevel, mssLevel, zones.impulseLow].filter(isNum)
      );
      slBeyondOk = isNum(extreme) ? stopLoss < extreme : stopLoss < entryPrice;
    } else if (direction === 'short') {
      const extreme = Math.max(
        ...[inducementLevel, mssLevel, zones.impulseHigh].filter(isNum)
      );
      slBeyondOk = isNum(extreme) ? stopLoss > extreme : stopLoss > entryPrice;
    }
  }
  push('slBeyondExtreme', gate(slBeyondOk, 'SL is not beyond the inducement/MSS extreme'), { veto: true });

  // SL on correct side of entry
  const slSide = sideOf(stopLoss, entryPrice, direction);
  const slSideOk =
    (direction === 'long' && slSide === 'below') ||
    (direction === 'short' && slSide === 'above');
  push('slSide', gate(slSideOk, 'SL on wrong side of entry'), { veto: true });

  // TP on correct side of entry
  const tpSide = sideOf(targetPrice, entryPrice, direction);
  const tpSideOk =
    (direction === 'long' && tpSide === 'above') ||
    (direction === 'short' && tpSide === 'below');
  push('tpSide', gate(tpSideOk, 'TP on wrong side of entry'), { veto: true });

  // RR >= 2
  let rr = null;
  if (isNum(entryPrice) && isNum(stopLoss) && isNum(targetPrice)) {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(targetPrice - entryPrice);
    rr = risk > 0 ? reward / risk : null;
  }
  push('rr', gate(isNum(rr) && rr >= MIN_RR, `RR < ${MIN_RR} or risk is zero`), { veto: true });

  // ---- Setup-specific gates ----
  const impulseRange = zones.impulseRange;

  // Pullback depth = how much of the impulse was retraced to the entry
  let pullbackPct = null;
  if (impulseRange != null && isNum(entryPrice)) {
    if (direction === 'long') pullbackPct = pct(impulseHigh - entryPrice, impulseRange);
    else if (direction === 'short') pullbackPct = pct(entryPrice - impulseLow, impulseRange);
  }

  if (setupType === 'standard') {
    push(
      'stdDeepZone',
      gate(isNum(pullbackPct) && pullbackPct >= DEEP_ZONE_MIN,
        `Standard: pullback ${fmtPct(pullbackPct)} < ${DEEP_ZONE_MIN * 100}% deep zone`),
      { veto: true }
    );

    // price inside premium (short) / discount (long)
    let zoneOk = false;
    if (isNum(entryPrice) && zones.ce != null) {
      if (direction === 'short') zoneOk = entryPrice >= zones.ce;
      else if (direction === 'long') zoneOk = entryPrice <= zones.ce;
    }
    push('stdZone', gate(zoneOk, 'Standard: entry not inside Premium (short) / Discount (long)'));

    // inducement inside deep zone (proxy: inducement beyond 62% retrace)
    let indDeep = false;
    if (isNum(inducementLevel) && impulseRange != null) {
      const indPct =
        direction === 'long'
          ? pct(impulseHigh - inducementLevel, impulseRange)
          : pct(inducementLevel - impulseLow, impulseRange);
      indDeep = isNum(indPct) && indPct >= DEEP_ZONE_MIN;
    }
    push('stdInducementDeep', gate(indDeep, 'Standard: inducement not inside deep zone'));

    // hard veto: standard with pullback < 50%
    if (isNum(pullbackPct) && pullbackPct < STANDARD_HARD_FLOOR) {
      vetoes.push(`Standard invalid: pullback ${fmtPct(pullbackPct)} < 50% (should be Shallow)`);
    }
  }

  if (setupType === 'shallow') {
    push(
      'shPullbackMax',
      gate(isNum(pullbackPct) && pullbackPct <= SHALLOW_MAX,
        `Shallow: pullback ${fmtPct(pullbackPct)} > ${SHALLOW_MAX * 100}%`),
      { veto: true }
    );

    // tapped CE or 50 EMA
    let tapped = false;
    if (isNum(entryPrice)) {
      const nearCE = zones.ce != null && Math.abs(entryPrice - zones.ce) <= 0.005 * zones.dealingRange;
      const nearEMA = isNum(ema50Value) && Math.abs(entryPrice - ema50Value) <= 0.005 * zones.dealingRange;
      tapped = nearCE || nearEMA || !!ema50Tapped;
    }
    push('shTap', gate(tapped, 'Shallow: pullback did not tap CE or 50 EMA'));

    // tight SL: SL <= 25% of impulse leg
    let tightSL = false;
    if (isNum(stopLoss) && isNum(entryPrice) && impulseRange != null) {
      tightSL = Math.abs(entryPrice - stopLoss) <= 0.25 * impulseRange;
    }
    push('shTightSL', gate(tightSL, 'Shallow: SL is not tight (<= 25% of impulse leg)'));

    // hard veto: shallow with pullback > 62%
    if (isNum(pullbackPct) && pullbackPct > SHALLOW_HARD_CAP) {
      vetoes.push(`Shallow invalid: pullback ${fmtPct(pullbackPct)} > 62% (should be Standard)`);
    }
  }

  if (setupType === 'turtle_soup') {
    // sweep beyond dealing range extreme
    let swept = false;
    if (isNum(sweepLevel) && zones.dealingRange != null) {
      swept = sweepLevel > rangeHigh || sweepLevel < rangeLow;
    }
    push('tsSweep', gate(swept, 'Turtle Soup: no sweep beyond dealing range extreme'), { veto: true });

    // close back inside range (hard gate)
    push(
      'tsCloseBack',
      gate(!!sweepClosedBackInside, 'Turtle Soup: sweep candle did not close back inside range'),
      { veto: true }
    );

    // displacement >= 1xATR if ATR given, else >= 50% of prior impulse
    let dispOk = false;
    let dispReason = 'Turtle Soup: displacement not provided';
    if (isNum(displacementRange)) {
      if (isNum(atrValue)) {
        dispOk = displacementRange >= atrValue;
        dispReason = `Turtle Soup: displacement ${displacementRange} < ATR ${atrValue}`;
      } else if (impulseRange != null) {
        dispOk = displacementRange >= TS_DISPLACEMENT_PROXY * impulseRange;
        dispReason = `Turtle Soup: displacement < 50% of prior impulse (no ATR provided)`;
      }
    }
    push('tsDisplacement', gate(dispOk, dispReason), { veto: true });

    // reversal MSS confirmed
    push(
      'tsMSS',
      gate(!!mssConfirmed && isNum(mssLevel), 'Turtle Soup: reversal MSS not confirmed'),
      { veto: true }
    );
  }

  // unknown setup type
  if (!SETUP_TYPES.includes(setupType)) {
    vetoes.push('Setup type not selected (standard / shallow / turtle_soup)');
  }

  return {
    pass: vetoes.length === 0 && Object.values(gates).every((g) => g.pass),
    vetoes,
    gates,
    zones,
    rr: round(rr, 4),
    pullbackPct: isNum(pullbackPct) ? round(pullbackPct, 4) : null,
  };
}

function fmtPct(p) {
  return isNum(p) ? `${(p * 100).toFixed(1)}%` : 'n/a';
}

// ------------------------------------------------------------
// 4. scoreSetup
//    Weighted score by stage. Mirrors FWT's byStage breakdown.
//    total is 0–100. Stage weights: context 25, liquidity 25,
//    inducement 25, entry 25.
// ------------------------------------------------------------

const STAGE_WEIGHTS = { context: 25, liquidity: 25, inducement: 25, entry: 25 };

const STAGE_MAP = {
  bias: 'context',
  dealingRange: 'context',
  direction: 'context',
  mss: 'inducement',
  inducement: 'inducement',
  fvgSide: 'inducement',
  stdInducementDeep: 'inducement',
  tsMSS: 'inducement',
  levels: 'entry',
  slBeyondExtreme: 'entry',
  slSide: 'entry',
  tpSide: 'entry',
  rr: 'entry',
  stdDeepZone: 'liquidity',
  stdZone: 'liquidity',
  shPullbackMax: 'liquidity',
  shTap: 'liquidity',
  shTightSL: 'entry',
  tsSweep: 'liquidity',
  tsCloseBack: 'liquidity',
  tsDisplacement: 'liquidity',
};

export function scoreSetup(gates = {}) {
  const byStage = { context: 0, liquidity: 0, inducement: 0, entry: 0 };
  const counts = { context: 0, liquidity: 0, inducement: 0, entry: 0 };

  for (const [name, result] of Object.entries(gates)) {
    const stage = STAGE_MAP[name];
    if (!stage) continue;
    counts[stage] += 1;
    if (result.pass) byStage[stage] += 1;
  }

  const normalised = {};
  let total = 0;
  for (const stage of Object.keys(STAGE_WEIGHTS)) {
    const c = counts[stage];
    const earned = c === 0 ? 1 : byStage[stage] / c; // no gates in stage = full credit
    normalised[stage] = round(earned * STAGE_WEIGHTS[stage], 1);
    total += normalised[stage];
  }

  return {
    total: Math.round(total),
    byStage: normalised,
    raw: byStage,
    counts,
  };
}

// ------------------------------------------------------------
// 5. suggestSetup
//    Nudges the UI toward the right setup type.
//    Returns 'standard' | 'shallow' | 'turtle_soup' | null.
// ------------------------------------------------------------

export function suggestSetup({
  pullbackPct,
  sweepClosedBackInside,
  sweepBeyondRange,
} = {}) {
  if (sweepBeyondRange && sweepClosedBackInside) return 'turtle_soup';
  if (isNum(pullbackPct)) {
    if (pullbackPct <= SHALLOW_MAX) return 'shallow';
    if (pullbackPct >= DEEP_ZONE_MIN) return 'standard';
  }
  return null;
}

// ------------------------------------------------------------
// 6. buildApxRecord
//    Maps form input → snake_case row for apx_setups.
//    Computes rr, confluence_score, reasons, status.
//    Does NOT insert — the page calls supabase.from('apx_setups').insert(row).
// ------------------------------------------------------------

export function buildApxRecord(input = {}, result = null) {
  const gatesResult = result ?? runGates(input);
  const score = scoreSetup(gatesResult.gates);
  const zones = gatesResult.zones;

  const {
    userId,
    pair,
    timeframeStack,
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
    riskPercent,
    notes,
  } = input;

  const status = gatesResult.pass ? 'complete' : 'draft';

  return {
    user_id: userId ?? null,
    status,
    trade_result: status === 'complete' ? 'active' : null,
    r_result: null,

    pair: pair ?? null,
    timeframe_stack: timeframeStack ?? null,
    setup_type: setupType ?? null,
    bias: bias ?? null,
    direction: direction ?? null,

    range_high: numOrNull(rangeHigh),
    range_low: numOrNull(rangeLow),
    ce: numOrNull(zones.ce),

    impulse_high: numOrNull(impulseHigh),
    impulse_low: numOrNull(impulseLow),
    ote_low: numOrNull(zones.oteLow),
    ote_high: numOrNull(zones.oteHigh),

    sweep_level: numOrNull(sweepLevel),
    sweep_closed_back_inside: !!sweepClosedBackInside,
    displacement_range: numOrNull(displacementRange),
    atr_value: numOrNull(atrValue),

    inducement_level: numOrNull(inducementLevel),
    inducement_broken: !!inducementBroken,
    mss_level: numOrNull(mssLevel),
    mss_confirmed: !!mssConfirmed,
    fvg_high: numOrNull(fvgHigh),
    fvg_low: numOrNull(fvgLow),

    ema50_value: numOrNull(ema50Value),
    ema50_tapped: !!ema50Tapped,

    entry_price: numOrNull(entryPrice),
    stop_loss: numOrNull(stopLoss),
    target_price: numOrNull(targetPrice),
    rr: numOrNull(gatesResult.rr),
    risk_percent: numOrNull(riskPercent),

    auto_detected: false,
    confluence_score: score.total,
    reasons: {
      pass: gatesResult.pass,
      vetoes: gatesResult.vetoes,
      gates: gatesResult.gates,
      score,
      pullbackPct: gatesResult.pullbackPct,
      suggestedSetup: suggestSetup({
        pullbackPct: gatesResult.pullbackPct,
        sweepClosedBackInside,
        sweepBeyondRange:
          isNum(sweepLevel) &&
          isNum(rangeHigh) &&
          isNum(rangeLow) &&
          (sweepLevel > rangeHigh || sweepLevel < rangeLow),
      }),
    },

    notes: notes ?? null,
  };
}

const numOrNull = (v) => (isNum(v) ? v : null);

// ------------------------------------------------------------
// Default export — convenience bundle for pages
// ------------------------------------------------------------

export default {
  SETUP_TYPES,
  TRADE_RESULTS,
  DIRECTIONS,
  BIASES,
  computeZones,
  runGates,
  scoreSetup,
  suggestSetup,
  buildApxRecord,
};