// ============================================================
// AMS — APEX MASTER SYSTEM ENGINE
// ============================================================
// Three scenarios: Trend / Reversal / Range
// Hybrid entry: AUTO (system) vs MANUAL (user, engine-validated)
// 10 Commandments: scored, with 4 hard-blocking
// ============================================================

export const AMS_SCENARIOS = [
  {
    key: "trend",
    label: "Scenario A — Healthy Trend",
    emoji: "📈",
    hint: "Price making HH+HL or LH+LL. Trade the IRL pullback.",
  },
  {
    key: "reversal",
    label: "Scenario B — Reversal",
    emoji: "🔄",
    hint: "Sweep → MSS → FVG. Classic ICT reversal.",
  },
  {
    key: "range",
    label: "Scenario C — Accumulation Range",
    emoji: "📦",
    hint: "Sweep one side → MSS → return into range, target opposite edge.",
  },
];

export const AMS_SESSIONS = [
  { key: "london", label: "London KZ",  hint: "2:00–5:00 AM EST." },
  { key: "ny_am",  label: "NY AM KZ",   hint: "7:00–10:00 AM EST." },
];

export const SWEEP_DIRECTIONS = [
  { key: "upper", label: "Upper Sweep (BSL)", emoji: "⬆️" },
  { key: "lower", label: "Lower Sweep (SSL)", emoji: "⬇️" },
];

export const DOL_TYPES = [
  { key: "bsl", label: "BSL", emoji: "🔵" },
  { key: "ssl", label: "SSL", emoji: "🟠" },
  { key: "erl", label: "ERL", emoji: "🎯" },
];

export const PULLBACK_IRL_TYPES = [
  { key: "fvg", label: "FVG", emoji: "📊" },
  { key: "ob",  label: "Order Block", emoji: "🧱" },
];

export const M1_TRIGGER_TYPES = [
  { key: "choch",     label: "1M CHoCH",        emoji: "⚡" },
  { key: "rejection", label: "1M Rejection",    emoji: "📍" },
  { key: "both",      label: "CHoCH + Rejection", emoji: "🎯" },
];

// 10 Commandments — with hard-block flags
export const COMMANDMENTS = [
  { n: 1,  key: "no_bos",          hardBlock: true,  text: "Never trade a BOS breakout — it's the trap." },
  { n: 2,  key: "no_choch_alone",  hardBlock: true,  text: "Never trade a CHoCH without displacement." },
  { n: 3,  key: "sweep_before_mss",hardBlock: false, text: "Wait for the Sweep before the MSS (Scenarios B/C)." },
  { n: 4,  key: "ll_validation",   hardBlock: false, text: "A Lower Low only counts if it breaks the previous Lower Low." },
  { n: 5,  key: "lh_breaks",       hardBlock: false, text: "The Lower High must break for a Bullish MSS." },
  { n: 6,  key: "no_middle_range", hardBlock: true,  text: "In the middle of an Accumulation Range, do nothing." },
  { n: 7,  key: "premium_short",   hardBlock: false, text: "In a downtrend, short the Premium MSS FVG, target SSL." },
  { n: 8,  key: "ema_filter",      hardBlock: false, text: "The 50 EMA is a filter, not a checkpoint." },
  { n: 9,  key: "risk_limit",      hardBlock: false, text: "Never risk more than 1% per trade." },
  { n: 10, key: "dol_required",    hardBlock: true,  text: "No clear DOL = no trade." },
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
// PHASE 1: D1 CONTEXT (all scenarios)
// ============================================================
export function evaluateD1Context({
  d1Bias,
  d1RangeHigh,
  d1RangeLow,
  currentPrice,
  dolLevel,
  dolType,
  ema50Value,
}) {
  const gates = [];

  const hasBias = d1Bias === "bullish" || d1Bias === "bearish";
  gates.push({
    key: "bias",
    label: "D1 bias set",
    pass: hasBias,
    detail: hasBias ? `Bias: ${d1Bias}.` : "❌ No D1 bias.",
  });

  const rHigh = num(d1RangeHigh);
  const rLow = num(d1RangeLow);
  const hasRange = rHigh !== null && rLow !== null && rHigh > rLow;
  gates.push({
    key: "range",
    label: "D1 dealing range marked",
    pass: hasRange,
    detail: hasRange ? `Range: ${rLow} – ${rHigh}.` : "❌ Mark D1 Swing High and Low.",
  });

  let zone = "unknown";
  let zoneValid = false;
  const cur = num(currentPrice);
  if (hasRange && cur !== null) {
    const ce = computeCe(rHigh, rLow);
    if (ce !== null) {
      if (cur > ce) zone = "premium";
      else if (cur < ce) zone = "discount";
      else zone = "equilibrium";
      zoneValid =
        (d1Bias === "bearish" && zone === "premium") ||
        (d1Bias === "bullish" && zone === "discount");
    }
  }
  gates.push({
    key: "zone",
    label: "D1 price in correct zone",
    pass: zoneValid,
    warning: zone !== "unknown" && !zoneValid,
    detail:
      zone === "unknown"
        ? "Need range + current price."
        : zoneValid
        ? `✅ ${zone.toUpperCase()} — correct for ${d1Bias} bias.`
        : `⚠️ ${zone.toUpperCase()} — not the ideal zone.`,
  });

  const dol = num(dolLevel);
  gates.push({
    key: "dol",
    label: "DOL identified",
    pass: dol !== null && !!dolType,
    detail: dol !== null
      ? `DOL: ${dolType?.toUpperCase()} @ ${dol}.`
      : "❌ No DOL — no trade.",
  });

  // 50 EMA
  const ema = num(ema50Value);
  let emaConflict = false;
  let emaDetail = "50 EMA not entered.";
  if (ema !== null && cur !== null && hasBias) {
    const emaBias = cur > ema ? "bullish" : cur < ema ? "bearish" : "flat";
    emaConflict = emaBias !== "flat" && emaBias !== d1Bias;
    emaDetail = emaConflict
      ? `⚠️ Price ${emaBias} vs 50 EMA — conflicts with bias.`
      : emaBias === "flat"
      ? "Price at 50 EMA."
      : `✅ 50 EMA aligned.`;
  }
  gates.push({
    key: "ema50",
    label: "50 EMA filter",
    pass: !emaConflict && ema !== null,
    bonus: true,
    warning: emaConflict,
    detail: emaDetail,
  });

  const blocking = gates.filter(g => !g.bonus && !g.warning);
  const passed = blocking.filter(g => g.pass).length;

  return {
    ready: passed === blocking.length,
    gates,
    score: Math.round((passed / blocking.length) * 100),
    zone,
    emaConflict,
  };
}

// ============================================================
// PHASE 2: SWING ANATOMY
// ============================================================
export function evaluateSwingAnatomy({
  scenario,
  d1Bias,
  lastHH,
  lastHL,
  lastLH,
  lastLL,
  eqhEqlLevel,
  bosLevel,
  chochLevel,
  mssLevel,
}) {
  const gates = [];

  // Trend scenario: HH/HL or LH/LL must be set (at least 2)
  const swings = [lastHH, lastHL, lastLH, lastLL].map(num);
  const hasSwings = swings.filter(s => s !== null).length >= 2;
  gates.push({
    key: "swings",
    label: "Swing points marked (≥ 2)",
    pass: hasSwings,
    detail: hasSwings ? "Swing anatomy recorded." : "❌ Mark the recent swing points.",
  });

  // BOS level — the trap
  const bos = num(bosLevel);
  gates.push({
    key: "bos",
    label: "BOS level marked (the trap)",
    pass: bos !== null,
    warning: bos !== null,
    detail: bos !== null
      ? `BOS at ${bos} — DO NOT trade the breakout. Wait for reversal.`
      : "No BOS marked.",
  });

  // CHoCH level
  const choch = num(chochLevel);
  gates.push({
    key: "choch",
    label: "CHoCH level marked",
    pass: choch !== null,
    detail: choch !== null ? `CHoCH at ${choch}.` : "No CHoCH level.",
  });

  // MSS level (required for Reversal/Range, optional for Trend)
  const mss = num(mssLevel);
  if (scenario === "reversal" || scenario === "range") {
    gates.push({
      key: "mss",
      label: "MSS confirmed (displacement + FVG)",
      pass: mss !== null,
      detail: mss !== null ? `MSS at ${mss}.` : "❌ MSS required for this scenario.",
    });
  } else {
    gates.push({
      key: "mss",
      label: "MSS level (optional for Trend)",
      pass: true,
      bonus: true,
      detail: mss !== null ? `MSS at ${mss}.` : "No MSS needed for continuation.",
    });
  }

  // EQH/EQL magnet (bonus if present)
  const eq = num(eqhEqlLevel);
  gates.push({
    key: "eqh_eql",
    label: "EQH/EQL magnet (bonus)",
    pass: eq !== null,
    bonus: true,
    detail: eq !== null ? `EQH/EQL at ${eq} — magnet for the target.` : "No EQH/EQL marked.",
  });

  const blocking = gates.filter(g => !g.bonus && !g.warning);
  const passed = blocking.filter(g => g.pass).length;

  return {
    ready: passed === blocking.length,
    gates,
    score: Math.round((passed / blocking.length) * 100),
  };
}

// ============================================================
// PHASE 3A: SCENARIO A — HEALTHY TREND
// ============================================================
export function evaluateScenarioA({
  pullbackIrlType,
  pullbackIrlHigh,
  pullbackIrlLow,
  d1RangeHigh,
  d1RangeLow,
  d1Bias,
}) {
  const gates = [];

  gates.push({
    key: "irl_type",
    label: "Pullback IRL type selected",
    pass: pullbackIrlType === "fvg" || pullbackIrlType === "ob",
    detail: pullbackIrlType ? `Type: ${pullbackIrlType.toUpperCase()}.` : "❌ Pick FVG or OB.",
  });

  const irlH = num(pullbackIrlHigh);
  const irlL = num(pullbackIrlLow);
  const hasIrl = irlH !== null && irlL !== null && irlH > irlL;
  gates.push({
    key: "irl_bounds",
    label: "Pullback IRL bounds marked",
    pass: hasIrl,
    detail: hasIrl ? `IRL: ${irlL} – ${irlH}.` : "❌ Mark the IRL FVG/OB high and low.",
  });

  // IRL must be in correct zone of D1 range
  const rHigh = num(d1RangeHigh);
  const rLow = num(d1RangeLow);
  let zoneOk = null;
  if (hasIrl && rHigh !== null && rLow !== null && rHigh > rLow) {
    const ce = computeCe(rHigh, rLow);
    const irlCe = computeCe(irlH, irlL);
    if (ce !== null && irlCe !== null) {
      const irlZone = irlCe > ce ? "premium" : "discount";
      const expected = d1Bias === "bullish" ? "discount" : "premium";
      zoneOk = irlZone === expected;
    }
  }
  gates.push({
    key: "irl_zone",
    label: "IRL in correct zone",
    pass: zoneOk === true,
    warning: zoneOk === false,
    detail:
      zoneOk === null
        ? "Need D1 range + IRL bounds."
        : zoneOk
        ? `✅ IRL in correct zone.`
        : `⚠️ IRL in wrong zone — check bias.`,
  });

  const blocking = gates.filter(g => !g.warning);
  const passed = blocking.filter(g => g.pass).length;
  return {
    ready: passed === blocking.length,
    gates,
    score: Math.round((passed / blocking.length) * 100),
  };
}

// ============================================================
// PHASE 3B/C: SCENARIO B/C — REVERSAL / RANGE (Sweep → MSS → FVG)
// ============================================================
export function evaluateScenarioBC({
  scenario,
  session,
  d1Bias,
  m30SweepDirection,
  m30SweepLevel,
  m30MssConfirmed,
  m30MssLevel,
  m30FvgHigh,
  m30FvgLow,
}) {
  const gates = [];

  // Session
  const inKz = session === "london" || session === "ny_am";
  gates.push({
    key: "session",
    label: "Inside Kill Zone",
    pass: inKz,
    detail: inKz ? `Session: ${session === "london" ? "London" : "NY AM"}.` : "❌ Outside Kill Zone.",
  });

  // Sweep
  const sweepLvl = num(m30SweepLevel);
  const sweepAligned =
    (d1Bias === "bearish" && m30SweepDirection === "upper") ||
    (d1Bias === "bullish" && m30SweepDirection === "lower");
  gates.push({
    key: "sweep",
    label: "M30 sweep confirmed",
    pass: sweepLvl !== null && sweepAligned,
    detail:
      sweepLvl === null
        ? "❌ No sweep level."
        : sweepAligned
        ? `✅ ${m30SweepDirection} sweep at ${sweepLvl}.`
        : `❌ Sweep direction conflicts with bias.`,
  });

  // MSS confirmed
  gates.push({
    key: "mss_confirmed",
    label: "M30 MSS confirmed (displacement)",
    pass: !!m30MssConfirmed,
    detail: m30MssConfirmed ? "✅ MSS confirmed." : "❌ No MSS.",
  });

  // MSS level
  const mssLvl = num(m30MssLevel);
  gates.push({
    key: "mss_level",
    label: "MSS level marked",
    pass: mssLvl !== null,
    detail: mssLvl !== null ? `MSS at ${mssLvl}.` : "No MSS level.",
  });

  // FVG required
  const fvgH = num(m30FvgHigh);
  const fvgL = num(m30FvgLow);
  const hasFvg = fvgH !== null && fvgL !== null && fvgH > fvgL;
  gates.push({
    key: "fvg",
    label: "M30 FVG present",
    pass: hasFvg,
    detail: hasFvg ? `FVG: ${fvgL} – ${fvgH}.` : "❌ No FVG = fake MSS.",
  });

  const blocking = gates.filter(g => !g.warning);
  const passed = blocking.filter(g => g.pass).length;
  return {
    ready: passed === blocking.length,
    gates,
    score: Math.round((passed / blocking.length) * 100),
  };
}

// ============================================================
// PHASE 4: M1 TRIGGER (all scenarios)
// ============================================================
export function evaluateM1Trigger({
  m1TriggerType,
  m1EntryPrice,
}) {
  const gates = [];

  gates.push({
    key: "trigger_type",
    label: "M1 trigger type selected",
    pass: !!m1TriggerType,
    detail: m1TriggerType
      ? `Trigger: ${m1TriggerType.toUpperCase()}.`
      : "❌ Pick CHoCH, Rejection, or Both.",
  });

  const entry = num(m1EntryPrice);
  gates.push({
    key: "entry",
    label: "M1 entry price set",
    pass: entry !== null,
    detail: entry !== null ? `Entry: ${entry}.` : "❌ No entry price.",
  });

  const passed = gates.filter(g => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
  };
}

// ============================================================
// PHASE 5: AUTO-COMPUTED ENTRY / SL / TP1 / TP2
// ============================================================
export function computeAutoEntry({
  scenario,
  d1Bias,
  pullbackIrlHigh,
  pullbackIrlLow,
  m30FvgHigh,
  m30FvgLow,
  m30SweepLevel,
  dolLevel,
}) {
  // Which IRL to use? Trend uses pullback_irl_*, B/C use M30 FVG
  let irlHigh, irlLow;
  if (scenario === "trend") {
    irlHigh = num(pullbackIrlHigh);
    irlLow = num(pullbackIrlLow);
  } else {
    irlHigh = num(m30FvgHigh);
    irlLow = num(m30FvgLow);
  }

  const entry = computeCe(irlHigh, irlLow);
  const sweep = num(m30SweepLevel);
  const dol = num(dolLevel);

  if (entry === null || dol === null) {
    return {
      ready: false,
      autoEntry: null,
      autoSl: null,
      autoTp1: null,
      autoTp2: null,
      reasons: ["Need IRL bounds + DOL to compute auto entry."],
    };
  }

  // SL: beyond the sweep extreme (Reversal/Range) or beyond IRL edge (Trend)
  let sl;
  if (scenario === "trend") {
    sl = d1Bias === "bullish" ? irlLow : irlHigh;
  } else {
    sl = sweep !== null ? sweep : (d1Bias === "bullish" ? irlLow : irlHigh);
  }

  // TP1: nearest IRL on the opposite side — approximate as the sweep level
  // (For a proper IRL target the user should fill this in)
  const tp1 = sweep !== null ? sweep : null; // uses the sweep as IRL proxy

  // TP2: DOL
  const tp2 = dol;

  // Validate SL side
  const slValid = (d1Bias === "bullish" && sl < entry) || (d1Bias === "bearish" && sl > entry);
  if (!slValid) {
    return {
      ready: false,
      autoEntry: null,
      autoSl: null,
      autoTp1: null,
      autoTp2: null,
      reasons: ["Auto-computed SL is on wrong side of entry — check IRL/sweep levels."],
    };
  }

  const risk = Math.abs(entry - sl);
  const rrTp1 = tp1 !== null && risk > 0 ? Math.abs(tp1 - entry) / risk : null;
  const rrTp2 = tp2 !== null && risk > 0 ? Math.abs(tp2 - entry) / risk : null;

  return {
    ready: true,
    autoEntry: entry,
    autoSl: sl,
    autoTp1: tp1,
    autoTp2: tp2,
    autoRrTp1: rrTp1,
    autoRrTp2: rrTp2,
    reasons: [],
  };
}

// ============================================================
// PHASE 6: MANUAL ENTRY VALIDATION
// ============================================================
export function validateManualEntry({
  scenario,
  d1Bias,
  manualEntry,
  manualSl,
  manualTp1,
  manualTp2,
  pullbackIrlHigh,
  pullbackIrlLow,
  m30FvgHigh,
  m30FvgLow,
  m30SweepLevel,
}) {
  const gates = [];

  const entry = num(manualEntry);
  const sl = num(manualSl);
  const tp1 = num(manualTp1);
  const tp2 = num(manualTp2);
  const sweep = num(m30SweepLevel);

  // Which IRL to validate against
  const irlHigh = scenario === "trend" ? num(pullbackIrlHigh) : num(m30FvgHigh);
  const irlLow  = scenario === "trend" ? num(pullbackIrlLow)  : num(m30FvgLow);

  // Entry must be inside IRL
  let entryInIrl = false;
  if (entry !== null && irlHigh !== null && irlLow !== null) {
    entryInIrl = entry >= irlLow && entry <= irlHigh;
  }
  gates.push({
    key: "entry_in_irl",
    label: "Manual entry is inside the IRL zone",
    pass: entryInIrl,
    detail:
      entry === null
        ? "No entry price."
        : irlHigh === null || irlLow === null
        ? "Need IRL bounds to validate."
        : entryInIrl
        ? `✅ Entry ${entry} is inside IRL (${irlLow} – ${irlHigh}).`
        : `❌ Entry ${entry} is outside IRL (${irlLow} – ${irlHigh}).`,
  });

  // SL must be beyond sweep extreme (B/C) or beyond IRL edge (Trend)
  let slValid = false;
  if (entry !== null && sl !== null) {
    if (scenario === "trend") {
      slValid = d1Bias === "bullish"
        ? sl < entry && sl <= irlLow
        : sl > entry && sl >= irlHigh;
    } else {
      if (sweep !== null) {
        slValid = d1Bias === "bullish"
          ? sl < entry && sl <= sweep
          : sl > entry && sl >= sweep;
      }
    }
  }
  gates.push({
    key: "sl_valid",
    label: "Manual SL beyond the sweep extreme",
    pass: slValid,
    detail:
      sl === null
        ? "No SL entered."
        : slValid
        ? `✅ SL ${sl} beyond extreme.`
        : `❌ SL must be beyond sweep extreme (${sweep ?? irlLow ?? irlHigh}).`,
  });

  // TP2 direction
  let tp2Valid = false;
  if (tp2 !== null && entry !== null) {
    tp2Valid = d1Bias === "bearish" ? tp2 < entry : tp2 > entry;
  }
  gates.push({
    key: "tp2_valid",
    label: "Manual TP2 in correct direction",
    pass: tp2Valid,
    detail:
      tp2 === null
        ? "No TP2."
        : tp2Valid
        ? `✅ TP2 ${tp2} on correct side.`
        : "❌ TP2 is on wrong side of entry.",
  });

  // TP1 direction (optional)
  let tp1Valid = true;
  if (tp1 !== null && entry !== null) {
    tp1Valid = d1Bias === "bearish" ? tp1 < entry : tp1 > entry;
  }
  gates.push({
    key: "tp1_valid",
    label: "Manual TP1 in correct direction",
    pass: tp1 === null || tp1Valid,
    bonus: true,
    detail:
      tp1 === null
        ? "TP1 not set."
        : tp1Valid
        ? `✅ TP1 ${tp1} on correct side.`
        : "❌ TP1 is on wrong side of entry.",
  });

  const blocking = gates.filter(g => !g.bonus);
  const passed = blocking.filter(g => g.pass).length;
  return {
    ready: passed === blocking.length,
    gates,
    score: Math.round((passed / blocking.length) * 100),
  };
}

// ============================================================
// PHASE 7: THE 10 COMMANDMENTS — SCORING + BLOCKING
// ============================================================
export function evaluateCommandments({
  scenario,
  d1Bias,
  currentPrice,
  d1RangeHigh,
  d1RangeLow,
  dolLevel,
  dolType,
  mssLevel,
  m30MssConfirmed,
  m30SweepLevel,
  riskPercentUsed,
  lastLL,
  lastLH,
  ema50Value,
}) {
  const results = [];

  const cur = num(currentPrice);
  const dol = num(dolLevel);
  const mss = num(mssLevel);
  const sweep = num(m30SweepLevel);

  // #1 — Never trade a BOS breakout (hard block)
  // We check: if user marked MSS but did NOT mark a sweep (in B/C), they might be trading BOS
  const tradedBos =
    (scenario === "reversal" || scenario === "range") &&
    !!m30MssConfirmed &&
    sweep === null;
  results.push({
    n: 1,
    pass: !tradedBos,
    hardBlock: true,
    detail: tradedBos
      ? "Trading a BOS breakout (no sweep) — abort."
      : "Not a BOS breakout — OK.",
  });

  // #2 — CHoCH without displacement (hard block)
  // In B/C, MSS must be confirmed for the CHoCH to be valid
  const chochWithoutDisplacement =
    (scenario === "reversal" || scenario === "range") && !m30MssConfirmed;
  results.push({
    n: 2,
    pass: !chochWithoutDisplacement,
    hardBlock: true,
    detail: chochWithoutDisplacement
      ? "CHoCH without MSS/displacement — fakeout."
      : "CHoCH confirmed with displacement — OK.",
  });

  // #3 — Sweep before MSS (B/C only, not a hard block but scored)
  const sweepBeforeMss = scenario === "trend" || sweep !== null;
  results.push({
    n: 3,
    pass: sweepBeforeMss,
    hardBlock: false,
    detail: sweepBeforeMss
      ? "Sweep happened before MSS — OK."
      : "No sweep before MSS — weak setup.",
  });

  // #4 — LL validation (a LL only counts if it breaks previous LL)
  // We check this by comparing user-marked lastLL against MSS level
  const llValid = !lastLL || !mss || (d1Bias === "bullish" ? true : parseFloat(lastLL) <= mss);
  results.push({
    n: 4,
    pass: llValid,
    hardBlock: false,
    detail: llValid ? "Swing validation OK." : "LL not validated against prior swing.",
  });

  // #5 — LH must break to create a bullish MSS
  // (approximated: bullish setup requires MSS above the LH)
  const lastLHNum = num(lastLH);
  const lhBreaks = d1Bias !== "bullish" || mss === null || lastLHNum === null || mss >= lastLHNum;
  results.push({
    n: 5,
    pass: lhBreaks,
    hardBlock: false,
    detail: lhBreaks ? "LH break validation OK." : "Bullish MSS must break the LH.",
  });

  // #6 — In the middle of an Accumulation Range, do nothing (hard block)
  // If range is set but MSS is not confirmed, price may be in the middle
  const rHigh = num(d1RangeHigh);
  const rLow = num(d1RangeLow);
  let inMiddleOfRange = false;
  if (rHigh !== null && rLow !== null && cur !== null) {
    const ce = computeCe(rHigh, rLow);
    if (ce !== null) {
      const tolerance = (rHigh - rLow) * 0.1;
      inMiddleOfRange = Math.abs(cur - ce) < tolerance && !m30MssConfirmed;
    }
  }
  results.push({
    n: 6,
    pass: !inMiddleOfRange,
    hardBlock: true,
    detail: inMiddleOfRange
      ? "In the middle of the range — do nothing."
      : "Not in the middle — OK.",
  });

  // #7 — Short in premium (for bearish) / buy in discount (for bullish)
  // Not a hard block, but scored
  let premiumOk = true;
  if (rHigh !== null && rLow !== null && cur !== null) {
    const ce = computeCe(rHigh, rLow);
    if (ce !== null) {
      if (d1Bias === "bearish") premiumOk = cur > ce;
      else if (d1Bias === "bullish") premiumOk = cur < ce;
    }
  }
  results.push({
    n: 7,
    pass: premiumOk,
    hardBlock: false,
    detail: premiumOk
      ? "Correct zone for bias — OK."
      : "Wrong zone — reduce risk.",
  });

  // #8 — 50 EMA is a filter, not a checkpoint (informational)
  const ema = num(ema50Value);
  let emaAligned = true;
  if (ema !== null && cur !== null) {
    const emaBias = cur > ema ? "bullish" : "bearish";
    emaAligned = emaBias === d1Bias;
  }
  results.push({
    n: 8,
    pass: emaAligned,
    hardBlock: false,
    detail: emaAligned ? "50 EMA aligned." : "50 EMA conflicting — treat as filter.",
  });

  // #9 — Risk ≤ 1% (warning, not hard block)
  const risk = num(riskPercentUsed);
  const riskOk = risk === null || risk <= 1;
  results.push({
    n: 9,
    pass: riskOk,
    hardBlock: false,
    detail: riskOk ? `Risk ${risk ?? "?"}% within 1%.` : `⚠️ Risk ${risk}% > 1%!`,
  });

  // #10 — DOL required (hard block)
  results.push({
    n: 10,
    pass: dol !== null && !!dolType,
    hardBlock: true,
    detail: dol !== null && dolType
      ? "DOL clear — OK."
      : "No DOL — no trade.",
  });

  const passed = results.filter(r => r.pass).length;
  const hardBlockFails = results.filter(r => r.hardBlock && !r.pass);
  const warnings = results.filter(r => !r.pass).map(r => r.n);

  return {
    ready: hardBlockFails.length === 0,
    results,
    passed,
    total: results.length,
    hardBlocked: hardBlockFails.length > 0,
    warnings,
    score: passed, // out of 10
  };
}

// ============================================================
// TRADE MATH (for the resolved active values)
// ============================================================
export function computeAmsTrade({
  d1Bias,
  activeEntry,
  activeSl,
  activeTp1,
  activeTp2,
  accountSize = 0,
  riskPercent = 1,
}) {
  const entry = num(activeEntry);
  const sl = num(activeSl);
  const tp1 = num(activeTp1);
  const tp2 = num(activeTp2);

  if (entry === null || sl === null || tp2 === null) return null;

  const slValid = (d1Bias === "bearish" && sl > entry) || (d1Bias === "bullish" && sl < entry);
  if (!slValid) {
    return { invalid: true, invalidReason: "SL is on the wrong side of entry." };
  }

  const risk = Math.abs(entry - sl);
  const reward1 = tp1 !== null ? Math.abs(tp1 - entry) : null;
  const reward2 = Math.abs(tp2 - entry);
  const rr1 = reward1 !== null && risk > 0 ? reward1 / risk : null;
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
export function evaluateAms({
  // Meta
  scenario,

  // D1
  d1Bias, d1RangeHigh, d1RangeLow, currentPrice,
  dolLevel, dolType, ema50Value,

  // Swing anatomy
  lastHH, lastHL, lastLH, lastLL, eqhEqlLevel,
  bosLevel, chochLevel, mssLevel,

  // Scenario A
  pullbackIrlType, pullbackIrlHigh, pullbackIrlLow,

  // Scenario B/C
  session, m30SweepDirection, m30SweepLevel,
  m30MssConfirmed, m30MssLevel, m30FvgHigh, m30FvgLow,

  // M1 (all scenarios)
  m1TriggerType, m1EntryPrice,

  // Hybrid entry
  entryMode,                 // 'auto' | 'manual'
  manualEntry, manualSl, manualTp1, manualTp2,

  // Risk
  accountSize = 0, riskPercent = 1,
}) {
  // Scenario validation
  const scenarioValid = scenario === "trend" || scenario === "reversal" || scenario === "range";

  // Phase 1: D1
  const d1 = evaluateD1Context({
    d1Bias, d1RangeHigh, d1RangeLow, currentPrice, dolLevel, dolType, ema50Value,
  });

  // Phase 2: Swing Anatomy
  const anatomy = evaluateSwingAnatomy({
    scenario, d1Bias, lastHH, lastHL, lastLH, lastLL,
    eqhEqlLevel, bosLevel, chochLevel, mssLevel,
  });

  // Phase 3: Scenario-specific
  let scenarioPhase = null;
  if (scenario === "trend") {
    scenarioPhase = evaluateScenarioA({
      pullbackIrlType, pullbackIrlHigh, pullbackIrlLow, d1RangeHigh, d1RangeLow, d1Bias,
    });
  } else if (scenario === "reversal" || scenario === "range") {
    scenarioPhase = evaluateScenarioBC({
      scenario, session, d1Bias, m30SweepDirection, m30SweepLevel,
      m30MssConfirmed, m30MssLevel, m30FvgHigh, m30FvgLow,
    });
  }

  // Phase 4: M1
  const m1 = evaluateM1Trigger({ m1TriggerType, m1EntryPrice });

  // Phase 5: Auto-compute Entry/SL/TP
  const auto = computeAutoEntry({
    scenario, d1Bias, pullbackIrlHigh, pullbackIrlLow,
    m30FvgHigh, m30FvgLow, m30SweepLevel, dolLevel,
  });

  // Phase 6: Manual validation (only if manual mode)
  const manual =
    entryMode === "manual"
      ? validateManualEntry({
          scenario, d1Bias, manualEntry, manualSl, manualTp1, manualTp2,
          pullbackIrlHigh, pullbackIrlLow, m30FvgHigh, m30FvgLow, m30SweepLevel,
        })
      : { ready: true, gates: [], score: 100 };

  // Phase 7: Commandments
  const commandments = evaluateCommandments({
    scenario, d1Bias, currentPrice, d1RangeHigh, d1RangeLow,
    dolLevel, dolType, mssLevel, m30MssConfirmed, m30SweepLevel,
    riskPercentUsed: riskPercent,
    lastLL, lastLH, ema50Value,
  });

  // Resolve active values based on mode
  const activeEntry = entryMode === "auto" ? auto.autoEntry : num(manualEntry);
  const activeSl = entryMode === "auto" ? auto.autoSl : num(manualSl);
  const activeTp1 = entryMode === "auto" ? auto.autoTp1 : num(manualTp1);
  const activeTp2 = entryMode === "auto" ? auto.autoTp2 : num(manualTp2);

  // Compute the trade
  const trade = computeAmsTrade({
    d1Bias, activeEntry, activeSl, activeTp1, activeTp2,
    accountSize, riskPercent,
  });

  // Overall readiness
  const autoReady = entryMode === "auto" ? auto.ready : true;
  const manualReady = entryMode === "manual" ? manual.ready : true;
  const entryResolved = activeEntry !== null && activeSl !== null && activeTp2 !== null;

  const allReady =
    scenarioValid &&
    d1.ready &&
    anatomy.ready &&
    (scenarioPhase?.ready ?? false) &&
    m1.ready &&
    autoReady &&
    manualReady &&
    commandments.ready &&
    entryResolved;

  const reasons = [];
  if (!scenarioValid) reasons.push("Scenario: pick Trend / Reversal / Range.");
  if (!d1.ready) d1.gates.filter(g => !g.pass && !g.bonus && !g.warning).forEach(g => reasons.push(`D1: ${g.label}`));
  if (!anatomy.ready) anatomy.gates.filter(g => !g.pass && !g.bonus && !g.warning).forEach(g => reasons.push(`Anatomy: ${g.label}`));
  if (scenarioPhase && !scenarioPhase.ready) scenarioPhase.gates.filter(g => !g.pass && !g.warning).forEach(g => reasons.push(`Scenario: ${g.label}`));
  if (!m1.ready) m1.gates.filter(g => !g.pass).forEach(g => reasons.push(`M1: ${g.label}`));
  if (entryMode === "auto" && !auto.ready) auto.reasons.forEach(r => reasons.push(`Auto: ${r}`));
  if (entryMode === "manual" && !manual.ready) manual.gates.filter(g => !g.pass).forEach(g => reasons.push(`Manual: ${g.label}`));
  if (!commandments.ready) reasons.push(`Commandments: ${commandments.hardBlocked ? "hard-block rule failed" : "warnings"}`);

  return {
    scenario,
    scenarioValid,
    d1,
    anatomy,
    scenarioPhase,
    m1,
    auto,
    manual,
    commandments,
    trade,
    entryMode,
    activeEntry,
    activeSl,
    activeTp1,
    activeTp2,
    preEntryReady: allReady && trade && !trade.invalid,
    reasons,
    isAplus: !!(d1?.emaConflict === false && commandsClean(commandments)),
  };
}

function commandsClean(commandments) {
  return commandments.passed === 10;
}