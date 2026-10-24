// ============================================================
// THE RESEARCH DECKS — Shared helpers
// ============================================================

export const DECK_CATEGORIES = [
  { key: "general", label: "General Research", emoji: "🧠", accent: "gray" },
  { key: "sld",     label: "SLD System",        emoji: "🎯", accent: "emerald" },
  { key: "smc",     label: "SMC System",        emoji: "🏛️", accent: "orange" },
  { key: "lqe",     label: "LQE System",        emoji: "⚙️", accent: "orange" },
  { key: "fwt",     label: "FWT System",        emoji: "🕯️", accent: "teal" },
  { key: "ads",     label: "ADS System",        emoji: "👑", accent: "amber" },
  { key: "ams",     label: "AMS System",        emoji: "👑", accent: "red" },
  { key: "amd",     label: "AMD System",        emoji: "🔄", accent: "blue" },
  { key: "book",    label: "Book Notes",        emoji: "📖", accent: "purple" },
];

export const DECK_TEMPLATES = [
  {
    key: "backtest",
    label: "Backtest Finding",
    emoji: "🧪",
    hint: "Document a tested setup and its outcome",
    content: `# Backtest — [Setup Name]

## Setup
- **System:**
- **Pair:**
- **Timeframe:**
- **Scenario:**
- **Date tested:**

## What happened

## Screenshots

## Lesson
What did this teach me? Would I take it again?
`,
  },
  {
    key: "doctrine",
    label: "Doctrine Insight",
    emoji: "📚",
    hint: "Quote a doctrine section and interpret it",
    content: `# Doctrine Insight — [Topic]

## Source
- **System:**
- **Chapter / Section:**

## The Quote
> 

## What it means
What is the doctrine actually saying?

## How it applies to my trading
How does this change what I do?
`,
  },
  {
    key: "comparison",
    label: "System Comparison",
    emoji: "⚖️",
    hint: "Compare two systems or two approaches",
    content: `# Comparison — [System A] vs [System B]

## System A
- **Core idea:**
- **Strength:**
- **Weakness:**

## System B
- **Core idea:**
- **Strength:**
- **Weakness:**

## When to use A

## When to use B

## Verdict
`,
  },
  {
    key: "review",
    label: "Trade Review",
    emoji: "🔍",
    hint: "Review a specific trade — win or loss",
    content: `# Trade Review — [Pair / Date]

## The Setup
- **System:**
- **Scenario:**
- **Bias:**

## What I saw

## What I did

## Outcome

## What I learned
Would I take this trade again? What would I change?
`,
  },
  {
    key: "quote",
    label: "Quote Capture",
    emoji: "💭",
    hint: "A doctrine quote worth remembering",
    content: `# Quote

> 

— **Source:**

## Why this matters to me

`,
  },
  {
    key: "blank",
    label: "Blank Deck",
    emoji: "📝",
    hint: "Start fresh with no template",
    content: "",
  },
];

export function getCategoryInfo(key) {
  return DECK_CATEGORIES.find(c => c.key === key) || DECK_CATEGORIES[0];
}

export function getTemplateInfo(key) {
  return DECK_TEMPLATES.find(t => t.key === key) || null;
}

// ============================================================
// Setup linking helpers
// ============================================================
export const SETUP_TABLES = [
  { key: "sld_setups", label: "SLD",  emoji: "🎯", systemHref: "/sld" },
  { key: "smc_setups", label: "SMC",  emoji: "🏛️", systemHref: "/smc" },
  { key: "lqe_setups", label: "LQE",  emoji: "⚙️", systemHref: "/lqe" },
  { key: "fwt_setups", label: "FWT",  emoji: "🕯️", systemHref: "/fwt" },
  { key: "ads_setups", label: "ADS",  emoji: "👑", systemHref: "/ads" },
  { key: "ams_setups", label: "AMS",  emoji: "👑", systemHref: "/ams" },
];

export function getSetupTableInfo(table) {
  return SETUP_TABLES.find(t => t.key === table) || null;
}

export function setupHref(table, id) {
  if (!table || !id) return null;
  const info = getSetupTableInfo(table);
  if (!info) return null;
  return `${info.systemHref}/${id}`;
}

// ============================================================
// Tags — normalize, merge, search
// ============================================================
export function normalizeTags(rawTags) {
  if (!rawTags) return [];
  return rawTags
    .map(t => t.trim().replace(/^#/, "").toLowerCase())
    .filter(Boolean)
    .filter((t, i, arr) => arr.indexOf(t) === i); // dedupe
}

export function parseTagsFromInput(input) {
  if (!input) return [];
  return normalizeTags(input.split(/[,\s]+/).filter(Boolean));
}

export function formatTagsForInput(tags) {
  if (!tags || tags.length === 0) return "";
  return tags.map(t => `#${t}`).join(" ");
}

// ============================================================
// Search / filtering
// ============================================================
export function matchDeck(deck, { search, category, status, tag, pinned }) {
  if (category && category !== "all" && deck.category !== category) return false;
  if (status && status !== "all" && deck.status !== status) return false;
  if (pinned && !deck.is_pinned) return false;
  if (tag && (!deck.tags || !deck.tags.includes(tag))) return false;

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    const hay = [
      deck.title || "",
      deck.content || "",
      (deck.tags || []).join(" "),
      deck.category || "",
      deck.linked_setup_label || "",
    ].join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

// ============================================================
// Daily deck helpers
// ============================================================
export function todayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dailyDeckTitle(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function dailyDeckTemplate(dateStr) {
  const title = dailyDeckTitle(dateStr);
  return `# ${title} — Daily Deck

## Morning intent
What am I watching today?

## Setups taken

## Observations

## Doctrine reminders
- Commandment #1: Never trade a BOS breakout.
- Commandment #10: No DOL, no trade.

## Reflection
`;
}

// ============================================================
// Version helpers — trim to last 10 client-side
// ============================================================
export const MAX_VERSIONS = 10;

export function trimVersions(versions) {
  if (!versions || versions.length <= MAX_VERSIONS) return versions || [];
  return versions.slice(0, MAX_VERSIONS);
}

// ============================================================
// Date formatting
// ============================================================
export function relativeTime(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

export function shortDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}