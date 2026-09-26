// ============================================================
// KILLZONE HELPERS — Institutional Flow System
// ============================================================
// Killzones (UTC):
//   London      07:00 - 10:00
//   New York    12:00 - 15:00
//   Overlap     12:00 - 15:00 (London + NY both active)
//   Asian       23:00 - 07:00
//   Outside     all other times
// ============================================================

export const KILLZONES = [
  {
    key: "london",
    label: "London",
    emoji: "🇬🇧",
    startUTC: 7,
    endUTC: 10,
    color: "bg-blue-900/40 text-blue-300",
    badge: "bg-blue-900/40 text-blue-300",
    description: "London session — European institutions active",
    quality: "high",
  },
  {
    key: "new_york",
    label: "New York",
    emoji: "🇺🇸",
    startUTC: 12,
    endUTC: 15,
    color: "bg-green-900/40 text-green-300",
    badge: "bg-green-900/40 text-green-300",
    description: "New York session — US institutions active",
    quality: "high",
  },
  {
    key: "overlap",
    label: "London-NY Overlap",
    emoji: "🔥",
    startUTC: 12,
    endUTC: 15,
    color: "bg-orange-900/40 text-orange-300",
    badge: "bg-orange-900/40 text-orange-300",
    description: "London + NY overlap — highest liquidity of the day",
    quality: "extreme",
  },
  {
    key: "asian",
    label: "Asian",
    emoji: "🌏",
    startUTC: 23,
    endUTC: 7,
    color: "bg-purple-900/40 text-purple-300",
    badge: "bg-purple-900/40 text-purple-300",
    description: "Asian session — accumulation / range",
    quality: "low",
  },
  {
    key: "outside",
    label: "Outside Killzone",
    emoji: "⚫",
    startUTC: null,
    endUTC: null,
    color: "bg-gray-900 text-gray-500",
    badge: "bg-gray-800 text-gray-500",
    description: "No active killzone — avoid new trades",
    quality: "avoid",
  },
];

export function killzoneInfo(key) {
  return KILLZONES.find((k) => k.key === key) || KILLZONES[4];
}

// Get the current UTC hour (with decimal for minutes)
export function getCurrentUTCHour() {
  const now = new Date();
  return now.getUTCHours() + now.getUTCMinutes() / 60;
}

// Which killzone are we in right now?
export function getCurrentKillzone() {
  const utcHour = getCurrentUTCHour();

  // Asian: 23:00 - 07:00 (wraps midnight)
  if (utcHour >= 23 || utcHour < 7) {
    return KILLZONES[3]; // asian
  }

  // London: 07:00 - 10:00
  if (utcHour >= 7 && utcHour < 10) {
    return KILLZONES[0]; // london
  }

  // Overlap: 12:00 - 15:00 (London + NY both active)
  if (utcHour >= 12 && utcHour < 15) {
    return KILLZONES[2]; // overlap
  }

  // Outside
  return KILLZONES[4]; // outside
}

// Time until the next killzone opens (in minutes)
export function minutesUntilNextKillzone() {
  const utcHour = getCurrentUTCHour();

  // Killzone start hours
  const starts = [7, 12]; // London, NY overlap

  // Find the next start
  let nextStart = null;
  for (const s of starts) {
    const diff = s - utcHour;
    if (diff > 0) {
      nextStart = diff * 60;
      break;
    }
  }

  // If no start today, next is London tomorrow at 07:00
  if (nextStart === null) {
    nextStart = (7 + (24 - utcHour)) * 60;
  }

  return Math.round(nextStart);
}

// Format "in Xh Ym" or "in Xm"
export function formatTimeUntil(minutes) {
  if (minutes < 60) return `in ${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `in ${h}h ${m}m`;
}

// Is the current time a killzone (London, NY, Overlap)?
export function isKillzoneNow() {
  const kz = getCurrentKillzone();
  return kz.key === "london" || kz.key === "new_york" || kz.key === "overlap";
}

// Is this a Judas Swing window? (first 30 min of session open)
export function isJudasWindow() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();

  // London opens at 07:00, NY at 12:00 — first 30 min
  if ((utcHour === 7 || utcHour === 12) && utcMinute < 30) {
    return true;
  }
  return false;
}