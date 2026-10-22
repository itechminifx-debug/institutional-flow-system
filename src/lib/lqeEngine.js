// ============================================================
// LQE — LIQUIDITY ENGINE (FULL + ZONE SIDE + SHALLOW PULLBACK + 50 EMA)
// ============================================================

import { computeCe } from "@/lib/liquidityZoneEngine";

export const LQE_SESSIONS = [
  { key: "asian",  label: "Asian",      hint: "Accumulation. Sets the range." },
  { key: "london", label: "London KZ",  hint: "Manipulation. Judas Swing." },
  { key: "ny_am",  label: "NY AM KZ",   hint: "Distribution. Highest volume." },
  { key: "ny_pm",  label: "NY PM",      hint: "Secondary window." },
];

export const SWEEP_TYPES = [
  { key: "bsl", label: "BSL (Buy-Side)", emoji: "🔵" },
  { key: "ssl", label: "SSL (Sell-Side)", emoji: "🟠" },
];

export const PD_ARRAY_TYPES = [
  { key: "fvg",              label: "Fair Value Gap (FVG)",      emoji: "📊", rank: 2,  family: "imbalance" },
  { key: "ob",               label: "Order Block (OB)",          emoji: "🧱", rank: 1,  family: "block"     },
  { key: "breaker",          label: "Breaker Block",             emoji: "🔨", rank: 3,  family: "reversal"  },
  { key: "mitigation",       label: "Mitigation Block",          emoji: "🔁", rank: 4,  family: "block"     },
  { key: "rejection_block",  label: "Rejection Block",           emoji: "📍", rank: 5,  family: "reversal"  },
  { key: "liquidity_void",   label: "Liquidity Void",            emoji: "🕳️", rank: 6,  family: "imbalance" },
  { key: "volume_imbalance", label: "Volume Imbalance",          emoji: "📉", rank: 8,  family: "imbalance" },
  { key: "propulsion",       label: "Propulsion Block",          emoji: "🚀", rank: 7,  family: "block"     },
  { key: "ote",              label: "Optimal Trade Entry (OTE)", emoji: "🎯", rank: 9,  family: "fib"       },
  { key: "ce",               label: "Consequent Encroachment",   emoji: "➗", rank: 10, family: "fib"       },
];

export function pdArrayTypeInfo(key) {
  return PD_ARRAY_TYPES.find(t => t.key === key) || PD_ARRAY_TYPES[0];
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

// ============================================================
// 50 EMA BIAS FILTER
// ============================================================
export function evaluateEmaBias({ ema50Value, currentPrice, dailyBias }) {
  const ema = num(ema50Value);
  const price = num(currentPrice);

  if (ema === null || price === null) {
    return {
      ready: false,
      bias: "unknown",
      conflict: false,
      gates: [{
        key: "ema50",
        label: "50 EMA bias filter",
        pass: true,
        warning: true,
        detail: "⚠️ 50 EMA value not entered — bias filter not evaluated.",
      }],
    };
  }

  const bias = price > ema ? "bullish" : price < ema ? "bearish" : "flat";
  const conflict = bias !== "flat" && bias !== dailyBias;
  const aligned = bias === dailyBias;

  return {
    ready: true,
    bias,
    emaValue: ema,
    price,
    conflict,
    gates: [{
      key: "ema50",
      label: "50 EMA bias filter",
      pass: !conflict,
      warning: conflict,
      detail:
        bias === "flat"
          ? "Price is at the 50 EMA — no directional conviction."
          : aligned
          ? `✅ Price ${price} is ${bias} vs 50 EMA ${ema}. Trend confluence confirmed.`
          : `⚠️ Price ${price} is ${bias} vs 50 EMA ${ema}. Your bias is ${dailyBias} — trading against the trend filter.`,
    }],
  };
}

// ============================================================
// ZONE SIDE DETECTION
// ============================================================
export function detectZoneSide({ array, dealingRangeHigh, dealingRangeLow, override }) {
  if (override && override !== "auto") {
    return { zoneSide: override, source: "manual" };
  }

  const rHigh = num(dealingRangeHigh);
  const rLow = num(dealingRangeLow);
  const arrHigh = num(array.high);
  const arrLow = num(array.low);

  if (rHigh === null || rLow === null || arrHigh === null || arrLow === null || rHigh <= rLow) {
    return { zoneSide: "unknown", source: "insufficient-data" };
  }

  const ce = computeCe(rHigh, rLow);
  const arrayCe = computeCe(arrHigh, arrLow);

  if (arrayCe === null) {
    return { zoneSide: "unknown", source: "insufficient-data" };
  }

  const tolerance = ce * 0.001;
  if (Math.abs(arrayCe - ce) < tolerance) {
    return { zoneSide: "equilibrium", source: "auto" };
  }

  return {
    zoneSide: arrayCe > ce ? "premium" : "discount",
    source: "auto",
  };
}

// ============================================================
// STEP 1: CONTEXT & TIME (with 50 EMA)
// ============================================================
export function evaluateContext({ dailyBias, session, dealingRangeHigh, dealingRangeLow, currentPrice, ema50Value }) {
  const gates = [];

  const hasBias = dailyBias === "bullish" || dailyBias === "bearish";
  gates.push({
    key: "bias",
    label: "Daily bias set",
    pass: hasBias,
    detail: hasBias ? `Bias: ${dailyBias}` : "Missing daily bias.",
  });

  const emaResult = evaluateEmaBias({ ema50Value, currentPrice, dailyBias });
  gates.push(...emaResult.gates);

  const isKillZone = session === "london" || session === "ny_am";
  gates.push({
    key: "time",
    label: "Inside a Kill Zone",
    pass: isKillZone,
    detail: isKillZone ? `Session: ${session.toUpperCase()}` : "Outside high-probability windows.",
  });

  let inZone = null;
  const rHigh = num(dealingRangeHigh);
  const rLow  = num(dealingRangeLow);
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

  // Only non-warning gates count toward readiness
  const blocking = gates.filter(g => !g.warning);
  const passed = blocking.filter(g => g.pass).length;

  return {
    ready: passed === blocking.length,
    gates,
    score: Math.round((passed / blocking.length) * 100),
    emaBias: emaResult.bias,
    emaConflict: emaResult.conflict,
  };
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
// STEP 4a: ARRAY TYPE + FLIP + ZONE SIDE
// ============================================================
export function validateArrayType({
  array, bias, hasDisplacement, hasChoch, hasSweep,
  dealingRangeHigh, dealingRangeLow, zoneSideOverride,
}) {
  const gates = [];
  const typeInfo = pdArrayTypeInfo(array.array_type);

  const isFlipped = array.flip_state === "flipped";
  const effectiveDirection = isFlipped
    ? (array.direction === "bullish" ? "bearish" : "bullish")
    : array.direction;

  const directionOk = effectiveDirection === bias;
  gates.push({
    key: "dir",
    label: `${typeInfo.emoji} ${typeInfo.label} — direction`,
    pass: directionOk,
    detail: directionOk
      ? isFlipped
        ? `Flipped ${array.direction} → now acting as ${effectiveDirection}. Aligned with ${bias} bias.`
        : `Intact ${array.direction} ${typeInfo.label} aligned with ${bias} bias.`
      : isFlipped
        ? `⚠️ Flipped ${array.direction} → ${effectiveDirection}, but bias is ${bias}.`
        : `❌ ${array.direction} array conflicts with ${bias} bias.`,
  });

  if (isFlipped) {
    const hasFlipDetails = !!array.flip_price || !!array.flip_date;
    gates.push({
      key: "flip_details",
      label: "Flip event recorded",
      pass: hasFlipDetails,
      detail: hasFlipDetails
        ? `Flipped ${array.flip_date || "—"} @ ${array.flip_price || "—"}.`
        : "⚠️ Array marked as flipped but no flip price/date logged.",
    });
  }

  const zoneDetection = detectZoneSide({
    array,
    dealingRangeHigh,
    dealingRangeLow,
    override: zoneSideOverride,
  });
  const zoneSide = zoneDetection.zoneSide;

  const expectedZone = bias === "bullish" ? "discount" : "premium";
  const isWrongZone = zoneSide !== "unknown" && zoneSide !== "equilibrium" && zoneSide !== expectedZone;
  const shallowPullbackMode = isWrongZone;

  gates.push({
    key: "zone_side",
    label: "Zone side (premium/discount)",
    pass: !isWrongZone,
    warning: shallowPullbackMode,
    detail:
      zoneSide === "unknown"
        ? "⚠️ Cannot detect zone side — need dealing range + array bounds."
        : !isWrongZone
        ? `✅ ${bias} ${typeInfo.label} in ${zoneSide} zone (correct). Normal rules apply.`
        : `⚠️ ${bias} ${typeInfo.label} is in ${zoneSide} zone (WRONG). This is a shallow pullback — stricter rules apply.`,
  });

  if (shallowPullbackMode) {
    gates.push({
      key: "shallow_choch",
      label: "Shallow Pullback: LTF CHoCH required",
      pass: !!hasChoch,
      detail: hasChoch
        ? "✅ 5M CHoCH confirmed. Bounce has failed structurally."
        : "🚫 Shallow Pullback without LTF CHoCH = NO TRADE. Wait for the 5M CHoCH.",
    });

    const arrayEdge = bias === "bearish" ? num(array.high) : num(array.low);
    gates.push({
      key: "shallow_tight_stop",
      label: "Shallow Pullback: razor-thin stop",
      pass: true,
      warning: true,
      detail: `⚠️ Stop must be just above ${arrayEdge} (FVG edge), not the sweep extreme.`,
    });

    gates.push({
      key: "shallow_quick_target",
      label: "Shallow Pullback: quick target",
      pass: true,
      warning: true,
      detail: "⚠️ Target the immediate Range Low / nearest SSL. Do not aim for the far DOL.",
    });
  }

  let typeValid = true;
  let typeDetail = "";

  switch (array.array_type) {
    case "breaker":
      typeValid = !!hasChoch;
      typeDetail = typeValid ? "Breaker confirmed by prior structure shift." : "❌ Breaker requires a preceding CHoCH/MSS.";
      break;
    case "rejection_block":
      typeValid = !!hasDisplacement;
      typeDetail = typeValid ? "Rejection confirmed by displacement." : "❌ Rejection Block requires displacement away from the wick.";
      break;
    case "mitigation":
      typeValid = !!hasDisplacement && !hasChoch;
      typeDetail = typeValid ? "Mitigation Block valid (displacement, no structural break)." : "⚠️ Mitigation Block normally forms WITHOUT a structural break.";
      break;
    case "propulsion":
      typeValid = !!hasDisplacement;
      typeDetail = typeValid ? "Propulsion Block valid." : "❌ Propulsion Block requires immediate displacement.";
      break;
    case "ote":
      typeValid = !!hasDisplacement;
      typeDetail = typeValid ? "OTE valid — retracement of impulse." : "❌ OTE requires an impulse (displacement) leg.";
      break;
    case "ce":
      typeValid = !!hasDisplacement;
      typeDetail = typeValid ? "CE valid — 50% of the parent array." : "❌ CE requires a parent array with displacement.";
      break;
    case "liquidity_void":
      typeValid = !!hasDisplacement;
      typeDetail = typeValid ? "Liquidity Void valid." : "❌ Liquidity Void requires a displacement run.";
      break;
    case "volume_imbalance":
      typeValid = true;
      typeDetail = hasDisplacement ? "Volume Imbalance with displacement — strong." : "Volume Imbalance valid but weak (no displacement).";
      break;
    case "fvg":
    case "ob":
    default:
      typeValid = true;
      typeDetail = `${typeInfo.label} — standard array.`;
  }

  gates.push({
    key: "type_req",
    label: `${typeInfo.emoji} ${typeInfo.label} — requirements`,
    pass: typeValid,
    detail: typeDetail,
  });

  const blocking = gates.filter(g => !g.warning);
  const passed = blocking.filter(g => g.pass).length;
  return {
    ready: passed === blocking.length,
    gates,
    score: Math.round((passed / blocking.length) * 100),
    zoneSide,
    shallowPullbackMode,
  };
}

// ============================================================
// STEP 4b: PD ARRAY MATRIX (LADDER)
// ============================================================
export function evaluateLadder({
  arrays = [], currentPrice, dailyBias,
  hasDisplacement, hasChoch, hasSweep,
  dealingRangeHigh, dealingRangeLow, zoneSideOverride,
}) {
  const gates = [];
  const current = num(currentPrice);

  const validArrays = arrays.filter(a => num(a.high) !== null && num(a.low) !== null);

  if (validArrays.length === 0) {
    return {
      ready: false,
      gates: [{ key: "no_arrays", label: "No arrays logged", pass: false, detail: "Add at least one array to the ladder." }],
      score: 0,
      ladderInfo: null,
      zoneSide: "unknown",
      shallowPullbackMode: false,
    };
  }

  const sorted = [...validArrays].sort((a, b) => num(b.high) - num(a.high));
  const topEdge = num(sorted[0].high);
  const bottomEdge = num(sorted[sorted.length - 1].low);
  const activeFVG = sorted.find(a => current !== null && current >= num(a.low) && current <= num(a.high));

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

  gates.push({
    key: "in_fvg",
    label: "Price is inside an array",
    pass: !!activeFVG,
    detail: activeFVG ? `Inside ${pdArrayTypeInfo(activeFVG.array_type).label} (${activeFVG.low} - ${activeFVG.high})` : "Price not inside any array.",
  });

  gates.push({
    key: "not_middle",
    label: "Not in the middle of the ladder",
    pass: position !== "middle",
    detail: position === "middle" ? "⚠️ Middle of ladder — NO TRADE." : position === "top" ? "At top edge." : position === "bottom" ? "At bottom edge." : "Outside ladder.",
  });

  let zoneSide = "unknown";
  let shallowPullbackMode = false;

  if (activeFVG) {
    const typeValidation = validateArrayType({
      array: activeFVG,
      bias: dailyBias,
      hasDisplacement,
      hasChoch,
      hasSweep,
      dealingRangeHigh,
      dealingRangeLow,
      zoneSideOverride,
    });
    gates.push(...typeValidation.gates);
    zoneSide = typeValidation.zoneSide;
    shallowPullbackMode = typeValidation.shallowPullbackMode;
  }

  const blocking = gates.filter(g => !g.warning);
  const passed = blocking.filter(g => g.pass).length;
  return {
    ready: passed === blocking.length,
    gates,
    score: Math.round((passed / blocking.length) * 100),
    ladderInfo: { topEdge, bottomEdge, position, activeFVG, count: sorted.length, sorted },
    zoneSide,
    shallowPullbackMode,
  };
}

// ============================================================
// STEP 5 & 6: TRADE MATH
// ============================================================
export function computeLqeTrade({
  dailyBias, activeFVG, sweepLevel, targetPrice,
  accountSize = 0, riskPercent = 1,
  shallowPullbackMode = false,
}) {
  if (!activeFVG) return null;
  const zHigh = num(activeFVG.high);
  const zLow  = num(activeFVG.low);
  const dol   = num(targetPrice);
  const sweep = num(sweepLevel);
  if (!zHigh || !zLow || !dol) return null;

  const entry = computeCe(zHigh, zLow);
  if (!entry) return null;

  let sl;
  if (shallowPullbackMode) {
    sl = dailyBias === "bullish" ? zLow : zHigh;
  } else {
    sl = sweep !== null ? sweep : (dailyBias === "bullish" ? zLow : zHigh);
  }

  const slValid = (dailyBias === "bullish" && sl < entry) || (dailyBias === "bearish" && sl > entry);
  if (!slValid) return { invalid: true, invalidReason: "Stop is on wrong side of entry." };

  const risk = Math.abs(entry - sl);
  const reward = Math.abs(dol - entry);
  const rr = risk > 0 ? reward / risk : 0;
  const oteEntry = dailyBias === "bullish" ? sl + ((entry - sl) * 0.705) : sl - ((entry - sl) * 0.705);

  const trade = {
    direction: dailyBias === "bullish" ? "BUY" : "SELL",
    entry,
    oteEntry,
    sl,
    tp: dol,
    rr,
    invalid: false,
    shallowPullbackMode,
  };

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
  dailyBias, session, dealingRangeHigh, dealingRangeLow, currentPrice, ema50Value,
  sweepType, sweepLevel, sweepConfirmed, smtDivergence,
  mssConfirmed, chochConfirmed, displacementPresent,
  arrays = [],
  targetPrice, targetLiquidityType,
  zoneSideOverride = null,
  accountSize = 0, riskPercent = 1,
}) {
  const context   = evaluateContext({ dailyBias, session, dealingRangeHigh, dealingRangeLow, currentPrice, ema50Value });
  const sweep     = evaluateSweep({ dailyBias, sweepType, sweepLevel, sweepConfirmed, smtDivergence });
  const structure = evaluateStructure({ mssConfirmed, chochConfirmed, displacementPresent });
  const ladder    = evaluateLadder({
    arrays, currentPrice, dailyBias,
    hasDisplacement: !!displacementPresent,
    hasChoch: !!chochConfirmed || !!mssConfirmed,
    hasSweep: !!sweepConfirmed,
    dealingRangeHigh,
    dealingRangeLow,
    zoneSideOverride,
  });

  const isReady = context.ready && sweep.ready && structure.ready && ladder.ready;
  let trade = null;
  if (isReady && ladder.ladderInfo?.activeFVG) {
    trade = computeLqeTrade({
      dailyBias,
      activeFVG: ladder.ladderInfo.activeFVG,
      sweepLevel,
      targetPrice,
      accountSize,
      riskPercent,
      shallowPullbackMode: ladder.shallowPullbackMode,
    });
  }

  const reasons = [];
  if (!context.ready)   context.gates.filter(g => !g.pass && !g.warning).forEach(g => reasons.push(`Context: ${g.label}`));
  if (!sweep.ready)     sweep.gates.filter(g => !g.pass && !g.bonus).forEach(g => reasons.push(`Sweep: ${g.label}`));
  if (!structure.ready) structure.gates.filter(g => !g.pass).forEach(g => reasons.push(`Structure: ${g.label}`));
  if (!ladder.ready)    ladder.gates.filter(g => !g.pass && !g.warning).forEach(g => reasons.push(`Ladder: ${g.label}`));

  return {
    context, sweep, structure, ladder, trade,
    preEntryReady: isReady && trade && !trade.invalid,
    reasons,
    zoneSide: ladder.zoneSide,
    shallowPullbackMode: ladder.shallowPullbackMode,
    emaBias: context.emaBias,
    emaConflict: context.emaConflict,
  };
}