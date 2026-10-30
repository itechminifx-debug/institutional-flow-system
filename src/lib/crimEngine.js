// lib/crimEngine.js
// CRIM (CRT + IDM + MSS) — The Golden Pipeline

export const CRIM_SESSIONS = [
  { key: "london", label: "London (02:00–05:00 EST)" },
  { key: "ny_am", label: "New York AM (07:00–10:00 EST)" },
];

export const CRIM_TIMEFRAMES = ["4H", "1H", "15M", "5M"];

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

// ============================================================
// 1. AUTO-CALCULATE LEVELS (CE, 62%, 79%)
// ============================================================
export function computeCrimLevels({ rcHigh, rcLow, direction }) {
  const H = num(rcHigh);
  const L = num(rcLow);

  if (H === null || L === null || H <= L) {
    return { valid: false };
  }

  const size = H - L;
  const ce = (H + L) / 2;

  let ote62, ote79, zone;
  if (direction === "bullish") {
    ote62 = L + size * 0.62;
    ote79 = L + size * 0.79;
    zone = "discount"; // Bullish buys in discount
  } else {
    ote62 = H - size * 0.62;
    ote79 = H - size * 0.79;
    zone = "premium";  // Bearish sells in premium
  }

  return {
    valid: true,
    rangeSize: size,
    ce,
    ote62,
    ote79,
    oteZoneLow: Math.min(ote62, ote79),
    oteZoneHigh: Math.max(ote62, ote79),
    zone,
  };
}

// ============================================================
// 2. FULL EVALUATION (The Golden Pipeline)
// ============================================================
export function evaluateCrim({
  direction = "bullish",
  rcHigh, rcLow,
  sweptSide, sweepExtreme,
  idmLevel,
  chochLevel, fvgHigh, fvgLow,
  entryPrice, stopLoss, takeProfit,
  accountSize = 0, riskPercent = 1,
}) {
  const levels = computeCrimLevels({ rcHigh, rcLow, direction });
  const gates = { context: [], sweep: [], structure: [], entry: [] };

  const H = num(rcHigh);
  const L = num(rcLow);
  const wExt = num(sweepExtreme);
  const idm = num(idmLevel);
  const choch = num(chochLevel);
  const fvgH = num(fvgHigh);
  const fvgL = num(fvgLow);
  const entry = num(entryPrice);
  const sl = num(stopLoss);
  const tp = num(takeProfit);

  // ---------------------------------------------------------
  // STAGE 1: Context (CRT)
  // ---------------------------------------------------------
  gates.context.push({
    key: "rc",
    label: "Reference Candle (RC) bounds valid",
    pass: levels.valid,
    detail: levels.valid ? `Range: ${L} – ${H}` : "RC High must be greater than RC Low.",
  });

  gates.context.push({
    key: "ce",
    label: "50% CE Auto-Calculated",
    pass: levels.valid,
    detail: levels.valid ? `CE is at ${levels.ce}` : "Cannot compute CE.",
  });

  // ---------------------------------------------------------
  // STAGE 2: Sweep (Seek & Destroy)
  // ---------------------------------------------------------
  const expectedSweep = direction === "bullish" ? "ssl" : "bsl";
  gates.sweep.push({
    key: "sweep_side",
    label: `Swept ${expectedSweep.toUpperCase()}`,
    pass: sweptSide === expectedSweep,
    detail: sweptSide === expectedSweep
      ? `Correct sweep for ${direction} setup.`
      : `❌ A ${direction} setup must sweep ${expectedSweep.toUpperCase()}.`,
  });

  let sweepExtremeValid = false;
  if (wExt !== null && levels.valid) {
    // For Bullish (SSL sweep), sweep must be below RC Low
    // For Bearish (BSL sweep), sweep must be above RC High
    if (direction === "bullish") sweepExtremeValid = wExt < L;
    else sweepExtremeValid = wExt > H;
  }
  gates.sweep.push({
    key: "sweep_ext",
    label: "Sweep Extreme is outside the RC",
    pass: sweepExtremeValid,
    detail: sweepExtremeValid
      ? `Extreme at ${wExt} is a valid sweep.`
      : `❌ Sweep extreme must be ${direction === "bullish" ? "below" : "above"} the RC.`,
  });

  // ---------------------------------------------------------
  // STAGE 3: Structure (IDM + MSS)
  // ---------------------------------------------------------
  // IDM must form between the sweep extreme and the range
  let idmValid = false;
  if (idm !== null && wExt !== null) {
    if (direction === "bullish") idmValid = idm > wExt; // Bait is higher than the sweep
    else idmValid = idm < wExt; // Bait is lower than the sweep
  }
  gates.structure.push({
    key: "idm",
    label: "IDM (bait) formed after sweep",
    pass: idmValid,
    detail: idmValid
      ? `IDM at ${idm} is a valid trap.`
      : "❌ IDM must be on the correct side of the sweep extreme.",
  });

  // MSS (CHoCH must break the IDM)
  let mssValid = false;
  if (choch !== null && idm !== null) {
    if (direction === "bullish") mssValid = choch > idm; // Upward displacement breaks the high
    else mssValid = choch < idm; // Downward displacement breaks the low
  }
  gates.structure.push({
    key: "mss",
    label: "MSS (CHoCH broke the IDM)",
    pass: mssValid,
    detail: mssValid
      ? `CHoCH at ${choch} successfully broke the IDM.`
      : "❌ The CHoCH did not break the IDM. No structure shift.",
  });

  // FVG (Displacement footprint)
  const hasFvg = fvgH !== null && fvgL !== null && fvgH > fvgL;
  gates.structure.push({
    key: "fvg",
    label: "Displacement FVG recorded",
    pass: hasFvg,
    detail: hasFvg ? `FVG bounds: ${fvgL} – ${fvgH}` : "Missing FVG bounds.",
  });

  // ---------------------------------------------------------
  // STAGE 4: Entry & Risk (PD Array)
  // ---------------------------------------------------------
  // Entry must be in the correct half of the range
  let entryInZone = false;
  if (entry !== null && levels.valid) {
    if (direction === "bullish") entryInZone = entry < levels.ce;
    else entryInZone = entry > levels.ce;
  }
  gates.entry.push({
    key: "entry_zone",
    label: `Entry in ${levels.zone?.toUpperCase() || "correct"} zone`,
    pass: entryInZone,
    detail: entryInZone
      ? `Entry at ${entry} is correctly positioned.`
      : `❌ Entry is on the wrong side of the 50% CE.`,
  });

  // Stop Loss must be beyond the sweep extreme
  let slValid = false;
  if (sl !== null && wExt !== null) {
    if (direction === "bullish") slValid = sl < wExt;
    else slValid = sl > wExt;
  }
  gates.entry.push({
    key: "sl",
    label: "Stop Loss beyond Sweep Extreme",
    pass: slValid,
    detail: slValid ? `SL at ${sl} is safely beyond the sweep.` : "❌ SL is not beyond the sweep extreme.",
  });

  // Target must be the opposite extreme of the RC (Draw on Liquidity)
  let tpValid = false;
  if (tp !== null && levels.valid) {
    // Give a 10% buffer to allow targeting slightly inside the RC edge
    const buffer = levels.rangeSize * 0.1;
    if (direction === "bullish") tpValid = tp >= H - buffer;
    else tpValid = tp <= L + buffer;
  }
  gates.entry.push({
    key: "tp",
    label: "TP targets opposite RC extreme (DOL)",
    pass: tpValid,
    detail: tpValid ? `TP at ${tp} targets the liquidity pool.` : "❌ TP must target the opposite side of the Reference Candle.",
  });

  // ---------------------------------------------------------
  // FINAL CALCULATIONS
  // ---------------------------------------------------------
  const allGatesPass = Object.values(gates).every(stage => stage.every(g => g.pass));

  let trade = null;
  if (entry !== null && sl !== null && tp !== null) {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    const rr = risk > 0 ? reward / risk : 0;
    
    let lotSize = null;
    let riskAmount = null;
    
    if (accountSize > 0 && risk > 0) {
      riskAmount = accountSize * (riskPercent / 100);
      const pips = risk / 0.0001; // Assuming standard forex pip for now
      const pipValuePerLot = 100000 * 0.0001;
      lotSize = Math.round((riskAmount / (pips * pipValuePerLot)) * 100) / 100;
    }

    trade = { rr, lotSize, riskAmount };
  }

  const reasons = [];
  Object.values(gates).forEach(stage => {
    stage.forEach(g => {
      if (!g.pass) reasons.push(g.label);
    });
  });

  return {
    levels,
    gates,
    trade,
    allGatesPass,
    reasons,
  };
}