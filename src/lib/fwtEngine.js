// ============================================================
// FWT — 4-HOUR WICK TRAP ENGINE (MULTI-CANDLE EDITION)
// ============================================================
// Sequence: Bias → Wick → Wick Confirmed → 15M CHoCH → 15M FVG → 1M Entry → SL/TP
// Supports Single Candle and Multi-Candle containers.
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

export const CONTAINER_MODES = [
  { key: "single", label: "Single Candle",    hint: "Use only the current 4H candle." },
  { key: "multi",  label: "Multi-Candle",     hint: "Combine 2+ candles into a larger container." },
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
// STEP 1: CONTEXT — DAILY BIAS + CONTAINER + 50 EMA
// ============================================================
export function evaluateFwtContext({
  mode,
  containerMode = "single",
  dailyBias,
  currentPrice,
  candleOpen,
  candleHigh,
  candleLow,
  candleClose,
  linkedCandles = [],
  ema50Value,
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

  // 50 EMA
  const emaResult = evaluateEmaBias({ ema50Value, currentPrice, dailyBias });
  gates.push(...emaResult.gates);

  // Candle / Container bounds
  const o = num(candleOpen);
  const h = num(candleHigh);
  const l = num(candleLow);
  const c = num(candleClose);
  const cur = num(currentPrice);

  let effectiveHigh = h;
  let effectiveLow = l;

  if (containerMode === "multi" && linkedCandles.length > 0) {
    const validHighs = linkedCandles.map(lc => num(lc.high)).filter(v => v !== null);
    const validLows = linkedCandles.map(lc => num(lc.low)).filter(v => v !== null);
    
    // Combine current candle + linked candles
    if (h !== null) validHighs.push(h);
    if (l !== null) validLows.push(l);

    if (validHighs.length > 0) effectiveHigh = Math.max(...validHighs);
    if (validLows.length > 0) effectiveLow = Math.min(...validLows);
  }

  const hasContainer = effectiveHigh !== null && effectiveLow !== null && effectiveHigh > effectiveLow;
  
  gates.push({
    key: "container",
    label: containerMode === "multi" ? `Multi-Candle Container (${linkedCandles.length + 1} candles incl. current)` : "4H Candle bounds set",
    pass: hasContainer,
    detail: hasContainer
      ? `${containerMode === "multi" ? "Combined" : "Candle"} Range: ${fmt(effectiveLow)} – ${fmt(effectiveHigh)}`
      : "Missing bounds.",
  });

  // Price inside container
  const priceInRange = hasContainer && cur !== null && cur >= effectiveLow && cur <= effectiveHigh;
  gates.push({
    key: "price_in_candle",
    label: "Current price inside the container",
    pass: priceInRange,
    detail:
      cur === null
        ? "No current price set."
        : !hasContainer
        ? "Need container bounds to check price position."
        : priceInRange
        ? `Price ${fmt(cur)} is inside (${fmt(effectiveLow)} – ${fmt(effectiveHigh)}).`
        : `⚠️ Price ${fmt(cur)} is outside the container range.`,
  });

  // Closed mode
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

  const blocking = gates.filter(g => !g.warning);
  const passed = blocking.filter(g => g.pass).length;

  return {
    ready: passed === blocking.length,
    gates,
    score: Math.round((passed / blocking.length) * 100),
    emaBias: emaResult.bias,
    emaConflict: emaResult.conflict,
    effectiveHigh,
    effectiveLow,
  };
}

// ============================================================
// STEP 2: THE WICK — MANIPULATION PHASE
// ============================================================
export function evaluateFwtWick({
  dailyBias,
  effectiveHigh,
  effectiveLow,
  wickDirection,
  wickExtreme,
  liquiditySweptType,
  liquiditySweptLevel,
  wickConfirmed,
}) {
  const gates = [];

  const wExt = num(wickExtreme);
  const h = num(effectiveHigh);
  const l = num(effectiveLow);
  const sweepLvl = num(liquiditySweptLevel);

  // Direction set
  gates.push({
    key: "direction",
    label: "Wick direction set",
    pass: wickDirection === "upper" || wickDirection === "lower",
    detail: wickDirection ? `Direction: ${wickDirection}` : "No wick direction selected.",
  });

  // Direction aligns
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

  // Wick extreme beyond container
  let extremeValid = false;
  if (wExt !== null && h !== null && l !== null) {
    if (wickDirection === "upper") extremeValid = wExt >= h;
    else if (wickDirection === "lower") extremeValid = wExt <= l;
  }
  gates.push({
    key: "extreme",
    label: "Wick extreme beyond container (SL reference)",
    pass: extremeValid,
    detail: extremeValid
      ? `Wick extreme ${fmt(wExt)} extends beyond container edge.`
      : `❌ Wick extreme ${fmt(wExt)} must extend beyond the container (${fmt(h)} / ${fmt(l)}).`,
  });

  // Sweep type
  const sweepAligned =
    (wickDirection === "upper" && liquiditySweptType === "bsl") ||
    (wickDirection === "lower" && liquiditySweptType === "ssl");
  gates.push({
    key: "sweep_type",
    label: "Liquidity swept correctly",
    pass: sweepAligned,
    detail: sweepAligned
      ? `${liquiditySweptType?.toUpperCase()} swept by ${wickDirection} wick.`
      : "❌ Swept liquidity type doesn't match wick direction.",
  });

  // Sweep level
  gates.push({
    key: "sweep_level",
    label: "Swept liquidity level recorded",
    pass: sweepLvl !== null,
    detail: sweepLvl !== null ? `Swept at ${fmt(sweepLvl)}.` : "No swept price level entered.",
  });

  // Confirmed
  gates.push({
    key: "confirmed",
    label: "Wick confirmed (price rejected)",
    pass: !!wickConfirmed,
    detail: wickConfirmed
      ? "Price rejected the wick extreme. Trap sprung."
      : "⏳ Waiting for rejection confirmation.",
  });

  const passed = gates.filter((g) => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
  };
}

// ============================================================
// STEP 3: 15M STRUCTURE
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

  gates.push({
    key: "choch",
    label: "15M CHoCH confirmed",
    pass: !!m15ChochConfirmed,
    detail: m15ChochConfirmed
      ? "Structure shifted on 15M."
      : "⏳ Waiting for 15M CHoCH.",
  });

  const chochLvl = num(m15ChochLevel);
  gates.push({
    key: "choch_level",
    label: "15M CHoCH level recorded",
    pass: chochLvl !== null,
    detail: chochLvl !== null ? `CHoCH at ${fmt(chochLvl)}.` : "No CHoCH price level entered.",
  });

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

  const wExt = num(wickExtreme);
  let fvgInWick = null;
  if (hasFvg && wExt !== null && chochLvl !== null) {
    if (wickDirection === "upper") fvgInWick = fvgH <= wExt && fvgL >= chochLvl;
    else if (wickDirection === "lower") fvgInWick = fvgL >= wExt && fvgH <= chochLvl;
  }
  gates.push({
    key: "fvg_in_wick",
    label: "15M FVG inside the wick zone",
    pass: fvgInWick === true,
    detail:
      fvgInWick === null
        ? "Need FVG bounds, CHoCH level, and wick extreme."
        : fvgInWick
        ? "FVG sits inside the wick — valid entry zone."
        : "⚠️ FVG is outside the wick zone.",
  });

  const passed = gates.filter((g) => g.pass).length;
  return {
    ready: passed === gates.length,
    gates,
    score: Math.round((passed / gates.length) * 100),
  };
}

// ============================================================
// STEP 4: 1M ENTRY
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

  const hasTrigger = !!m1ChochConfirmed || !!m1RejectionPresent;
  gates.push({
    key: "trigger",
    label: "1M trigger (CHoCH or rejection)",
    pass: hasTrigger,
    detail: hasTrigger
      ? `Trigger: ${[m1ChochConfirmed && "CHoCH", m1RejectionPresent && "Rejection"].filter(Boolean).join(" + ")}.`
      : "Need a 1M CHoCH or Rejection Block.",
  });

  const entry = num(entryPrice);
  const sl = num(stopLoss);
  const tp = num(targetPrice);
  const wExt = num(wickExtreme);

  gates.push({
    key: "entry",
    label: "Entry price set",
    pass: entry !== null,
    detail: entry !== null ? `Entry: ${fmt(entry)}.` : "No entry price entered.",
  });

  let slValid = false;
  if (entry !== null && sl !== null && wExt !== null) {
    if (dailyBias === "bearish") {
      slValid = sl > entry && sl >= wExt;
    } else if (dailyBias === "bullish") {
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
        ? `SL ${fmt(sl)} is beyond wick extreme ${fmt(wExt)}.`
        : `❌ SL must be beyond the wick extreme (${fmt(wExt)}).`,
  });

  let tpValid = false;
  if (entry !== null && tp !== null) {
    if (dailyBias === "bearish") tpValid = tp < entry;
    else if (dailyBias === "bullish") tpValid = tp > entry;
  }
  gates.push({
    key: "tp",
    label: "Target in correct direction",
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
  containerMode = "single",
  dailyBias,
  currentPrice,
  candleOpen,
  candleHigh,
  candleLow,
  candleClose,
  linkedCandles = [],
  ema50Value,
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
    containerMode,
    dailyBias,
    currentPrice,
    candleOpen,
    candleHigh,
    candleLow,
    candleClose,
    linkedCandles,
    ema50Value,
  });

  const wick = evaluateFwtWick({
    dailyBias,
    effectiveHigh: context.effectiveHigh,
    effectiveLow: context.effectiveLow,
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

  const reasons = [];
  if (!context.ready) context.gates.filter((g) => !g.pass && !g.warning).forEach((g) => reasons.push(`Context: ${g.label}`));
  if (!wick.ready) wick.gates.filter((g) => !g.pass).forEach((g) => reasons.push(`Wick: ${g.label}`));
  if (!structure.ready) structure.gates.filter((g) => !g.pass).forEach((g) => reasons.push(`Structure: ${g.label}`));
  if (!entry.ready) entry.gates.filter((g) => !g.pass).forEach((g) => reasons.push(`Entry: ${g.label}`));

  return {
    mode,
    containerMode,
    effectiveHigh: context.effectiveHigh,
    effectiveLow: context.effectiveLow,
    context,
    wick,
    structure,
    entry,
    trade,
    preEntryReady: allReady && trade && !trade.invalid,
    reasons,
    emaBias: context.emaBias,
    emaConflict: context.emaConflict,
  };
}