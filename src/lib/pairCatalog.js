// ============================================================
// PAIR CATALOG — Institutional Flow System
// ============================================================
// Complete instrument list organized by category.
// Favorites appear first for quick selection.
// ============================================================

export const FAVORITES = ["XAUUSD", "Volatility 80"];

export const PAIR_CATEGORIES = [
  {
    key: "synthetics",
    label: "Synthetics",
    emoji: "🎯",
    pairs: [
      // Headway — user's broker
      "Volatility 80",
      // Deriv — reference feeds
      "Volatility 10",
      "Volatility 25",
      "Volatility 50",
      "Volatility 75",
      "Volatility 100",
      "Volatility 10 (1s)",
      "Volatility 25 (1s)",
      "Volatility 50 (1s)",
      "Volatility 75 (1s)",
      "Volatility 100 (1s)",
      "Boom 500",
      "Boom 1000",
      "Crash 500",
      "Crash 1000",
      "Step Index",
      "Step Index 200",
      "Step Index 300",
      "Jump 10",
      "Jump 25",
      "Jump 50",
      "Jump 75",
      "Jump 100",
      "Range Break 100",
      "Range Break 200",
      "Bull Market Index",
      "Bear Market Index",
    ],
  },
  {
    key: "metals",
    label: "Metals",
    emoji: "💰",
    pairs: [
      "XAUUSD",
      "XAGUSD",
      "XPTUSD",
      "XPDUSD",
      "XCUUSD",
      "XAU/EUR",
      "XAU/GBP",
      "XAU/JPY",
      "XAU/AUD",
      "XAG/EUR",
      "XAG/GBP",
      "XAG/AUD",
    ],
  },
  {
    key: "forex_majors",
    label: "Forex Majors",
    emoji: "💱",
    pairs: [
      "EURUSD",
      "GBPUSD",
      "USDJPY",
      "USDCHF",
      "AUDUSD",
      "USDCAD",
      "NZDUSD",
    ],
  },
  {
    key: "forex_crosses",
    label: "Forex Crosses",
    emoji: "💱",
    pairs: [
      "EURGBP",
      "EURJPY",
      "EURCHF",
      "EURAUD",
      "GBPJPY",
      "GBPAUD",
    ],
  },
  {
    key: "forex_exotics",
    label: "Forex Exotics",
    emoji: "💱",
    pairs: [
      "USDTRY",
      "USDZAR",
      "USDSGD",
      "USDHKD",
      "EURTRY",
      "USDRUB",
      "USDBRL",
      "USDNOK",
    ],
  },
  {
    key: "energy",
    label: "Energy",
    emoji: "🛢️",
    pairs: [
      "WTIUSD",
      "BRENTUSD",
      "NGUSD",
      "GASUSD",
      "HOUSD",
    ],
  },
  {
    key: "agriculture",
    label: "Agriculture",
    emoji: "🌾",
    pairs: [
      "WHEATUSD",
      "CORNUSD",
      "SOYBEANSUSD",
      "OATSUSD",
      "RICEUSD",
      "COFFEEUSD",
      "SUGARUSD",
      "COCOAUSD",
      "COTTONUSD",
      "LUMBERUSD",
      "ORANGEJUICEUSD",
      "LCUSD",
      "FCUSD",
      "LHUSD",
    ],
  },
  {
    key: "crypto",
    label: "Crypto",
    emoji: "₿",
    pairs: [
      "BTCUSD",
      "ETHUSD",
      "SOLUSD",
      "XRPUSD",
      "ADAUSD",
      "BNBUSD",
      "DOGEUSD",
      "LINKUSD",
      "NEARUSD",
      "SUIUSD",
      "BTC/EUR",
      "ETH/GBP",
      "ETH/BTC",
      "SOL/BTC",
      "XRP/BTC",
      "SOL/ETH",
      "ADA/BTC",
      "LINK/ETH",
      "BTCUSDT",
      "ETHUSDT",
      "SOLUSDT",
      "XRPUSDT",
      "DOGEUSDT",
      "BNBUSDT",
      "NEARUSDT",
      "SUIUSDT",
    ],
  },
  {
    key: "indices",
    label: "Indices",
    emoji: "📊",
    pairs: [
      "US30",
      "US500",
      "US100",
      "UK100",
      "GER40",
      "JP225",
      "HK50",
      "AUS200",
    ],
  },
];

// Flat list of every pair (used for validation and legacy code)
export const ALL_PAIRS = (() => {
  const flat = new Set();
  FAVORITES.forEach((p) => flat.add(p));
  PAIR_CATEGORIES.forEach((cat) => {
    cat.pairs.forEach((p) => flat.add(p));
  });
  return Array.from(flat);
})();

// Get category by key
export function categoryInfo(key) {
  return PAIR_CATEGORIES.find((c) => c.key === key) || null;
}

// Search across all pairs
export function searchPairs(query) {
  if (!query) return [];
  const q = query.toLowerCase().trim();
  return ALL_PAIRS.filter((p) => p.toLowerCase().includes(q)).slice(0, 20);
}