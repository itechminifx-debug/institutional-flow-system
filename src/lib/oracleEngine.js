// ============================================================
// THE IFS ORACLE — MASTER CHART READER ENGINE
// ============================================================
// 8 Layers: Weekly → Daily → 4H → 1H → 15M → 5M → 1M → Execution
// ============================================================

export const ORACLE_BIASES = [
  { key: "bullish", label: "Bullish", emoji: "🟢" },
  { key: "bearish", label: "Bearish", emoji: "🔴" },
  { key: "range",   label: "Ranging", emoji: "📦" },
];

export const ORACLE_STRUCTURES = [
  { key: "HH_HL", label: "HH + HL (Bullish)", emoji: "🟢" },
  { key: "LH_LL", label: "LH + LL (Bearish)", emoji: "🔴" },
  { key: "range", label: "Ranging", emoji: "📦" },
];

export const ORACLE_BREAKS = [
  { key: "bos",   label: "BOS (Continuation)", emoji: "➡️" },
  { key: "choch", label: "CHoCH (Reversal)", emoji: "🔄" },
  { key: "none",  label: "None", emoji: "⚪" },
];

export const ORACLE_SWEEPS = [
  { key: "none", label: "No sweep", emoji: "⚪" },
  { key: "bsl",  label: "Swept BSL (Above)", emoji: "🔵" },
  { key: "ssl",  label: "Swept SSL (Below)", emoji: "🟠" },
];

export const ORACLE_KILLZONES = [
  { key: "asian",  label: "Asian",   emoji: "🌙" },
  { key: "london", label: "London",  emoji: "🇬🇧" },
  { key: "ny_am",  label: "NY AM",   emoji: "🗽" },
  { key: "ny_pm",  label: "NY PM",   emoji: "🌆" },
  { key: "none",   label: "None",    emoji: "⚪" },
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
// LAYER 1: WEEKLY CONTEXT
// ============================================================
export function evaluateWeekly({ weeklyBias }) {
  const gates = [];
  let narrative = "";
  let predicts = "neutral";

  const valid = weeklyBias === "bullish" || weeklyBias === "bearish" || weeklyBias === "range";
  gates.push({
    key: "bias",
    label: "Weekly macro bias",
    pass: valid,
    detail: valid ? `Weekly bias: ${weeklyBias}` : "❌ Weekly bias not set.",
  });

  if (valid && weeklyBias !== "range") {
    predicts = weeklyBias;
    narrative = `Weekly bias is ${weeklyBias}. The macro flow is established.`;
  } else if (weeklyBias === "range") {
    narrative = "Weekly is ranging. Wait for a breakout to establish macro direction.";
  } else {
    narrative = "Weekly context missing.";
  }

  const passed = gates.filter(g => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    predicts,
    narrative,
  };
}

// ============================================================
// LAYER 2: DAILY CONTEXT
// ============================================================
export function evaluateDaily({
  dailyBias,
  dailyRangeHigh,
  dailyRangeLow,
  currentPrice,
}) {
  const gates = [];
  let narrative = "";
  let predicts = "neutral";

  const hasBias = dailyBias === "bullish" || dailyBias === "bearish";
  gates.push({
    key: "bias",
    label: "Daily bias",
    pass: hasBias,
    detail: hasBias ? `Daily bias: ${dailyBias}` : "❌ Daily bias not set.",
  });

  const h = num(dailyRangeHigh);
  const l = num(dailyRangeLow);
  const cur = num(currentPrice);
  let zone = "unknown";
  
  if (h !== null && l !== null && cur !== null && h > l) {
    const ce = computeCe(h, l);
    if (ce !== null) {
      zone = cur > ce ? "premium" : cur < ce ? "discount" : "equilibrium";
    }
  }

  gates.push({
    key: "range",
    label: "Daily dealing range identified",
    pass: zone !== "unknown",
    detail: zone !== "unknown" ? `Price is in ${zone.toUpperCase()}.` : "❌ Need range and current price.",
  });

  const zoneCorrect =
    (dailyBias === "bullish" && zone === "discount") ||
    (dailyBias === "bearish" && zone === "premium");
  
  gates.push({
    key: "zone",
    label: "Price in correct daily zone",
    pass: zoneCorrect,
    warning: !zoneCorrect && zone !== "unknown",
    detail: zone === "unknown" ? "Need range + price." : zoneCorrect ? `✅ Price in correct ${zone} zone.` : `⚠️ Price in ${zone}. Bias requires opposite.`,
  });

  if (hasBias) {
    predicts = dailyBias;
    narrative = `Daily bias is ${dailyBias}. Price is in ${zone} zone.`;
    if (!zoneCorrect && zone !== "unknown") {
      narrative += " Warning: price is in the wrong zone for this bias.";
    }
  } else {
    narrative = "Daily context missing.";
  }

  const blocking = gates.filter(g => !g.warning);
  const passed = blocking.filter(g => g.pass).length;

  return {
    ready: passed === blocking.length,
    gates,
    score: Math.round((passed / blocking.length) * 100),
    predicts,
    narrative,
    zone,
  };
}

// ============================================================
// LAYER 3: 4H STRUCTURE
// ============================================================
export function evaluateH4({
  h4Structure,
  h4Break,
  h4Displacement,
  h4Sweep,
}) {
  const gates = [];
  let narrative = "";
  let predicts = "neutral";

  const hasStructure = h4Structure === "HH_HL" || h4Structure === "LH_LL" || h4Structure === "range";
  gates.push({
    key: "structure",
    label: "4H structure identified",
    pass: hasStructure,
    detail: hasStructure ? `4H structure: ${h4Structure}` : "❌ 4H structure not set.",
  });

  const hasBreak = h4Break === "bos" || h4Break === "choch";
  gates.push({
    key: "break",
    label: "Structural break (BOS or CHoCH)",
    pass: hasBreak,
    detail: hasBreak ? `4H break: ${h4Break.toUpperCase()}` : "❌ No 4H break identified.",
  });

  if (hasBreak && h4Break === "choch") {
    gates.push({
      key: "displacement",
      label: "Displacement on CHoCH",
      pass: !!h4Displacement,
      detail: h4Displacement ? "✅ CHoCH with displacement." : "⚠️ CHoCH without displacement — likely fakeout.",
      warning: !h4Displacement,
    });
  }

  if (h4Sweep && h4Sweep !== "none") {
    predicts = h4Sweep === "bsl" ? "bearish" : "bullish";
    gates.push({
      key: "sweep",
      label: "Recent 4H sweep",
      pass: true,
      bonus: true,
      detail: `Recent sweep: ${h4Sweep.toUpperCase()}.`,
    });
  }

  if (h4Structure === "HH_HL") predicts = "bullish";
  else if (h4Structure === "LH_LL") predicts = "bearish";

  if (hasStructure && hasBreak) {
    narrative = `4H structure is ${h4Structure}. Last break was a ${h4Break.toUpperCase()}${h4Displacement ? " on displacement" : ""}.`;
  } else {
    narrative = "4H context incomplete.";
  }

  const blocking = gates.filter(g => !g.warning && !g.bonus);
  const passed = blocking.filter(g => g.pass).length;

  return {
    ready: passed === blocking.length,
    gates,
    score: Math.round((passed / blocking.length) * 100),
    predicts,
    narrative,
  };
}

// ============================================================
// LAYER 4: 1H FVG / KILL ZONE
// ============================================================
export function evaluateH1({
  h1FvgHigh,
  h1FvgLow,
  h1Killzone,
}) {
  const gates = [];
  let narrative = "";
  let predicts = "neutral";

  const hasFvg = num(h1FvgHigh) !== null && num(h1FvgLow) !== null;
  gates.push({
    key: "fvg",
    label: "1H FVG or OB identified",
    pass: hasFvg,
    detail: hasFvg ? `1H FVG: ${h1FvgLow} – ${h1FvgHigh}` : "❌ No 1H FVG or OB marked.",
  });

  const inKz = h1Killzone === "london" || h1Killzone === "ny_am";
  gates.push({
    key: "killzone",
    label: "Inside a high-probability kill zone",
    pass: inKz,
    detail: inKz ? `✅ Inside ${h1Killzone === "london" ? "London" : "NY AM"} Kill Zone.` : `⚠️ Outside kill zones (${h1Killzone}).`,
    warning: !inKz,
  });

  if (hasFvg) {
    narrative = `1H POI marked at ${h1FvgLow} – ${h1FvgHigh}.`;
    if (inKz) narrative += " Price is in a Kill Zone.";
  } else {
    narrative = "1H POI missing.";
  }

  const blocking = gates.filter(g => !g.warning);
  const passed = blocking.filter(g => g.pass).length;

  return {
    ready: passed === blocking.length,
    gates,
    score: Math.round((passed / blocking.length) * 100),
    predicts,
    narrative,
  };
}

// ============================================================
// LAYER 5: 15M TRAP
// ============================================================
export function evaluateM15({
  m15Sweep,
  m15Mss,
  m15FvgHigh,
  m15FvgLow,
}) {
  const gates = [];
  let narrative = "";
  let predicts = "neutral";

  gates.push({
    key: "sweep",
    label: "15M sweep (Judas Swing)",
    pass: !!m15Sweep,
    detail: m15Sweep ? "✅ Liquidity swept on 15M." : "❌ No 15M sweep.",
  });

  gates.push({
    key: "mss",
    label: "15M MSS (displacement + FVG)",
    pass: !!m15Mss,
    detail: m15Mss ? "✅ 15M MSS confirmed." : "❌ No 15M MSS.",
  });

  const hasFvg = num(m15FvgHigh) !== null && num(m15FvgLow) !== null;
  gates.push({
    key: "fvg",
    label: "15M FVG marked",
    pass: hasFvg,
    detail: hasFvg ? `15M FVG: ${m15FvgLow} – ${m15FvgHigh}` : "❌ No 15M FVG.",
  });

  if (m15Sweep && m15Mss && hasFvg) {
    narrative = `15M swept liquidity, shifted structure, and left an FVG at ${m15FvgLow} – ${m15FvgHigh}.`;
  } else {
    narrative = "15M trap incomplete.";
  }

  const passed = gates.filter(g => g.pass).length;

  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    predicts,
    narrative,
  };
}

// ============================================================
// LAYER 6: 5M CONFIRMATION
// ============================================================
export function evaluateM5({
  m5Choch,
  m5Rejection,
}) {
  const gates = [];
  let narrative = "";

  const hasTrigger = !!m5Choch || !!m5Rejection;
  gates.push({
    key: "trigger",
    label: "5M confirmation",
    pass: hasTrigger,
    detail: hasTrigger ? `Trigger: ${[m5Choch && "CHoCH", m5Rejection && "Rejection"].filter(Boolean).join(" + ")}.` : "❌ No 5M confirmation.",
  });

  if (hasTrigger) {
    narrative = `5M confirmed with ${[m5Choch && "CHoCH", m5Rejection && "Rejection"].filter(Boolean).join(" + ")}.`;
  } else {
    narrative = "5M trigger missing.";
  }

  const passed = gates.filter(g => g.pass).length;

  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    narrative,
  };
}

// ============================================================
// LAYER 7: 1M TRIGGER
// ============================================================
export function evaluateM1({
  m1Choch,
  m1Rejection,
}) {
  const gates = [];
  let narrative = "";

  const hasTrigger = !!m1Choch || !!m1Rejection;
  gates.push({
    key: "trigger",
    label: "1M trigger",
    pass: hasTrigger,
    detail: hasTrigger ? `1M Trigger: ${[m1Choch && "CHoCH", m1Rejection && "Rejection"].filter(Boolean).join(" + ")}.` : "❌ No 1M trigger.",
  });

  if (hasTrigger) {
    narrative = `1M trigger fired with ${[m1Choch && "CHoCH", m1Rejection && "Rejection"].filter(Boolean).join(" + ")}.`;
  } else {
    narrative = "1M trigger missing.";
  }

  const passed = gates.filter(g => g.pass).length;

  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    narrative,
  };
}

// ============================================================
// LAYER 8: EXECUTION
// ============================================================
export function evaluateExecution({
  entryPrice,
  stopLoss,
  targetPrice,
  tp1Price,
  dailyBias,
}) {
  const gates = [];
  let narrative = "";

  const entry = num(entryPrice);
  const sl = num(stopLoss);
  const tp = num(targetPrice);
  const tp1 = num(tp1Price);

  gates.push({
    key: "entry",
    label: "Entry price set",
    pass: entry !== null,
    detail: entry !== null ? `Entry: ${entry}` : "❌ No entry price.",
  });

  let slValid = false;
  if (entry !== null && sl !== null) {
    slValid = dailyBias === "bearish" ? sl > entry : sl < entry;
  }
  gates.push({
    key: "sl",
    label: "Stop loss in correct direction",
    pass: slValid,
    detail: slValid ? `✅ SL ${sl} on correct side.` : "❌ SL on wrong side of entry.",
  });

  let tpValid = false;
  if (entry !== null && tp !== null) {
    tpValid = dailyBias === "bearish" ? tp < entry : tp > entry;
  }
  gates.push({
    key: "tp",
    label: "Final target (DOL) in correct direction",
    pass: tpValid,
    detail: tpValid ? `✅ Target ${tp} on correct side.` : "❌ Target on wrong side of entry.",
  });

  if (entry !== null && sl !== null && tp !== null && slValid && tpValid) {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    const rr = risk > 0 ? reward / risk : 0;
    narrative = `Execution: Entry ${entry}, SL ${sl}, TP ${tp}. R:R 1:${rr.toFixed(2)}.`;
  } else {
    narrative = "Execution plan incomplete or invalid.";
  }

  const passed = gates.filter(g => g.pass).length;

  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
    narrative,
  };
}

// ============================================================
// THE PREDICTION SYNTHESIS
// ============================================================
export function synthesizePrediction({
  weekly,
  daily,
  h4,
  m15,
  m1,
  execution,
}) {
  // Count directional votes from HTF
  const htfVotes = [weekly.predicts, daily.predicts, h4.predicts].filter(p => p !== "neutral");
  const ltfVotes = [m15.predicts, m1.predicts].filter(p => p !== "neutral");

  // HTF decides direction
  let finalPrediction = "WAIT";
  if (htfVotes.length > 0) {
    const bullCount = htfVotes.filter(v => v === "bullish").length;
    const bearCount = htfVotes.filter(v => v === "bearish").length;
    if (bullCount > bearCount) finalPrediction = "BUY";
    else if (bearCount > bullCount) finalPrediction = "SELL";
  }

  // If execution is complete, force the direction from execution
  if (execution.ready) {
    // We trust the execution layer, but only if it matches the HTF
    if (finalPrediction === "WAIT") {
      // If HTF is unclear but execution is complete, proceed cautiously
      finalPrediction = "WAIT"; // Default to wait if HTF is unclear
    }
  }

  // Confidence Calculation
  let confidence = "low";
  const avgScore = (weekly.score + daily.score + h4.score + m15.score + m1.score) / 5;
  
  if (avgScore >= 85 && htfVotes.length >= 2) confidence = "high";
  else if (avgScore >= 60 && htfVotes.length >= 1) confidence = "medium";

  // Probability (0-100) scaled from the score
  const probability = Math.round(avgScore);

  // Generate the master narrative
  const narrativeParts = [
    weekly.narrative,
    daily.narrative,
    h4.narrative,
    m15.narrative,
    m1.narrative,
    execution.narrative,
  ].filter(Boolean);

  return {
    prediction: finalPrediction,
    confidence,
    probability,
    narrative: narrativeParts.join(" "),
  };
}

// ============================================================
// FULL EVALUATION
// ============================================================
export function evaluateOracle({
  // Weekly
  weeklyBias,
  // Daily
  dailyBias,
  dailyRangeHigh,
  dailyRangeLow,
  currentPrice,
  // 4H
  h4Structure,
  h4Break,
  h4Displacement,
  h4Sweep,
  // 1H
  h1FvgHigh,
  h1FvgLow,
  h1Killzone,
  // 15M
  m15Sweep,
  m15Mss,
  m15FvgHigh,
  m15FvgLow,
  // 5M
  m5Choch,
  m5Rejection,
  // 1M
  m1Choch,
  m1Rejection,
  // Execution
  entryPrice,
  stopLoss,
  targetPrice,
  tp1Price,
}) {
  const weekly = evaluateWeekly({ weeklyBias });
  const daily = evaluateDaily({ dailyBias, dailyRangeHigh, dailyRangeLow, currentPrice });
  const h4 = evaluateH4({ h4Structure, h4Break, h4Displacement, h4Sweep });
  const h1 = evaluateH1({ h1FvgHigh, h1FvgLow, h1Killzone });
  const m15 = evaluateM15({ m15Sweep, m15Mss, m15FvgHigh, m15FvgLow });
  const m5 = evaluateM5({ m5Choch, m5Rejection });
  const m1 = evaluateM1({ m1Choch, m1Rejection });
  const execution = evaluateExecution({ entryPrice, stopLoss, targetPrice, tp1Price, dailyBias });

  const synthesis = synthesizePrediction({
    weekly,
    daily,
    h4,
    m15,
    m1,
    execution,
  });

  // Gather warnings
  const warnings = [];
  [weekly, daily, h4, h1, m15, m5, m1, execution].forEach(layer => {
    layer.gates?.filter(g => g.warning && !g.pass).forEach(g => warnings.push(g.detail));
  });

  // Overall doctrine score = average of all 8 layers
  const doctrineScore = Math.round(
    (weekly.score + daily.score + h4.score + h1.score + m15.score + m5.score + m1.score + execution.score) / 8
  );

  return {
    weekly,
    daily,
    h4,
    h1,
    m15,
    m5,
    m1,
    execution,
    prediction: synthesis.prediction,
    confidence: synthesis.confidence,
    probability: synthesis.probability,
    narrative: synthesis.narrative,
    warnings,
    doctrineScore,
    layerScores: {
      weekly: weekly.score,
      daily: daily.score,
      h4: h4.score,
      h1: h1.score,
      m15: m15.score,
      m5: m5.score,
      m1: m1.score,
      execution: execution.score,
    },
    layersPassed: [weekly, daily, h4, h1, m15, m5, m1, execution].filter(l => l.ready).length,
    totalLayers: 8,
  };
}