// ============================================================
// LIQUIDITY SEQUENCE ENGINE — v2 (5-system collaborative flow)
//
// Systems, in order:
//   1. Liquidity Zone    — marked (high + low)
//   2. Liquidity Sweep   — price poked through the zone
//   3. MSS               — structure shifted (close breaks reference)
//   4. FVG               — fair value gap formed
//   5. Rejection Block   — RB aligns with the FVG
//   6. Close in RB       — a candle closes inside the RB range
//
// Verdict (system 6 extension):
//   Premium / discount judged INSIDE the RB.
//   Close above RB CE → premium → SELL
//   Close below RB CE → discount → BUY
//   Close ≈ RB CE     → equilibrium → WAIT
// ============================================================

export const SEQUENCE_TYPES = [
  { key: "support",    label: "Support Liquidity (Bullish)",    emoji: "🟢" },
  { key: "resistance", label: "Resistance Liquidity (Bearish)", emoji: "🔴" },
];

export function sequenceTypeInfo(key) {
  return SEQUENCE_TYPES.find((s) => s.key === key) || SEQUENCE_TYPES[0];
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

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

function round(n, dp = 2) {
  if (n === null || n === undefined || isNaN(n)) return null;
  return Math.round(n * 10 ** dp) / 10 ** dp;
}

// ------------------------------------------------------------
// GATE 1 — Liquidity Zone
// ------------------------------------------------------------

export function checkLiquidityZone({ liquidityZoneHigh, liquidityZoneLow }) {
  const high = num(liquidityZoneHigh);
  const low = num(liquidityZoneLow);

  if (high === null || low === null) {
    return {
      pass: false,
      label: "Liquidity Zone",
      detail: "Zone not marked yet.",
      zone: null,
    };
  }
  if (low >= high) {
    return {
      pass: false,
      label: "Liquidity Zone",
      detail: "Zone low must be below zone high.",
      zone: null,
    };
  }
  return {
    pass: true,
    label: "Liquidity Zone",
    detail: `Zone marked ${low} – ${high}.`,
    zone: { high, low, ce: (high + low) / 2 },
  };
}

// ------------------------------------------------------------
// GATE 2 — Liquidity Sweep
// Support: sweep candle's low dips below the zone low
// Resistance: sweep candle's high pokes above the zone high
// ------------------------------------------------------------

export function checkLiquiditySweep({
  sweepCandle,
  liquidityZone,
  sequenceType,
}) {
  if (!liquidityZone) {
    return {
      pass: false,
      label: "Liquidity Sweep",
      detail: "Zone missing.",
    };
  }
  if (!validCandle(sweepCandle)) {
    return {
      pass: false,
      label: "Liquidity Sweep",
      detail: "Sweep candle not filled in.",
    };
  }

  const low = num(sweepCandle.low);
  const high = num(sweepCandle.high);

  if (sequenceType === "support") {
    const swept = low < liquidityZone.low;
    return {
      pass: swept,
      label: "Liquidity Sweep",
      detail: swept
        ? `Swept below zone (low ${low} < ${liquidityZone.low}).`
        : `No sweep — low ${low} did not go below zone low ${liquidityZone.low}.`,
      sweepExtreme: low,
    };
  } else {
    const swept = high > liquidityZone.high;
    return {
      pass: swept,
      label: "Liquidity Sweep",
      detail: swept
        ? `Swept above zone (high ${high} > ${liquidityZone.high}).`
        : `No sweep — high ${high} did not go above zone high ${liquidityZone.high}.`,
      sweepExtreme: high,
    };
  }
}

// ------------------------------------------------------------
// GATE 3 — MSS (Market Structure Shift)
// Support: close breaks ABOVE the MSS reference
// Resistance: close breaks BELOW the MSS reference
// ------------------------------------------------------------

export function checkMSS({ mssCandle, mssReference, sequenceType }) {
  if (!validCandle(mssCandle)) {
    return {
      pass: false,
      label: "MSS",
      detail: "MSS candle not filled in.",
    };
  }
  const ref = num(mssReference);
  if (ref === null) {
    return {
      pass: false,
      label: "MSS",
      detail: "MSS reference price missing.",
    };
  }

  const close = num(mssCandle.close);

  if (sequenceType === "support") {
    const broke = close > ref;
    return {
      pass: broke,
      label: "MSS",
      detail: broke
        ? `Bullish MSS — closed ${close} above ${ref}.`
        : `No bullish MSS — close ${close}, needs to break above ${ref}.`,
      direction: "BUY",
    };
  } else {
    const broke = close < ref;
    return {
      pass: broke,
      label: "MSS",
      detail: broke
        ? `Bearish MSS — closed ${close} below ${ref}.`
        : `No bearish MSS — close ${close}, needs to break below ${ref}.`,
      direction: "SELL",
    };
  }
}

// ------------------------------------------------------------
// GATE 4 — FVG (Fair Value Gap)
// Just needs the FVG high + low to be marked, and matching
// direction relative to the sequence type.
// ------------------------------------------------------------

export function checkFVG({ fvgHigh, fvgLow, sequenceType }) {
  const high = num(fvgHigh);
  const low = num(fvgLow);

  if (high === null || low === null) {
    return {
      pass: false,
      label: "FVG",
      detail: "FVG not marked.",
      fvg: null,
    };
  }
  if (low >= high) {
    return {
      pass: false,
      label: "FVG",
      detail: "FVG low must be below FVG high.",
      fvg: null,
    };
  }
  return {
    pass: true,
    label: "FVG",
    detail: `FVG marked ${low} – ${high}.`,
    fvg: { high, low, ce: (high + low) / 2 },
  };
}

// ------------------------------------------------------------
// GATE 5 — Rejection Block aligned with FVG
// Any overlap between RB range and FVG range counts as aligned.
// Also classified as: "inside", "above", "below" for display.
// ------------------------------------------------------------

export function checkRBAlignment({ rbHigh, rbLow, fvg }) {
  const high = num(rbHigh);
  const low = num(rbLow);

  if (high === null || low === null) {
    return {
      pass: false,
      label: "RB vs FVG",
      detail: "Rejection Block not marked.",
      rb: null,
      alignment: null,
      overlap: 0,
    };
  }
  if (low >= high) {
    return {
      pass: false,
      label: "RB vs FVG",
      detail: "RB low must be below RB high.",
      rb: null,
      alignment: null,
      overlap: 0,
    };
  }
  if (!fvg) {
    return {
      pass: false,
      label: "RB vs FVG",
      detail: "FVG missing.",
      rb: { high, low, ce: (high + low) / 2 },
      alignment: null,
      overlap: 0,
    };
  }

  const rb = { high, low, ce: (high + low) / 2 };

  // Overlap of [rbLow, rbHigh] and [fvg.low, fvg.high]
  const overlapTop = Math.min(rb.high, fvg.high);
  const overlapBottom = Math.max(rb.low, fvg.low);
  const overlap = Math.max(0, overlapTop - overlapBottom);

  let alignment;
  if (overlap > 0) {
    alignment = "inside";
  } else if (rb.low >= fvg.high) {
    alignment = "above";
  } else if (rb.high <= fvg.low) {
    alignment = "below";
  } else {
    alignment = "none";
  }

  // "Aligned" = overlapping, OR touching (within tolerance of 0 gap)
  const pass = overlap > 0 || alignment === "above" || alignment === "below";

  const detail =
    alignment === "inside"
      ? `RB sits inside the FVG (overlap ${round(overlap)}).`
      : alignment === "above"
      ? `RB sits just above the FVG.`
      : alignment === "below"
      ? `RB sits just below the FVG.`
      : `RB does not align with the FVG.`;

  return {
    pass,
    label: "RB vs FVG",
    detail,
    rb,
    alignment,
    overlap,
  };
}

// ------------------------------------------------------------
// GATE 6 — Close inside RB
// The trigger candle must close within the RB range.
// ------------------------------------------------------------

export function checkCloseInRB({ closeCandle, rb }) {
  if (!validCandle(closeCandle)) {
    return {
      pass: false,
      label: "Close in RB",
      detail: "Close candle not filled in.",
      close: null,
    };
  }
  if (!rb) {
    return {
      pass: false,
      label: "Close in RB",
      detail: "RB missing.",
      close: null,
    };
  }

  const close = num(closeCandle.close);
  const inside = close >= rb.low && close <= rb.high;

  return {
    pass: inside,
    label: "Close in RB",
    detail: inside
      ? `Closed ${close} inside RB (${rb.low} – ${rb.high}).`
      : `Close ${close} is outside RB (${rb.low} – ${rb.high}).`,
    close,
  };
}

// ------------------------------------------------------------
// VERDICT — Premium / Discount inside the RB
// Close > RB CE → premium → SELL
// Close < RB CE → discount → BUY
// Close ≈ RB CE → equilibrium → WAIT
// ------------------------------------------------------------

export function judgePremiumDiscount({ closeCandle, rb, pipSize }) {
  if (!validCandle(closeCandle) || !rb) {
    return {
      verdict: "WAIT",
      position: "unknown",
      detail: "Missing close candle or RB.",
      ce: rb?.ce ?? null,
      close: null,
      pipsFromCe: null,
    };
  }

  const close = num(closeCandle.close);
  const ce = rb.ce;
  const ps = num(pipSize) || 1;

  // Equilibrium tolerance — 5% of RB height, minimum 1 pip
  const rbHeight = rb.high - rb.low;
  const tolerance = Math.max(rbHeight * 0.05, ps);

  const diff = close - ce;
  const pipsFromCe = diff / ps;

  if (Math.abs(diff) <= tolerance) {
    return {
      verdict: "WAIT",
      position: "equilibrium",
      detail: `Close ${close} is at equilibrium (CE ${round(ce)}).`,
      ce,
      close,
      pipsFromCe: round(pipsFromCe, 1),
    };
  }

  if (diff > 0) {
    return {
      verdict: "SELL",
      position: "premium",
      detail: `Close ${close} is in premium (above CE ${round(ce)}).`,
      ce,
      close,
      pipsFromCe: round(pipsFromCe, 1),
    };
  }

  return {
    verdict: "BUY",
    position: "discount",
    detail: `Close ${close} is in discount (below CE ${round(ce)}).`,
    ce,
    close,
    pipsFromCe: round(pipsFromCe, 1),
  };
}

// ------------------------------------------------------------
// Trade computation — entry / SL / TP / RR
// Entry = RB CE
// SL    = RB extreme on the losing side + 10% of RB height
// TP    = next liquidity level (user-marked)
// ------------------------------------------------------------

export function computeSequenceTrade({
  sequenceType,
  rb,
  nextLiquidityLevel,
  pipSize,
}) {
  if (!rb) return null;
  const nextLiq = num(nextLiquidityLevel);
  if (nextLiq === null) return null;

  const entry = rb.ce;
  const rbHeight = rb.high - rb.low;
  const buffer = rbHeight * 0.1;

  let sl;
  if (sequenceType === "support") {
    sl = rb.low - buffer;
  } else {
    sl = rb.high + buffer;
  }

  const tp = nextLiq;

  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  const rr = risk > 0 ? reward / risk : 0;

  const ps = num(pipSize) || 1;
  const slPips = ps > 0 ? risk / ps : null;
  const tpPips = ps > 0 ? reward / ps : null;

  return {
    entry: round(entry, 5),
    sl: round(sl, 5),
    tp: round(tp, 5),
    rr: round(rr, 2),
    slPips: round(slPips, 1),
    tpPips: round(tpPips, 1),
    direction: sequenceType === "support" ? "BUY" : "SELL",
  };
}

// ------------------------------------------------------------
// ORCHESTRATOR
// ------------------------------------------------------------

export function evaluateLiquiditySequence({
  sequenceType,
  liquidityZoneHigh,
  liquidityZoneLow,
  sweepCandle,
  mssCandle,
  mssReference,
  fvgHigh,
  fvgLow,
  rbHigh,
  rbLow,
  closeCandle,
  nextLiquidityLevel,
  pipSize,
}) {
  const liquidity = checkLiquidityZone({
    liquidityZoneHigh,
    liquidityZoneLow,
  });

  const sweep = checkLiquiditySweep({
    sweepCandle,
    liquidityZone: liquidity.zone,
    sequenceType,
  });

  const mss = checkMSS({ mssCandle, mssReference, sequenceType });

  const fvg = checkFVG({ fvgHigh, fvgLow, sequenceType });

  const rbAlign = checkRBAlignment({
    rbHigh,
    rbLow,
    fvg: fvg.fvg,
  });

  const closeGate = checkCloseInRB({
    closeCandle,
    rb: rbAlign.rb,
  });

  const premiumDiscount = judgePremiumDiscount({
    closeCandle,
    rb: rbAlign.rb,
    pipSize,
  });

  const steps = {
    liquidity,
    sweep,
    mss,
    fvg,
    rb: rbAlign,
    close: closeGate,
  };

  const gatesPassed = Object.values(steps).every((s) => s.pass);

  // Final verdict — only fires if all 6 gates pass AND premium/discount
  // agrees with the MSS direction (collaboration check).
  let verdict = "WAIT";
  let conflict = null;

  if (gatesPassed && premiumDiscount.verdict !== "WAIT") {
    if (mss.direction && premiumDiscount.verdict !== mss.direction) {
      conflict = {
        label: "MSS vs Premium/Discount conflict",
        detail: `MSS says ${mss.direction}, but premium/discount says ${premiumDiscount.verdict}. Wait for alignment.`,
      };
      verdict = "WAIT";
    } else {
      verdict = premiumDiscount.verdict;
    }
  }

  let trade = null;
  if (verdict === "BUY" || verdict === "SELL") {
    trade = computeSequenceTrade({
      sequenceType,
      rb: rbAlign.rb,
      nextLiquidityLevel,
      pipSize,
    });
  }

  const reasons = [];
  Object.entries(steps).forEach(([, s]) => {
    if (!s.pass) reasons.push(`${s.label}: ${s.detail}`);
  });
  if (conflict) reasons.push(conflict.detail);

  return {
    sequenceType,
    steps,
    premiumDiscount,
    verdict,
    conflict,
    trade,
    reasons,
    allPassed: gatesPassed && !conflict && verdict !== "WAIT",
  };
}