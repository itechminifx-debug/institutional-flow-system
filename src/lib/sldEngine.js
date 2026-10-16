// ============================================================
// SLD ENGINE
// ============================================================
// Structure → Liquidity → Delivery
//
// 5 Layers:
//   1. Bias & DOL (Daily/4H)
//   2. POI / Entry Zone (1H/15M)
//   3. Entry Trigger (5M/1M)
//   4. Trade Management
//   5. DOL Updates (re-entry)
// ============================================================

import { computeCe } from "@/lib/liquidityZoneEngine";

// ============================================================
// CONSTANTS
// ============================================================
export const SLD_TYPES = [
  { key: "bullish", label: "Bullish SLD", emoji: "🟢", hint: "Bias up → sweep low → BOS up → discount POI → BUY" },
  { key: "bearish", label: "Bearish SLD", emoji: "🔴", hint: "Bias down → sweep high → BOS down → premium POI → SELL" },
];

export function sldTypeInfo(key) {
  return SLD_TYPES.find((t) => t.key === key) || SLD_TYPES[0];
}

export const DOL_RANK_OPTIONS = [
  { key: "eqh_eql", label: "Equal Highs / Equal Lows (EQH/EQL)", emoji: "🏆", strength: "strong" },
  { key: "pdh_pdl", label: "Prior Day High / Low (PDH/PDL)", emoji: "🎯", strength: "strong" },
  { key: "swing", label: "Prior Swing High / Low", emoji: "🔷", strength: "normal" },
  { key: "trendline", label: "Trendline liquidity", emoji: "📈", strength: "normal" },
  { key: "round", label: "Round number / ATH", emoji: "⭕", strength: "weak" },
];

export const POI_ZONE_TYPES = [
  { key: "fvg", label: "Fair Value Gap (FVG)", emoji: "📊" },
  { key: "ob", label: "Order Block (OB)", emoji: "🧱" },
  { key: "breaker", label: "Breaker Block", emoji: "🔨" },
];

export const SLD_SESSIONS = [
  { key: "asian", label: "Asian" },
  { key: "london", label: "London" },
  { key: "ny_am", label: "NY AM" },
  { key: "ny_pm", label: "NY PM" },
  { key: "other", label: "Other / Off-session" },
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
    num(c.open) !== null && num(c.high) !== null &&
    num(c.low) !== null && num(c.close) !== null
  );
}

// ============================================================
// LAYER 1 — BIAS & DOL
// ============================================================
export function evaluateBias({ d1Bias, structureVerdict, chochDetected, quarterlyAligned }) {
  const gates = [];

  const biasClear = d1Bias === "bullish" || d1Bias === "bearish";
  gates.push({
    key: "bias_clear",
    label: "Daily bias is clear (bullish or bearish)",
    pass: biasClear,
    detail: biasClear
      ? `Bias = ${d1Bias}.`
      : "Bias not set. Cannot trade without a clear directional bias.",
  });

  const structureValid = !!structureVerdict && structureVerdict !== "mixed";
  gates.push({
    key: "structure",
    label: "Structure confirms the bias",
    pass: structureValid,
    detail: structureVerdict
      ? structureVerdict === "HH_HL"
        ? "Structure: Higher Highs + Higher Lows (bullish)."
        : structureVerdict === "LH_LL"
        ? "Structure: Lower Highs + Lower Lows (bearish)."
        : structureVerdict === "choch"
        ? "⚠️ CHoCH detected — structure may be flipping."
        : "Structure is mixed — no clear direction."
      : "Structure not identified.",
  });

  // CHoCH is not a gate — it's a warning
  if (chochDetected) {
    gates.push({
      key: "choch_warning",
      label: "CHoCH detected — bias may flip",
      pass: true, // still passes, but warns
      detail: "A CHoCH was detected. Confirm the bias before entering.",
      warning: true,
    });
  }

  // Quarterly alignment is a bonus, not required
  gates.push({
    key: "quarterly",
    label: "Quarterly alignment (bonus)",
    pass: !!quarterlyAligned,
    detail: quarterlyAligned
      ? "✅ DOL aligned with higher timeframe bias."
      : "DOL against higher timeframe — needs more patience.",
    bonus: true,
  });

  const blocking = gates.filter((g) => !g.bonus);
  const blockingPassed = blocking.filter((g) => g.pass).length;
  const ready = blockingPassed === blocking.length;

  return {
    ready,
    gates,
    passed: gates.filter((g) => g.pass).length,
    total: gates.length,
    score: Math.round((blockingPassed / blocking.length) * 100),
  };
}

export function evaluateDOL({ bias, dolType, dolPrice, dolRank, currentPrice }) {
  const price = num(dolPrice);
  const current = num(currentPrice);

  if (price === null || !dolType) {
    return {
      ready: false,
      dol: null,
      detail: "No DOL level marked.",
    };
  }

  // DOL direction check
  const correctDirection =
    (bias === "bullish" && dolType === "bsl") ||
    (bias === "bearish" && dolType === "ssl");

  // Strength from rank
  const rankInfo = DOL_RANK_OPTIONS.find((r) => r.key === dolRank);
  const strength = rankInfo?.strength || "normal";

  // Distance classification (near vs far)
  let distanceClass = "near";
  if (current !== null && current > 0) {
    const pct = Math.abs(price - current) / current;
    if (pct > 0.15) distanceClass = "far";
    else if (pct > 0.05) distanceClass = "moderate";
  }

  return {
    ready: correctDirection,
    dol: { type: dolType, price, rank: dolRank, strength, distanceClass },
    correctDirection,
    detail: correctDirection
      ? `${dolType.toUpperCase()} at ${price} (${strength} strength, ${distanceClass} distance)`
      : `DOL type (${dolType}) doesn't match bias (${bias}).`,
  };
}

// ============================================================
// LAYER 2 — POI / ENTRY ZONE
// ============================================================
export function evaluatePOI({
  bias,
  sweepHappened,
  sweepLevel,
  bosConfirmed,
  bosLevel,
  poiZone,
  dealingRange,
  pathClear,
}) {
  const gates = [];

  // Sweep of opposing liquidity
  gates.push({
    key: "sweep",
    label: "Opposing liquidity swept",
    pass: !!sweepHappened,
    detail: sweepHappened
      ? `Sweep at ${sweepLevel}.`
      : "Opposing liquidity not yet swept. Wait.",
  });

  // BOS confirmed in bias direction
  gates.push({
    key: "bos",
    label: "BOS confirmed in bias direction",
    pass: !!bosConfirmed,
    detail: bosConfirmed
      ? `BOS at ${bosLevel}.`
      : "No BOS yet. Structure hasn't confirmed.",
  });

  // POI zone marked
  const hasZone = poiZone && num(poiZone.high) !== null && num(poiZone.low) !== null;
  gates.push({
    key: "poi",
    label: "POI marked (FVG / OB / Breaker)",
    pass: hasZone,
    detail: hasZone
      ? `${poiZone.type?.toUpperCase()} at ${poiZone.low} – ${poiZone.high}.`
      : "No POI zone marked.",
  });

  // Discount/premium check
  let inCorrectZone = null;
  if (hasZone && dealingRange) {
    const rHigh = num(dealingRange.high);
    const rLow = num(dealingRange.low);
    if (rHigh !== null && rLow !== null && rHigh > rLow) {
      const ce = computeCe(rHigh, rLow);
      const zoneCe = computeCe(poiZone.high, poiZone.low);
      if (zoneCe !== null) {
        if (bias === "bullish") inCorrectZone = zoneCe < ce;
        else if (bias === "bearish") inCorrectZone = zoneCe > ce;
      }
    }
  }

  gates.push({
    key: "zone",
    label: "POI in correct zone (discount/premium)",
    pass: inCorrectZone === true,
    detail:
      inCorrectZone === null
        ? "Cannot check — need dealing range + zone."
        : inCorrectZone
        ? `POI is in the correct ${bias === "bullish" ? "discount" : "premium"} zone.`
        : `⚠️ POI is in the wrong zone. ${bias === "bullish" ? "Should be in discount." : "Should be in premium."}`,
  });

  // Path to DOL clear
  gates.push({
    key: "path",
    label: "Path to DOL is clear (no opposing PD arrays)",
    pass: pathClear !== false,
    detail: pathClear === false
      ? "⚠️ Opposing PD array in the path. May stall delivery."
      : "Path is clear.",
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
// LAYER 3 — ENTRY TRIGGER
// ============================================================
export function evaluateTrigger({ priceTapped, ltfChoch, ltfFvgEntry }) {
  const gates = [];

  gates.push({
    key: "tapped",
    label: "Price tapped the POI",
    pass: !!priceTapped,
    detail: priceTapped ? "Price entered the POI zone." : "Waiting for price to reach POI.",
  });

  gates.push({
    key: "choch",
    label: "Lower-TF CHoCH confirmed",
    pass: !!ltfChoch,
    detail: ltfChoch ? "5M CHoCH confirmed." : "No lower-TF CHoCH yet.",
  });

  gates.push({
    key: "fvg_entry",
    label: "Entry on LTF FVG/OB",
    pass: !!ltfFvgEntry,
    detail: ltfFvgEntry ? "Entry triggered on 5M FVG." : "Entry not yet triggered.",
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
// TRADE COMPUTATION
// ============================================================
export function computeSldTrade({
  bias,
  poiZone,
  sweepLevel,
  dolPrice,
  pipSize,
  accountSize,
  riskPercent,
}) {
  if (!poiZone) return null;
  const zHigh = num(poiZone.high);
  const zLow = num(poiZone.low);
  const dol = num(dolPrice);
  const sweep = num(sweepLevel);

  if (zHigh === null || zLow === null || dol === null) return null;

  const entry = computeCe(zHigh, zLow);
  if (entry === null) return null;

  // SL beyond the sweep level
  let sl;
  if (bias === "bullish") {
    sl = sweep !== null ? sweep : zLow;
  } else {
    sl = sweep !== null ? sweep : zHigh;
  }

  const risk = Math.abs(entry - sl);
  const reward = Math.abs(dol - entry);
  const rr = risk > 0 ? reward / risk : 0;

  const ps = num(pipSize) || 1;

  const trade = {
    direction: bias === "bullish" ? "BUY" : "SELL",
    entry,
    sl,
    tp: dol,
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

  return trade;
}

// ============================================================
// LAYER 4 — TRADE MANAGEMENT
// ============================================================
export function evaluateManagement({
  trade,
  currentPrice,
  partial2RTaken,
  breakevenSet,
  trailActive,
  trailLevel,
  tradeStatus,
}) {
  if (!trade) {
    return {
      ready: false,
      rules: [],
      summary: "No trade to manage.",
    };
  }

  const entry = num(trade.entry);
  const sl = num(trade.sl);
  const tp = num(trade.tp);
  const current = num(currentPrice);

  const risk = entry !== null && sl !== null ? Math.abs(entry - sl) : 0;
  const direction = trade.direction;

  // Current R
  let currentR = 0;
  if (current !== null && risk > 0) {
    const move = direction === "BUY" ? current - entry : entry - current;
    currentR = move / risk;
  }

  // 2R price
  const twoRPrice = entry !== null
    ? direction === "BUY"
      ? entry + 2 * risk
      : entry - 2 * risk
    : null;

  // Reached 2R?
  const reached2R = currentR >= 2;

  const rules = [
    {
      key: "partial_2r",
      label: "Take 50% partial at 2R",
      status: partial2RTaken ? "✅ taken" : reached2R ? "⚠️ should take now" : "⏳ waiting",
      pass: partial2RTaken,
      ready: reached2R,
      detail: reached2R
        ? `Price at ${currentR.toFixed(2)}R — take partial.`
        : `Waiting for 2R (${twoRPrice !== null ? twoRPrice.toFixed(2) : "—"}).`,
    },
    {
      key: "breakeven",
      label: "Move stop to break-even after partial",
      status: breakevenSet ? "✅ set" : partial2RTaken ? "⚠️ set now" : "⏳ waiting",
      pass: breakevenSet,
      ready: partial2RTaken,
      detail: breakevenSet
        ? "Stop at break-even."
        : partial2RTaken
        ? "Take the partial — then move stop to BE."
        : "Waiting for partial.",
    },
    {
      key: "trail",
      label: "Trail stop after next BOS",
      status: trailActive ? `✅ active (${trailLevel})` : "⏳ waiting",
      pass: trailActive,
      ready: breakevenSet,
      detail: trailActive
        ? `Trail at ${trailLevel}.`
        : "Set trail after the next BOS in your direction.",
    },
    {
      key: "exit_dol",
      label: "Full exit at DOL",
      status: tradeStatus === "closed_win" ? "✅ closed" : "⏳ waiting",
      pass: tradeStatus === "closed_win",
      ready: tp !== null && current !== null && Math.abs(current - tp) < risk * 0.1,
      detail: tp !== null
        ? `Target ${tp}. Current ${current ?? "—"}.`
        : "No target set.",
    },
  ];

  const allPassed = rules.every((r) => r.pass);

  return {
    ready: allPassed,
    rules,
    currentR,
    reached2R,
    twoRPrice,
    summary: allPassed
      ? "Trade fully managed."
      : `${rules.filter((r) => r.pass).length}/${rules.length} management steps complete.`,
  };
}

// ============================================================
// LAYER 5 — DOL UPDATES (Re-entry)
// ============================================================
export function evaluateDolUpdate({
  tradeStatus,
  nextDol,
  nextDolType,
  structureFlipped,
}) {
  const canReenter =
    tradeStatus === "closed_win" &&
    !!nextDol &&
    !structureFlipped;

  return {
    ready: canReenter,
    canReenter,
    nextDol: nextDol || null,
    nextDolType: nextDolType || null,
    detail: structureFlipped
      ? "Structure flipped — re-entry blocked until new bias forms."
      : tradeStatus !== "closed_win"
      ? "Waiting for current trade to close."
      : canReenter
      ? `Ready to hunt the next DOL at ${nextDol}.`
      : "No next DOL marked.",
  };
}

// ============================================================
// FULL EVALUATION
// ============================================================
export function evaluateSld({
  sequenceType,
  pair,
  timeframe,
  // Layer 1
  d1Bias,
  structureVerdict,
  chochDetected,
  quarterlyAligned,
  dolType,
  dolPrice,
  dolRank,
  currentPrice,
  // Layer 2
  sweepHappened,
  sweepLevel,
  bosConfirmed,
  bosLevel,
  poiZone,
  dealingRange,
  pathClear,
  // Layer 3
  priceTapped,
  ltfChoch,
  ltfFvgEntry,
  // Layer 4
  partial2RTaken,
  breakevenSet,
  trailActive,
  trailLevel,
  tradeStatus,
  // Layer 5
  nextDol,
  nextDolType,
  structureFlipped,
  // Trade context
  pipSize,
  accountSize = 0,
  riskPercent = 1,
}) {
  const layer1 = evaluateBias({
    d1Bias,
    structureVerdict,
    chochDetected,
    quarterlyAligned,
  });

  const dol = evaluateDOL({
    bias: d1Bias,
    dolType,
    dolPrice,
    dolRank,
    currentPrice,
  });

  const layer2 = evaluatePOI({
    bias: d1Bias,
    sweepHappened,
    sweepLevel,
    bosConfirmed,
    bosLevel,
    poiZone,
    dealingRange,
    pathClear,
  });

  const layer3 = evaluateTrigger({
    priceTapped,
    ltfChoch,
    ltfFvgEntry,
  });

  // Trade fires only when layers 1–3 all pass
  const preEntryReady =
    layer1.ready && dol.ready && layer2.ready && layer3.ready;

  let trade = null;
  if (preEntryReady && poiZone && d1Bias) {
    trade = computeSldTrade({
      bias: d1Bias,
      poiZone,
      sweepLevel,
      dolPrice,
      pipSize,
      accountSize,
      riskPercent,
    });
  }

  const layer4 = evaluateManagement({
    trade,
    currentPrice,
    partial2RTaken,
    breakevenSet,
    trailActive,
    trailLevel,
    tradeStatus,
  });

  const layer5 = evaluateDolUpdate({
    tradeStatus,
    nextDol,
    nextDolType,
    structureFlipped,
  });

  const reasons = [];
  if (!layer1.ready) {
    layer1.gates.filter((g) => !g.pass && !g.bonus).forEach((g) =>
      reasons.push(`Layer 1 — ${g.label}: ${g.detail}`)
    );
  }
  if (!dol.ready) {
    reasons.push(`DOL — ${dol.detail}`);
  }
  if (!layer2.ready) {
    layer2.gates.filter((g) => !g.pass).forEach((g) =>
      reasons.push(`Layer 2 — ${g.label}: ${g.detail}`)
    );
  }
  if (!layer3.ready) {
    layer3.gates.filter((g) => !g.pass).forEach((g) =>
      reasons.push(`Layer 3 — ${g.label}: ${g.detail}`)
    );
  }

  return {
    sequenceType,
    pair,
    timeframe,
    layer1,
    dol,
    layer2,
    layer3,
    layer4,
    layer5,
    trade,
    preEntryReady,
    reasons,
  };
}