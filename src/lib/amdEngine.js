// ============================================================
// AMD ENGINE
// ============================================================
// Accumulation → Manipulation → Distribution
//
// Full engine with:
//   - Range / ATR / Sweep / Reclaim / MSS gates
//   - FVG list (multiple) with auto-active pick
//   - RB inside active FVG
//   - Verdict closes list with zone classification
//   - MSS sequence tracking (tip test / sweep / retest / contested)
//   - RB reaction judgment (breakout / discount / premium / wrong side)
//   - Auto-resolve currentClose from latest verdict close
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
// CHECKLIST
// ============================================================
export const AMD_CHECKLIST = [
  { key: "range",       number: 1,  phase: "A", label: "Is price in a range?",          hint: "Mark the range high + low" },
  { key: "atr_falling", number: 2,  phase: "A", label: "Is ATR falling?",               hint: "Compression — volatility contracting" },
  { key: "sweep",       number: 3,  phase: "M", label: "Did price sweep the range?",    hint: "False break against the true direction" },
  { key: "reclaim",     number: 4,  phase: "M", label: "Did price close back inside?",  hint: "The trap is set — the sweep was false" },
  { key: "mss",         number: 5,  phase: "D", label: "Did an MSS occur?",             hint: "Market Structure Shift — confirmed by close" },
  { key: "fvg",         number: 6,  phase: "D", label: "Did displacement create an FVG?", hint: "Mark all FVGs — active one is picked automatically" },
  { key: "rb",          number: 7,  phase: "D", label: "Is there an RB inside the FVG?",  hint: "RB must overlap the active FVG" },
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
// PHASE D
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

// ============================================================
// FVG LIST
// ============================================================
export function rankFvgs({ fvgs, closePrice, activeRb }) {
  if (!Array.isArray(fvgs) || fvgs.length === 0) return [];

  const cleaned = fvgs
    .map((f) => ({
      id: f.id,
      high: num(f.high),
      low: num(f.low),
      addedAt: f.addedAt || new Date().toISOString(),
    }))
    .filter((f) => f.high !== null && f.low !== null && f.high > f.low);

  if (cleaned.length === 0) return [];

  const close = num(closePrice);
  const rHigh = activeRb ? num(activeRb.high) : null;
  const rLow = activeRb ? num(activeRb.low) : null;

  const sorted = [...cleaned].sort(
    (a, b) => new Date(b.addedAt) - new Date(a.addedAt)
  );

  let activeId = null;

  if (close !== null) {
    for (const f of sorted) {
      if (close >= f.low && close <= f.high) {
        activeId = f.id;
        break;
      }
    }
  }

  if (!activeId && rHigh !== null && rLow !== null) {
    for (const f of sorted) {
      const overlapLow = Math.max(rLow, f.low);
      const overlapHigh = Math.min(rHigh, f.high);
      if (overlapHigh > overlapLow) {
        activeId = f.id;
        break;
      }
    }
  }

  if (!activeId && close !== null) {
    let closest = null;
    let minDist = Infinity;
    for (const f of sorted) {
      const ce = (f.high + f.low) / 2;
      const dist = Math.abs(close - ce);
      if (dist < minDist) {
        minDist = dist;
        closest = f.id;
      }
    }
    activeId = closest;
  }

  return sorted.map((f, i) => ({
    ...f,
    fvgCe: computeCe(f.high, f.low),
    isActive: f.id === activeId,
    rank: i === 0 ? "newest" : i === sorted.length - 1 ? "oldest" : "middle",
  }));
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
    data: { activeFvg: active, allFvgs: rankedFvgs, count: rankedFvgs.length },
  };
}

export function checkRbInActiveFvg({ rbHigh, rbLow, activeFvg }) {
  const rHigh = num(rbHigh);
  const rLow = num(rbLow);

  if (rHigh === null || rLow === null) {
    return { pass: false, detail: "RB not marked.", data: null };
  }
  if (rHigh <= rLow) {
    return { pass: false, detail: "RB high must be above RB low.", data: null };
  }
  if (!activeFvg) {
    return { pass: false, detail: "No active FVG.", data: null };
  }

  const fHigh = num(activeFvg.high);
  const fLow = num(activeFvg.low);
  if (fHigh === null || fLow === null) {
    return { pass: false, detail: "Active FVG invalid.", data: null };
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
      detail: `RB ${rLow} – ${rHigh} ${position} the active FVG.`,
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
    detail: `RB ${rLow} – ${rHigh} does not overlap active FVG ${fLow} – ${fHigh}.`,
    data: null,
  };
}

// ============================================================
// MSS SEQUENCE — classify a verdict close against the MSS
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

  // ---- Contested / Sweep (body close vs MSS reference) ----
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

  // ---- Tip test (wick touched MSS candle extreme) ----
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

  // ---- Retest (wick touched MSS reference from correct side, close stayed) ----
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
  rb,
  mssReference,
  mssCandleHigh,
  mssCandleLow,
  sequenceType,
}) {
  const buildZoneMap = () => {
    const map = { fvgs: {}, rb: false };
    if (Array.isArray(fvgs)) {
      fvgs.forEach((f) => {
        if (f && f.id) map.fvgs[f.id] = false;
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

    if (rbReaction) {
      primaryType = rbReaction.reaction;
      primaryDetail = rbReaction.detail;
    } else if (mssStep) {
      primaryType = mssStep.step;
      primaryDetail = mssStep.detail;
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
    }

    return {
      id: vc.id,
      sequenceNumber: vc.sequenceNumber ?? i + 1,
      candle: vc.candle,
      reactedZone: rbReaction ? "rb" : mssStep ? "mss" : fvgInteraction ? "fvg" : null,
      reactedZoneRef: fvgInteraction?.zoneRef || null,
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
    if (r.reactedZone === "rb") zonesVisited.rb = true;
  }

  const fvgIds = Object.keys(zonesVisited.fvgs || {});
  const allFvgsVisited = fvgIds.every((id) => zonesVisited.fvgs[id]);
  const allZonesVisited = allFvgsVisited && zonesVisited.rb;

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

  const totalChecks = fvgIds.length + 1;
  let checksPassed = 0;
  fvgIds.forEach((id) => {
    if (zonesVisited.fvgs[id]) checksPassed++;
  });
  if (zonesVisited.rb) checksPassed++;
  const readiness = totalChecks > 0 ? checksPassed / totalChecks : 0;

  return {
    ranked,
    zonesVisited,
    mssSequence,
    allFvgsVisited,
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
  fvgs,
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
  // ----------------------------------------------------------
  // AUTO-RESOLVE currentClose from the latest verdict close
  // ----------------------------------------------------------
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
    sequenceType,
  });

  const rankedFvgs = rankFvgs({
    fvgs,
    closePrice: resolvedClose,
    activeRb: rbHigh && rbLow ? { high: rbHigh, low: rbLow } : null,
  });
  const fvg = checkFvgList({ rankedFvgs });
  const activeFvg = fvg.data?.activeFvg || null;

  const rb = checkRbInActiveFvg({ rbHigh, rbLow, activeFvg });

  const verdictClosesResult = evaluateVerdictCloses({
    verdictCloses,
    fvgs: rankedFvgs,
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
    fvgs: rankedFvgs,
    activeFvg,
    verdictCloses: verdictClosesResult,
    reasons,
    resolvedClose,
  };
}