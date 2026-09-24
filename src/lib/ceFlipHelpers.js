// ============================================================
// CE FLIP TRACKER HELPERS
// Tracks a Consequent Encroachment line through its lifecycle
// ============================================================

export const CE_STATES = [
  {
    key: "fresh",
    label: "Fresh",
    emoji: "⚪",
    color: "bg-gray-900 border-gray-700 text-gray-300",
    badge: "bg-gray-800 text-gray-300",
    description: "CE formed — no touch yet",
  },
  {
    key: "tapped",
    label: "Tapped",
    emoji: "🟡",
    color: "bg-yellow-950/40 border-yellow-700 text-yellow-200",
    badge: "bg-yellow-900/40 text-yellow-300",
    description: "Price tapped CE — waiting for reaction",
  },
  {
    key: "held",
    label: "Held",
    emoji: "🟢",
    color: "bg-green-950/40 border-green-700 text-green-200",
    badge: "bg-green-900/40 text-green-300",
    description: "CE held — original direction confirmed",
  },
  {
    key: "flipped",
    label: "Flipped",
    emoji: "🔴",
    color: "bg-red-950/40 border-red-700 text-red-200",
    badge: "bg-red-900/40 text-red-300",
    description: "CE flipped — opposite role now active",
  },
  {
    key: "retested",
    label: "Retested",
    emoji: "🟠",
    color: "bg-orange-950/40 border-orange-700 text-orange-200",
    badge: "bg-orange-900/40 text-orange-300",
    description: "Price returned to flipped CE — flip trade ready",
  },
  {
    key: "dead",
    label: "Dead",
    emoji: "⚫",
    color: "bg-gray-950 border-gray-900 text-gray-600",
    badge: "bg-gray-900 text-gray-500",
    description: "CE no longer relevant",
  },
];

export function ceStateInfo(key) {
  return CE_STATES.find((s) => s.key === key) || CE_STATES[0];
}

// Does the flipped CE become a BUY or SELL?
// - Original bullish (support) + flipped → SELL at resistance
// - Original bearish (resistance) + flipped → BUY at support
export function getFlipDirection(originalDirection) {
  return originalDirection === "bullish" ? "sell" : "buy";
}

export function flipTradeLabel(originalDirection) {
  const flipDir = getFlipDirection(originalDirection);
  return flipDir === "sell"
    ? "🔴 Flip Trade — SELL at flipped resistance"
    : "🟢 Flip Trade — BUY at flipped support";
}

// Compute close-beyond check for flip
// For a bullish CE at 20450.50, flip = close below 20450.50
// For a bearish CE at 20450.50, flip = close above 20450.50
export function isFlipped(originalDirection, closePrice, cePrice) {
  if (!closePrice || !cePrice) return false;
  const ce = parseFloat(cePrice);
  const c = parseFloat(closePrice);
  if (isNaN(ce) || isNaN(c)) return false;

  if (originalDirection === "bullish") {
    return c < ce;
  }
  return c > ce;
}

// State transitions helper
export function nextState(currentState, action) {
  const map = {
    fresh: { tap: "tapped", flip: "flipped", dead: "dead" },
    tapped: { hold: "held", flip: "flipped", dead: "dead" },
    held: { retest: "retested", flip: "flipped", dead: "dead" },
    flipped: { retest: "retested", dead: "dead" },
    retested: { dead: "dead" },
    dead: {},
  };
  return map[currentState]?.[action] || currentState;
}