export const PAIRS = [
  "Volatility 80",
  "Volatility 75",
  "Volatility 100",
  "Volatility 50",
  "Volatility 25",
  "XAUUSD",
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "GBPJPY",
];

export function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}