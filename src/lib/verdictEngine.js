// ============================================================
// SHARED VERDICT ENGINE
// ============================================================
// Centralizes verdict strength adjustment, HTF bias resolution,
// sweep override, and warning reason computation.
//
// Used by: negotiation, BOS+RB, premium/discount, liquidity zone,
// rejection block.
//
// Each system provides its base verdict, then this engine layers
// HTF bias, EMA alignment, sweep overrides, and danger warnings
// on top — producing a consistent final verdict object.
// ============================================================

// ============================================================
// STRENGTH ORDER
// ============================================================
export const STRENGTH_ORDER = ["weak", "normal", "strong"];

// ============================================================
// HTF BIAS OPTIONS
// ============================================================
export const HTF_BIAS_OPTIONS = [
  { key: "auto", label: "Auto (use EMA 50)", emoji: "🤖" },
  { key: "bullish", label: "Bullish", emoji: "🟢" },
  { key: "bearish", label: "Bearish", emoji: "🔴" },
];

export const SWEEP_DIRECTION_OPTIONS = [
  { key: "none", label: "No sweep detected", emoji: "⚪" },
  { key: "up_bearish", label: "Sweep up → bearish", emoji: "🔻" },
  { key: "down_bullish", label: "Sweep down → bullish", emoji: "🔺" },
];

// ============================================================
// EMA DIRECTION
// ============================================================
export function computeEmaDirection({ emaPrice, closePrice }) {
  const c = parseFloat(emaPrice);
  const close = parseFloat(closePrice);
  if (isNaN(c)) {
    return {
      direction: "unknown",
      position: "unknown",
      valid: false,
    };
  }
  let position = "unknown";
  if (!isNaN(close)) {
    const tolerance = Math.abs(c) * 0.0001;
    if (Math.abs(close - c) <= tolerance) position = "at";
    else position = close > c ? "above" : "below";
  }
  return {
    direction:
      position === "above"
        ? "bullish"
        : position === "below"
        ? "bearish"
        : "unknown",
    position,
    emaPrice: c,
    valid: true,
  };
}

export function emaInfo({ direction, position }) {
  const dirMap = {
    bullish: { label: "Bullish", emoji: "📈", color: "text-green-300" },
    bearish: { label: "Bearish", emoji: "📉", color: "text-red-300" },
    unknown: { label: "Unknown", emoji: "⚪", color: "text-gray-400" },
  };
  const posMap = {
    above: { label: "Above EMA", color: "text-green-300" },
    below: { label: "Below EMA", color: "text-red-300" },
    at: { label: "At EMA", color: "text-yellow-300" },
    unknown: { label: "—", color: "text-gray-400" },
  };
  return {
    direction: dirMap[direction] || dirMap.unknown,
    position: posMap[position] || posMap.unknown,
  };
}

export function emaAlignment({ position, verdict }) {
  if (!verdict || verdict === "WAIT") return null;
  if (!position || position === "unknown") return null;

  if (verdict === "BUY") {
    if (position === "above") {
      return {
        key: "aligned",
        label: "EMA 50 aligned ✅",
        color: "bg-green-900/40 text-green-300",
        description: "BUY with price above EMA 50 — aligned.",
        modifier: +1,
      };
    }
    if (position === "below") {
      return {
        key: "counter",
        label: "Counter-trend ⚠️",
        color: "bg-yellow-900/40 text-yellow-300",
        description: "BUY with price below EMA 50 — counter-trend.",
        modifier: -1,
      };
    }
  }
  if (verdict === "SELL") {
    if (position === "below") {
      return {
        key: "aligned",
        label: "EMA 50 aligned ✅",
        color: "bg-green-900/40 text-green-300",
        description: "SELL with price below EMA 50 — aligned.",
        modifier: +1,
      };
    }
    if (position === "above") {
      return {
        key: "counter",
        label: "Counter-trend ⚠️",
        color: "bg-yellow-900/40 text-yellow-300",
        description: "SELL with price above EMA 50 — counter-trend.",
        modifier: -1,
      };
    }
  }
  return {
    key: "neutral",
    label: "EMA 50 neutral",
    color: "bg-blue-900/40 text-blue-300",
    description: "Price at EMA 50 — no directional bias.",
    modifier: 0,
  };
}

// ============================================================
// RESOLVE HTF BIAS
// ============================================================
export function resolveHtfBias({ htfBiasInput, ema }) {
  if (htfBiasInput === "bullish" || htfBiasInput === "bearish") {
    return htfBiasInput;
  }
  if (ema?.direction === "bullish" || ema?.direction === "bearish") {
    return ema.direction;
  }
  return "unknown";
}

// ============================================================
// ADJUST STRENGTH
// ============================================================
export function adjustStrength(baseStrength, modifier) {
  if (!baseStrength) return baseStrength;
  if (!modifier) return baseStrength;
  const idx = STRENGTH_ORDER.indexOf(baseStrength);
  if (idx === -1) return baseStrength;
  let newIdx = idx + modifier;
  if (newIdx < 0) newIdx = 0;
  if (newIdx > 2) newIdx = 2;
  return STRENGTH_ORDER[newIdx];
}

// ============================================================
// APPLY HTF + EMA + SWEEP TO A BASE VERDICT
// ============================================================
// Input:
//   verdict: { verdict, strength, reason, ... } — base verdict
//   ema: { position, direction } — from computeEmaDirection
//   htfBiasInput: 'auto' | 'bullish' | 'bearish'
//   sweepDirection: 'none' | 'up_bearish' | 'down_bullish'
//
// Returns: enriched verdict with conflicts/overrides attached
// ============================================================
export function enrichVerdict({
  verdict,
  ema,
  htfBiasInput = "auto",
  sweepDirection = "none",
}) {
  if (!verdict) return null;

  const result = { ...verdict };

  // EMA modifier
  const alignment = emaAlignment({
    position: ema?.position,
    verdict: result.verdict,
  });
  const emaModifier = alignment?.modifier ?? 0;

  result.emaAlignment = alignment;

  // HTF conflict
  const resolvedHtf = resolveHtfBias({ htfBiasInput, ema });
  const htfConflict = [];

  if (htfBiasInput !== "auto" && resolvedHtf && resolvedHtf !== "unknown") {
    const verdictDir = result.verdict === "BUY" ? "bullish" : "bearish";
    if (verdictDir !== resolvedHtf) {
      htfConflict.push({
        key: "htf_conflict",
        label: `HTF bias is ${resolvedHtf} — verdict is ${verdictDir}`,
        detail:
          "The higher-timeframe trend conflicts with the verdict. This is a counter-trend signal.",
      });
    }
  }

  // Sweep override
  let sweepOverride = null;
  if (sweepDirection === "up_bearish" && result.verdict === "BUY") {
    sweepOverride = {
      key: "sweep_flip_to_sell",
      label: "Sweep up — bearish override",
      detail:
        "Liquidity was swept above. The BUY verdict is contradicted by the sweep — consider SELL.",
    };
  }
  if (sweepDirection === "down_bullish" && result.verdict === "SELL") {
    sweepOverride = {
      key: "sweep_flip_to_buy",
      label: "Sweep down — bullish override",
      detail:
        "Liquidity was swept below. The SELL verdict is contradicted by the sweep — consider BUY.",
    };
  }

  // Adjust strength
  let finalModifier = emaModifier;
  if (htfConflict.length > 0 && finalModifier === 0) finalModifier = -1;
  if (sweepOverride && finalModifier === 0) finalModifier = -1;

  const baseStrength = result.strength;
  const adjusted = adjustStrength(baseStrength, finalModifier);

  if (adjusted !== baseStrength) {
    if (finalModifier > 0) result.reason += " Strength upgraded.";
    else if (finalModifier < 0)
      result.reason += " Strength reduced (conflict).";
  }

  result.strength = adjusted;
  result.baseStrength = baseStrength;
  result.strengthAdjustment = finalModifier;
  result.htfConflict = htfConflict;
  result.hasHtfConflict = htfConflict.length > 0;
  result.sweepOverride = sweepOverride;
  result.hasSweepOverride = !!sweepOverride;
  result.resolvedHtf = resolvedHtf;

  return result;
}

// ============================================================
// WARNING REASONS
// ============================================================
// Collects all the reasons a trade should trigger the pre-save
// warning modal. Works for any system.
//
// Inputs:
//   verdict: enriched verdict (with htfConflict, hasSweepOverride)
//   alignment: from emaAlignment
//   pathDanger: from scorePathDanger (optional)
//   blockerBadge: from blockerInfo (optional)
//   extraReasons: array of custom reasons to append
// ============================================================
export function computeWarningReasons({
  verdict,
  alignment,
  pathDanger,
  blockerBadge,
  extraReasons = [],
}) {
  const reasons = [];

  // 1. Critical path danger
  if (pathDanger && pathDanger.topScore >= 8) {
    reasons.push({
      key: "critical_path",
      label: `Critical resistance ahead (score ${pathDanger.topScore}/10)`,
      detail:
        "A high-danger zone sits in the trade's path. Price may reject there before reaching the target.",
    });
  }

  // 2. Blocked early
  if (blockerBadge && blockerBadge.key === "weak") {
    reasons.push({
      key: "blocked_early",
      label: "Blocked early",
      detail:
        "The nearest zone sits in the first 15% of the path — the trade may reject almost immediately.",
    });
  }

  // 3. Weak + Counter-trend
  if (verdict?.strength === "weak" && alignment?.key === "counter") {
    reasons.push({
      key: "weak_counter",
      label: "Weak verdict + Counter-trend",
      detail:
        "The verdict strength is weak and the EMA 50 bias is against the trade direction.",
    });
  }

  // 4. HTF conflict
  if (verdict?.hasHtfConflict) {
    reasons.push({
      key: "htf_conflict",
      label: "HTF bias conflict",
      detail: "The higher-timeframe bias conflicts with the verdict.",
    });
  }

  // 5. Sweep override
  if (verdict?.hasSweepOverride) {
    reasons.push({
      key: "sweep_override",
      label: "Sweep override",
      detail: "The sweep direction contradicts the verdict.",
    });
  }

  // Custom extras
  for (const extra of extraReasons) {
    reasons.push(extra);
  }

  return reasons;
}