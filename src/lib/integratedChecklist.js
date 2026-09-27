// ============================================================
// INTEGRATED CHECKLIST — 10-Question Gate
// SMC + ICT + CRT combined final check
// ============================================================

export const INTEGRATED_QUESTIONS = [
  {
    key: "q1_sweep",
    number: 1,
    label: "Is there a liquidity sweep?",
    hint: "Current candle wick exceeded a previous swing high/low",
    module: "Sweep Confluence",
  },
  {
    key: "q2_close_inside",
    number: 2,
    label: "Did price close back inside the range?",
    hint: "The RB candle closed within the previous range",
    module: "RB Validator",
  },
  {
    key: "q3_ob_fvg",
    number: 3,
    label: "Is there an Order Block or FVG?",
    hint: "Marked in Context Layers",
    module: "Context Layers",
  },
  {
    key: "q4_rb",
    number: 4,
    label: "Is there a Rejection Block?",
    hint: "Validated by the RB Validator",
    module: "RB Validator",
  },
  {
    key: "q5_ce",
    number: 5,
    label: "Is the CE (50%) marked?",
    hint: "Setup has a CE price computed",
    module: "Setup Planner",
  },
  {
    key: "q6_mss",
    number: 6,
    label: "Has a Market Structure Shift occurred?",
    hint: "Structure has shifted in your direction",
    module: "MSS / Trend Analyzer",
  },
  {
    key: "q7_ema50",
    number: 7,
    label: "Is the EMA 50 aligned?",
    hint: "Bullish: price above or at EMA. Bearish: price below or at EMA",
    module: "Setup Step 1",
  },
  {
    key: "q8_tf_aligned",
    number: 8,
    label: "Is the timeframe aligned?",
    hint: "Confluence Analyzer score ≥ 65",
    module: "Confluence Analyzer",
  },
  {
    key: "q9_rr_ok",
    number: 9,
    label: "Is the RR at least 1:2?",
    hint: "Entry Calculator shows RR ≥ 1:2",
    module: "Entry Calculator",
  },
  {
    key: "q10_calm",
    number: 10,
    label: "Am I calm and disciplined?",
    hint: "Emotional section of Mindset Ritual is fully checked",
    module: "Mindset Ritual",
  },
];

export function computeScore(answers) {
  return INTEGRATED_QUESTIONS.filter((q) => answers[q.key]).length;
}

export function getVerdict(score) {
  if (score >= 9)
    return {
      key: "extreme",
      label: "Extreme Confluence",
      emoji: "🏆",
      color: "bg-green-950/50 border-green-600 text-green-200",
      badge: "bg-green-900/40 text-green-300",
      description:
        "Full alignment across SMC + ICT + CRT. Highest-probability setup.",
      pass: true,
    };
  if (score >= 7)
    return {
      key: "high",
      label: "High Probability",
      emoji: "✅",
      color: "bg-green-950/40 border-green-700 text-green-200",
      badge: "bg-green-900/40 text-green-300",
      description: "Strong alignment. Trade is valid.",
      pass: true,
    };
  if (score >= 5)
    return {
      key: "medium",
      label: "Medium — Wait",
      emoji: "⚠️",
      color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
      badge: "bg-yellow-900/40 text-yellow-300",
      description:
        "Partial alignment. Wait for one more confirmation before entering.",
      pass: false,
    };
  return {
    key: "low",
    label: "Low — Skip",
    emoji: "🔴",
    color: "bg-red-950/40 border-red-700 text-red-200",
    badge: "bg-red-900/40 text-red-300",
    description: "Too many boxes unchecked. Not a valid setup.",
    pass: false,
  };
}

export const PASS_THRESHOLD = 7;