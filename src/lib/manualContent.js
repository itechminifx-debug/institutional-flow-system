// ============================================================
// MANUAL CONTENT — Institutional Flow System
// Complete Operating Manual
// ============================================================
// This file holds the structure and content of every chapter.
// Chapters are filled in stages as content is written.
// ============================================================

export const MANUAL_PARTS = [
  {
    key: "part1",
    number: 1,
    title: "Foundations — Why This System Exists",
    chapters: [
      {
        key: "ch1",
        number: 1,
        title: "What is the Institutional Flow System",
      },
      {
        key: "ch2",
        number: 2,
        title: "Retail vs. Institutions",
      },
      {
        key: "ch3",
        number: 3,
        title: "The Three Laws",
      },
      {
        key: "ch4",
        number: 4,
        title: "The Golden Rule",
      },
    ],
  },
  {
    key: "part2",
    number: 2,
    title: "Chart Reading — What to Look For",
    chapters: [
      {
        key: "ch5",
        number: 5,
        title: "Reading Footprints, Not Patterns",
      },
      {
        key: "ch6",
        number: 6,
        title: "Liquidity — The Fuel",
      },
      {
        key: "ch7",
        number: 7,
        title: "Structure Blocks",
      },
      {
        key: "ch8",
        number: 8,
        title: "Block Breakers",
      },
      {
        key: "ch9",
        number: 9,
        title: "Flip Zones & Rejection Blocks",
      },
      {
        key: "ch10",
        number: 10,
        title: "Fair Value Gaps (FVG)",
      },
      {
        key: "ch11",
        number: 11,
        title: "Order Blocks",
      },
      {
        key: "ch12",
        number: 12,
        title: "Consequent Encroachment (CE)",
      },
      {
        key: "ch13",
        number: 13,
        title: "Timeframe Alignment",
      },
      {
        key: "ch14",
        number: 14,
        title: "EMA 50 Confluence",
      },
      {
        key: "ch15",
        number: 15,
        title: "The Battlefield",
      },
    ],
  },
  {
    key: "part3",
    number: 3,
    title: "The System in the App — How to Use",
    chapters: [
      { key: "ch16", number: 16, title: "Daily Routine" },
      { key: "ch17", number: 17, title: "The Mindset Ritual" },
      { key: "ch18", number: 18, title: "The Chart Checklist" },
      { key: "ch19", number: 19, title: "The Trend Analyzer" },
      { key: "ch20", number: 20, title: "The Confluence Analyzer" },
      { key: "ch21", number: 21, title: "The RB Validator" },
      { key: "ch22", number: 22, title: "The Setup Planner" },
      { key: "ch23", number: 23, title: "The RB Quality Score" },
      { key: "ch24", number: 24, title: "The Sweep Confluence" },
      { key: "ch25", number: 25, title: "The Trade Checklist" },
      { key: "ch26", number: 26, title: "The Entry Calculator" },
      { key: "ch27", number: 27, title: "The CE Entry" },
      { key: "ch28", number: 28, title: "The CE Flip Tracker" },
      { key: "ch29", number: 29, title: "The Journal" },
      { key: "ch30", number: 30, title: "The Stats" },
      { key: "ch31", number: 31, title: "The Weekly Review" },
      { key: "ch32", number: 32, title: "The Trading Plan" },
    ],
  },
  {
    key: "part4",
    number: 4,
    title: "Chart Identification — Where to Find Elements",
    chapters: [
      { key: "ch33", number: 33, title: "Finding a Swing High" },
      { key: "ch34", number: 34, title: "Finding a Swing Low" },
      { key: "ch35", number: 35, title: "Identifying a Rejection Block" },
      { key: "ch36", number: 36, title: "Measuring Wick-to-Body Ratio" },
      { key: "ch37", number: 37, title: "Reading ATR from MT5" },
      { key: "ch38", number: 38, title: "Calculating Displacement" },
      { key: "ch39", number: 39, title: "Finding the CE" },
      { key: "ch40", number: 40, title: "Spotting a Sweep" },
    ],
  },
  {
    key: "part5",
    number: 5,
    title: "Worked Examples",
    chapters: [
      { key: "ch41", number: 41, title: "Valid RFZ — Bearish Rejection" },
      { key: "ch42", number: 42, title: "Valid SFZ — Bullish Rejection" },
      { key: "ch43", number: 43, title: "Invalid RB — Reversal Pattern" },
      { key: "ch44", number: 44, title: "RB + Sweep Confluence" },
      { key: "ch45", number: 45, title: "CE Shot Entry" },
      { key: "ch46", number: 46, title: "CE Flip — Second Trade" },
      { key: "ch47", number: 47, title: "News Avoidance" },
      { key: "ch48", number: 48, title: "Trap Detection" },
    ],
  },
  {
    key: "part6",
    number: 6,
    title: "Discipline & Mindset",
    chapters: [
      { key: "ch49", number: 49, title: "The 10 Golden Rules" },
      { key: "ch50", number: 50, title: "Common Mistakes" },
      { key: "ch51", number: 51, title: "Building Discipline" },
      { key: "ch52", number: 52, title: "Scaling Your Account" },
      { key: "ch53", number: 53, title: "Withdrawing Profits" },
    ],
  },
  {
    key: "part7",
    number: 7,
    title: "Reference",
    chapters: [
      { key: "ch54", number: 54, title: "Glossary of Terms" },
      { key: "ch55", number: 55, title: "The Complete Rulebook" },
      { key: "ch56", number: 56, title: "Daily Checklist" },
      { key: "ch57", number: 57, title: "Weekly Checklist" },
      { key: "ch58", number: 58, title: "Monthly Checklist" },
    ],
  },
];

// ============================================================
// CHAPTER CONTENT
// ============================================================
// Each chapter's content lives here.
// Empty chapters show "Content coming soon."
// Fill in one chapter at a time across manual-building stages.
// ============================================================

export const MANUAL_CONTENT = {
  ch1: {
    title: "What is the Institutional Flow System",
    content: `
## What is the Institutional Flow System

The Institutional Flow System is not a strategy. It is a framework for reading the market the way institutions move it.

**One truth:** Price does not move randomly. It moves to fill orders. And institutions leave footprints behind.

This manual will teach you to read those footprints — not to follow the crowd, but to follow the flow.

### Why This System Exists

Most retail traders lose money because they trade *against* the market's design. They:

- Enter at obvious levels where stops cluster
- Chase price after moves have already happened
- Ignore where liquidity actually sits
- Confuse their emotions with the market's direction

Institutions do the opposite. They:

- **Hunt liquidity** — pushing price into areas where retail stops sit
- **Fill orders gradually** — never all at once
- **Leave footprints** — wicks, bodies, zones that tell you what they did
- **Then move price** — in the real direction, after the trap

### What You Will Learn

This system teaches you to:

1. **Read structure** — understand where institutions are building positions
2. **Identify liquidity** — see where stops are resting, and where they will be hunted
3. **Confirm rejection** — know exactly when a level is being defended
4. **Enter precisely** — use Consequent Encroachment (CE) to enter at the exact 50% midpoint
5. **Trade with confirmation** — never before
6. **Manage risk** — size, stop, target, all based on your account
7. **Journal and review** — build real data to improve your edge

### The Core Principle

> You are not trading price. You are trading **institutional intent**. Read the footprints — follow the flow.

The market is not random. It is engineered. Once you see the engineering, you cannot unsee it.

---

*Continue to Chapter 2 — Retail vs. Institutions →*
    `,
  },
};

// Helper: flatten all chapters into a single list for navigation
export function getAllChapters() {
  const flat = [];
  MANUAL_PARTS.forEach((part) => {
    part.chapters.forEach((chapter) => {
      flat.push({
        ...chapter,
        partNumber: part.number,
        partTitle: part.title,
      });
    });
  });
  return flat;
}

// Helper: get chapter by key
export function getChapter(key) {
  for (const part of MANUAL_PARTS) {
    const found = part.chapters.find((c) => c.key === key);
    if (found) {
      return {
        ...found,
        partNumber: part.number,
        partTitle: part.title,
        content: MANUAL_CONTENT[key]?.content || null,
      };
    }
  }
  return null;
}

// Helper: find previous and next chapters
export function getNavigation(key) {
  const all = getAllChapters();
  const idx = all.findIndex((c) => c.key === key);
  return {
    prev: idx > 0 ? all[idx - 1] : null,
    next: idx < all.length - 1 ? all[idx + 1] : null,
  };
}