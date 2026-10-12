// ============================================================
// AMD ENGINE
// ============================================================
// Accumulation → Manipulation → Distribution
//
//   1. Accumulation — range forms, ATR falls
//   2. Manipulation — sweep of range, close back inside
//   3. Distribution — MSS → FVG → RB → retest → close → entry
//
// Reuses:
//   - computeCe, judgeZoneNegotiation,
//     premiumDiscountVerdict, atrFilter   (liquidityZoneEngine)
//
// Does NOT duplicate any existing logic.
// ============================================================

import {
  computeCe,
  judgeZoneNegotiation,
  premiumDiscountVerdict,
  atrFilter,
} from "@/lib/liquidityZoneEngine";

// ============================================================
// SEQUENCE TYPES
// ============================================================
export const AMD_TYPES = [
  {
    key: "bullish",
    label: "Bullish AMD",
    emoji: "🟢",
    hint: "Range → sweep below → MSS up → FVG → RB → BUY",
  },
  {
    key: "bearish",
    label: "Bearish AMD",
    emoji: "🔴",
    hint: "Range → sweep above → MSS down → FVG → RB → SELL",
  },
];

export function amdTypeInfo(key) {
  return AMD_TYPES.find((t) => t.key === key) || AMD_TYPES[0];
}

// ============================================================
// HELPERS
// ============================================================
function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function validCandle(c) {
  if (!c) return false;
  return (
    num(c.open) !== null &&
    num(c.high) !== null &&
    num(c.low) !== null &&
    num(c.close) !== null
  );
}

// ============================================================
// THE 10-GATE CHECKLIST
// ============================================================
export const AMD_CHECKLIST = [
  { key: "range",       number: 1,  phase: "A", label: "Is price in a range?",          hint: "Mark the range high + low" },
  { key: "atr_falling", number: 2,  phase: "A", label: "Is ATR falling?",               hint: "Compression — volatility contracting" },
  { key: "sweep",       number: 3,  phase: "M", label: "Did price sweep the range?",    hint: "False break against the true direction" },
  { key: "reclaim",     number: 4,  phase: "M", label: "Did price close back inside?",  hint: "The trap is set — the sweep was false" },
  { key: "mss",         number: 5,  phase: "D", label: "Did an MSS occur?",             hint: "Market Structure Shift — confirmed by close" },
  { key: "fvg",         number: 6,  phase: "D", label: "Did displacement create an FVG?", hint: "Mark the FVG high + low" },
  { key: "rb",          number: 7,  phase: "D", label: "Is there an RB inside the FVG?",  hint: "RB must overlap the FVG" },
  { key: "entry",       number: 8,  phase: "D", label: "Is there a clear entry?",       hint: "Close candle lands inside the RB" },
  { key: "reward",      number: 9,  phase: "D", label: "Is the reward 1:2+?",           hint: "TP vs Entry vs SL ≥ 2:1" },
  { key: "mindset",     number: 10, phase: "X", label: "Am I calm and disciplined?",    hint: "Manual check — mindset gate" },
];

export const AMD_PASS_THRESHOLD = 7;

export function computeAmdScore(answers) {
  return AMD_CHECKLIST.filter((q) => answers[q.key]).length;
}

export function amdChecklistVerdict(score) {
  if (score >= 9) {
    return {
      key: "extreme",
      label: "Extreme Confluence",
      emoji: "🏆",
      color: "bg-green-950/50 border-green-600 text-green-200",
      description: "Full AMD alignment — highest-probability trade",
      passed: true,
    };
  }
  if (score >= AMD_PASS_THRESHOLD) {
    return {
      key: "high",
      label: "Passed",
      emoji: "✅",
      color: "bg-green-950/40 border-green-700 text-green-200",
      description: "AMD checklist passed — trade is valid",
      passed: true,
    };
  }
  if (score >= 5) {
    return {
      key: "medium",
      label: "Partial — Wait",
      emoji: "⚠️",
      color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
      description: "Partial alignment — wait for more confirmation",
      passed: false,
    };
  }
  return {
    key: "low",
    label: "Failed — Skip",
    emoji: "🔴",
    color: "bg-red-950/40 border-red-700 text-red-200",
    description: "Too many gates unchecked — not a valid AMD trade",
    passed: false,
  };
}

// ============================================================
// PHASE A — ACCUMULATION
// ============================================================

export function checkRange({ rangeHigh, rangeLow }) {
  const high = num(rangeHigh);
  const low = num(rangeLow);

  if (high === null || low === null) {
    return { pass: false, detail: "Range not marked.", data: null };
  }
  if (high <= low) {
    return {
      pass: false,
      detail: `Range high (${high}) must be above range low (${low}).`,
      data: null,
    };
  }
  return {
    pass: true,
    detail: `Range marked ${low} – ${high}.`,
    data: { high, low, ce: computeCe(high, low) },
  };
}

export function checkAtrFalling({ atrCurrent, atrPrior }) {
  const filter = atrFilter(atrCurrent, atrPrior);
  const falling = filter.key === "falling" || filter.key === "flat";
  return {
    pass: falling,
    detail: falling
      ? `${filter.label} — compression confirmed.`
      : `${filter.label} — volatility rising, not typical accumulation.`,
    data: { atrState: filter.key, tradeable: filter.tradeable },
  };
}

// ============================================================
// PHASE M — MANIPULATION
// ============================================================

export function checkSweep({ sweepCandle, rangeHigh, rangeLow, sequenceType }) {
  if (!validCandle(sweepCandle)) {
    return { pass: false, detail: "Sweep candle not filled in.", data: null };
  }
  const high = num(rangeHigh);
  const low = num(rangeLow);
  if (high === null || low === null) {
    return { pass: false, detail: "Range missing.", data: null };
  }

  const wickLow = num(sweepCandle.low);
  const wickHigh = num(sweepCandle.high);

  if (sequenceType === "bullish") {
    const swept = wickLow < low;
    const depth = swept ? Math.round((low - wickLow) * 100) / 100 : 0;
    return {
      pass: swept,
      detail: swept
        ? `Swept ${depth} below range low ${low}.`
        : `No sweep below — wick low ${wickLow}, needs below ${low}.`,
      data: swept ? { side: "below", depth } : null,
    };
  } else {
    const swept = wickHigh > high;
    const depth = swept ? Math.round((wickHigh - high) * 100) / 100 : 0;
    return {
      pass: swept,
      detail: swept
        ? `Swept ${depth} above range high ${high}.`
        : `No sweep above — wick high ${wickHigh}, needs above ${high}.`,
      data: swept ? { side: "above", depth } : null,
    };
  }
}

export function checkReclaim({ sweepCandle, rangeHigh, rangeLow, sequenceType }) {
  if (!validCandle(sweepCandle)) {
    return { pass: false, detail: "Sweep candle not filled in.", data: null };
  }
  const high = num(rangeHigh);
  const low = num(rangeLow);
  const close = num(sweepCandle.close);
  if (high === null || low === null || close === null) {
    return { pass: false, detail: "Range or close missing.", data: null };
  }

  if (sequenceType === "bullish") {
    const reclaimed = close > low;
    return {
      pass: reclaimed,
      detail: reclaimed
        ? `Closed back inside at ${close} (above range low ${low}).`
        : `Failed to reclaim — closed ${close}, below ${low}.`,
      data: reclaimed ? { closedInside: true } : null,
    };
  } else {
    const reclaimed = close < high;
    return {
      pass: reclaimed,
      detail: reclaimed
        ? `Closed back inside at ${close} (below range high ${high}).`
        : `Failed to reclaim — closed ${close}, above ${high}.`,
      data: reclaimed ? { closedInside: true } : null,
    };
  }
}

// ============================================================
// PHASE D — DISTRIBUTION
// ============================================================

export function checkMSS({ currentClose, mssReference, sequenceType }) {
  const close = num(currentClose);
  const ref = num(mssReference);
  if (close === null || ref === null) {
    return { pass: false, detail: "Close or MSS reference missing.", data: null };
  }

  if (sequenceType === "bullish") {
    const broke = close > ref;
    return {
      pass: broke,
      detail: broke
        ? `Bullish MSS — close ${close} above ${ref}.`
        : `No bullish MSS — close ${close}, needs above ${ref}.`,
      data: broke ? { direction: "bullish", level: ref } : null,
    };
  } else {
    const broke = close < ref;
    return {
      pass: broke,
      detail: broke
        ? `Bearish MSS — close ${close} below ${ref}.`
        : `No bearish MSS — close ${close}, needs below ${ref}.`,
      data: broke ? { direction: "bearish", level: ref } : null,
    };
  }
}

export function checkFVG({ fvgHigh, fvgLow }) {
  const high = num(fvgHigh);
  const low = num(fvgLow);

  if (high === null || low === null) {
    return { pass: false, detail: "FVG not marked.", data: null };
  }
  if (high <= low) {
    return {
      pass: false,
      detail: `FVG high (${high}) must be above FVG low (${low}).`,
      data: null,
    };
  }
  const size = Math.round((high - low) * 100) / 100;
  return {
    pass: true,
    detail: `FVG marked ${low} – ${high} (${size} wide).`,
    data: { high, low, ce: computeCe(high, low), size },
  };
}

export function checkRbInFvg({ rbHigh, rbLow, fvgHigh, fvgLow }) {
  const rHigh = num(rbHigh);
  const rLow = num(rbLow);
  const fHigh = num(fvgHigh);
  const fLow = num(fvgLow);

  if (rHigh === null || rLow === null) {
    return { pass: false, detail: "RB not marked.", data: null };
  }
  if (rHigh <= rLow) {
    return { pass: false, detail: "RB high must be above RB low.", data: null };
  }
  if (fHigh === null || fLow === null) {
    return { pass: false, detail: "FVG missing.", data: null };
  }

  const overlapLow = Math.max(rLow, fLow);
  const overlapHigh = Math.min(rHigh, fHigh);
  const overlap = overlapHigh - overlapLow;

  if (overlap > 0) {
    let position = "overlapping";
    if (rHigh <= fHigh && rLow >= fLow) position = "inside";
    else if (rLow >= fHigh - 0.0001) position = "above";
    else if (rHigh <= fLow + 0.0001) position = "below";

    return {
      pass: true,
      detail: `RB ${rLow} – ${rHigh} ${position} the FVG.`,
      data: {
        rbHigh: rHigh,
        rbLow: rLow,
        rbCe: computeCe(rHigh, rLow),
        position,
        overlap: Math.round(overlap * 100) / 100,
      },
    };
  }

  return {
    pass: false,
    detail: `RB ${rLow} – ${rHigh} does not overlap FVG ${fLow} – ${fHigh}.`,
    data: null,
  };
}

export function checkEntry({ closeCandle, rbHigh, rbLow }) {
  if (!validCandle(closeCandle)) {
    return { pass: false, detail: "Close candle not filled in.", data: null };
  }
  const rHigh = num(rbHigh);
  const rLow = num(rbLow);
  const close = num(closeCandle.close);
  if (rHigh === null || rLow === null || close === null) {
    return { pass: false, detail: "RB or close missing.", data: null };
  }

  if (close >= rLow && close <= rHigh) {
    const rbCe = computeCe(rHigh, rLow);
    const side = close > rbCe ? "premium" : close < rbCe ? "discount" : "at-ce";
    return {
      pass: true,
      detail: `Closed ${close} inside RB — ${side}.`,
      data: { close, side, rbCe },
    };
  }
  if (close > rHigh) {
    return {
      pass: false,
      detail: `Closed ${close} above RB — breakout, not retest.`,
      data: null,
    };
  }
  return {
    pass: false,
    detail: `Closed ${close} below RB — breakout, not retest.`,
    data: null,
  };
}

export function checkReward({ trade }) {
  if (!trade) {
    return { pass: false, detail: "Trade not yet computable.", data: null };
  }
  const rr = trade.rr || 0;
  const pass = rr >= 2;
  return {
    pass,
    detail: pass
      ? `RR ${rr.toFixed(2)}:1 — meets 2:1.`
      : `RR ${rr.toFixed(2)}:1 — below 2:1.`,
    data: { rr },
  };
}

export function checkMindset({ manualAnswer }) {
  const pass = manualAnswer === true;
  return {
    pass,
    detail: pass
      ? "Mindset gate acknowledged."
      : "Confirm you are calm and disciplined before saving.",
    data: null,
  };
}

// ============================================================
// FULL EVALUATION
// ============================================================

export function evaluateAmd({
  sequenceType,
  rangeHigh,
  rangeLow,
  atrCurrent,
  atrPrior,
  sweepCandle,
  currentClose,
  mssReference,
  fvgHigh,
  fvgLow,
  rbHigh,
  rbLow,
  closeCandle,
  nextLiquidityLevel,
  pipSize,
  manualMindset = false,
  accountSize = 0,
  riskPercent = 1,
}) {
  // Phase gates
  const range = checkRange({ rangeHigh, rangeLow });
  const atr = checkAtrFalling({ atrCurrent, atrPrior });
  const sweep = checkSweep({
    sweepCandle,
    rangeHigh,
    rangeLow,
    sequenceType,
  });
  const reclaim = checkReclaim({
    sweepCandle,
    rangeHigh,
    rangeLow,
    sequenceType,
  });
  const mss = checkMSS({ currentClose, mssReference, sequenceType });
  const fvg = checkFVG({ fvgHigh, fvgLow });
  const rb = checkRbInFvg({ rbHigh, rbLow, fvgHigh, fvgLow });
  const entry = checkEntry({ closeCandle, rbHigh, rbLow });

  // ---- Base negotiation verdict ----
  // Uses judgeZoneNegotiation (RB CE premium/discount).
  // AMD fix: if judge returns WAIT (close within its tolerance of CE),
  // but the CLOSE CANDLE clearly sits on one side of CE, use that side.
  let baseNegotiation = null;
  if (rb.pass && entry.pass) {
    baseNegotiation = judgeZoneNegotiation({
      activeRb: { high: rbHigh, low: rbLow },
      closePrice: currentClose,
    });

    if (
      baseNegotiation &&
      baseNegotiation.verdict === "WAIT" &&
      entry.data?.side &&
      entry.data.side !== "at-ce"
    ) {
      const rbCe = entry.data.rbCe;
      const close = entry.data.close;
      const isAbove = close > rbCe;
      baseNegotiation = {
        verdict: isAbove ? "SELL" : "BUY",
        side: isAbove ? "premium" : "discount",
        ce: rbCe,
        rbBroken: null,
        strength: "normal",
        reason: isAbove
          ? "Closed in the PREMIUM of the RB (via close candle) — SELL."
          : "Closed in the DISCOUNT of the RB (via close candle) — BUY.",
      };
    }
  }

  // ---- Trade computation ----
  let trade = null;
  if (
    baseNegotiation &&
    (baseNegotiation.verdict === "BUY" || baseNegotiation.verdict === "SELL")
  ) {
    const rHigh = num(rbHigh);
    const rLow = num(rbLow);
    if (rHigh !== null && rLow !== null) {
      const ce = computeCe(rHigh, rLow);
      const slRef = baseNegotiation.verdict === "BUY" ? rLow : rHigh;
      const tp = num(nextLiquidityLevel);
      const ps = num(pipSize) || 1;

      if (tp !== null) {
        const risk = Math.abs(ce - slRef);
        const reward = Math.abs(tp - ce);
        const rr = risk > 0 ? reward / risk : 0;

        trade = {
          direction: baseNegotiation.verdict,
          entry: ce,
          sl: slRef,
          tp,
          rr,
          pipSize: ps,
          slPips: ps > 0 ? Math.round(risk / ps) : null,
          tpPips: ps > 0 ? Math.round(reward / ps) : null,
        };

        // Lot size estimate
        if (accountSize > 0 && risk > 0) {
          const riskAmount = (accountSize * (riskPercent || 1)) / 100;
          const pips = risk / ps;
          const pipValuePerLot = 100000 * ps;
          const lots = pips > 0 ? riskAmount / (pips * pipValuePerLot) : 0;
          trade.lotSize = Math.round(lots * 100) / 100;
          trade.riskAmount = Math.round(riskAmount * 100) / 100;
        }
      }
    }
  }

  // ---- Remaining gates ----
  const reward = checkReward({ trade });
  const mindset = checkMindset({ manualAnswer: manualMindset });

  // ---- Score ----
  const answers = {
    range: range.pass,
    atr_falling: atr.pass,
    sweep: sweep.pass,
    reclaim: reclaim.pass,
    mss: mss.pass,
    fvg: fvg.pass,
    rb: rb.pass,
    entry: entry.pass,
    reward: reward.pass,
    mindset: mindset.pass,
  };

  const score = computeAmdScore(answers);
  const checklistVerdict = amdChecklistVerdict(score);

  // ---- Final verdict ----
  let verdict = "WAIT";
  if (
    checklistVerdict.passed &&
    baseNegotiation &&
    (baseNegotiation.verdict === "BUY" || baseNegotiation.verdict === "SELL")
  ) {
    verdict = baseNegotiation.verdict;
  }

  const verdictDisplay = premiumDiscountVerdict(
    baseNegotiation || { verdict: "WAIT", reason: "AMD sequence not complete." }
  );

  // ---- Reasons list ----
  const reasons = [];
  if (!range.pass) reasons.push(`Range: ${range.detail}`);
  if (!atr.pass) reasons.push(`ATR: ${atr.detail}`);
  if (!sweep.pass) reasons.push(`Sweep: ${sweep.detail}`);
  if (!reclaim.pass) reasons.push(`Reclaim: ${reclaim.detail}`);
  if (!mss.pass) reasons.push(`MSS: ${mss.detail}`);
  if (!fvg.pass) reasons.push(`FVG: ${fvg.detail}`);
  if (!rb.pass) reasons.push(`RB: ${rb.detail}`);
  if (!entry.pass) reasons.push(`Entry: ${entry.detail}`);
  if (!reward.pass) reasons.push(`Reward: ${reward.detail}`);
  if (!mindset.pass) reasons.push(`Mindset: ${mindset.detail}`);

  return {
    sequenceType,
    gates: {
      range,
      atr_falling: atr,
      sweep,
      reclaim,
      mss,
      fvg,
      rb,
      entry,
      reward,
      mindset,
    },
    answers,
    score,
    checklistVerdict,
    baseNegotiation,
    verdict,
    verdictDisplay,
    trade,
    reasons,
  };
}