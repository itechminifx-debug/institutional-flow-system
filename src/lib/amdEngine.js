// ============================================================
// AMD ENGINE
// ============================================================
// Accumulation → Manipulation → Distribution
//
// Full engine — all upgrades included:
//   - Range / ATR / Sweep / Reclaim / MSS gates
//   - MSS requires sweep + close (textbook MSS)
//   - Inducement bonus detection
//   - Buy-Side / Sell-Side Liquidity classification
//   - Multi-timeframe tags (D1 / H4 / LTF)
//   - D1 Bias alignment check
//   - Displacement quality check (Pass 8)
//   - Draw on Liquidity as TP (Pass 5)
//   - FVG list + Order Blocks with auto-active
//   - RB inside active FVG or OB
//   - Verdict closes with MSS sequence tracking
//   - Wick retest bonus
//   - Reward + mindset gates
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
    hint: "Range → sweep below → MSS up → FVG/OB → RB → BUY",
  },
  {
    key: "bearish",
    label: "Bearish AMD",
    emoji: "🔴",
    hint: "Range → sweep above → MSS down → FVG/OB → RB → SELL",
  },
];

export function amdTypeInfo(key) {
  return AMD_TYPES.find((t) => t.key === key) || AMD_TYPES[0];
}

export const DRAW_ON_LIQUIDITY_OPTIONS = [
  { key: "auto", label: "Auto (derive from sweep)", emoji: "🤖" },
  { key: "bsl", label: "Buy-Side (BSL — above)", emoji: "🔵" },
  { key: "ssl", label: "Sell-Side (SSL — below)", emoji: "🟠" },
];

export const TIMEFRAME_OPTIONS = [
  { key: "D1", label: "D1" },
  { key: "H4", label: "H4" },
  { key: "H1", label: "H1" },
  { key: "M30", label: "M30" },
  { key: "M15", label: "M15" },
  { key: "M5", label: "M5" },
];

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

function rankZones({ zones, closePrice, activeRb }) {
  if (!Array.isArray(zones) || zones.length === 0) return [];

  const cleaned = zones
    .map((z) => ({
      id: z.id,
      high: num(z.high),
      low: num(z.low),
      addedAt: z.addedAt || new Date().toISOString(),
    }))
    .filter((z) => z.high !== null && z.low !== null && z.high > z.low);

  if (cleaned.length === 0) return [];

  const close = num(closePrice);
  const rHigh = activeRb ? num(activeRb.high) : null;
  const rLow = activeRb ? num(activeRb.low) : null;

  const sorted = [...cleaned].sort(
    (a, b) => new Date(b.addedAt) - new Date(a.addedAt)
  );

  let activeId = null;

  if (close !== null) {
    for (const z of sorted) {
      if (close >= z.low && close <= z.high) {
        activeId = z.id;
        break;
      }
    }
  }

  if (!activeId && rHigh !== null && rLow !== null) {
    for (const z of sorted) {
      const overlapLow = Math.max(rLow, z.low);
      const overlapHigh = Math.min(rHigh, z.high);
      if (overlapHigh > overlapLow) {
        activeId = z.id;
        break;
      }
    }
  }

  if (!activeId && close !== null) {
    let closest = null;
    let minDist = Infinity;
    for (const z of sorted) {
      const ce = (z.high + z.low) / 2;
      const dist = Math.abs(close - ce);
      if (dist < minDist) {
        minDist = dist;
        closest = z.id;
      }
    }
    activeId = closest;
  }

  return sorted.map((z, i) => ({
    ...z,
    zoneCe: computeCe(z.high, z.low),
    isActive: z.id === activeId,
    rank: i === 0 ? "newest" : i === sorted.length - 1 ? "oldest" : "middle",
  }));
}

// ============================================================
// CHECKLIST
// ============================================================
export const AMD_CHECKLIST = [
  { key: "range",       number: 1,  phase: "A", label: "Is price in a range?",          hint: "Mark the range high + low" },
  { key: "atr_falling", number: 2,  phase: "A", label: "Is ATR falling?",               hint: "Compression — volatility contracting" },
  { key: "sweep",       number: 3,  phase: "M", label: "Did price sweep the range?",    hint: "False break against the true direction" },
  { key: "reclaim",     number: 4,  phase: "M", label: "Did price close back inside?",  hint: "The trap is set — the sweep was false" },
  { key: "mss",         number: 5,  phase: "D", label: "Did an MSS occur?",             hint: "Sweep + close beyond structure" },
  { key: "fvg",         number: 6,  phase: "D", label: "Did displacement create an FVG?", hint: "Mark all FVGs + OBs — active one is picked automatically" },
  { key: "rb",          number: 7,  phase: "D", label: "Is there an RB inside the zone?",  hint: "RB must overlap the active FVG or OB" },
  { key: "entry",       number: 8,  phase: "D", label: "Is there a clear entry?",       hint: "RB close on the correct side — or MSS sequence complete" },
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
// PHASE A
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
// PHASE M
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
// PHASE D — MSS
// ============================================================
export function checkMSS({
  currentClose,
  mssReference,
  sweepCandle,
  sequenceType,
}) {
  const close = num(currentClose);
  const ref = num(mssReference);

  if (close === null || ref === null) {
    return {
      pass: false,
      detail: "Close or MSS reference missing.",
      data: null,
    };
  }

  const bullish = sequenceType === "bullish";

  const sweepLow = sweepCandle ? num(sweepCandle.low) : null;
  const sweepHigh = sweepCandle ? num(sweepCandle.high) : null;

  let sweepHappened = false;
  let sweepDetail = "";

  if (bullish) {
    if (sweepLow !== null) {
      sweepHappened = sweepLow < ref;
      sweepDetail = sweepHappened
        ? `Sweep below ${ref} (wick low ${sweepLow}).`
        : `No sweep below — wick low ${sweepLow} did not breach ${ref}.`;
    } else {
      sweepDetail = "Sweep candle not set — cannot verify the sweep.";
    }
  } else {
    if (sweepHigh !== null) {
      sweepHappened = sweepHigh > ref;
      sweepDetail = sweepHappened
        ? `Sweep above ${ref} (wick high ${sweepHigh}).`
        : `No sweep above — wick high ${sweepHigh} did not breach ${ref}.`;
    } else {
      sweepDetail = "Sweep candle not set — cannot verify the sweep.";
    }
  }

  const closeBroke = bullish ? close > ref : close < ref;

  const closeDetail = closeBroke
    ? `Close ${close} ${bullish ? "above" : "below"} ${ref}.`
    : `Close ${close} did not break ${ref}.`;

  if (sweepHappened && closeBroke) {
    return {
      pass: true,
      detail: `${
        bullish ? "Bullish" : "Bearish"
      } MSS confirmed — ${sweepDetail} ${closeDetail}`,
      data: {
        direction: bullish ? "bullish" : "bearish",
        level: ref,
        sweepHappened: true,
        closeBroke: true,
      },
    };
  }

  if (!sweepHappened && closeBroke) {
    return {
      pass: false,
      detail: `${closeDetail} But NO sweep — not a textbook MSS.`,
      data: null,
    };
  }

  if (sweepHappened && !closeBroke) {
    return {
      pass: false,
      detail: `${sweepDetail} But close did not confirm.`,
      data: null,
    };
  }

  return {
    pass: false,
    detail: `No sweep and no close break — MSS not confirmed.`,
    data: null,
  };
}

// ============================================================
// DISPLACEMENT QUALITY (Pass 8)
// ============================================================
export function checkDisplacementQuality({ displacementCandle, sequenceType }) {
  if (!validCandle(displacementCandle)) {
    return {
      quality: "unknown",
      ratio: 0,
      detail: "Displacement candle not filled in.",
    };
  }

  const o = num(displacementCandle.open);
  const c = num(displacementCandle.close);
  const h = num(displacementCandle.high);
  const l = num(displacementCandle.low);

  const bodySize = Math.abs(c - o);
  const range = h - l;
  const ratio = range > 0 ? bodySize / range : 0;

  const directionCorrect =
    sequenceType === "bullish" ? c > o : c < o;

  let quality;
  if (!directionCorrect) quality = "wrong-direction";
  else if (ratio >= 0.75) quality = "strong";
  else if (ratio >= 0.5) quality = "normal";
  else quality = "weak";

  const pct = Math.round(ratio * 100);

  const labelMap = {
    strong: "🔥 Strong displacement",
    normal: "✅ Normal displacement",
    weak: "⚠️ Weak displacement",
    "wrong-direction": "❌ Wrong direction",
  };

  return {
    quality,
    ratio,
    detail: `${labelMap[quality]} — body is ${pct}% of the candle range.`,
  };
}

// ============================================================
// FVG / OB / RB
// ============================================================
export function rankFvgs({ fvgs, closePrice, activeRb }) {
  return rankZones({ zones: fvgs, closePrice, activeRb });
}

export function checkFvgList({ rankedFvgs }) {
  if (!rankedFvgs || rankedFvgs.length === 0) {
    return { pass: false, detail: "No FVGs marked. Add at least one.", data: null };
  }

  const active = rankedFvgs.find((f) => f.isActive) || rankedFvgs[0];
  const size = Math.round((active.high - active.low) * 100) / 100;

  return {
    pass: true,
    detail: `${rankedFvgs.length} FVG${
      rankedFvgs.length === 1 ? "" : "s"
    } marked. Active: ${active.low} – ${active.high} (${size} wide).`,
    data: {
      activeFvg: active,
      allFvgs: rankedFvgs,
      count: rankedFvgs.length,
    },
  };
}

export function rankOrderBlocks({ orderBlocks, closePrice, activeRb }) {
  return rankZones({ zones: orderBlocks, closePrice, activeRb });
}

export function checkOrderBlockList({ rankedObs }) {
  if (!rankedObs || rankedObs.length === 0) {
    return {
      pass: false,
      detail: "No Order Blocks marked.",
      data: null,
    };
  }

  const active = rankedObs.find((o) => o.isActive) || rankedObs[0];
  const size = Math.round((active.high - active.low) * 100) / 100;

  return {
    pass: true,
    detail: `${rankedObs.length} Order Block${
      rankedObs.length === 1 ? "" : "s"
    } marked. Active: ${active.low} – ${active.high} (${size} wide).`,
    data: {
      activeOb: active,
      allObs: rankedObs,
      count: rankedObs.length,
    },
  };
}

export function checkRbInActiveZone({
  rbHigh,
  rbLow,
  activeFvg,
  activeOb,
}) {
  const rHigh = num(rbHigh);
  const rLow = num(rbLow);

  if (rHigh === null || rLow === null) {
    return { pass: false, detail: "RB not marked.", data: null };
  }
  if (rHigh <= rLow) {
    return { pass: false, detail: "RB high must be above RB low.", data: null };
  }

  if (activeFvg) {
    const fHigh = num(activeFvg.high);
    const fLow = num(activeFvg.low);
    if (fHigh !== null && fLow !== null) {
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
          detail: `RB ${rLow} – ${rHigh} ${position} the active FVG.`,
          data: {
            rbHigh: rHigh,
            rbLow: rLow,
            rbCe: computeCe(rHigh, rLow),
            position,
            overlap: Math.round(overlap * 100) / 100,
            zoneType: "fvg",
          },
        };
      }
    }
  }

  if (activeOb) {
    const oHigh = num(activeOb.high);
    const oLow = num(activeOb.low);
    if (oHigh !== null && oLow !== null) {
      const overlapLow = Math.max(rLow, oLow);
      const overlapHigh = Math.min(rHigh, oHigh);
      const overlap = overlapHigh - overlapLow;

      if (overlap > 0) {
        let position = "overlapping";
        if (rHigh <= oHigh && rLow >= oLow) position = "inside";
        else if (rLow >= oHigh - 0.0001) position = "above";
        else if (rHigh <= oLow + 0.0001) position = "below";

        return {
          pass: true,
          detail: `RB ${rLow} – ${rHigh} ${position} the active Order Block.`,
          data: {
            rbHigh: rHigh,
            rbLow: rLow,
            rbCe: computeCe(rHigh, rLow),
            position,
            overlap: Math.round(overlap * 100) / 100,
            zoneType: "ob",
          },
        };
      }
    }
  }

  if (activeFvg || activeOb) {
    return {
      pass: false,
      detail: `RB ${rLow} – ${rHigh} does not overlap the active zone.`,
      data: null,
    };
  }

  return {
    pass: false,
    detail: "No active FVG or Order Block.",
    data: null,
  };
}

// ============================================================
// MSS SEQUENCE
// ============================================================
export function classifyMssStep({
  candle,
  mssReference,
  mssCandleHigh,
  mssCandleLow,
  sequenceType,
}) {
  if (!validCandle(candle)) return null;

  const ref = num(mssReference);
  const mssHigh = num(mssCandleHigh);
  const mssLow = num(mssCandleLow);

  const close = num(candle.close);
  const wickLow = num(candle.low);
  const wickHigh = num(candle.high);

  const bullish = sequenceType === "bullish";

  if (ref !== null) {
    if (bullish) {
      if (close < ref) {
        return {
          step: "contested",
          detail: `Closed ${close} — below MSS ${ref}. Contested.`,
        };
      }
      if (close > ref) {
        return {
          step: "sweep",
          detail: `Body closed ${close} above MSS ${ref}. Liquidity sweep.`,
        };
      }
    } else {
      if (close > ref) {
        return {
          step: "contested",
          detail: `Closed ${close} — above MSS ${ref}. Contested.`,
        };
      }
      if (close < ref) {
        return {
          step: "sweep",
          detail: `Body closed ${close} below MSS ${ref}. Liquidity sweep.`,
        };
      }
    }
  }

  if (bullish && mssHigh !== null) {
    if (wickHigh >= mssHigh) {
      return {
        step: "tip_test",
        detail: `Wick high ${wickHigh} touched MSS candle extreme ${mssHigh}.`,
      };
    }
  } else if (!bullish && mssLow !== null) {
    if (wickLow <= mssLow) {
      return {
        step: "tip_test",
        detail: `Wick low ${wickLow} touched MSS candle extreme ${mssLow}.`,
      };
    }
  }

  if (ref !== null) {
    if (bullish && wickLow <= ref && close > ref) {
      return {
        step: "retest",
        detail: `Wick low ${wickLow} tested MSS ${ref} — closed above. Retest confirmed.`,
      };
    }
    if (!bullish && wickHigh >= ref && close < ref) {
      return {
        step: "retest",
        detail: `Wick high ${wickHigh} tested MSS ${ref} — closed below. Retest confirmed.`,
      };
    }
  }

  return null;
}

// ============================================================
// RB REACTION
// ============================================================
export function classifyRbReaction({ candle, rbHigh, rbLow, sequenceType }) {
  if (!validCandle(candle)) return null;

  const rHigh = num(rbHigh);
  const rLow = num(rbLow);
  const close = num(candle.close);
  if (rHigh === null || rLow === null || close === null) return null;

  const bullish = sequenceType === "bullish";
  const ce = computeCe(rHigh, rLow);

  if (bullish) {
    if (close > rHigh) {
      return {
        reaction: "rb_breakout",
        detail: `Closed ${close} ABOVE RB ${rLow} – ${rHigh}. Breakout — strong bullish.`,
        strength: "strong",
      };
    }
    if (close < rLow) {
      return {
        reaction: "rb_wrong_side",
        detail: `Closed ${close} below RB — weak, expect pullback.`,
        strength: "weak",
      };
    }
    if (close >= rLow && close <= rHigh) {
      if (close < ce) {
        return {
          reaction: "rb_discount",
          detail: `Closed ${close} in RB DISCOUNT (below CE ${ce}). Buyers defended — BUY.`,
          strength: "strong",
        };
      }
      return {
        reaction: "rb_premium",
        detail: `Closed ${close} in RB PREMIUM (above CE ${ce}). Sellers present — expect pullback.`,
        strength: "weak",
      };
    }
  }

  if (!bullish) {
    if (close < rLow) {
      return {
        reaction: "rb_breakout",
        detail: `Closed ${close} BELOW RB ${rLow} – ${rHigh}. Breakdown — strong bearish.`,
        strength: "strong",
      };
    }
    if (close > rHigh) {
      return {
        reaction: "rb_wrong_side",
        detail: `Closed ${close} above RB — weak, expect pullback.`,
        strength: "weak",
      };
    }
    if (close >= rLow && close <= rHigh) {
      if (close > ce) {
        return {
          reaction: "rb_premium",
          detail: `Closed ${close} in RB PREMIUM (above CE ${ce}). Sellers defended — SELL.`,
          strength: "strong",
        };
      }
      return {
        reaction: "rb_discount",
        detail: `Closed ${close} in RB DISCOUNT (below CE ${ce}). Buyers present — expect pullback.`,
        strength: "weak",
      };
    }
  }

  return null;
}

// ============================================================
// VERDICT CLOSES
// ============================================================
export function evaluateVerdictCloses({
  verdictCloses,
  fvgs,
  orderBlocks,
  rb,
  mssReference,
  mssCandleHigh,
  mssCandleLow,
  sequenceType,
}) {
  const buildZoneMap = () => {
    const map = { fvgs: {}, obs: {}, rb: false };
    if (Array.isArray(fvgs)) {
      fvgs.forEach((f) => {
        if (f && f.id) map.fvgs[f.id] = false;
      });
    }
    if (Array.isArray(orderBlocks)) {
      orderBlocks.forEach((o) => {
        if (o && o.id) map.obs[o.id] = false;
      });
    }
    return map;
  };

  if (!Array.isArray(verdictCloses) || verdictCloses.length === 0) {
    return {
      ranked: [],
      zonesVisited: buildZoneMap(),
      mssSequence: {
        tipTest: false,
        sweep: false,
        retest: false,
        contested: false,
      },
      allFvgsVisited: false,
      allObsVisited: false,
      allZonesVisited: false,
      finalClose: null,
      finalEntry: null,
      readiness: 0,
      count: 0,
    };
  }

  const ordered = [...verdictCloses].sort(
    (a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)
  );

  const mssSequence = {
    tipTest: false,
    sweep: false,
    retest: false,
    contested: false,
  };

  const ranked = ordered.map((vc, i) => {
    let fvgInteraction = null;
    for (const f of fvgs || []) {
      const fHigh = num(f.high);
      const fLow = num(f.low);
      if (fHigh === null || fLow === null) continue;

      const close = num(vc.candle.close);
      const wickLow = num(vc.candle.low);
      const wickHigh = num(vc.candle.high);

      const insideClose = close >= fLow && close <= fHigh;
      const wickTested = wickLow <= fHigh && wickHigh >= fLow;

      if (insideClose || wickTested) {
        fvgInteraction = {
          zone: "fvg",
          zoneRef: f,
          insideClose,
          detail: insideClose
            ? `Closed inside FVG ${fLow} – ${fHigh}.`
            : `Wick tested FVG ${fLow} – ${fHigh}.`,
        };
        break;
      }
    }

    let obInteraction = null;
    for (const o of orderBlocks || []) {
      const oHigh = num(o.high);
      const oLow = num(o.low);
      if (oHigh === null || oLow === null) continue;

      const close = num(vc.candle.close);
      const wickLow = num(vc.candle.low);
      const wickHigh = num(vc.candle.high);

      const insideClose = close >= oLow && close <= oHigh;
      const wickTested = wickLow <= oHigh && wickHigh >= oLow;

      if (insideClose || wickTested) {
        obInteraction = {
          zone: "ob",
          zoneRef: o,
          insideClose,
          detail: insideClose
            ? `Closed inside OB ${oLow} – ${oHigh}.`
            : `Wick tested OB ${oLow} – ${oHigh}.`,
        };
        break;
      }
    }

    const rbReaction = rb
      ? classifyRbReaction({
          candle: vc.candle,
          rbHigh: rb.high,
          rbLow: rb.low,
          sequenceType,
        })
      : null;

    const mssStep = classifyMssStep({
      candle: vc.candle,
      mssReference,
      mssCandleHigh,
      mssCandleLow,
      sequenceType,
    });

    if (mssStep) {
      if (mssStep.step === "tip_test") mssSequence.tipTest = true;
      if (mssStep.step === "sweep") mssSequence.sweep = true;
      if (mssStep.step === "retest") mssSequence.retest = true;
      if (mssStep.step === "contested") mssSequence.contested = true;
    }

    let primaryType = "unclassified";
    let primaryDetail = null;
    let reactedZone = null;

    if (rbReaction) {
      primaryType = rbReaction.reaction;
      primaryDetail = rbReaction.detail;
      reactedZone = "rb";
    } else if (mssStep) {
      primaryType = mssStep.step;
      primaryDetail = mssStep.detail;
      reactedZone = "mss";
    } else if (fvgInteraction) {
      const close = num(vc.candle.close);
      const bullish = sequenceType === "bullish";
      if (fvgInteraction.insideClose) {
        primaryType = "filled";
        primaryDetail = fvgInteraction.detail;
      } else {
        const rejected =
          (bullish && close > fvgInteraction.zoneRef.high) ||
          (!bullish && close < fvgInteraction.zoneRef.low);
        primaryType = rejected ? "held" : "broke";
        primaryDetail = fvgInteraction.detail;
      }
      reactedZone = "fvg";
    } else if (obInteraction) {
      const close = num(vc.candle.close);
      const bullish = sequenceType === "bullish";
      if (obInteraction.insideClose) {
        primaryType = "filled";
        primaryDetail = obInteraction.detail;
      } else {
        const rejected =
          (bullish && close > obInteraction.zoneRef.high) ||
          (!bullish && close < obInteraction.zoneRef.low);
        primaryType = rejected ? "held" : "broke";
        primaryDetail = obInteraction.detail;
      }
      reactedZone = "ob";
    }

    return {
      id: vc.id,
      sequenceNumber: vc.sequenceNumber ?? i + 1,
      candle: vc.candle,
      reactedZone,
      reactedZoneRef:
        fvgInteraction?.zoneRef || obInteraction?.zoneRef || null,
      mssStep: mssStep?.step || null,
      rbReaction: rbReaction?.reaction || null,
      rbStrength: rbReaction?.strength || null,
      detail: primaryDetail,
      reactionType: primaryType,
      isFinal: false,
    };
  });

  const zonesVisited = buildZoneMap();
  for (const r of ranked) {
    if (r.reactedZone === "fvg" && r.reactedZoneRef) {
      zonesVisited.fvgs[r.reactedZoneRef.id] = true;
    }
    if (r.reactedZone === "ob" && r.reactedZoneRef) {
      zonesVisited.obs[r.reactedZoneRef.id] = true;
    }
    if (r.reactedZone === "rb") zonesVisited.rb = true;
  }

  const fvgIds = Object.keys(zonesVisited.fvgs || {});
  const obIds = Object.keys(zonesVisited.obs || {});
  const allFvgsVisited = fvgIds.every((id) => zonesVisited.fvgs[id]);
  const allObsVisited = obIds.every((id) => zonesVisited.obs[id]);
  const allZonesVisited =
    allFvgsVisited && allObsVisited && zonesVisited.rb;

  let finalClose = null;
  for (let i = ranked.length - 1; i >= 0; i--) {
    const r = ranked[i];
    if (r.rbStrength === "strong") {
      finalClose = r;
      ranked[i].isFinal = true;
      r.reactionType = "entry";
      break;
    }
  }

  const totalChecks = fvgIds.length + obIds.length + 1;
  let checksPassed = 0;
  fvgIds.forEach((id) => {
    if (zonesVisited.fvgs[id]) checksPassed++;
  });
  obIds.forEach((id) => {
    if (zonesVisited.obs[id]) checksPassed++;
  });
  if (zonesVisited.rb) checksPassed++;
  const readiness = totalChecks > 0 ? checksPassed / totalChecks : 0;

  return {
    ranked,
    zonesVisited,
    mssSequence,
    allFvgsVisited,
    allObsVisited,
    allZonesVisited,
    finalClose,
    finalEntry: finalClose
      ? {
          close: num(finalClose.candle?.close),
          candle: finalClose.candle,
          reaction: finalClose.rbReaction,
        }
      : null,
    readiness,
    count: ranked.length,
  };
}

// ============================================================
// LIQUIDITY SIDES
// ============================================================
export function checkLiquiditySides({
  bslLevel,
  sslLevel,
  sweepCandle,
  sequenceType,
  drawOnLiquidity,
}) {
  const bsl = num(bslLevel);
  const ssl = num(sslLevel);

  if (!validCandle(sweepCandle)) {
    return {
      bsl: bsl !== null ? { level: bsl, swept: false } : null,
      ssl: ssl !== null ? { level: ssl, swept: false } : null,
      draw: null,
      drawMatches: null,
      detail: "Sweep candle not set — cannot verify liquidity sides.",
    };
  }

  const wickLow = num(sweepCandle.low);
  const wickHigh = num(sweepCandle.high);

  const bslSwept =
    bsl !== null && wickHigh !== null && wickHigh >= bsl;
  const sslSwept =
    ssl !== null && wickLow !== null && wickLow <= ssl;

  let resolvedDraw = null;
  if (drawOnLiquidity === "bsl" || drawOnLiquidity === "ssl") {
    resolvedDraw = drawOnLiquidity;
  } else {
    resolvedDraw = sequenceType === "bullish" ? "bsl" : "ssl";
  }

  let drawMatches = null;
  if (resolvedDraw !== null && sequenceType) {
    drawMatches =
      (sequenceType === "bullish" && resolvedDraw === "bsl") ||
      (sequenceType === "bearish" && resolvedDraw === "ssl");
  }

  const parts = [];
  if (bsl !== null) {
    parts.push(
      `BSL ${bsl} — ${bslSwept ? "✅ swept" : "still resting (target)"}`
    );
  }
  if (ssl !== null) {
    parts.push(
      `SSL ${ssl} — ${sslSwept ? "✅ swept" : "still resting (target)"}`
    );
  }

  return {
    bsl: bsl !== null ? { level: bsl, swept: bslSwept } : null,
    ssl: ssl !== null ? { level: ssl, swept: sslSwept } : null,
    draw: resolvedDraw,
    drawMatches,
    detail: parts.length > 0 ? parts.join(" · ") : "No BSL or SSL levels set.",
  };
}

// ============================================================
// MULTI-TIMEFRAME ALIGNMENT (Pass 6 + 7)
// ============================================================
export function checkMultiTimeframe({
  d1Bias,
  sequenceType,
  d1Timeframe,
  h4Timeframe,
  ltfTimeframe,
}) {
  const gates = [];

  // D1 bias alignment
  const biasMatches =
    d1Bias === sequenceType ||
    (d1Bias === "bullish" && sequenceType === "bullish") ||
    (d1Bias === "bearish" && sequenceType === "bearish");

  gates.push({
    key: "d1_bias",
    label: "D1 bias matches setup direction",
    pass: biasMatches,
    detail: biasMatches
      ? `D1 bias = ${d1Bias} — aligned with ${sequenceType}.`
      : d1Bias
      ? `D1 bias = ${d1Bias}, setup = ${sequenceType} — conflict.`
      : "D1 bias not set.",
  });

  // Timeframe hierarchy check
  const tfs = [d1Timeframe, h4Timeframe, ltfTimeframe].filter(Boolean);
  const hierarchyValid = tfs.length === 3;

  gates.push({
    key: "tf_hierarchy",
    label: "Timeframe hierarchy (D1 → H4 → LTF)",
    pass: hierarchyValid,
    detail: hierarchyValid
      ? `${d1Timeframe} → ${h4Timeframe} → ${ltfTimeframe}`
      : "All three timeframes must be set.",
  });

  const passed = gates.filter((g) => g.pass).length;
  const ready = passed === gates.length;

  return {
    ready,
    gates,
    passed,
    total: gates.length,
    score: Math.round((passed / gates.length) * 100),
  };
}

// ============================================================
// ENTRY GATE
// ============================================================
export function checkEntry({ closeCandle, rbHigh, rbLow, verdictClosesResult }) {
  if (verdictClosesResult && verdictClosesResult.finalClose) {
    const candle = verdictClosesResult.finalClose.candle;
    const close = num(candle.close);
    const rHigh = num(rbHigh);
    const rLow = num(rbLow);
    if (close !== null && rHigh !== null && rLow !== null) {
      const rbCe = computeCe(rHigh, rLow);
      const side =
        close > rbCe ? "premium" : close < rbCe ? "discount" : "at-ce";
      return {
        pass: true,
        detail: `Verdict close ${close} in RB — ${side}. ${verdictClosesResult.finalClose.detail || ""}`,
        data: { close, side, rbCe, source: "verdict_closes" },
      };
    }
  }

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
      data: { close, side, rbCe, source: "single_close" },
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

// ============================================================
// WICK RETEST BONUS
// ============================================================
export function checkWickRetest({
  closeCandle,
  mssReference,
  ema50Price,
  sequenceType,
  pipSize,
}) {
  if (!validCandle(closeCandle)) {
    return { pass: false, detail: null, emaConfluence: false, emaDetail: null };
  }

  const mss = num(mssReference);
  if (mss === null) {
    return { pass: false, detail: null, emaConfluence: false, emaDetail: null };
  }

  const ps = num(pipSize) || 1;
  const tolerance = 5 * ps;
  const emaTolerance = 10 * ps;

  const wickLow = num(closeCandle.low);
  const wickHigh = num(closeCandle.high);

  let pass = false;
  let detail = null;

  if (sequenceType === "bullish") {
    if (wickLow !== null) {
      const distance = wickLow - mss;
      if (distance <= tolerance) {
        pass = true;
        const reached = distance <= 0;
        detail = reached
          ? `Wick low ${wickLow} retested MSS ${mss}.`
          : `Wick low ${wickLow} came within ${Math.round(distance)} of MSS ${mss}.`;
      }
    }
  } else {
    if (wickHigh !== null) {
      const distance = mss - wickHigh;
      if (distance <= tolerance) {
        pass = true;
        const reached = distance <= 0;
        detail = reached
          ? `Wick high ${wickHigh} retested MSS ${mss}.`
          : `Wick high ${wickHigh} came within ${Math.round(distance)} of MSS ${mss}.`;
      }
    }
  }

  if (!pass) {
    return { pass: false, detail: null, emaConfluence: false, emaDetail: null };
  }

  let emaConfluence = false;
  let emaDetail = null;

  const ema = num(ema50Price);
  if (ema !== null) {
    const emaDistance = Math.abs(ema - mss);
    if (emaDistance <= emaTolerance) {
      emaConfluence = true;
      emaDetail = `EMA 50 at ${ema} sits near MSS ${mss} — adds strength.`;
    }
  }

  return { pass: true, detail, emaConfluence, emaDetail };
}

// ============================================================
// INDUCEMENT
// ============================================================
export function checkInducement({
  inducementLevel,
  sweepCandle,
  sequenceType,
  pipSize,
}) {
  const level = num(inducementLevel);
  if (level === null) {
    return { pass: false, detail: null, swept: false };
  }

  if (!validCandle(sweepCandle)) {
    return { pass: false, detail: null, swept: false };
  }

  const ps = num(pipSize) || 1;
  const wickLow = num(sweepCandle.low);
  const wickHigh = num(sweepCandle.high);

  let swept = false;
  let detail = null;

  if (sequenceType === "bullish") {
    if (wickLow !== null && wickLow < level) {
      swept = true;
      const depth = Math.round((level - wickLow) * 100) / 100;
      detail = `Inducement swept — wick low ${wickLow} went ${depth} below ${level}.`;
    }
  } else {
    if (wickHigh !== null && wickHigh > level) {
      swept = true;
      const depth = Math.round((wickHigh - level) * 100) / 100;
      detail = `Inducement swept — wick high ${wickHigh} went ${depth} above ${level}.`;
    }
  }

  return {
    pass: swept,
    detail,
    swept,
    level,
  };
}

// ============================================================
// REWARD + MINDSET
// ============================================================
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
  mssCandleHigh,
  mssCandleLow,
  inducementLevel,
  bslLevel,
  sslLevel,
  drawOnLiquidity,
  displacementCandle,
  // Multi-TF
  d1Bias,
  d1Timeframe,
  h4Timeframe,
  ltfTimeframe,
  fvgs,
  orderBlocks,
  rbHigh,
  rbLow,
  closeCandle,
  verdictCloses = [],
  nextLiquidityLevel,
  pipSize,
  manualMindset = false,
  accountSize = 0,
  riskPercent = 1,
  ema50Price,
}) {
  let resolvedClose = currentClose;
  if (Array.isArray(verdictCloses) && verdictCloses.length > 0) {
    const ordered = [...verdictCloses].sort(
      (a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)
    );
    const latest = ordered[ordered.length - 1];
    const latestClose = parseFloat(latest?.candle?.close);
    if (!isNaN(latestClose)) {
      resolvedClose = latestClose;
    }
  }

  const range = checkRange({ rangeHigh, rangeLow });
  const atr = checkAtrFalling({ atrCurrent, atrPrior });
  const sweep = checkSweep({ sweepCandle, rangeHigh, rangeLow, sequenceType });
  const reclaim = checkReclaim({ sweepCandle, rangeHigh, rangeLow, sequenceType });
  const mss = checkMSS({
    currentClose: resolvedClose,
    mssReference,
    sweepCandle,
    sequenceType,
  });

  const displacement = checkDisplacementQuality({
    displacementCandle,
    sequenceType,
  });

  const rankedFvgs = rankFvgs({
    fvgs,
    closePrice: resolvedClose,
    activeRb: rbHigh && rbLow ? { high: rbHigh, low: rbLow } : null,
  });
  const fvg = checkFvgList({ rankedFvgs });
  const activeFvg = fvg.data?.activeFvg || null;

  const rankedObs = rankOrderBlocks({
    orderBlocks,
    closePrice: resolvedClose,
    activeRb: rbHigh && rbLow ? { high: rbHigh, low: rbLow } : null,
  });
  const ob = checkOrderBlockList({ rankedObs });
  const activeOb = ob.data?.activeOb || null;

  const rb = checkRbInActiveZone({ rbHigh, rbLow, activeFvg, activeOb });

  const verdictClosesResult = evaluateVerdictCloses({
    verdictCloses,
    fvgs: rankedFvgs,
    orderBlocks: rankedObs,
    rb: rbHigh && rbLow ? { id: "active_rb", high: rbHigh, low: rbLow } : null,
    mssReference,
    mssCandleHigh,
    mssCandleLow,
    sequenceType,
  });

  const entry = checkEntry({
    closeCandle,
    rbHigh,
    rbLow,
    verdictClosesResult,
  });

  const liquiditySides = checkLiquiditySides({
    bslLevel,
    sslLevel,
    sweepCandle,
    sequenceType,
    drawOnLiquidity,
  });

  const multiTf = checkMultiTimeframe({
    d1Bias,
    sequenceType,
    d1Timeframe,
    h4Timeframe,
    ltfTimeframe,
  });

  let baseNegotiation = null;
  if (rb.pass && entry.pass) {
    baseNegotiation = judgeZoneNegotiation({
      activeRb: { high: rbHigh, low: rbLow },
      closePrice: resolvedClose,
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
          ? "Closed in the PREMIUM of the RB (via verdict close) — SELL."
          : "Closed in the DISCOUNT of the RB (via verdict close) — BUY.",
      };
    }
  }

  // Draw on Liquidity as TP (Pass 5)
  // Priority: draw price (bsl/ssl) > nextLiquidityLevel
  let resolvedTp = num(nextLiquidityLevel);
  let tpSource = resolvedTp !== null ? "nextLiquidityLevel" : null;

  if (baseNegotiation) {
    if (
      baseNegotiation.verdict === "BUY" &&
      liquiditySides?.bsl?.level
    ) {
      resolvedTp = liquiditySides.bsl.level;
      tpSource = "BSL (draw on liquidity)";
    } else if (
      baseNegotiation.verdict === "SELL" &&
      liquiditySides?.ssl?.level
    ) {
      resolvedTp = liquiditySides.ssl.level;
      tpSource = "SSL (draw on liquidity)";
    }
  }

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
      const tp = resolvedTp;
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
          tpSource,
          rr,
          pipSize: ps,
          slPips: ps > 0 ? Math.round(risk / ps) : null,
          tpPips: ps > 0 ? Math.round(reward / ps) : null,
        };

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

  const reward = checkReward({ trade });
  const mindset = checkMindset({ manualAnswer: manualMindset });

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

  const wickRetest = checkWickRetest({
    closeCandle,
    mssReference,
    ema50Price,
    sequenceType,
    pipSize,
  });

  const inducement = checkInducement({
    inducementLevel,
    sweepCandle,
    sequenceType,
    pipSize,
  });

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
    wickRetest,
    inducement,
    liquiditySides,
    displacement,
    multiTf,
    fvgs: rankedFvgs,
    activeFvg,
    orderBlocks: rankedObs,
    activeOb,
    verdictCloses: verdictClosesResult,
    reasons,
    resolvedClose,
  };
}