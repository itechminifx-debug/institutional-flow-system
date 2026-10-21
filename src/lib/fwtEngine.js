// ============================================================
// FWT — 4-HOUR WICK TRAP ENGINE
// ============================================================
// Sequence: Bias → 4H Wick → Wick Confirmed → 15M CHoCH → 15M FVG → 1M Entry → SL/TP
//
// Two modes:
//   - 'live'   = trading inside the 4H candle while it's forming (aggressive)
//   - 'closed' = the 4H candle has closed with a confirmed rejection wick (mechanical)
//
// The engine blocks saving if the sequence is incomplete.
// ============================================================

export const FWT_SESSIONS = [
  { key: "asian",  label: "Asian 4H",   hint: "Accumulation. Sets the range." },
  { key: "london", label: "London 4H",  hint: "Judas Swing. First real volume." },
  { key: "ny_am",  label: "NY AM 4H",   hint: "Heaviest volume. Cleanest wicks." },
  { key: "ny_pm",  label: "NY PM 4H",   hint: "Secondary. Late reversal or continuation." },
];

export const FWT_MODES = [
  { key: "live",   label: "Live (intra-candle)",  hint: "Trade the wick while the 4H candle is still forming." },
  { key: "closed", label: "Closed (post-candle)", hint: "The 4H candle has closed with a confirmed rejection wick." },
];

export const WICK_DIRECTIONS = [
  { key: "upper", label: "Upper Wick", emoji: "⬆️", hint: "Sweeps BSL above. Expect short." },
  { key: "lower", label: "Lower Wick", emoji: "⬇️", hint: "Sweeps SSL below. Expect long." },
];

export const LIQUIDITY_SWEPT_TYPES = [
  { key: "bsl", label: "BSL (Buy-Side Liquidity)", emoji: "🔵" },
  { key: "ssl", label: "SSL (Sell-Side Liquidity)", emoji: "🟠" },
];

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function fmt(v) {
  return v === null || v === undefined ? "—" : v.toString();
}

// ============================================================
// STEP 1: CONTEXT — DAILY BIAS + 4H CANDLE DATA
// ============================================================
export function evaluateFwtContext({
  mode,
  dailyBias,
  currentPrice,
  candleOpen,
  candleHigh,
  candleLow,
  candleClose,
}) {
  const gates = [];

  // Bias
  const hasBias = dailyBias === "bullish" || dailyBias === "bearish";
  gates.push({
    key: "bias",
    label: "Daily bias set",
    pass: hasBias,
    detail: hasBias ? `Bias: ${dailyBias}` : "No daily bias. Cannot trade without HTF context.",
  });

  // Candle data
  const o = num(candleOpen);
  const h = num(candleHigh);
  const l = num(candleLow);
  const c = num(candleClose);
  const cur = num(currentPrice);

  const hasCandleBody = o !== null && h !== null && l !== null && h > l;
  gates.push({
    key: "candle_bounds",
    label: "4H candle bounds set",
    pass: hasCandleBody,
    detail: hasCandleBody
      ? `O:${fmt(o)} · H:${fmt(h)} · L:${fmt(l)}${c !== null ? ` · C:${fmt(c)}` : ""}`
      : "Missing candle open / high / low.",
  });

  // Current price must be inside the candle range
  const priceInRange = hasCandleBody && cur !== null && cur >= l && cur <= h;
  gates.push({
    key: "price_in_candle",
    label: "Current price is inside the 4H candle",
    pass: priceInRange,
    detail:
      cur === null
        ? "No current price set."
        : !hasCandleBody
        ? "Need candle bounds to check price position."
        : priceInRange
        ? `Price ${fmt(cur)} is inside the candle (${fmt(l)} – ${fmt(h)}).`
        : `⚠️ Price ${fmt(cur)} is outside the candle range. Check the data.`,
  });

  // Closed mode: candle_close must be set
  if (mode === "closed") {
    gates.push({
      key: "candle_close",
      label: "Candle close recorded (closed mode)",
      pass: c !== null,
      detail: c !== null
        ? `Closed at ${fmt(c)}. Post-candle analysis valid.`
        : "Closed mode requires the candle's close price.",
    });
  }

  const passed = gates.filter((g) => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
  };
}

// ============================================================
// STEP 2: THE WICK — MANIPULATION PHASE
// ============================================================
export function evaluateFwtWick({
  dailyBias,
  candleHigh,
  candleLow,
  wickDirection,
  wickExtreme,
  liquiditySweptType,
  liquiditySweptLevel,
  wickConfirmed,
}) {
  const gates = [];

  const wExt = num(wickExtreme);
  const h = num(candleHigh);
  const l = num(candleLow);
  const sweepLvl = num(liquiditySweptLevel);

  // Wick direction set
  gates.push({
    key: "direction",
    label: "Wick direction set",
    pass: wickDirection === "upper" || wickDirection === "lower",
    detail: wickDirection ? `Direction: ${wickDirection}` : "No wick direction selected.",
  });

  // Wick direction must match bias (upper wick + bearish, lower wick + bullish)
  const directionAligned =
    (dailyBias === "bearish" && wickDirection === "upper") ||
    (dailyBias === "bullish" && wickDirection === "lower");
  gates.push({
    key: "alignment",
    label: "Wick direction aligns with bias",
    pass: directionAligned,
    detail: directionAligned
      ? `${wickDirection} wick + ${dailyBias} bias = aligned.`
      : `❌ ${wickDirection} wick conflicts with ${dailyBias} bias.`,
  });

  // Wick extreme must be at or beyond candle high/low
  let extremeValid = false;
  if (wExt !== null && h !== null && l !== null) {
    if (wickDirection === "upper") extremeValid = wExt >= h;
    else if (wickDirection === "lower") extremeValid = wExt <= l;
  }
  gates.push({
    key: "extreme",
    label: "Wick extreme recorded (SL reference)",
    pass: extremeValid,
    detail: extremeValid
      ? `Wick extreme ${fmt(wExt)} — will be used as SL reference.`
      : "Wick extreme must be at or beyond the candle high/low.",
  });

  // Liquidity sweep type must match direction
  const sweepAligned =
    (wickDirection === "upper" && liquiditySweptType === "bsl") ||
    (wickDirection === "lower" && liquiditySweptType === "ssl");
  gates.push({
    key: "sweep_type",
    label: "Liquidity swept correctly (BSL for upper, SSL for lower)",
    pass: sweepAligned,
    detail: sweepAligned
      ? `${liquiditySweptType?.toUpperCase()} swept by ${wickDirection} wick.`
      : "❌ Swept liquidity type doesn't match wick direction.",
  });

  // Sweep level recorded
  gates.push({
    key: "sweep_level",
    label: "Swept liquidity level recorded",
    pass: sweepLvl !== null,
    detail: sweepLvl !== null ? `Swept at ${fmt(sweepLvl)}.` : "No swept price level entered.",
  });

  // Wick confirmed
  gates.push({
    key: "confirmed",
    label: "Wick confirmed (price rejected)",
    pass: !!wickConfirmed,
    detail: wickConfirmed
      ? "Price rejected the wick extreme. Trap sprung."
      : "⏳ Waiting for rejection confirmation. The wick is still forming or hasn't been rejected.",
  });

  const passed = gates.filter((g) => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
  };
}

// ============================================================
// STEP 3: 15M STRUCTURE — CHoCH + FVG
// ============================================================
export function evaluateFwtStructure({
  mode,
  wickConfirmed,
  m15ChochConfirmed,
  m15ChochLevel,
  m15FvgHigh,
  m15FvgLow,
  wickExtreme,
  wickDirection,
}) {
  const gates = [];

  // 15M CHoCH confirmed
  gates.push({
    key: "choch",
    label: "15M CHoCH confirmed",
    pass: !!m15ChochConfirmed,
    detail: m15ChochConfirmed
      ? "Structure shifted on 15M. Shift confirmed."
      : "⏳ Waiting for 15M CHoCH. Cannot enter without it.",
  });

  // CHoCH level recorded
  const chochLvl = num(m15ChochLevel);
  gates.push({
    key: "choch_level",
    label: "15M CHoCH level recorded",
    pass: chochLvl !== null,
    detail: chochLvl !== null ? `CHoCH at ${fmt(chochLvl)}.` : "No CHoCH price level entered.",
  });

  // 15M FVG bounds
  const fvgH = num(m15FvgHigh);
  const fvgL = num(m15FvgLow);
  const hasFvg = fvgH !== null && fvgL !== null && fvgH > fvgL;
  gates.push({
    key: "fvg",
    label: "15M FVG bounds marked",
    pass: hasFvg,
    detail: hasFvg
      ? `FVG ${fmt(fvgL)} – ${fmt(fvgH)}.`
      : "15M FVG is required as the entry zone.",
  });

  // FVG must be inside the wick zone (between wick extreme and candle body)
  const wExt = num(wickExtreme);
  let fvgInWick = null;
  if (hasFvg && wExt !== null && chochLvl !== null) {
    // For an upper wick (short): FVG should be between CHoCH level and wick extreme (above)
    // For a lower wick (long): FVG should be between CHoCH level and wick extreme (below)
    if (wickDirection === "upper") fvgInWick = fvgH <= wExt && fvgL >= chochLvl;
    else if (wickDirection === "lower") fvgInWick = fvgL >= wExt && fvgH <= chochLvl;
  }
  gates.push({
    key: "fvg_in_wick",
    label: "15M FVG is inside the wick zone",
    pass: fvgInWick === true,
    detail:
      fvgInWick === null
        ? "Need FVG bounds, CHoCH level, and wick extreme to validate."
        : fvgInWick
        ? "FVG sits inside the wick — valid entry zone."
        : "⚠️ FVG is outside the wick zone. Check the levels.",
  });

  const passed = gates.filter((g) => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
  };
}

// ============================================================
// STEP 4: 1M ENTRY — CHoCH OR REJECTION
// ============================================================
export function evaluateFwtEntry({
  m1ChochConfirmed,
  m1RejectionPresent,
  entryPrice,
  stopLoss,
  targetPrice,
  wickExtreme,
  wickDirection,
  dailyBias,
}) {
  const gates = [];

  // Trigger: either 1M CHoCH or 1M rejection
  const hasTrigger = !!m1ChochConfirmed || !!m1RejectionPresent;
  gates.push({
    key: "trigger",
    label: "1M trigger (CHoCH or rejection block)",
    pass: hasTrigger,
    detail: hasTrigger
      ? `Trigger: ${[m1ChochConfirmed && "CHoCH", m1RejectionPresent && "Rejection"].filter(Boolean).join(" + ")}.`
      : "Need a 1M CHoCH or a 1M rejection block to trigger the entry.",
  });

  const entry = num(entryPrice);
  const sl = num(stopLoss);
  const tp = num(targetPrice);
  const wExt = num(wickExtreme);

  // Entry price set
  gates.push({
    key: "entry",
    label: "Entry price set",
    pass: entry !== null,
    detail: entry !== null ? `Entry: ${fmt(entry)}.` : "No entry price entered.",
  });

  // SL must be beyond the wick extreme (with a small buffer allowed)
  let slValid = false;
  if (entry !== null && sl !== null && wExt !== null) {
    if (dailyBias === "bearish") {
      // Short: SL above entry, and SL >= wick extreme (with small tolerance)
      slValid = sl > entry && sl >= wExt;
    } else if (dailyBias === "bullish") {
      // Long: SL below entry, and SL <= wick extreme
      slValid = sl < entry && sl <= wExt;
    }
  }
  gates.push({
    key: "sl",
    label: "Stop loss beyond wick extreme",
    pass: slValid,
    detail:
      sl === null
        ? "No stop loss entered."
        : slValid
        ? `SL ${fmt(sl)} is beyond wick extreme ${fmt(wExt)}. Tight and correct.`
        : `❌ SL must be beyond the wick extreme (${fmt(wExt)}) — not inside the trap.`,
  });

  // TP direction check
  let tpValid = false;
  if (entry !== null && tp !== null) {
    if (dailyBias === "bearish") tpValid = tp < entry;
    else if (dailyBias === "bullish") tpValid = tp > entry;
  }
  gates.push({
    key: "tp",
    label: "Target in the correct direction",
    pass: tpValid,
    detail: tp === null
      ? "No target price entered."
      : tpValid
      ? `Target ${fmt(tp)} — correct direction.`
      : "❌ Target is on the wrong side of entry.",
  });

  const passed = gates.filter((g) => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
  };
}

// ============================================================
// TRADE MATH
// ============================================================
export function computeFwtTrade({
  dailyBias,
  entryPrice,
  stopLoss,
  targetPrice,
  accountSize = 0,
  riskPercent = 1,
}) {
  const entry = num(entryPrice);
  const sl = num(stopLoss);
  const tp = num(targetPrice);

  if (entry === null || sl === null || tp === null) return null;

  const slValid = (dailyBias === "bearish" && sl > entry) || (dailyBias === "bullish" && sl < entry);
  if (!slValid) {
    return {
      invalid: true,
      invalidReason: "Stop loss is on the wrong side of entry.",
    };
  }

  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  const rr = risk > 0 ? reward / risk : 0;

  const trade = {
    direction: dailyBias === "bullish" ? "BUY" : "SELL",
    entry,
    sl,
    tp,
    rr,
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
export function evaluateFwt({
  mode = "live",
  dailyBias,
  currentPrice,
  candleOpen,
  candleHigh,
  candleLow,
  candleClose,
  wickDirection,
  wickExtreme,
  liquiditySweptType,
  liquiditySweptLevel,
  wickConfirmed,
  m15ChochConfirmed,
  m15ChochLevel,
  m15FvgHigh,
  m15FvgLow,
  m1ChochConfirmed,
  m1RejectionPresent,
  entryPrice,
  stopLoss,
  targetPrice,
  accountSize = 0,
  riskPercent = 1,
}) {
  const context = evaluateFwtContext({
    mode,
    dailyBias,
    currentPrice,
    candleOpen,
    candleHigh,
    candleLow,
    candleClose,
  });

  const wick = evaluateFwtWick({
    dailyBias,
    candleHigh,
    candleLow,
    wickDirection,
    wickExtreme,
    liquiditySweptType,
    liquiditySweptLevel,
    wickConfirmed,
  });

  const structure = evaluateFwtStructure({
    mode,
    wickConfirmed,
    m15ChochConfirmed,
    m15ChochLevel,
    m15FvgHigh,
    m15FvgLow,
    wickExtreme,
    wickDirection,
  });

  const entry = evaluateFwtEntry({
    m1ChochConfirmed,
    m1RejectionPresent,
    entryPrice,
    stopLoss,
    targetPrice,
    wickExtreme,
    wickDirection,
    dailyBias,
  });

  const allReady =
    context.ready && wick.ready && structure.ready && entry.ready;

  let trade = null;
  if (allReady) {
    trade = computeFwtTrade({
      dailyBias,
      entryPrice,
      stopLoss,
      targetPrice,
      accountSize,
      riskPercent,
    });
  }

  // Collect reasons if not ready
  const reasons = [];
  if (!context.ready) context.gates.filter((g) => !g.pass).forEach((g) => reasons.push(`Context: ${g.label}`));
  if (!wick.ready) wick.gates.filter((g) => !g.pass).forEach((g) => reasons.push(`Wick: ${g.label}`));
  if (!structure.ready) structure.gates.filter((g) => !g.pass).forEach((g) => reasons.push(`Structure: ${g.label}`));
  if (!entry.ready) entry.gates.filter((g) => !g.pass).forEach((g) => reasons.push(`Entry: ${g.label}`));

  return {
    mode,
    context,
    wick,
    structure,
    entry,
    trade,
    preEntryReady: allReady && trade && !trade.invalid,
    reasons,
  };
}