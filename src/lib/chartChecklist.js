// ============================================================
// CHART CHECKLIST — Institutional Flow System
// Pre-session chart reading walkthrough
// ============================================================

export const CHART_PHASES = [
  {
    key: "phase1",
    number: 1,
    title: "Prepare the Chart",
    color: "bg-gray-800 text-gray-300",
    items: [
      "Correct pair is selected (Vol 80 or XAUUSD)",
      "Timeframe is set (start on D1)",
      "Chart is clean — only EMA 50 visible",
      "MT5 bridge is running",
      "Cloudflare tunnel is active",
    ],
  },
  {
    key: "phase2",
    number: 2,
    title: "Read the D1 Direction",
    color: "bg-blue-900/40 text-blue-300",
    items: [
      "D1 trend identified — higher highs + higher lows? Or lower?",
      "EMA 50 position checked (above/below price)",
      "D1 + H4 + H1 agree on direction (Confluence Analyzer)",
      "Market Structure Shift checked (recent reversal?)",
    ],
  },
  {
    key: "phase3",
    number: 3,
    title: "Find the Liquidity",
    color: "bg-purple-900/40 text-purple-300",
    items: [
      "Unmitigated highs/lows marked",
      "Equal highs/lows identified",
      "Round numbers noted",
      "Session extremes noted (Asian / London / NY)",
      "Nearest liquidity pool identified",
    ],
  },
  {
    key: "phase4",
    number: 4,
    title: "Identify Structure Blocks",
    color: "bg-orange-900/40 text-orange-300",
    items: [
      "Structure Block above current price",
      "Structure Block below current price",
      "Block Breaker present (level broken)",
      "Twice-blocked level checked",
    ],
  },
  {
    key: "phase5",
    number: 5,
    title: "Find the Rejection Block",
    color: "bg-red-900/40 text-red-300",
    items: [
      "Sweep occurred (current candle exceeded swing)",
      "Current candle made the wick (not the previous one)",
      "Wick-to-body ratio ≥ 2× (3× strong, 5× exceptional)",
      "Close back inside the previous range",
      "Displacement ≥ 0.6× ATR",
      "Validated with the RB Validator tool",
    ],
  },
  {
    key: "phase6",
    number: 6,
    title: "Find the FVG",
    color: "bg-green-900/40 text-green-300",
    items: [
      "3-candle imbalance visible",
      "Direction identified (bullish or bearish)",
      "Mitigation checked (already filled or not)",
      "FVG aligns with RB",
    ],
  },
  {
    key: "phase7",
    number: 7,
    title: "Identify the Order Block",
    color: "bg-teal-900/40 text-teal-300",
    items: [
      "Last opposing candle before strong move identified",
      "Fresh or used checked",
      "Aligns with FVG (confluence)",
    ],
  },
  {
    key: "phase8",
    number: 8,
    title: "Check the Battlefield",
    color: "bg-yellow-900/40 text-yellow-300",
    items: [
      "Distance to next key level measured",
      "Compression checked (narrow = prepare)",
    ],
  },
  {
    key: "phase9",
    number: 9,
    title: "Traps & Timing",
    color: "bg-pink-900/40 text-pink-300",
    items: [
      "Not within 30 min of session open (Judas Swing risk)",
      "No obvious false breakout forming",
      "No stop hunt setting up",
    ],
  },
  {
    key: "phase10",
    number: 10,
    title: "News Check",
    color: "bg-indigo-900/40 text-indigo-300",
    items: [
      "No high-impact news within 30 min",
      "No news within 60 min after release",
      "Manual news lock set if needed",
    ],
  },
];

export function phaseTotalItems(phase) {
  return phase.items.length;
}

export function totalChecklistItems() {
  return CHART_PHASES.reduce((sum, p) => sum + p.items.length, 0);
}