// ============================================================
// ICT CORE DOCTRINE ENGINE
// ============================================================
// A validator for the ICT book.
// It calculates a Doctrine Score (0-100) and generates warnings.
// It NEVER blocks saving. It only scores and warns.
// ============================================================

export const ICT_SESSIONS = [
  { key: "asian",  label: "Asian",     hint: "Accumulation. Sets the range." },
  { key: "london", label: "London KZ", hint: "Manipulation. Judas Swing." },
  { key: "ny_am",  label: "NY AM KZ",  hint: "Distribution. Highest volume." },
  { key: "ny_pm",  label: "NY PM",     hint: "Secondary window." },
];

export const ICT_STRUCTURES = [
  { key: "HH_HL", label: "HH + HL (Bullish)" },
  { key: "LH_LL", label: "LH + LL (Bearish)" },
  { key: "range", label: "Range" },
];

export const ICT_BREAKS = [
  { key: "bos",   label: "BOS (Continuation)" },
  { key: "choch", label: "CHoCH (Reversal)" },
  { key: "none",  label: "None" },
];

export const ICT_LIQUIDITY_TYPES = [
  { key: "bsl",      label: "BSL (Buy-Side)" },
  { key: "ssl",      label: "SSL (Sell-Side)" },
  { key: "eqh_eql",  label: "EQH / EQL" },
  { key: "pdh_pdl",  label: "PDH / PDL" },
  { key: "trendline",label: "Trendline" },
  { key: "round",    label: "Round Number" },
];

export const ICT_SWEEP_TYPES = [
  { key: "sweep", label: "Sweep (Wick + close back)" },
  { key: "run",   label: "Run (Close through)" },
  { key: "none",  label: "None / Unclear" },
];

export const ICT_ARRAY_TYPES = [
  { key: "fvg",      label: "Fair Value Gap" },
  { key: "ob",       label: "Order Block" },
  { key: "breaker",  label: "Breaker Block" },
  { key: "mitigation", label: "Mitigation Block" },
  { key: "unicorn",  label: "Unicorn (OB+FVG)" },
];

export const ICT_MACROS = [
  { key: "silver_bullet", label: "Silver Bullet (10-11 AM EST)" },
  { key: "london_open",   label: "London Open (2-5 AM EST)" },
  { key: "ny_open",       label: "NY Open (7-10 AM EST)" },
  { key: "none",          label: "None / Outside Macro" },
];

export const ICT_AMD_PHASES = [
  { key: "accumulation",  label: "Accumulation" },
  { key: "manipulation",  label: "Manipulation" },
  { key: "distribution",  label: "Distribution" },
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
// PHASE 1: CONTEXT & STRUCTURE (Ch. 6-10)
// ============================================================
export function evaluateIctContext({
  htfBias,
  ltfAligned,
  structureVerdict,
  structuralBreak,
  displacementPresent,
  rangeHigh,
  rangeLow,
  currentPrice,
}) {
  const gates = [];
  const warnings = [];

  // Bias
  const hasBias = htfBias === "bullish" || htfBias === "bearish";
  gates.push({
    key: "bias",
    label: "HTF Bias is clear",
    pass: hasBias,
    detail: hasBias ? `Bias: ${htfBias}` : "⚠️ Chapter 4: No clear bias. Without bias, there is no trade.",
  });
  if (!hasBias) warnings.push("Ch. 4: No clear HTF bias.");

  // LTF aligned
  gates.push({
    key: "ltf",
    label: "LTF reading confirms HTF",
    pass: !!ltfAligned,
    detail: ltfAligned ? "Top-down alignment confirmed." : "⚠️ Chapter 6: HTF context not confirmed on LTF.",
  });
  if (!ltfAligned) warnings.push("Ch. 6: LTF does not confirm HTF.");

  // Structure
  const hasStructure = structureVerdict === "HH_HL" || structureVerdict === "LH_LL" || structureVerdict === "range";
  gates.push({
    key: "structure",
    label: "Market structure is clear",
    pass: hasStructure,
    detail: hasStructure ? `Structure: ${structureVerdict}` : "⚠️ Chapter 7: Structure not identified.",
  });
  if (!hasStructure) warnings.push("Ch. 7: Structure not identified.");

  // Break type
  const hasBreak = structuralBreak === "bos" || structuralBreak === "choch";
  gates.push({
    key: "break",
    label: "Structural break identified (BOS or CHoCH)",
    pass: hasBreak,
    detail: hasBreak
      ? `Break: ${structuralBreak === "bos" ? "BOS (Continuation)" : "CHoCH (Reversal)"}`
      : "⚠️ Chapter 8: No BOS or CHoCH identified.",
  });
  if (!hasBreak) warnings.push("Ch. 8: No BOS or CHoCH.");

  // Displacement (only critical if CHoCH)
  const needsDisplacement = structuralBreak === "choch";
  const displacementValid = needsDisplacement ? !!displacementPresent : true;
  gates.push({
    key: "displacement",
    label: needsDisplacement ? "Displacement present on CHoCH" : "Displacement (optional for BOS)",
    pass: displacementValid,
    detail: displacementValid
      ? needsDisplacement
        ? "✅ Displacement confirmed on CHoCH."
        : "BOS continuation — displacement not strictly required."
      : "⚠️ Chapter 10: A CHoCH without displacement is often a fake-out.",
  });
  if (!displacementValid) warnings.push("Ch. 10: CHoCH without displacement — likely fakeout.");

  // Zone
  const rHigh = num(rangeHigh);
  const rLow = num(rangeLow);
  const cur = num(currentPrice);
  let zone = "unknown";
  if (rHigh !== null && rLow !== null && cur !== null && rHigh > rLow) {
    const ce = computeCe(rHigh, rLow);
    if (ce !== null) {
      if (cur > ce) zone = "premium";
      else if (cur < ce) zone = "discount";
      else zone = "equilibrium";
    }
  }
  gates.push({
    key: "zone",
    label: "Dealing range identified",
    pass: zone !== "unknown",
    detail: zone !== "unknown" ? `Price is in ${zone.toUpperCase()}.` : "⚠️ Chapter 9: Dealing range not set.",
  });
  if (zone === "unknown") warnings.push("Ch. 9: Dealing range not marked.");

  // Score: 5 gates total, weighted
  const passed = gates.filter(g => g.pass).length;
  const phaseScore = Math.round((passed / gates.length) * 100);

  return { gates, passed, total: gates.length, score: phaseScore, warnings, zone };
}

// ============================================================
// PHASE 2: LIQUIDITY (Ch. 11-15)
// ============================================================
export function evaluateIctLiquidity({
  sweepHappened,
  sweepType,
  sweepLevel,
  drawOnLiquidity,
  dolLevel,
}) {
  const gates = [];
  const warnings = [];

  // Sweep happened
  gates.push({
    key: "sweep_happened",
    label: "Liquidity was targeted",
    pass: !!sweepHappened,
    detail: sweepHappened ? "Setup involves liquidity." : "⚠️ Chapter 11: No liquidity target identified.",
  });
  if (!sweepHappened) warnings.push("Ch. 11: No liquidity targeted.");

  // Sweep vs Run (the critical distinction)
  const sweepValid = sweepType === "sweep";
  gates.push({
    key: "sweep_type",
    label: "Liquidity was SWEPT (not run)",
    pass: sweepValid,
    detail:
      sweepType === "sweep"
        ? "✅ Sweep confirmed (wick + close back)."
        : sweepType === "run"
        ? "⚠️ Chapter 13: You marked a RUN (close through). The book says: a run is continuation, not reversal."
        : "⚠️ Chapter 13: No sweep/run distinction made.",
  });
  if (!sweepValid) warnings.push("Ch. 13: Not a true sweep.");

  // Sweep level
  const sweepLvl = num(sweepLevel);
  gates.push({
    key: "sweep_level",
    label: "Sweep level recorded",
    pass: sweepLvl !== null,
    detail: sweepLvl !== null ? `Swept at ${sweepLvl}.` : "⚠️ Chapter 13: No sweep level recorded.",
  });
  if (sweepLvl === null) warnings.push("Ch. 13: No sweep level.");

  // Draw on Liquidity
  const hasDol = drawOnLiquidity === "erl" || drawOnLiquidity === "irl";
  gates.push({
    key: "dol",
    label: "Draw on Liquidity identified",
    pass: hasDol,
    detail: hasDol
      ? `DOL: ${drawOnLiquidity.toUpperCase()}`
      : "⚠️ Chapter 15: No draw on liquidity = no trade.",
  });
  if (!hasDol) warnings.push("Ch. 15: No DOL identified.");

  // DOL level
  const dol = num(dolLevel);
  gates.push({
    key: "dol_level",
    label: "Specific DOL price recorded",
    pass: dol !== null,
    detail: dol !== null ? `Target: ${dol}.` : "⚠️ Chapter 15: DOL not marked with a price.",
  });
  if (dol === null) warnings.push("Ch. 15: DOL price not set.");

  const passed = gates.filter(g => g.pass).length;
  const phaseScore = Math.round((passed / gates.length) * 100);

  return { gates, passed, total: gates.length, score: phaseScore, warnings };
}

// ============================================================
// PHASE 3: PD ARRAYS (Ch. 16-20)
// ============================================================
export function evaluateIctArrays({
  arrayType,
  arrayHigh,
  arrayLow,
  arrayZone,
  dealingRangeHigh,
  dealingRangeLow,
  expectedZone, // from bias
}) {
  const gates = [];
  const warnings = [];

  // Array type
  const hasType = !!arrayType;
  gates.push({
    key: "type",
    label: "Array type identified",
    pass: hasType,
    detail: hasType ? `Array: ${arrayType.toUpperCase()}` : "⚠️ Chapter 16: No PD Array identified.",
  });
  if (!hasType) warnings.push("Ch. 16: No PD Array.");

  // Bounds
  const h = num(arrayHigh);
  const l = num(arrayLow);
  const hasBounds = h !== null && l !== null && h > l;
  gates.push({
    key: "bounds",
    label: "Array bounds marked",
    pass: hasBounds,
    detail: hasBounds ? `FVG: ${l} – ${h}.` : "⚠️ Chapter 17: Array bounds not set.",
  });
  if (!hasBounds) warnings.push("Ch. 17: Array bounds not marked.");

  // Zone correct
  const zoneCorrect = arrayZone && arrayZone === expectedZone;
  gates.push({
    key: "zone",
    label: "Array is in the correct premium/discount zone",
    pass: zoneCorrect,
    detail: zoneCorrect
      ? `✅ Array in correct ${arrayZone} zone.`
      : `⚠️ Chapter 9/20: Array is in ${arrayZone || "unknown"} but bias expects ${expectedZone}.`,
  });
  if (!zoneCorrect) warnings.push("Ch. 9/20: Array in wrong zone.");

  // Range validation
  const rHigh = num(dealingRangeHigh);
  const rLow = num(dealingRangeLow);
  const hasRange = rHigh !== null && rLow !== null && rHigh > rLow;
  gates.push({
    key: "range",
    label: "Dealing range marked for context",
    pass: hasRange,
    detail: hasRange ? "Range defined." : "⚠️ Chapter 9: Dealing range missing.",
  });
  if (!hasRange) warnings.push("Ch. 9: Dealing range missing.");

  const passed = gates.filter(g => g.pass).length;
  const phaseScore = Math.round((passed / gates.length) * 100);

  return { gates, passed, total: gates.length, score: phaseScore, warnings };
}

// ============================================================
// PHASE 4: TIME & MODEL (Ch. 21-25)
// ============================================================
export function evaluateIctTimeAndModel({
  session,
  inKillZone,
  macroWindow,
  amdPhase,
  modelFullChecked,
}) {
  const gates = [];
  const warnings = [];

  // Kill zone
  const kzValid = !!inKillZone && (session === "london" || session === "ny_am");
  gates.push({
    key: "killzone",
    label: "Inside a kill zone",
    pass: kzValid,
    detail: kzValid
      ? `✅ Inside ${session === "london" ? "London" : "NY AM"} kill zone.`
      : "⚠️ Chapter 22: Outside kill zones, delivery is unreliable.",
  });
  if (!kzValid) warnings.push("Ch. 22: Outside kill zone.");

  // Macro
  const hasMacro = macroWindow && macroWindow !== "none";
  gates.push({
    key: "macro",
    label: "Specific macro window identified",
    pass: hasMacro,
    detail: hasMacro
      ? `✅ Macro: ${macroWindow.replace("_", " ").toUpperCase()}.`
      : "⚠️ Chapter 23: No macro window. Precision timing improves odds.",
  });
  if (!hasMacro) warnings.push("Ch. 23: No macro window.");

  // AMD phase
  const isDistribution = amdPhase === "distribution";
  gates.push({
    key: "amd",
    label: "AMD phase is distribution (entry timing)",
    pass: isDistribution,
    detail: isDistribution
      ? "✅ Distribution phase — correct timing."
      : `⚠️ Chapter 24: You marked ${amdPhase || "no phase"}. Entry should be in distribution.`,
  });
  if (!isDistribution) warnings.push("Ch. 24: Not in distribution phase.");

  // Full model check
  gates.push({
    key: "model",
    label: "The full model was verified",
    pass: !!modelFullChecked,
    detail: modelFullChecked
      ? "✅ Full model check confirmed."
      : "⚠️ Chapter 25: The complete entry model requires all elements (bias, sweep, shift, array, time).",
  });
  if (!modelFullChecked) warnings.push("Ch. 25: Full model not verified.");

  const passed = gates.filter(g => g.pass).length;
  const phaseScore = Math.round((passed / gates.length) * 100);

  return { gates, passed, total: gates.length, score: phaseScore, warnings };
}

// ============================================================
// DOCTRINE SCORE (the master calculation)
// ============================================================
// Weighted aggregate across all 4 phases.
// Produces a 0-100 score, a tier, and a combined warning list.
export function computeDoctrineScore({
  context,
  liquidity,
  arrays,
  time,
}) {
  // Weighting:
  // Context: 25%
  // Liquidity: 35%  (highest — this is the engine)
  // Arrays: 20%
  // Time/Model: 20%
  const weightedScore =
    context.score * 0.25 +
    liquidity.score * 0.35 +
    arrays.score * 0.20 +
    time.score * 0.20;

  const score = Math.round(weightedScore);

  // Tier
  let tier = "red";
  if (score >= 90) tier = "green";
  else if (score >= 70) tier = "yellow";
  else if (score >= 40) tier = "orange";

  // Warnings combined
  const warnings = [
    ...context.warnings,
    ...liquidity.warnings,
    ...arrays.warnings,
    ...time.warnings,
  ];

  return { score, tier, warnings };
}

// ============================================================
// FULL EVALUATION
// ============================================================
export function evaluateIct({
  // Phase 1
  htfBias,
  ltfAligned,
  structureVerdict,
  structuralBreak,
  displacementPresent,
  rangeHigh,
  rangeLow,
  currentPrice,

  // Phase 2
  sweepHappened,
  sweepType,
  sweepLevel,
  drawOnLiquidity,
  dolLevel,

  // Phase 3
  arrayType,
  arrayHigh,
  arrayLow,
  arrayZone,

  // Phase 4
  session,
  inKillZone,
  macroWindow,
  amdPhase,
  modelFullChecked,
}) {
  const context = evaluateIctContext({
    htfBias,
    ltfAligned,
    structureVerdict,
    structuralBreak,
    displacementPresent,
    rangeHigh,
    rangeLow,
    currentPrice,
  });

  const liquidity = evaluateIctLiquidity({
    sweepHappened,
    sweepType,
    sweepLevel,
    drawOnLiquidity,
    dolLevel,
  });

  // Expected zone comes from bias
  const expectedZone = htfBias === "bullish" ? "discount" : "premium";
  const arrays = evaluateIctArrays({
    arrayType,
    arrayHigh,
    arrayLow,
    arrayZone,
    dealingRangeHigh: rangeHigh,
    dealingRangeLow: rangeLow,
    expectedZone,
  });

  const time = evaluateIctTimeAndModel({
    session,
    inKillZone,
    macroWindow,
    amdPhase,
    modelFullChecked,
  });

  const doctrine = computeDoctrineScore({ context, liquidity, arrays, time });

  return {
    context,
    liquidity,
    arrays,
    time,
    doctrine,
  };
}