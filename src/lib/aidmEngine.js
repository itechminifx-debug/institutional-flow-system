// lib/aidmEngine.js
// AIDM (APEX-IDM) — evaluation engine
// Auto-calculates CE, 62%, 79%, OTE zone, POI side, and trade math.

export const AIDM_DIRECTIONS = [
  { value: 'bullish', label: 'Bullish (Buy)' },
  { value: 'bearish', label: 'Bearish (Sell)' },
];

export const AIDM_TIMEFRAMES = ['Daily', '4H', '1H', '15M', '5M', '1M'];

export const AIDM_SESSIONS = [
  { value: 'london', label: 'London (02:00–05:00 EST)' },
  { value: 'ny_am', label: 'New York AM (07:00–10:00 EST)' },
];

export const AIDM_EVENT_TYPES = [
  'sweep',
  'mss',
  'poi_tap',
  'entry',
  'partial',
  'be',
  'trail',
  'exit',
  'invalidation',
];

// ---------------------------------------------------------
// 1. AUTO LEVELS  (CE / 62 / 79 / OTE zone / POI side)
// ---------------------------------------------------------
export function computeApexLevels({ rangeHigh, rangeLow, direction }) {
  const H = Number(rangeHigh);
  const L = Number(rangeLow);

  const valid =
    Number.isFinite(H) &&
    Number.isFinite(L) &&
    H > 0 &&
    L > 0 &&
    H > L;

  if (!valid) {
    return {
      valid: false,
      direction,
      rangeHigh: H || null,
      rangeLow: L || null,
      rangeSize: null,
      ce: null,
      ote62: null,
      ote79: null,
      oteZoneLow: null,
      oteZoneHigh: null,
      poiZone: null,
      premiumBoundary: null,
      discountBoundary: null,
      distances: null,
    };
  }

  const size = H - L;
  const ce = (H + L) / 2;

  let ote62, ote79, poiZone;

  if (direction === 'bullish') {
    // bullish → retrace from LOW, POI in DISCOUNT
    ote62 = L + size * 0.62;
    ote79 = L + size * 0.79;
    poiZone = 'discount';
  } else {
    // bearish → retrace from HIGH, POI in PREMIUM
    ote62 = H - size * 0.62;
    ote79 = H - size * 0.79;
    poiZone = 'premium';
  }

  const oteZoneLow  = Math.min(ote62, ote79);
  const oteZoneHigh = Math.max(ote62, ote79);

  return {
    valid: true,
    direction,
    rangeHigh: H,
    rangeLow: L,
    rangeSize: size,
    ce,
    ote62,
    ote79,
    oteZoneLow,
    oteZoneHigh,
    poiZone,                       // 'discount' | 'premium'
    premiumBoundary: ce,
    discountBoundary: ce,
    distances: {
      ceTo62: size * 0.12,
      between62And79: size * 0.17,
    },
  };
}

// ---------------------------------------------------------
// 2. TRADE MATH  (SL side validation + lot size)
// ---------------------------------------------------------
export function computeAidmTrade({
  direction,
  entry,
  stopLoss,
  takeProfit1,
  takeProfit2,
  accountSize,
  riskPercent,
  pipSize = 0.0001,
  contractSize = 100000,
}) {
  const e  = Number(entry);
  const sl = Number(stopLoss);
  const tp1 = Number(takeProfit1);
  const tp2 = Number(takeProfit2);

  const result = {
    valid: false,
    errors: [],
    entry: e || null,
    sl: sl || null,
    tp1: tp1 || null,
    tp2: tp2 || null,
    riskPips: null,
    rewardPipsTp1: null,
    rewardPipsTp2: null,
    rrTp1: null,
    rrTp2: null,
    riskAmount: null,
    lotSize: null,
  };

  if (!Number.isFinite(e) || !Number.isFinite(sl) || e <= 0 || sl <= 0) {
    result.errors.push('Entry and Stop Loss must be positive numbers.');
    return result;
  }

  // ---- SL side validation ----
  if (direction === 'bullish' && sl >= e) {
    result.errors.push('Bullish setup: stop loss must be BELOW entry.');
  }
  if (direction === 'bearish' && sl <= e) {
    result.errors.push('Bearish setup: stop loss must be ABOVE entry.');
  }

  // ---- TP side validation (soft) ----
  if (Number.isFinite(tp1)) {
    if (direction === 'bullish' && tp1 <= e) {
      result.errors.push('Bullish setup: TP1 must be above entry.');
    }
    if (direction === 'bearish' && tp1 >= e) {
      result.errors.push('Bearish setup: TP1 must be below entry.');
    }
  }

  if (result.errors.length) return result;

  const riskPrice = Math.abs(e - sl);
  const riskPips  = riskPrice / pipSize;

  result.riskPips = riskPips;

  if (Number.isFinite(tp1)) {
    const rewardPriceTp1 = Math.abs(tp1 - e);
    result.rewardPipsTp1 = rewardPriceTp1 / pipSize;
    result.rrTp1 = rewardPriceTp1 / riskPrice;
  }

  if (Number.isFinite(tp2)) {
    const rewardPriceTp2 = Math.abs(tp2 - e);
    result.rewardPipsTp2 = rewardPriceTp2 / pipSize;
    result.rrTp2 = rewardPriceTp2 / riskPrice;
  }

  // ---- Lot size (forex default) ----
  const acc = Number(accountSize);
  const rp  = Number(riskPercent);

  if (Number.isFinite(acc) && acc > 0 && Number.isFinite(rp) && rp > 0) {
    const riskAmount = acc * (rp / 100);
    const pipValuePerLot = contractSize * pipSize;
    const lots = riskAmount / (riskPips * pipValuePerLot);
    result.riskAmount = riskAmount;
    result.lotSize = Math.round(lots * 100) / 100;
  }

  result.valid = true;
  return result;
}

// ---------------------------------------------------------
// 3. APEX 6-PART CHECKLIST EVALUATION
// ---------------------------------------------------------
export function evaluateAidm(setup = {}) {
  const layers = [];

  // PART 1 — Map
  const levels = computeApexLevels({
    rangeHigh: setup.range_high,
    rangeLow:  setup.range_low,
    direction: setup.direction,
  });

  layers.push({
    part: 1,
    title: 'Map (Dealing Range + CE + OTE)',
    ready: levels.valid,
    gates: [
      { key: 'range',  label: 'Range High / Low valid', passed: levels.valid },
      { key: 'ce',     label: '50% CE computed',         passed: !!levels.ce },
      { key: 'ote',    label: '62–79% OTE computed',     passed: !!levels.ote62 && !!levels.ote79 },
      { key: 'zone',   label: `POI in ${levels.poiZone || '—'}`, passed: !!levels.poiZone },
    ],
  });

  // PART 2 — Time & Trap
  const inSession = ['london','ny_am'].includes(setup.session);
  layers.push({
    part: 2,
    title: 'Time & Trap (Kill Zone + Sweep)',
    ready: inSession && setup.swept_erl === true,
    gates: [
      { key: 'session', label: 'Inside kill zone', passed: inSession },
      { key: 'sweep',   label: 'ERL swept (BSL/SSL)', passed: setup.swept_erl === true },
    ],
  });

  // PART 3 — Structure Shift
  layers.push({
    part: 3,
    title: 'Structure Shift (MSS + FVG)',
    ready: setup.mss_confirmed === true,
    gates: [
      { key: 'mss', label: 'Displacement MSS confirmed', passed: setup.mss_confirmed === true },
    ],
  });

  // PART 4 — Sniper Entry
  const trade = computeAidmTrade({
    direction: setup.direction,
    entry: setup.entry_price,
    stopLoss: setup.stop_loss,
    takeProfit1: setup.take_profit_1,
    takeProfit2: setup.take_profit_2,
    accountSize: setup.account_size,
    riskPercent: setup.risk_percent,
    pipSize: setup.pip_size || 0.0001,
    contractSize: setup.contract_size || 100000,
  });

  layers.push({
    part: 4,
    title: 'Sniper Entry (Entry + SL valid)',
    ready: trade.valid,
    errors: trade.errors,
    gates: [
      { key: 'entry', label: 'Entry set',         passed: Number(setup.entry_price) > 0 },
      { key: 'sl',    label: 'SL set',            passed: Number(setup.stop_loss) > 0 },
      { key: 'side',  label: 'SL on correct side', passed: trade.valid },
    ],
  });

  // PART 5 — Risk & Targets
  const hasTp1 = Number(setup.take_profit_1) > 0;
  const hasTp2 = Number(setup.take_profit_2) > 0;
  const riskOk = Number(setup.risk_percent) > 0 && Number(setup.risk_percent) <= 1;

  layers.push({
    part: 5,
    title: 'Risk & Targets (CE + Opposite ERL)',
    ready: hasTp1 && hasTp2 && riskOk,
    gates: [
      { key: 'tp1',  label: 'TP1 = 50% CE',        passed: hasTp1 },
      { key: 'tp2',  label: 'TP2 = Opposite ERL',  passed: hasTp2 },
      { key: 'risk', label: 'Risk ≤ 1% of account', passed: riskOk },
    ],
  });

  // PART 6 — Golden Rules (pre-entry summary)
  const rules = [
    { key: 'r1',  label: 'Not trading a raw BOS breakout',     passed: setup.swept_erl === true },
    { key: 'r2',  label: 'CHoCH has displacement (MSS)',       passed: setup.mss_confirmed === true },
    { key: 'r3',  label: 'Sweep happened before MSS',          passed: setup.swept_erl === true && setup.mss_confirmed === true },
    { key: 'r4',  label: 'Structure not HTF-flipped',          passed: setup.structure_flipped !== true },
    { key: 'r5',  label: 'POI in correct zone',                passed: !!levels.poiZone },
    { key: 'r6',  label: 'Risk ≤ 1%',                          passed: riskOk },
    { key: 'r7',  label: 'DOL defined (TP2 present)',          passed: hasTp2 },
  ];

  const allReady = layers.every(l => l.ready) && rules.every(r => r.passed);

  return {
    levels,
    trade,
    layers,
    rules,
    preEntryReady: allReady,
  };
}