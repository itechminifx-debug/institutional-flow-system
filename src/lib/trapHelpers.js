// ============================================================
// TRAP HELPERS — Institutional Flow System
// ============================================================

export const TRAP_TYPES = [
  {
    key: "false_breakout",
    label: "False Breakout",
    emoji: "🚨",
    color: "bg-red-900/40 text-red-300",
    description:
      "Price breaks a level — retail chases — then reverses. Liquidity collected.",
    bias: "reversal",
    retailAction: "Chases the breakout",
    smartAction: "Fades the breakout",
  },
  {
    key: "stop_hunt",
    label: "Stop Hunt",
    emoji: "🎯",
    color: "bg-orange-900/40 text-orange-300",
    description:
      "Price pushes into obvious stops — triggers them — then reverses.",
    bias: "reversal",
    retailAction: "Gets stopped out",
    smartAction: "Enters after the sweep",
  },
  {
    key: "judas_swing",
    label: "Judas Swing",
    emoji: "🌅",
    color: "bg-yellow-900/40 text-yellow-300",
    description:
      "A false move at session open — traps early traders before the real direction.",
    bias: "reversal",
    retailAction: "Enters the first move",
    smartAction: "Waits for the reversal",
  },
  {
    key: "wick_sweep",
    label: "Wick Sweep",
    emoji: "🔥",
    color: "bg-purple-900/40 text-purple-300",
    description:
      "A long wick sweeps liquidity at a key level — retail panics — then trend continues.",
    bias: "continuation",
    retailAction: "Panics out of position",
    smartAction: "Holds — the trend continues",
  },
];

export function trapInfo(key) {
  return TRAP_TYPES.find((t) => t.key === key) || null;
}

export function trapStatusColor(status) {
  const map = {
    watching: "bg-yellow-900/40 text-yellow-300",
    confirmed: "bg-green-900/40 text-green-300",
    failed: "bg-red-900/40 text-red-300",
  };
  return map[status] || "bg-gray-800 text-gray-300";
}

// Session windows (for Judas Swing detection)
export const SESSION_OPENS = [
  { session: "Asian", utcHour: 23, duration: 30 },
  { session: "London", utcHour: 7, duration: 30 },
  { session: "New York", utcHour: 13, duration: 30 },
];

// Are we within a session open window? (first 30 min)
export function isSessionOpen() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();

  for (const s of SESSION_OPENS) {
    const diff = utcHour - s.utcHour;
    if (diff === 0 && utcMinute < s.duration) {
      return { active: true, session: s.session };
    }
    // Handle midnight wrap
    if (s.utcHour === 23 && utcHour === 0 && utcMinute < s.duration) {
      return { active: true, session: s.session };
    }
  }

  return { active: false, session: null };
}

// Count traps by status
export function trapStats(traps) {
  const watching = traps.filter((t) => t.status === "watching").length;
  const confirmed = traps.filter((t) => t.status === "confirmed").length;
  const failed = traps.filter((t) => t.status === "failed").length;
  return { watching, confirmed, failed, total: traps.length };
}