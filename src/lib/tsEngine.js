// ============================================================
// TS — TIME-SLICE SETUP ENGINE
// ============================================================
// Sequence: 1H Container → 15M Trap → 5M Zone → 1M Trigger
//
// The previous 1H candle is the container.
// Its High is BSL. Its Low is SSL. Its midpoint is the CE.
// ============================================================

export const TS_BIASES = [
  { key: "bullish", label: "Bullish", emoji: "🟢" },
  { key: "bearish", label: "Bearish", emoji: "🔴" },
];

export const TS_SWEEP_DIRECTIONS = [
  { key: "above", label: "Above (Swept 1H High)", emoji: "⬆️" },
  { key: "below", label: "Below (Swept 1H Low)", emoji: "⬇️" },
];

export const TS_TRIGGER_TYPES = [
  { key: "choch",     label: "1M CHoCH",         emoji: "⚡" },
  { key: "rejection", label: "1M Rejection",     emoji: "📍" },
  { key: "both",      label: "CHoCH + Rejection", emoji: "🎯" },
];

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function computeCe(high, low) {
  const h = num(high);
  const l = num(low);
  if (h === null || l === null || h <= l) return null;
  return (h + l) / 2;
}

// ============================================================
// PHASE 1: THE CONTAINER (1H)
// ============================================================
export function evaluateContainer({
  d1Bias,
  h1High,
  h1Low,
  currentPrice,
}) {
  const gates = [];

  // Bias
  const hasBias = d1Bias === "bullish" || d1Bias === "bearish";
  gates.push({
    key: "bias",
    label: "D1 Bias identified",
    pass: hasBias,
    detail: hasBias ? `Bias: ${d1Bias}` : "❌ No D1 bias. Direction undefined.",
  });

  // Candle Bounds
  const h = num(h1High);
  const l = num(h1Low);
  const hasBounds = h !== null && l !== null && h > l;
  gates.push({
    key: "bounds",
    label: "1H candle bounds marked",
    pass: hasBounds,
    detail: hasBounds ? `Range: ${l} – ${h}` : "❌ Mark the previous 1H High and Low.",
  });

  // Current Price inside range
  const cur = num(currentPrice);
  const priceInRange = hasBounds && cur !== null && cur >= l && cur <= h;
  gates.push({
    key: "price_in_range",
    label: "Price inside the 1H container",
    pass: priceInRange,
    detail: cur === null
      ? "No current price set."
      : !hasBounds
      ? "Need candle bounds."
      : priceInRange
      ? `✅ Price ${cur} is inside the 1H candle.`
      : `⚠️ Price ${cur} is outside the 1H range. Wait for it to return.`,
  });

  const passed = gates.filter(g => g.pass).length;
  const ce = hasBounds ? computeCe(h, l) : null;

  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    ce,
  };
}

// ============================================================
// PHASE 2: THE TRAP (15M)
// ============================================================
export function evaluateTrap({
  d1Bias,
  h1High,
  h1Low,
  sweepDirection,
  sweepLevel,
  mssConfirmed,
  fvgPresent,
}) {
  const gates = [];

  const h = num(h1High);
  const l = num(h1Low);
  const sweepLvl = num(sweepLevel);

  // Sweep direction aligns with bias
  // Bearish bias → sweep ABOVE the high (BSL)
  // Bullish bias → sweep BELOW the low (SSL)
  const sweepValid =
    (d1Bias === "bearish" && sweepDirection === "above") ||
    (d1Bias === "bullish" && sweepDirection === "below");
  gates.push({
    key: "sweep_direction",
    label: "Sweep direction aligns with bias",
    pass: sweepValid,
    detail: sweepValid
      ? `✅ Swept ${sweepDirection} the 1H candle. Correct for ${d1Bias}.`
      : `❌ ${d1Bias} bias requires sweep ${d1Bias === "bearish" ? "above" : "below"}, not ${sweepDirection}.`,
  });

  // Sweep level beyond the candle edge
  let sweepLevelValid = false;
  if (sweepLvl !== null && h !== null && l !== null) {
    if (sweepDirection === "above") sweepLevelValid = sweepLvl > h;
    else if (sweepDirection === "below") sweepLevelValid = sweepLvl < l;
  }
  gates.push({
    key: "sweep_level",
    label: "Sweep extends beyond the 1H edge",
    pass: sweepLevelValid,
    detail: sweepLevelValid
      ? `✅ Wick swept ${sweepLvl}, beyond the 1H edge.`
      : sweepLvl === null
      ? "❌ Mark the sweep wick tip."
      : `❌ Sweep ${sweepLvl} did not extend beyond the 1H edge.`,
  });

  // MSS confirmed
  gates.push({
    key: "mss",
    label: "15M MSS confirmed",
    pass: !!mssConfirmed,
    detail: mssConfirmed
      ? "✅ 15M MSS locked in."
      : "❌ No 15M MSS. Wait for the aggressive reversal.",
  });

  // FVG present
  gates.push({
    key: "fvg",
    label: "15M FVG left by the MSS",
    pass: !!fvgPresent,
    detail: fvgPresent
      ? "✅ FVG confirmed."
      : "❌ No FVG. Weak MSS — abort.",
  });

  const passed = gates.filter(g => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
  };
}

// ============================================================
// PHASE 3: THE ZONE (5M / 15M)
// ============================================================
export function evaluateZone({
  d1Bias,
  h1High,
  h1Low,
  fvgHigh,
  fvgLow,
}) {
  const gates = [];

  const h = num(h1High);
  const l = num(h1Low);
  const fH = num(fvgHigh);
  const fL = num(fvgLow);

  // FVG bounds
  const hasFvg = fH !== null && fL !== null && fH > fL;
  gates.push({
    key: "fvg_bounds",
    label: "FVG bounds marked",
    pass: hasFvg,
    detail: hasFvg ? `FVG: ${fL} – ${fH}` : "❌ Mark the FVG high and low.",
  });

  // Zone check
  let zone = "unknown";
  let zoneValid = null;
  if (hasFvg && h !== null && l !== null && h > l) {
    const ce = computeCe(h, l);
    const fvgCe = computeCe(fH, fL);
    if (ce !== null && fvgCe !== null) {
      zone = fvgCe > ce ? "premium" : "discount";
      const expected = d1Bias === "bearish" ? "premium" : "discount";
      zoneValid = zone === expected;
    }
  }

  gates.push({
    key: "zone",
    label: "FVG in correct premium/discount zone",
    pass: zoneValid === true,
    detail:
      zoneValid === null
        ? "Need FVG bounds + 1H candle to check."
        : zoneValid
        ? `✅ FVG in ${zone.toUpperCase()} zone (correct for ${d1Bias}).`
        : `❌ FVG is in ${zone.toUpperCase()}. ${d1Bias} bias requires ${d1Bias === "bearish" ? "premium" : "discount"} (shallow pullback — abort or use extreme caution).`,
  });

  const passed = gates.filter(g => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    zone,
  };
}

// ============================================================
// PHASE 4: THE TRIGGER (1M)
// ============================================================
export function evaluateTrigger({
  m1TriggerType,
  entryPrice,
}) {
  const gates = [];

  // Trigger type
  const hasTrigger = m1TriggerType === "choch" || m1TriggerType === "rejection" || m1TriggerType === "both";
  gates.push({
    key: "trigger_type",
    label: "1M trigger identified",
    pass: hasTrigger,
    detail: hasTrigger
      ? `✅ Trigger: ${m1TriggerType.toUpperCase()}.`
      : "❌ No 1M trigger. Wait for CHoCH or rejection.",
  });

  // Entry price
  const entry = num(entryPrice);
  gates.push({
    key: "entry",
    label: "Entry price set",
    pass: entry !== null,
    detail: entry !== null ? `Entry: ${entry}.` : "❌ Mark the entry price.",
  });

  const passed = gates.filter(g => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
  };
}

// ============================================================
// PHASE 5: RISK & TARGETS
// ============================================================
export function computeTsTrade({
  d1Bias,
  h1High,
  h1Low,
  sweepLevel,
  entryPrice,
  accountSize = 0,
  riskPercent = 1,
}) {
  const h = num(h1High);
  const l = num(h1Low);
  const sweep = num(sweepLevel);
  const entry = num(entryPrice);

  if (h === null || l === null || sweep === null || entry === null) {
    return null;
  }

  const ce = computeCe(h, l);
  if (ce === null) return null;

  // Stop Loss: beyond the sweep wick
  let sl;
  if (d1Bias === "bearish") {
    // Selling: SL above the sweep high
    sl = sweep;
    const buffer = Math.abs(sweep - h) * 0.1; // 10% buffer beyond the wick
    sl = sweep + buffer;
  } else {
    // Buying: SL below the sweep low
    sl = sweep;
    const buffer = Math.abs(l - sweep) * 0.1;
    sl = sweep - buffer;
  }

  const slValid =
    (d1Bias === "bearish" && sl > entry) ||
    (d1Bias === "bullish" && sl < entry);

  if (!slValid) {
    return {
      invalid: true,
      invalidReason: "Stop loss is on the wrong side of entry — check the sweep and entry direction.",
    };
  }

  // Targets
  // TP1 = CE (partial)
  // TP2 = opposite side of the 1H candle
  const tp1 = ce;
  const tp2 = d1Bias === "bearish" ? l : h;

  // Validate target direction
  const tp1Valid = d1Bias === "bearish" ? tp1 < entry : tp1 > entry;
  const tp2Valid = d1Bias === "bearish" ? tp2 < entry : tp2 > entry;

  if (!tp1Valid || !tp2Valid) {
    return {
      invalid: true,
      invalidReason: "Targets are on the wrong side of entry — check current price vs CE.",
    };
  }

  const risk = Math.abs(entry - sl);
  const reward1 = Math.abs(tp1 - entry);
  const reward2 = Math.abs(tp2 - entry);

  const rr1 = risk > 0 ? reward1 / risk : 0;
  const rr2 = risk > 0 ? reward2 / risk : 0;

  const trade = {
    direction: d1Bias === "bullish" ? "BUY" : "SELL",
    entry,
    sl,
    tp1,
    tp2,
    rr1,
    rr2,
    invalid: false,
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
export function evaluateTs({
  d1Bias,
  h1High,
  h1Low,
  currentPrice,
  sweepDirection,
  sweepLevel,
  mssConfirmed,
  fvgPresent,
  fvgHigh,
  fvgLow,
  m1TriggerType,
  entryPrice,
  accountSize = 0,
  riskPercent = 1,
}) {
  const container = evaluateContainer({
    d1Bias,
    h1High,
    h1Low,
    currentPrice,
  });

  const trap = evaluateTrap({
    d1Bias,
    h1High,
    h1Low,
    sweepDirection,
    sweepLevel,
    mssConfirmed,
    fvgPresent,
  });

  const zone = evaluateZone({
    d1Bias,
    h1High,
    h1Low,
    fvgHigh,
    fvgLow,
  });

  const trigger = evaluateTrigger({
    m1TriggerType,
    entryPrice,
  });

  const allReady =
    container.ready && trap.ready && zone.ready && trigger.ready;

  let trade = null;
  if (allReady) {
    trade = computeTsTrade({
      d1Bias,
      h1High,
      h1Low,
      sweepLevel,
      entryPrice,
      accountSize,
      riskPercent,
    });
  }

  const reasons = [];
  if (!container.ready) container.gates.filter(g => !g.pass).forEach(g => reasons.push(`Container: ${g.label}`));
  if (!trap.ready)      trap.gates.filter(g => !g.pass).forEach(g => reasons.push(`Trap: ${g.label}`));
  if (!zone.ready)      zone.gates.filter(g => !g.pass).forEach(g => reasons.push(`Zone: ${g.label}`));
  if (!trigger.ready)   trigger.gates.filter(g => !g.pass).forEach(g => reasons.push(`Trigger: ${g.label}`));

  return {
    container,
    trap,
    zone,
    trigger,
    trade,
    preEntryReady: allReady && trade && !trade.invalid,
    reasons,
    ce: container.ce,
    fvgZone: zone.zone,
  };
}