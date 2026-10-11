// ============================================================
// LIQUIDITY SEQUENCE ENGINE
// ============================================================
// The 5-system collaborative model:
//
//   1. Liquidity Zone   — user marks high + low
//   2. Liquidity Sweep  — did price poke through?
//   3. MSS              — did structure shift?
//   4. FVG              — did a fair value gap form?
//   5. Rejection Block  — does the RB align with the FVG?
//
// Then the trigger:
//
//   6. Close in RB      — did a candle close inside the RB?
//
// Then the verdict:
//
//   judgeZoneNegotiation → premium/discount inside the RB
//   enrichVerdict        → HTF + sweep layer on top
//
// This engine REUSES:
//   - judgeZoneNegotiation, computeCe, atrFilter  (liquidityZoneEngine)
//   - enrichVerdict, computeEmaDirection, emaInfo,
//     computeWarningReasons                       (verdictEngine)
//   - computeTrade                                (tradeCalculator)
//
// It does NOT duplicate any existing logic.
// ============================================================

import {
  computeCe,
  judgeZoneNegotiation,
  premiumDiscountVerdict,
  atrFilter,
} from "@/lib/liquidityZoneEngine";

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
// SEQUENCE TYPES
// ============================================================

export const SEQUENCE_TYPES = [
  {
    key: "support",
    label: "Support Liquidity (Bullish)",
    emoji: "🟢",
    hint: "Sweep below → reversal up → MSS → FVG → BUY",
  },
  {
    key: "resistance",
    label: "Resistance Liquidity (Bearish)",
    emoji: "🔴",
    hint: "Sweep above → reversal down → MSS → FVG → SELL",
  },
];

export function sequenceTypeInfo(key) {
  return SEQUENCE_TYPES.find((s) => s.key === key) || SEQUENCE_TYPES[0];
}

// ============================================================
// SYSTEM 1 — LIQUIDITY ZONE
// ============================================================

export function checkLiquidityZone({ liquidityZoneHigh, liquidityZoneLow }) {
  const high = num(liquidityZoneHigh);
  const low = num(liquidityZoneLow);

  if (high === null || low === null) {
    return {
      key: "liquidity",
      number: 1,
      label: "Liquidity Zone",
      hint: "Mark the pool of stops (high + low)",
      pass: false,
      detail: "Zone not marked.",
      data: null,
    };
  }

  if (high <= low) {
    return {
      key: "liquidity",
      number: 1,
      label: "Liquidity Zone",
      hint: "Mark the pool of stops (high + low)",
      pass: false,
      detail: `Zone high (${high}) must be above zone low (${low}).`,
      data: null,
    };
  }

  return {
    key: "liquidity",
    number: 1,
    label: "Liquidity Zone",
    hint: "Mark the pool of stops (high + low)",
    pass: true,
    detail: `Zone marked ${low} – ${high}.`,
    data: { high, low, ce: computeCe(high, low) },
  };
}

// ============================================================
// SYSTEM 2 — LIQUIDITY SWEEP
// ============================================================
// Support: sweep candle's LOW pokes BELOW the zone low
// Resistance: sweep candle's HIGH pokes ABOVE the zone high

export function checkSweep({ sweepCandle, liquidityZoneHigh, liquidityZoneLow, sequenceType }) {
  if (!validCandle(sweepCandle)) {
    return {
      key: "sweep",
      number: 2,
      label: "Liquidity Sweep",
      hint: "Candle that pokes through the zone",
      pass: false,
      detail: "Sweep candle not filled in.",
      data: null,
    };
  }

  const zoneHigh = num(liquidityZoneHigh);
  const zoneLow = num(liquidityZoneLow);
  if (zoneHigh === null || zoneLow === null) {
    return {
      key: "sweep",
      number: 2,
      label: "Liquidity Sweep",
      hint: "Candle that pokes through the zone",
      pass: false,
      detail: "Liquidity zone missing.",
      data: null,
    };
  }

  const wickLow = num(sweepCandle.low);
  const wickHigh = num(sweepCandle.high);

  if (sequenceType === "support") {
    const swept = wickLow < zoneLow;
    const depth = swept ? Math.round((zoneLow - wickLow) * 100) / 100 : 0;
    return {
      key: "sweep",
      number: 2,
      label: "Liquidity Sweep",
      hint: "Candle that pokes through the zone",
      pass: swept,
      detail: swept
        ? `Swept ${depth} below zone low ${zoneLow}.`
        : `No sweep — wick low ${wickLow} did not go below ${zoneLow}.`,
      data: swept ? { direction: "down", depth } : null,
    };
  } else {
    const swept = wickHigh > zoneHigh;
    const depth = swept ? Math.round((wickHigh - zoneHigh) * 100) / 100 : 0;
    return {
      key: "sweep",
      number: 2,
      label: "Liquidity Sweep",
      hint: "Candle that pokes through the zone",
      pass: swept,
      detail: swept
        ? `Swept ${depth} above zone high ${zoneHigh}.`
        : `No sweep — wick high ${wickHigh} did not go above ${zoneHigh}.`,
      data: swept ? { direction: "up", depth } : null,
    };
  }
}

// ============================================================
// SYSTEM 3 — MSS (Market Structure Shift)
// ============================================================
// Support: current close > MSS reference (swing high broken up)
// Resistance: current close < MSS reference (swing low broken down)

export function checkMSS({ currentClose, mssReference, sequenceType }) {
  const close = num(currentClose);
  const ref = num(mssReference);

  if (close === null || ref === null) {
    return {
      key: "mss",
      number: 3,
      label: "Market Structure Shift",
      hint: "Structure broke in the sequence direction",
      pass: false,
      detail: "Close price or MSS reference missing.",
      data: null,
    };
  }

  if (sequenceType === "support") {
    const broke = close > ref;
    return {
      key: "mss",
      number: 3,
      label: "Market Structure Shift",
      hint: "Structure broke in the sequence direction",
      pass: broke,
      detail: broke
        ? `Bullish MSS — close ${close} above ${ref}.`
        : `No bullish MSS — close ${close}, needs above ${ref}.`,
      data: broke ? { direction: "bullish", level: ref } : null,
    };
  } else {
    const broke = close < ref;
    return {
      key: "mss",
      number: 3,
      label: "Market Structure Shift",
      hint: "Structure broke in the sequence direction",
      pass: broke,
      detail: broke
        ? `Bearish MSS — close ${close} below ${ref}.`
        : `No bearish MSS — close ${close}, needs below ${ref}.`,
      data: broke ? { direction: "bearish", level: ref } : null,
    };
  }
}

// ============================================================
// SYSTEM 4 — FVG (Fair Value Gap)
// ============================================================
// Support: FVG low < FVG high (bullish imbalance)
// Resistance: FVG low < FVG high (bearish imbalance)
// Either way, user marks the FVG high + low directly.

export function checkFVG({ fvgHigh, fvgLow, sequenceType }) {
  const high = num(fvgHigh);
  const low = num(fvgLow);

  if (high === null || low === null) {
    return {
      key: "fvg",
      number: 4,
      label: "Fair Value Gap",
      hint: "Imbalance zone between candles",
      pass: false,
      detail: "FVG high + low not marked.",
      data: null,
    };
  }

  if (high <= low) {
    return {
      key: "fvg",
      number: 4,
      label: "Fair Value Gap",
      hint: "Imbalance zone between candles",
      pass: false,
      detail: `FVG high (${high}) must be above FVG low (${low}).`,
      data: null,
    };
  }

  const ce = computeCe(high, low);
  const size = Math.round((high - low) * 100) / 100;

  return {
    key: "fvg",
    number: 4,
    label: "Fair Value Gap",
    hint: "Imbalance zone between candles",
    pass: true,
    detail: `${sequenceType === "support" ? "Bullish" : "Bearish"} FVG ${low} – ${high} (${size} wide).`,
    data: { high, low, ce, size },
  };
}

// ============================================================
// SYSTEM 5 — RB aligned with FVG
// ============================================================
// RB passes if it OVERLAPS with the FVG (any of: inside / above / below)
// "Above" = RB bottom touches FVG top
// "Below" = RB top touches FVG bottom
// "Inside" = RB overlaps FVG middle

export function checkRbAlignment({ rbHigh, rbLow, fvgHigh, fvgLow }) {
  const rHigh = num(rbHigh);
  const rLow = num(rbLow);
  const fHigh = num(fvgHigh);
  const fLow = num(fvgLow);

  if (rHigh === null || rLow === null) {
    return {
      key: "rb",
      number: 5,
      label: "Rejection Block",
      hint: "RB must align with the FVG",
      pass: false,
      detail: "RB high + low not marked.",
      data: null,
    };
  }

  if (rHigh <= rLow) {
    return {
      key: "rb",
      number: 5,
      label: "Rejection Block",
      hint: "RB must align with the FVG",
      pass: false,
      detail: `RB high (${rHigh}) must be above RB low (${rLow}).`,
      data: null,
    };
  }

  if (fHigh === null || fLow === null) {
    return {
      key: "rb",
      number: 5,
      label: "Rejection Block",
      hint: "RB must align with the FVG",
      pass: false,
      detail: "FVG missing — cannot check alignment.",
      data: null,
    };
  }

  // Overlap between two ranges [rbLow, rbHigh] and [fLow, fHigh]
  const overlapLow = Math.max(rLow, fLow);
  const overlapHigh = Math.min(rHigh, fHigh);
  const overlap = overlapHigh - overlapLow;

  if (overlap > 0) {
    // Determine position — where does the RB sit relative to the FVG?
    let position;
    if (rHigh <= fHigh && rLow >= fLow) position = "inside";
    else if (rLow >= fHigh - 0.0001) position = "above";
    else if (rHigh <= fLow + 0.0001) position = "below";
    else position = "overlapping";

    return {
      key: "rb",
      number: 5,
      label: "Rejection Block",
      hint: "RB must align with the FVG",
      pass: true,
      detail: `RB ${rLow} – ${rHigh} ${position} the FVG (overlap ${Math.round(overlap * 100) / 100}).`,
      data: { rbHigh: rHigh, rbLow: rLow, rbCe: computeCe(rHigh, rLow), position, overlap },
    };
  }

  return {
    key: "rb",
    number: 5,
    label: "Rejection Block",
    hint: "RB must align with the FVG",
    pass: false,
    detail: `RB ${rLow} – ${rHigh} does not overlap FVG ${fLow} – ${fHigh}.`,
    data: null,
  };
}

// ============================================================
// TRIGGER 6 — Close inside RB
// ============================================================
// A candle must close inside the RB for the verdict to fire.

export function checkCloseInRb({ closeCandle, rbHigh, rbLow }) {
  if (!validCandle(closeCandle)) {
    return {
      key: "close",
      number: 6,
      label: "Close in RB",
      hint: "Body must close inside the RB",
      pass: false,
      detail: "Close candle not filled in.",
      data: null,
    };
  }

  const rHigh = num(rbHigh);
  const rLow = num(rbLow);
  const close = num(closeCandle.close);

  if (rHigh === null || rLow === null || close === null) {
    return {
      key: "close",
      number: 6,
      label: "Close in RB",
      hint: "Body must close inside the RB",
      pass: false,
      detail: "RB or close missing.",
      data: null,
    };
  }

  if (close >= rLow && close <= rHigh) {
    const rbCe = computeCe(rHigh, rLow);
    const side = close > rbCe ? "premium" : close < rbCe ? "discount" : "at-ce";
    return {
      key: "close",
      number: 6,
      label: "Close in RB",
      hint: "Body must close inside the RB",
      pass: true,
      detail: `Closed ${close} inside RB — ${side}.`,
      data: { close, side, rbCe },
    };
  }

  if (close > rHigh) {
    return {
      key: "close",
      number: 6,
      label: "Close in RB",
      hint: "Body must close inside the RB",
      pass: false,
      detail: `Closed ${close} ABOVE RB high — breakout, not negotiation.`,
      data: null,
    };
  }

  return {
    key: "close",
    number: 6,
    label: "Close in RB",
    hint: "Body must close inside the RB",
    pass: false,
    detail: `Closed ${close} BELOW RB low — breakout, not negotiation.`,
    data: null,
  };
}

// ============================================================
// FULL EVALUATION — THE COLLABORATION
// ============================================================

export function evaluateLiquiditySequence({
  sequenceType,
  liquidityZoneHigh,
  liquidityZoneLow,
  sweepCandle,
  currentClose,
  mssReference,
  fvgHigh,
  fvgLow,
  rbHigh,
  rbLow,
  closeCandle,
  atrCurrent,
  atrPrior,
}) {
  // ---- 5-system gates + trigger ----
  const liquidity = checkLiquidityZone({ liquidityZoneHigh, liquidityZoneLow });
  const sweep = checkSweep({
    sweepCandle,
    liquidityZoneHigh,
    liquidityZoneLow,
    sequenceType,
  });
  const mss = checkMSS({ currentClose, mssReference, sequenceType });
  const fvg = checkFVG({ fvgHigh, fvgLow, sequenceType });
  const rb = checkRbAlignment({ rbHigh, rbLow, fvgHigh, fvgLow });
  const close = checkCloseInRb({ closeCandle, rbHigh, rbLow });

  const steps = { liquidity, sweep, mss, fvg, rb, close };

  const gatesPass = [liquidity, sweep, mss, fvg, rb].every((s) => s.pass);
  const triggerPass = close.pass;
  const allPassed = gatesPass && triggerPass;

  // ---- Premium / discount verdict (the RB negotiation) ----
  // Reuses judgeZoneNegotiation from liquidityZoneEngine
  let baseNegotiation = null;
  if (rb.pass && close.pass) {
    baseNegotiation = judgeZoneNegotiation({
      activeRb: { high: rbHigh, low: rbLow },
      closePrice: currentClose,
    });
  }

  // ---- ATR filter for tradeability ----
  const atr = atrFilter(atrCurrent, atrPrior);

  // ---- Final verdict (only if all gates + trigger passed) ----
  let verdict = "WAIT";
  let verdictReason = "Sequence not complete.";

  if (allPassed && baseNegotiation) {
    verdict = baseNegotiation.verdict;
    verdictReason = baseNegotiation.reason;
  } else if (!allPassed) {
    const failing = Object.values(steps).filter((s) => !s.pass);
    verdictReason = `${failing.length} step${failing.length === 1 ? "" : "s"} failing.`;
  }

  // ---- Verdict display object ----
  const verdictDisplay = premiumDiscountVerdict(
    baseNegotiation || { verdict: "WAIT", reason: verdictReason }
  );

  // ---- Reasons list ----
  const reasons = Object.values(steps)
    .filter((s) => !s.pass)
    .map((s) => `${s.label}: ${s.detail}`);

  return {
    sequenceType,
    steps,
    gatesPass,
    triggerPass,
    allPassed,
    baseNegotiation,
    verdict,
    verdictDisplay,
    verdictReason,
    atr,
    reasons,
  };
}