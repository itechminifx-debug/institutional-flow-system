// ============================================================
// ADS — APEX DEEP SEARCH ENGINE
// ============================================================
// Sequence: D1 Narrative → M30 Trap → M1 Trigger
//
// The Golden Rule:
//   D1 tells you WHERE (bias + DOL)
//   M30 tells you WHEN (sweep + CHoCH + FVG in Kill Zone)
//   M1 tells you HOW (rejection + CHoCH + entry)
//
// If you don't have all three, you don't have a trade.
// ============================================================

export const ADS_SESSIONS = [
  { key: "london", label: "London KZ",  hint: "2:00–5:00 AM EST. The Judas Swing window." },
  { key: "ny_am",  label: "NY AM KZ",   hint: "7:00–10:00 AM EST. Heaviest volume." },
];

export const D1_BIASES = [
  { key: "bullish", label: "Bullish (HH + HL)", emoji: "🟢" },
  { key: "bearish", label: "Bearish (LH + LL)", emoji: "🔴" },
];

export const SWEEP_DIRECTIONS = [
  { key: "upper", label: "Upper Sweep (BSL)", emoji: "⬆️", hint: "Swept a high. Expect short." },
  { key: "lower", label: "Lower Sweep (SSL)", emoji: "⬇️", hint: "Swept a low. Expect long." },
];

export const DOL_TYPES = [
  { key: "bsl", label: "BSL (Buy-Side Liquidity)", emoji: "🔵" },
  { key: "ssl", label: "SSL (Sell-Side Liquidity)", emoji: "🟠" },
  { key: "erl", label: "ERL (External Range Liquidity)", emoji: "🎯" },
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
// PHASE 1: D1 NARRATIVE (THE WHERE)
// ============================================================
export function evaluateD1Narrative({
  d1Bias,
  d1RangeHigh,
  d1RangeLow,
  currentPrice,
  dolLevel,
  dolType,
  ema50Value,
}) {
  const gates = [];

  // Bias set
  const hasBias = d1Bias === "bullish" || d1Bias === "bearish";
  gates.push({
    key: "bias",
    label: "D1 bias determined",
    pass: hasBias,
    detail: hasBias ? `Bias: ${d1Bias}.` : "❌ No D1 bias. Cannot trade without the narrative.",
  });

  // Dealing range marked
  const rHigh = num(d1RangeHigh);
  const rLow = num(d1RangeLow);
  const hasRange = rHigh !== null && rLow !== null && rHigh > rLow;
  gates.push({
    key: "range",
    label: "D1 dealing range marked",
    pass: hasRange,
    detail: hasRange
      ? `Range: ${rLow} – ${rHigh}.`
      : "❌ Mark the most recent D1 Swing High and Low.",
  });

  // Premium / Discount zone
  let zone = "unknown";
  let zoneValid = false;
  const cur = num(currentPrice);
  if (hasRange && cur !== null) {
    const ce = computeCe(rHigh, rLow);
    if (ce !== null) {
      if (cur > ce) zone = "premium";
      else if (cur < ce) zone = "discount";
      else zone = "equilibrium";

      // Correct zone: bearish → premium, bullish → discount
      zoneValid =
        (d1Bias === "bearish" && zone === "premium") ||
        (d1Bias === "bullish" && zone === "discount");
    }
  }
  gates.push({
    key: "zone",
    label: "D1 price in correct premium/discount zone",
    pass: zoneValid,
    detail:
      zone === "unknown"
        ? "Need range + current price to compute zone."
        : zoneValid
        ? `✅ Price in ${zone.toUpperCase()} — correct for ${d1Bias} bias.`
        : `⚠️ Price in ${zone.toUpperCase()} — not the ideal zone for ${d1Bias} bias.`,
    warning: zone !== "unknown" && !zoneValid,
  });

  // DOL identified
  const dol = num(dolLevel);
  const hasDol = dol !== null && dolType;
  gates.push({
    key: "dol",
    label: "Draw on Liquidity (DOL) identified",
    pass: hasDol,
    detail: hasDol
      ? `DOL: ${dolType.toUpperCase()} @ ${dol}.`
      : "❌ Mark the D1 DOL (the ultimate target).",
  });

  // 50 EMA confluence (bonus — not blocking)
  const ema = num(ema50Value);
  let emaConflict = false;
  let emaDetail = "50 EMA not entered — no bonus confluence.";
  if (ema !== null && cur !== null && hasBias) {
    const emaBias = cur > ema ? "bullish" : cur < ema ? "bearish" : "flat";
    emaConflict = emaBias !== "flat" && emaBias !== d1Bias;
    emaDetail = emaConflict
      ? `⚠️ Price is ${emaBias} vs 50 EMA ${ema}. Conflicts with your ${d1Bias} bias.`
      : emaBias === "flat"
      ? `Price is at the 50 EMA.`
      : `✅ Price ${emaBias} vs 50 EMA — aligned with bias.`;
  }
  gates.push({
    key: "ema50",
    label: "50 EMA confluence (bonus)",
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
// PHASE 2: M30 TRAP (THE WHEN)
// ============================================================
export function evaluateM30Trap({
  session,
  d1Bias,
  m30SweepDirection,
  m30SweepLevel,
  m30ChochConfirmed,
  m30ChochLevel,
  m30FvgHigh,
  m30FvgLow,
  d1RangeHigh,
  d1RangeLow,
  ema50Value,
}) {
  const gates = [];

  // Kill Zone session
  const inKz = session === "london" || session === "ny_am";
  gates.push({
    key: "session",
    label: "Inside London or NY AM Kill Zone",
    pass: inKz,
    detail: inKz ? `Session: ${session === "london" ? "London" : "NY AM"}.` : "❌ Outside Kill Zone. Abort.",
  });

  // Sweep happened
  const sweepLvl = num(m30SweepLevel);
  const sweepAligned =
    (d1Bias === "bearish" && m30SweepDirection === "upper") ||
    (d1Bias === "bullish" && m30SweepDirection === "lower");
  gates.push({
    key: "sweep",
    label: "M30 sweep (Judas Swing) confirmed",
    pass: sweepLvl !== null && sweepAligned,
    detail:
      sweepLvl === null
        ? "❌ No sweep level. Wait for the trap."
        : sweepAligned
        ? `✅ Swept ${m30SweepDirection} at ${sweepLvl}.`
        : `❌ ${m30SweepDirection} sweep conflicts with ${d1Bias} bias.`,
  });

  // CHoCH confirmed
  gates.push({
    key: "choch",
    label: "M30 CHoCH confirmed",
    pass: !!m30ChochConfirmed,
    detail: m30ChochConfirmed
      ? "✅ M30 structure shifted against the trap."
      : "❌ No M30 CHoCH. Wait for structure to break.",
  });

  // CHoCH level recorded
  const chochLvl = num(m30ChochLevel);
  gates.push({
    key: "choch_level",
    label: "M30 CHoCH level marked",
    pass: chochLvl !== null,
    detail: chochLvl !== null ? `CHoCH at ${chochLvl}.` : "No CHoCH price level entered.",
  });

  // FVG left behind by CHoCH
  const fvgH = num(m30FvgHigh);
  const fvgL = num(m30FvgLow);
  const hasFvg = fvgH !== null && fvgL !== null && fvgH > fvgL;
  gates.push({
    key: "fvg",
    label: "M30 FVG left by the CHoCH",
    pass: hasFvg,
    detail: hasFvg
      ? `✅ FVG: ${fvgL} – ${fvgH}.`
      : "❌ No FVG = fake CHoCH. Abort.",
  });

  // POI zone check (correct zone of D1 range)
  const rHigh = num(d1RangeHigh);
  const rLow = num(d1RangeLow);
  let poiZone = "unknown";
  let poiZoneWarning = false;
  if (hasFvg && rHigh !== null && rLow !== null && rHigh > rLow) {
    const ce = computeCe(rHigh, rLow);
    const fvgCe = computeCe(fvgH, fvgL);
    if (ce !== null && fvgCe !== null) {
      poiZone = fvgCe > ce ? "premium" : "discount";
      const expected = d1Bias === "bullish" ? "discount" : "premium";
      poiZoneWarning = poiZone !== expected;
    }
  }
  gates.push({
    key: "poi_zone",
    label: "M30 FVG in correct zone of D1 range",
    pass: !poiZoneWarning,
    warning: poiZoneWarning,
    detail:
      poiZone === "unknown"
        ? "Need D1 range + FVG bounds."
        : poiZoneWarning
        ? `⚠️ FVG in ${poiZone.toUpperCase()} zone — wrong side for ${d1Bias} bias. Proceed with caution.`
        : `✅ FVG in ${poiZone.toUpperCase()} — correct zone.`,
  });

  // 50 EMA overlap with FVG (A+ bonus)
  const ema = num(ema50Value);
  let emaOverlap = false;
  if (ema !== null && hasFvg) {
    emaOverlap = ema >= fvgL && ema <= fvgH;
  }
  gates.push({
    key: "ema_overlap",
    label: "50 EMA overlaps M30 FVG (A+ bonus)",
    pass: emaOverlap,
    bonus: true,
    detail: emaOverlap
      ? `🌟 50 EMA ${ema} sits inside the FVG — A+ confluence.`
      : ema !== null
      ? "50 EMA does not overlap the FVG. Still valid, just not A+."
      : "50 EMA not entered.",
  });

  const blocking = gates.filter(g => !g.bonus && !g.warning);
  const passed = blocking.filter(g => g.pass).length;

  return {
    ready: passed === blocking.length,
    gates,
    score: Math.round((passed / blocking.length) * 100),
    poiZone,
    poiZoneWarning,
    emaOverlap,
  };
}

// ============================================================
// PHASE 3: M1 TRIGGER (THE HOW)
// ============================================================
export function evaluateM1Trigger({
  m1ChochConfirmed,
  m1RejectionPresent,
  m1EntryPrice,
  stopLoss,
  tp1Price,
  tp2Price,
  d1Bias,
  m30SweepLevel,
}) {
  const gates = [];

  // Trigger (CHoCH or rejection)
  const hasTrigger = !!m1ChochConfirmed || !!m1RejectionPresent;
  gates.push({
    key: "trigger",
    label: "M1 trigger (CHoCH or Rejection Block)",
    pass: hasTrigger,
    detail: hasTrigger
      ? `Trigger: ${[m1ChochConfirmed && "CHoCH", m1RejectionPresent && "Rejection"].filter(Boolean).join(" + ")}.`
      : "❌ No M1 trigger. Do not front-run. Wait for the CHoCH or rejection.",
  });

  // Entry price
  const entry = num(m1EntryPrice);
  gates.push({
    key: "entry",
    label: "M1 entry price set",
    pass: entry !== null,
    detail: entry !== null ? `Entry: ${entry}.` : "No entry price entered.",
  });

  // Stop beyond M30 sweep extreme
  const sl = num(stopLoss);
  const sweep = num(m30SweepLevel);
  let slValid = false;
  if (sl !== null && sweep !== null && entry !== null) {
    if (d1Bias === "bearish") {
      // Short: SL above entry, and beyond (above) the sweep high
      slValid = sl > entry && sl >= sweep;
    } else {
      // Long: SL below entry, and beyond (below) the sweep low
      slValid = sl < entry && sl <= sweep;
    }
  }
  gates.push({
    key: "sl",
    label: "Razor-thin stop beyond M30 sweep extreme",
    pass: slValid,
    detail:
      sl === null || sweep === null
        ? "Need SL + sweep level to validate."
        : slValid
        ? `✅ SL ${sl} beyond sweep extreme ${sweep}.`
        : `❌ SL must be beyond the sweep extreme (${sweep}) — not inside the trap.`,
  });

  // TP2 (final DOL) required
  const tp2 = num(tp2Price);
  gates.push({
    key: "tp2",
    label: "Final target (D1 DOL) set",
    pass: tp2 !== null,
    detail: tp2 !== null ? `TP2 (DOL): ${tp2}.` : "❌ Set the final D1 DOL target.",
  });

  // TP2 direction check
  let tp2Valid = false;
  if (tp2 !== null && entry !== null) {
    tp2Valid = d1Bias === "bearish" ? tp2 < entry : tp2 > entry;
  }
  gates.push({
    key: "tp2_direction",
    label: "Final target in correct direction",
    pass: tp2Valid,
    detail:
      tp2 === null
        ? "No TP2 set."
        : tp2Valid
        ? `✅ TP2 ${tp2} is on the correct side.`
        : "❌ TP2 is on the wrong side of entry.",
  });

  // TP1 (partial) direction check if set (optional)
  const tp1 = num(tp1Price);
  let tp1Valid = true;
  if (tp1 !== null && entry !== null) {
    tp1Valid = d1Bias === "bearish" ? tp1 < entry : tp1 > entry;
  }
  gates.push({
    key: "tp1",
    label: "Partial target (TP1) — optional",
    pass: tp1 === null || tp1Valid,
    bonus: true,
    detail:
      tp1 === null
        ? "No TP1 set (partial will be skipped)."
        : tp1Valid
        ? `✅ TP1 ${tp1} on correct side — take 50% and move SL to BE.`
        : "❌ TP1 is on the wrong side of entry.",
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
// TRADE MATH
// ============================================================
export function computeAdsTrade({
  d1Bias,
  m1EntryPrice,
  stopLoss,
  tp1Price,
  tp2Price,
  accountSize = 0,
  riskPercent = 1,
}) {
  const entry = num(m1EntryPrice);
  const sl = num(stopLoss);
  const tp1 = num(tp1Price);
  const tp2 = num(tp2Price);

  if (entry === null || sl === null || tp2 === null) return null;

  const slValid = (d1Bias === "bearish" && sl > entry) || (d1Bias === "bullish" && sl < entry);
  if (!slValid) {
    return { invalid: true, invalidReason: "Stop loss is on the wrong side of entry." };
  }

  const risk = Math.abs(entry - sl);
  const reward2 = Math.abs(tp2 - entry);
  const reward1 = tp1 !== null ? Math.abs(tp1 - entry) : null;

  const rr2 = risk > 0 ? reward2 / risk : 0;
  const rr1 = risk > 0 && reward1 !== null ? reward1 / risk : null;

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
    // If TP1 exists, 50% of position closes there
    if (tp1 !== null) {
      trade.partialRisk = trade.riskAmount / 2;
    }
  }

  return trade;
}

// ============================================================
// FULL EVALUATION — THE GOLDEN RULE CHECK
// ============================================================
export function evaluateAds({
  // D1
  d1Bias,
  d1RangeHigh,
  d1RangeLow,
  currentPrice,
  dolLevel,
  dolType,
  ema50Value,

  // M30
  session,
  m30SweepDirection,
  m30SweepLevel,
  m30ChochConfirmed,
  m30ChochLevel,
  m30FvgHigh,
  m30FvgLow,

  // M1
  m1ChochConfirmed,
  m1RejectionPresent,
  m1EntryPrice,
  stopLoss,
  tp1Price,
  tp2Price,

  // Meta
  accountSize = 0,
  riskPercent = 1,
}) {
  const d1 = evaluateD1Narrative({
    d1Bias,
    d1RangeHigh,
    d1RangeLow,
    currentPrice,
    dolLevel,
    dolType,
    ema50Value,
  });

  const m30 = evaluateM30Trap({
    session,
    d1Bias,
    m30SweepDirection,
    m30SweepLevel,
    m30ChochConfirmed,
    m30ChochLevel,
    m30FvgHigh,
    m30FvgLow,
    d1RangeHigh,
    d1RangeLow,
    ema50Value,
  });

  const m1 = evaluateM1Trigger({
    m1ChochConfirmed,
    m1RejectionPresent,
    m1EntryPrice,
    stopLoss,
    tp1Price,
    tp2Price,
    d1Bias,
    m30SweepLevel,
  });

  const allReady = d1.ready && m30.ready && m1.ready;

  let trade = null;
  if (allReady) {
    trade = computeAdsTrade({
      d1Bias,
      m1EntryPrice,
      stopLoss,
      tp1Price,
      tp2Price,
      accountSize,
      riskPercent,
    });
  }

  // A+ badge: 50 EMA overlaps the M30 FVG
  const isAplus = m30.emaOverlap === true;

  const reasons = [];
  if (!d1.ready) d1.gates.filter(g => !g.pass && !g.bonus && !g.warning).forEach(g => reasons.push(`D1: ${g.label}`));
  if (!m30.ready) m30.gates.filter(g => !g.pass && !g.bonus && !g.warning).forEach(g => reasons.push(`M30: ${g.label}`));
  if (!m1.ready) m1.gates.filter(g => !g.pass && !g.bonus).forEach(g => reasons.push(`M1: ${g.label}`));

  return {
    d1,
    m30,
    m1,
    trade,
    preEntryReady: allReady && trade && !trade.invalid,
    reasons,
    isAplus,
    poiZoneWarning: m30.poiZoneWarning,
    emaConflict: d1.emaConflict,
    // Convenience top-level fields for the card
    d1Zone: d1.zone,
    m30PoiZone: m30.poiZone,
  };
}