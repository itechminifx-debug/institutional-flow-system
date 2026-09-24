// Format a number for display
// < 1000 → "123.45"
// < 100,000 → "12,345.67"
// < 1,000,000 → "123,456.78"
// >= 1,000,000 → "2.31M"
export function formatPrice(num, decimals = 2) {
  if (num == null || isNaN(num)) return "—";

  const n = parseFloat(num);
  const abs = Math.abs(n);

  if (abs >= 1_000_000) {
    return (n / 1_000_000).toFixed(2) + "M";
  }
  if (abs >= 100_000) {
    return n.toLocaleString("en-US", {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    });
  }
  return n.toFixed(decimals);
}

// Full precision version (for copy/paste into setups)
export function fullPrice(num, decimals = 2) {
  if (num == null || isNaN(num)) return "";
  return parseFloat(num).toFixed(decimals);
}