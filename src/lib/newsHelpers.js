// High-impact currencies that move your pairs
export const HIGH_IMPACT_CURRENCIES = ["USD", "EUR", "GBP", "JPY"];

// Minutes before an event to warn
export const PRE_NEWS_WINDOW_MINUTES = 30;
export const POST_NEWS_WINDOW_MINUTES = 60;

export function isWithinNewsWindow(event, now = new Date()) {
  const eventTime = new Date(event.scheduled_at);
  const diffMinutes = (eventTime - now) / 60000;

  // 30 min before OR 60 min after
  return diffMinutes >= -POST_NEWS_WINDOW_MINUTES && diffMinutes <= PRE_NEWS_WINDOW_MINUTES;
}

export function formatEventTime(dateString) {
  const d = new Date(dateString);
  return d.toLocaleString("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });
}

export function timeUntilEvent(dateString) {
  const diff = new Date(dateString) - new Date();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `in ${days}d ${hours % 24}h`;
  if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `in ${minutes}m`;
  if (minutes > -60) return "LIVE NOW";
  return "passed";
}

export function impactColor(impact) {
  const map = {
    high: "bg-red-900/40 text-red-300 border-red-700",
    medium: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
    low: "bg-gray-800 text-gray-300 border-gray-700",
  };
  return map[impact] || map.low;
}