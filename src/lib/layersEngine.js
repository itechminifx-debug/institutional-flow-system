// ============================================================
// LAYERS ENGINE
// ============================================================
// Context → Setup → Trigger
//
// A decision system: "Should I trade right now?"
//
// Layer 1 — CONTEXT (Where am I?)
//   - Daily bias confirmed?
//   - Price in premium/discount of the dealing range?
//   - Draw on liquidity identified?
//
// Layer 2 — SETUP (Where is the trap?)
//   - Sweep confirmed?
//   - Displacement confirmed?
//   - FVG / OB marked?
//
// Layer 3 — TRIGGER (When do I enter?)
//   - Price reached the zone?
//   - Close confirmed inside?
//   - Kill zone (bonus)?
//
// Reuses:
//   - computeCe               (liquidityZoneEngine)
//   - atrFilter               (liquidityZoneEngine)
//   - computeEmaDirection     (verdictEngine)
//   - computeTrade            (tradeCalculator)
// ============================================================

import { computeCe, atrFilter } from "@/lib/liquidityZoneEngine";
import { computeEmaDirection } from "@/lib/verdictEngine";

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
// CONSTANTS
// ============================================================
export const LAYERS_TYPES = [
  {
    key: "bullish",
    label: "Bullish Layers",
    emoji: "🟢",
    hint: "Bias up → sweep below → displacement → enter on retest",
  },
  {
    key: "bearish",
    label: "Bearish Layers",
    emoji: "🔴",
    hint: "Bias down → sweep above → displacement → enter on retest",
  },
];

export function layersTypeInfo(key) {
  return LAYERS_TYPES.find((t) => t.key === key) || LAYERS_TYPES[0];
}

export const SESSIONS = [
  { key: "asian", label: "Asian", emoji: "🌏" },
  { key: "london", label: "London", emoji: "🇬🇧" },
  { key: "ny_am", label: "NY AM", emoji: "🗽" },
  { key: "ny_pm", label: "NY PM", emoji: "🌆" },
  { key: "kill_zone", label: "Kill Zone", emoji: "⚡" },
  { key: "other", label: "Other / Off-session", emoji: "⚪" },
];

export function sessionInfo(key) {
  return SESSIONS.find((s) => s.key === key) || SESSIONS[SESSIONS.length - 1];
}

// "High-quality" kill zones — bonus confluence
const KILL_ZONE_KEYS = ["london", "ny_am", "ny_pm", "kill_zone"];

// ============================================================
// LAYER 1 — CONTEXT
// ============================================================
// 3 gates:
//   1. Daily bias matches the setup direction
//   2. Price is in the correct premium/discount zone
//   3. Draw on liquidity identified
// ============================================================
export function evaluateContext({
  sequenceType,
  dailyBias,
  dealingRangeHigh,
  dealingRangeLow,
  currentClose,
  drawOnLiquidity,
  drawPrice,
}) {
  const gates = [];

  // ---- Gate 1: Bias alignment ----
  const biasMatches =
    dailyBias === sequenceType ||
    (dailyBias === "bullish" && sequenceType === "bullish") ||
    (dailyBias === "bearish" && sequenceType === "bearish");

  gates.push({
    key: "bias",
    label: "Daily bias matches setup direction",
    pass: biasMatches,
    detail: biasMatches
      ? `D1 bias = ${dailyBias} — aligned with ${sequenceType} setup.`
      : dailyBias
      ? `D1 bias = ${dailyBias}, setup = ${sequenceType} — conflict.`
      : "Daily bias not set.",
  });

  // ---- Gate 2: Premium/discount alignment ----
  const rHigh = num(dealingRangeHigh);
  const rLow = num(dealingRangeLow);
  const close = num(currentClose);

  let inCorrectZone = false;
  let zoneDetail = "Dealing range missing.";

  if (rHigh !== null && rLow !== null && rHigh > rLow && close !== null) {
    const ce = computeCe(rHigh, rLow);
    const isPremium = close > ce;
    const isDiscount = close < ce;

    if (sequenceType === "bullish") {
      inCorrectZone = isDiscount;
      zoneDetail = isDiscount
        ? `Close ${close} in DISCOUNT (below CE ${ce}).`
        : `Close ${close} in PREMIUM (above CE ${ce}) — not ideal for bullish.`;
    } else {
      inCorrectZone = isPremium;
      zoneDetail = isPremium
        ? `Close ${close} in PREMIUM (above CE ${ce}).`
        : `Close ${close} in DISCOUNT (below CE ${ce}) — not ideal for bearish.`;
    }
  }

  gates.push({
    key: "zone",
    label: "Price in correct premium/discount zone",
    pass: inCorrectZone,
    detail: zoneDetail,
  });

  // ---- Gate 3: Draw on liquidity identified ----
  const draw = num(drawPrice);
  const drawValid =
    draw !== null &&
    (drawOnLiquidity === "bsl" || drawOnLiquidity === "ssl") &&
    ((sequenceType === "bullish" && drawOnLiquidity === "bsl") ||
      (sequenceType === "bearish" && drawOnLiquidity === "ssl"));

  gates.push({
    key: "draw",
    label: "Draw on liquidity identified",
    pass: drawValid,
    detail: drawValid
      ? `Target: ${
          drawOnLiquidity === "bsl" ? "Buy-Side" : "Sell-Side"
        } liquidity at ${draw}.`
      : !drawOnLiquidity
      ? "No draw on liquidity selected."
      : draw === null
      ? "Draw price not set."
      : `Draw ${drawOnLiquidity} doesn't match ${sequenceType} setup.`,
  });

  const passed = gates.filter((g) => g.pass).length;
  const total = gates.length;
  const ready = passed === total;

  return {
    ready,
    gates,
    passed,
    total,
    score: Math.round((passed / total) * 100),
    summary: ready
      ? "Context READY — conditions aligned."
      : `Context WAIT — ${total - passed} of ${total} gates failing.`,
  };
}

// ============================================================
// LAYER 2 — SETUP
// ============================================================
// 3 gates (+ 1 optional MSS):
//   1. Sweep confirmed (wick beyond level, close back inside)
//   2. Displacement confirmed (strong body candle)
//   3. FVG/OB zone marked (at least one)
//   4. (Optional) MSS reference set
// ============================================================
export function evaluateSetup({
  sequenceType,
  sweepLevel,
  sweepCandle,
  displacementCandle,
  mssReference,
  zones,
}) {
  const gates = [];

  // ---- Gate 1: Sweep confirmed ----
  const level = num(sweepLevel);
  const sw = validCandle(sweepCandle) ? sweepCandle : null;

  let sweepPass = false;
  let sweepDetail = "Sweep candle not set.";

  if (level !== null && sw) {
    const wickLow = num(sw.low);
    const wickHigh = num(sw.high);
    const close = num(sw.close);

    if (sequenceType === "bullish") {
      const swept = wickLow < level;
      const reclaimed = close > level;
      sweepPass = swept && reclaimed;
      sweepDetail = swept
        ? reclaimed
          ? `Swept below ${level}, closed back above — confirmed.`
          : `Swept below ${level} but closed below — no reclaim.`
        : `No sweep — wick low ${wickLow} did not breach ${level}.`;
    } else {
      const swept = wickHigh > level;
      const reclaimed = close < level;
      sweepPass = swept && reclaimed;
      sweepDetail = swept
        ? reclaimed
          ? `Swept above ${level}, closed back below — confirmed.`
          : `Swept above ${level} but closed above — no reclaim.`
        : `No sweep — wick high ${wickHigh} did not breach ${level}.`;
    }
  }

  gates.push({
    key: "sweep",
    label: "Liquidity sweep confirmed",
    pass: sweepPass,
    detail: sweepDetail,
  });

  // ---- Gate 2: Displacement confirmed ----
  // Displacement = strong body > 50% of the candle's total range
  const dc = validCandle(displacementCandle) ? displacementCandle : null;
  let displacementPass = false;
  let displacementDetail = "Displacement candle not set.";

  if (dc) {
    const o = num(dc.open);
    const c = num(dc.close);
    const h = num(dc.high);
    const l = num(dc.low);
    const bodySize = Math.abs(c - o);
    const range = h - l;
    const ratio = range > 0 ? bodySize / range : 0;
    const directionCorrect =
      sequenceType === "bullish" ? c > o : c < o;

    displacementPass = ratio >= 0.5 && directionCorrect;

    displacementDetail = !directionCorrect
      ? `Body direction is wrong for ${sequenceType} setup.`
      : ratio < 0.5
      ? `Body is only ${Math.round(ratio * 100)}% of the candle — weak displacement.`
      : `Strong ${Math.round(ratio * 100)}% body — displacement confirmed.`;
  }

  gates.push({
    key: "displacement",
    label: "Displacement candle (strong body)",
    pass: displacementPass,
    detail: displacementDetail,
  });

  // ---- Gate 3: Zone marked ----
  const cleanZones = (zones || []).filter((z) => {
    const h = num(z.high);
    const l = num(z.low);
    return h !== null && l !== null && h > l;
  });

  gates.push({
    key: "zone",
    label: "FVG / RB / OB zone marked",
    pass: cleanZones.length > 0,
    detail:
      cleanZones.length > 0
        ? `${cleanZones.length} zone${cleanZones.length === 1 ? "" : "s"} marked.`
        : "No zones marked yet.",
  });

  // ---- Optional: MSS reference ----
  const mss = num(mssReference);
  if (mss !== null) {
    gates.push({
      key: "mss",
      label: "MSS reference set (optional)",
      pass: true,
      detail: `MSS reference at ${mss}.`,
    });
  }

  const passed = gates.filter((g) => g.pass).length;
  const total = gates.length;
  const ready = passed === total;

  return {
    ready,
    gates,
    passed,
    total,
    score: Math.round((passed / total) * 100),
    summary: ready
      ? "Setup READY — trap confirmed."
      : `Setup WAIT — ${total - passed} of ${total} gates failing.`,
  };
}

// ============================================================
// LAYER 3 — TRIGGER
// ============================================================
// 3 gates:
//   1. Price reached the active zone
//   2. Close confirmed inside the zone
//   3. Session is a high-quality kill zone (bonus)
// ============================================================
export function evaluateTrigger({
  sequenceType,
  entryCandle,
  zones,
  session,
}) {
  const gates = [];

  // ---- Active zone (nearest to entry close) ----
  const cleanZones = (zones || [])
    .map((z) => ({
      ...z,
      high: num(z.high),
      low: num(z.low),
    }))
    .filter((z) => z.high !== null && z.low !== null && z.high > z.low);

  const ec = validCandle(entryCandle) ? entryCandle : null;
  const entryClose = ec ? num(ec.close) : null;
  const entryWickLow = ec ? num(ec.low) : null;
  const entryWickHigh = ec ? num(ec.high) : null;

  // Find the nearest zone to the entry close
  let activeZone = null;
  let minDist = Infinity;
  for (const z of cleanZones) {
    const ce = computeCe(z.high, z.low);
    const dist = entryClose !== null ? Math.abs(entryClose - ce) : Infinity;
    if (dist < minDist) {
      minDist = dist;
      activeZone = z;
    }
  }

  // ---- Gate 1: Price reached the zone (wick) ----
  let reachedPass = false;
  let reachedDetail = "No zone or entry candle.";

  if (activeZone && ec) {
    const reached =
      entryWickLow <= activeZone.high && entryWickHigh >= activeZone.low;
    reachedPass = reached;
    reachedDetail = reached
      ? `Price reached zone ${activeZone.low} – ${activeZone.high}.`
      : `Price didn't reach zone ${activeZone.low} – ${activeZone.high}.`;
  }

  gates.push({
    key: "reached",
    label: "Price reached the active zone",
    pass: reachedPass,
    detail: reachedDetail,
  });

  // ---- Gate 2: Close confirmed inside the zone ----
  let closePass = false;
  let closeDetail = "No close or zone.";

  if (activeZone && entryClose !== null) {
    const inside =
      entryClose >= activeZone.low && entryClose <= activeZone.high;
    closePass = inside;
    closeDetail = inside
      ? `Close ${entryClose} inside zone — confirmed.`
      : `Close ${entryClose} outside zone ${activeZone.low} – ${activeZone.high}.`;
  }

  gates.push({
    key: "close",
    label: "Close confirmed inside the zone",
    pass: closePass,
    detail: closeDetail,
  });

  // ---- Gate 3: Kill zone (bonus — not required) ----
  const isKillZone = KILL_ZONE_KEYS.includes(session);
  gates.push({
    key: "session",
    label: "Inside kill zone (bonus)",
    pass: isKillZone,
    detail: isKillZone
      ? `Session: ${sessionInfo(session).label} — bonus confluence.`
      : session
      ? `Session: ${sessionInfo(session).label} — outside kill zones.`
      : "Session not set.",
    bonus: true, // mark as bonus — doesn't block readiness
  });

  // For readiness: only count non-bonus gates
  const blocking = gates.filter((g) => !g.bonus);
  const blockingPassed = blocking.filter((g) => g.pass).length;
  const blockingTotal = blocking.length;
  const ready = blockingPassed === blockingTotal;

  const totalPassed = gates.filter((g) => g.pass).length;

  return {
    ready,
    gates,
    activeZone,
    passed: totalPassed,
    total: gates.length,
    blockingPassed,
    blockingTotal,
    score: Math.round((blockingPassed / blockingTotal) * 100),
    summary: ready
      ? isKillZone
        ? "Trigger ENTER — in kill zone (extra confluence)."
        : "Trigger ENTER — close confirmed."
      : `Trigger WAIT — close not yet confirmed.`,
  };
}

// ============================================================
// TRADE COMPUTATION
// ============================================================
function computeLayersTrade({
  sequenceType,
  activeZone,
  drawPrice,
  pipSize,
  accountSize,
  riskPercent,
}) {
  if (!activeZone) return null;
  const tp = num(drawPrice);
  if (tp === null) return null;

  const entry = computeCe(activeZone.high, activeZone.low);
  if (entry === null) return null;

  // SL goes beyond the zone on the losing side
  const sl =
    sequenceType === "bullish" ? activeZone.low : activeZone.high;

  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  const rr = risk > 0 ? reward / risk : 0;

  const ps = num(pipSize) || 1;

  const trade = {
    direction: sequenceType === "bullish" ? "BUY" : "SELL",
    entry,
    sl,
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

  return trade;
}

// ============================================================
// FULL EVALUATION
// ============================================================
export function evaluateLayers({
  sequenceType,
  pair,
  timeframe,
  // Layer 1
  dailyBias,
  dealingRangeHigh,
  dealingRangeLow,
  currentClose,
  drawOnLiquidity,
  drawPrice,
  // Layer 2
  sweepLevel,
  sweepCandle,
  displacementCandle,
  mssReference,
  zones,
  // Layer 3
  entryCandle,
  session,
  // Trade
  pipSize,
  accountSize = 0,
  riskPercent = 1,
}) {
  const context = evaluateContext({
    sequenceType,
    dailyBias,
    dealingRangeHigh,
    dealingRangeLow,
    currentClose,
    drawOnLiquidity,
    drawPrice,
  });

  const setup = evaluateSetup({
    sequenceType,
    sweepLevel,
    sweepCandle,
    displacementCandle,
    mssReference,
    zones,
  });

  const trigger = evaluateTrigger({
    sequenceType,
    entryCandle,
    zones,
    session,
  });

  // ---- Trade only fires when all three layers pass ----
  const allReady = context.ready && setup.ready && trigger.ready;

  let trade = null;
  if (allReady && trigger.activeZone) {
    trade = computeLayersTrade({
      sequenceType,
      activeZone: trigger.activeZone,
      drawPrice,
      pipSize,
      accountSize,
      riskPercent,
    });
  }

  const verdict = allReady && trade ? trade.direction : "WAIT";

  // ---- Reasons list ----
  const reasons = [];
  if (!context.ready) {
    context.gates
      .filter((g) => !g.pass)
      .forEach((g) => reasons.push(`Context — ${g.label}: ${g.detail}`));
  }
  if (!setup.ready) {
    setup.gates
      .filter((g) => !g.pass)
      .forEach((g) => reasons.push(`Setup — ${g.label}: ${g.detail}`));
  }
  if (!trigger.ready) {
    trigger.gates
      .filter((g) => !g.pass && !g.bonus)
      .forEach((g) => reasons.push(`Trigger — ${g.label}: ${g.detail}`));
  }

  return {
    sequenceType,
    pair,
    timeframe,
    context,
    setup,
    trigger,
    allReady,
    trade,
    verdict,
    reasons,
  };
}