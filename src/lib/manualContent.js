// ============================================================
// MANUAL CONTENT — Institutional Flow System
// Complete Operating Manual
// Stage 2: Parts 1 & 2 filled with full content
// ============================================================

export const MANUAL_PARTS = [
  {
    key: "part1",
    number: 1,
    title: "Foundations — Why This System Exists",
    chapters: [
      { key: "ch1", number: 1, title: "What is the Institutional Flow System" },
      { key: "ch2", number: 2, title: "Retail vs. Institutions" },
      { key: "ch3", number: 3, title: "The Three Laws" },
      { key: "ch4", number: 4, title: "The Golden Rule" },
    ],
  },
  {
    key: "part2",
    number: 2,
    title: "Chart Reading — What to Look For",
    chapters: [
      { key: "ch5", number: 5, title: "Reading Footprints, Not Patterns" },
      { key: "ch6", number: 6, title: "Liquidity — The Fuel" },
      { key: "ch7", number: 7, title: "Structure Blocks" },
      { key: "ch8", number: 8, title: "Block Breakers" },
      { key: "ch9", number: 9, title: "Flip Zones & Rejection Blocks" },
      { key: "ch10", number: 10, title: "Fair Value Gaps (FVG)" },
      { key: "ch11", number: 11, title: "Order Blocks" },
      { key: "ch12", number: 12, title: "Consequent Encroachment (CE)" },
      { key: "ch13", number: 13, title: "Timeframe Alignment" },
      { key: "ch14", number: 14, title: "EMA 50 Confluence" },
      { key: "ch15", number: 15, title: "The Battlefield" },
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
// CHAPTER CONTENT — STAGE 2 (Parts 1 & 2)
// ============================================================

export const MANUAL_CONTENT = {
  // ==========================================================
  // PART 1 — FOUNDATIONS
  // ==========================================================

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

### Who This System Is For

This system is for the trader who:

- Has already lost money trying to predict direction
- Wants to understand *why* price moves, not just *when*
- Is willing to wait for high-probability setups instead of chasing every move
- Believes discipline beats prediction
- Treats trading as a business, not a hobby

If that is you, this manual is your roadmap.

---

*Continue to Chapter 2 — Retail vs. Institutions →*
    `,
  },

  ch2: {
    title: "Retail vs. Institutions",
    content: `
## Retail vs. Institutions

The market is not one game. It is two games played on the same chart.

**Retail** plays one game. **Institutions** play another. They both use the same candles, but they see completely different things.

### How Retail Thinks

- "Where is price going?"
- "I hope this trade works."
- "I need to win this trade."
- "Let me chase the move."
- "The market is against me."

Retail treats the market as something to **predict**. They look for patterns, indicators, and signals that tell them what comes next.

### How Institutions Think

- "Where is liquidity resting?"
- "Where will retail stop out?"
- "I need to fill my orders."
- "Let me create the move."
- "The market is my tool."

Institutions treat the market as something to **engineer**. They do not predict price — they **create** the conditions for price to move.

### The Critical Difference

**Retail reacts. Institutions act.**

When price sweeps above a swing high, retail sees a breakout — and buys. Institutions see liquidity — and sell into it.

When price drops sharply, retail sees fear — and sells. Institutions see orders being filled — and buy.

**Everything retail sees as a signal, institutions see as a trap.**

### Why It Works This Way

Institutions cannot buy 10,000 lots at market price. There is not enough liquidity on the other side. So they must:

1. **Create liquidity** — by pushing price into a level where retail orders sit
2. **Fill their position** — using retail's stops as fuel
3. **Reverse the market** — once their orders are filled

This is why the market sweeps levels before moving. It is not random. It is engineering.

### What Retail Misses

Retail focuses on **direction**. Institutions focus on **liquidity**.

Retail asks: "Will price go up or down?"

Institutions ask: "Where are the stops? Where is the liquidity? Where will I get filled?"

**The direction becomes obvious once you know where the liquidity is.**

### How This Manual Changes You

By the end of this manual, you will:

- Stop asking "where is price going?"
- Start asking "where is liquidity resting?"
- See sweeps as signals, not breakouts
- See rejections as confirmations, not noise
- Trade **after** the trap, not before it

You will stop playing the retail game. You will start playing the institutional game.

### A Simple Test

Look at your last 10 losing trades. Ask yourself:

- Was I buying after a move up? Or selling after a move down?
- Was I entering at an obvious level?
- Did I enter before the move?

If yes, you were playing the retail game. **This manual will teach you to play the other one.**

---

*Continue to Chapter 3 — The Three Laws →*
    `,
  },

  ch3: {
    title: "The Three Laws",
    content: `
## The Three Laws

Everything in this system is built on three laws. If you understand them, you understand the market.

### Law 1 — Price Moves to Fill Orders

Price does not move because of news, sentiment, or indicators. Price moves because there are orders that need to be filled.

When a large institutional order exists, price is **pulled** toward it. The market is not random — it is a delivery mechanism for orders.

**Implication:** Every move on the chart has a purpose. Ask: *"Whose order is being filled right now?"*

### Law 2 — Liquidity Is the Fuel

Institutions cannot fill large orders without liquidity. Liquidity comes from:

- **Retail stop losses** — resting just above highs and below lows
- **Retail entries** — buy stops above breakouts, sell stops below breakdowns
- **Equal highs / equal lows** — double layers of orders
- **Round numbers** — psychological clusters of retail interest

**Institutions do not avoid these levels. They hunt them.**

**Implication:** Before any big move, price will sweep a liquidity pool. Every trade you take should answer: *"Which liquidity has already been swept?"*

### Law 3 — Structure Reveals Intent

Institutions leave behind footprints:

- **Wicks** — where they were rejected
- **Bodies** — where they moved with conviction
- **Zones** — where they built positions
- **Breaks** — where they took control

These footprints tell you what institutions have done and what they are likely to do next.

**Implication:** Your job is not to predict. Your job is to **read** what has already happened — and position yourself accordingly.

### How the Three Laws Work Together

- **Law 1** tells you *why* price moves (orders)
- **Law 2** tells you *what fuels* the move (liquidity)
- **Law 3** tells you *how to read* the move (structure)

Together, they form the foundation of every trade you will take in this system.

### The Practical Application

Before every trade, run these three questions:

1. **Law 1:** What order is being filled right now?
2. **Law 2:** Which liquidity has been swept?
3. **Law 3:** What structure confirms the move?

If you cannot answer all three, you do not have a trade. You have a guess.

### One Warning

These laws will change how you see the chart. You will stop seeing patterns and start seeing footprints. You will stop seeing noise and start seeing intent.

Once you see it, you cannot unsee it. That is the point.

---

*Continue to Chapter 4 — The Golden Rule →*
    `,
  },

  ch4: {
    title: "The Golden Rule",
    content: `
## The Golden Rule

Every system has a rule that sits above all others. For the Institutional Flow System, it is this:

> "The market will always be there. Your capital may not. Prepare your mind before you prepare your chart. A disciplined trader is a prepared trader."

This rule is on your dashboard. It is on your home screen. It is the first thing you see when you open the app.

It is not decoration. It is a **command**.

### Why It Matters

Most traders lose money not because their strategy is wrong, but because they are not ready to trade it.

They trade:

- When they are tired
- When they are angry
- When they are afraid
- When they are revenge-trading
- When they are chasing a move they missed

No strategy survives a broken trader.

### The Four Foundations

The Golden Rule has four layers:

1. **The market is patient** — it will be there tomorrow. It will be there next week.
2. **Capital is not patient** — it can be gone in one bad session.
3. **The mind leads the chart** — you must be prepared before you look at price.
4. **Discipline is preparation** — a disciplined trader is not a lucky trader; they are a prepared one.

### The Daily Practice

Before every session, ask:

- Have I prayed / meditated?
- Am I calm?
- Am I rested?
- Am I ready to follow the rules even when it hurts?

If any answer is no — **do not trade**.

### The Corollary

If you break the Golden Rule — you will break your system.

If you follow the Golden Rule — your system will protect you.

### A Promise and a Warning

**Promise:** If you prepare your mind before every session, you will trade better than 90% of retail traders. Not because you have a better strategy — but because you have a better state of mind.

**Warning:** If you skip preparation "just this once," you have already lost the session. The market will find your weak spot.

### The Golden Rule Applied

Whenever you:

- Feel like you must trade today
- Feel rushed
- Feel like you missed a move
- Feel like you need to "make it back"

**Stop. Close the app. Come back tomorrow.**

The market will still be there. Your capital might not.

---

*Continue to Part 2 — Chart Reading →*
    `,
  },

  // ==========================================================
  // PART 2 — CHART READING
  // ==========================================================

  ch5: {
    title: "Reading Footprints, Not Patterns",
    content: `
## Reading Footprints, Not Patterns

Most retail traders look for patterns: head and shoulders, triangles, double tops, engulfing candles. These patterns are taught everywhere.

**They also fail everywhere.**

Why? Because patterns describe what price **did**. They do not explain **why** it did it.

### The Shift

To trade with institutions, you must shift from **pattern recognition** to **footprint reading**.

- A pattern says: *"Price made a double top."*
- A footprint says: *"Price swept liquidity above the previous high, then rejected — sellers filled orders and moved price down."*

Same chart. Different reading. Different trade.

### What Footprints Look Like

Every meaningful move leaves footprints:

- **A long wick** — rejected at a level. Institutions defended.
- **A big body** — conviction. Institutions moved.
- **A gap** — imbalance. Orders could not be filled at the previous price.
- **A break** — control shift. The previous side lost.
- **A retest** — confirmation. The new side held.

These are the prints. Read them.

### The Retail Mistake

Retail reads *the pattern* and enters immediately.

Institutions read *the footprint* and wait for confirmation.

The pattern gives you a hypothesis. The footprint gives you a trade.

### How to Practice

For the next 20 charts you look at, ask:

- Where was the liquidity that got swept?
- Which candle swept it?
- Did the candle close back inside? Or push through?
- Was there displacement after?
- Was there a retest?

Do not look for patterns. Look for the sequence: **sweep → reject → displace → retest → enter**.

### The Shift That Changes Everything

When you stop looking for patterns and start reading footprints:

- You will see trades forming hours before others see them
- You will enter at better prices
- You will size correctly because you have a clear invalidation
- You will journal accurately because you understand *why* you entered

### The Footprints You Will Learn

Over the next 10 chapters, you will learn every footprint in the system:

- Liquidity (Chapter 6)
- Structure Blocks (Chapter 7)
- Block Breakers (Chapter 8)
- Flip Zones / Rejection Blocks (Chapter 9)
- Fair Value Gaps (Chapter 10)
- Order Blocks (Chapter 11)
- Consequent Encroachment (Chapter 12)
- Timeframe Alignment (Chapter 13)
- EMA 50 (Chapter 14)
- The Battlefield (Chapter 15)

By the end, you will read a chart like an institution.

---

*Continue to Chapter 6 — Liquidity →*
    `,
  },

  ch6: {
    title: "Liquidity — The Fuel",
    content: `
## Liquidity — The Fuel

Liquidity is where orders rest. It is the fuel that moves price.

Without liquidity, institutions cannot fill their orders. Without liquidity, price does not move. **Everything starts with liquidity.**

### Where Liquidity Lives

Liquidity clusters at predictable places:

1. **Above previous highs** — retail buy stops, breakout traders
2. **Below previous lows** — retail sell stops, panic sellers
3. **At equal highs / equal lows** — double layers of orders
4. **At round numbers** — 1000, 500, 100, 50 — psychological clusters
5. **At session extremes** — Asian, London, NY highs and lows
6. **Above / below obvious swing points** — the classic stop-hunt zones

Anywhere there is a cluster of retail orders, there is liquidity.

### Why It Matters

Institutions do not move price randomly. They move it **toward liquidity** — because that is where they can fill their orders.

When you see price move sharply in one direction, ask:

> "Which liquidity pool was just swept?"

If you can identify it, you can anticipate the next move.

### The Sweep

A **liquidity sweep** is when price briefly moves into a pool — triggering orders — then reverses.

**A sweep looks like:**
- A long wick beyond a previous high or low
- A close back inside the previous range
- Often followed by a strong move in the opposite direction

**A sweep means:** Institutions just filled their orders with retail's stops.

### How to Mark Liquidity

Before every session, mark:

- Recent swing highs and lows
- Equal highs and lows
- Round numbers nearby
- Session extremes (Asian / London / NY)

**These are the levels where the next move will likely start.**

### The Rule

**No sweep = no trade.**

If price reaches a key level without sweeping liquidity beyond it, the move is suspect. Institutions do not push price into a level without taking the liquidity first.

### How It Fits Your System

- **Setup Step 3 — Aligned Liquidity:** You mark the level being targeted
- **Sweep Confluence:** You confirm the sweep happened inside the RB zone
- **Liquidity Map:** You track levels before they are swept

### What to Watch For

- **Unmitigated highs / lows** — liquidity still resting, waiting to be swept
- **Mitigated highs / lows** — liquidity already taken, weaker signal
- **Equal highs / lows** — double liquidity, strong magnet
- **Round numbers** — retail clusters, always draw attention

### The Golden Rule of Liquidity

> "Liquidity is the fuel. The sweep is the trigger. The rejection is the confirmation. Trade the rejection, not the sweep."

---

*Continue to Chapter 7 — Structure Blocks →*
    `,
  },

  ch7: {
    title: "Structure Blocks",
    content: `
## Structure Blocks

A Structure Block is a zone where institutions built orders. It is where price paused — where buyers and sellers fought evenly, before one side took control.

**Think of it as a "resting place" on the chart — a pause before the next move.**

### How to Identify a Structure Block

A Structure Block forms when:

- Price makes a high or low
- Then pauses in a range
- Then breaks out of that range

The range is the Structure Block. It is a footprint of institutional interest.

**Visually:**
- A series of candles stuck in a tight range
- Then a candle breaks above or below that range

### Bullish vs. Bearish Structure Blocks

**Bullish Structure Block:**
- Formed by an upper wick + candle closes above it
- Suggests buyers stepped in
- Signals upward bias

**Bearish Structure Block:**
- Formed by a lower wick + candle closes below it
- Suggests sellers stepped in
- Signals downward bias

### Why It Matters

Structure Blocks tell you:

- **Where institutions are interested** — this is a level to watch
- **Where price might reverse** — if approached from the right direction
- **Where to expect a reaction** — not a guarantee, but a clue

### The Rule

Do not trade a Structure Block directly. **Wait for it to be broken.**

Once broken, the Structure Block becomes a Block Breaker (Chapter 8).

### In Your Setup

**Setup Step 2 — Block Breaker:**
You enter the level where the Structure Block was broken.

**Setup Step 1 — Direction:**
The Structure Block tells you the initial bias.

### Common Mistake

Retail sees a Structure Block and trades it as support or resistance.

Institutions see the Structure Block and wait for the break — because the break is where the real move happens.

### How It Fits

- **First:** Structure Block forms (a pause)
- **Second:** Structure Block is broken → Block Breaker
- **Third:** The break level becomes a Flip Zone
- **Fourth:** A Rejection Block forms at that Flip Zone
- **Fifth:** The trade triggers

Structure Blocks are the **first footprint** in a long chain of events.

### Practice

For the next 10 charts:

- Circle every zone where price paused in a tight range
- Note whether it broke up or down
- Watch what happened after the break

You will start to see Structure Blocks everywhere. And you will see how often the break is what matters.

---

*Continue to Chapter 8 — Block Breakers →*
    `,
  },

  ch8: {
    title: "Block Breakers",
    content: `
## Block Breakers

A Block Breaker is a Structure Block that has been **broken**. It signals a shift in control.

If a Structure Block is a "pause," a Block Breaker is the moment the pause ends — and one side takes over.

### How It Forms

A Block Breaker forms when:

- Price was in a Structure Block (a range)
- Price breaks through the boundary of that range
- The break is confirmed by a close beyond the range

**The break level becomes your new reference.**

### Why It Matters

- **Control shifted** — the previous side lost
- **A new level is defined** — the break level
- **The level can be flipped** — old resistance becomes new support, or vice versa

### Bullish vs. Bearish Breakers

**Bullish Block Breaker:**
- Price breaks above the top of the range
- Control shifts to buyers
- The break level becomes a potential support

**Bearish Block Breaker:**
- Price breaks below the bottom of the range
- Control shifts to sellers
- The break level becomes a potential resistance

### The Break Level Becomes a Flip Zone

This is critical: **the break level is not just a level. It is a Flip Zone (Chapter 9).**

Once broken, the level can be:

- **Retested** — price returns to confirm
- **Rejected** — a new Rejection Block forms there
- **Flipped** — the level acts in the opposite role

### The Rule

- **Do not trade the Block Breaker when it forms.**
- **Wait for price to return to the break level.**
- **Confirm with a Rejection Block.**

### Multiple Breaks

A level can be broken twice:

- **First break** — Block Breaker forms
- **Second break** — level flips again

A twice-broken level is called a **Twice-Blocked Level** — battle-hardened and often a high-probability zone.

### In Your Setup

**Setup Step 2 — Block Breaker Level:**
You enter the exact price where the Structure Block was broken.

This becomes your **Flip Zone** — the level you watch for the RB to form.

### Common Mistake

Retail chases the break. They enter *during* the breakout.

Institutions wait. They enter *after* the retest — at the Flip Zone, with a confirmed Rejection Block.

### How It Fits

The sequence:

1. **Structure Block** forms
2. **Block Breaker** — the level is broken
3. **Flip Zone** — the level is marked
4. **Rejection Block** — price returns and rejects
5. **Entry** — confirmed

Block Breakers are the **second footprint** in the chain.

### Practice

For the next 10 charts:

- Mark every Structure Block that gets broken
- Note the exact break level
- Watch what happens when price returns to that level

You will start to see how often the break level is where the real trade triggers.

---

*Continue to Chapter 9 — Flip Zones & Rejection Blocks →*
    `,
  },

  ch9: {
    title: "Flip Zones & Rejection Blocks",
    content: `
## Flip Zones & Rejection Blocks

This is the **trigger** of the entire system. If you master this chapter, you master the system.

### What is a Flip Zone?

A Flip Zone is the level where control **flipped**. It is:

- The break level from a Block Breaker
- The level where old support becomes new resistance (or vice versa)

**The Flip Zone is a price, not a range.**

### What is a Rejection Block?

A Rejection Block is the **candle formation** that confirms the Flip Zone is being defended.

**The Rejection Block is where the trade is triggered.**

### The Core Rule

> **A Rejection Block requires a sweep of the Flip Zone, followed by a rejection.**

Specifically:

1. **Sweep** — price must exceed the Flip Zone
2. **Current candle made the wick** — not the previous candle
3. **Close back inside** — the candle must close back within the previous range
4. **Displacement** — the next candle should move aggressively in the opposite direction

If any of these conditions is missing, it is not a valid Rejection Block.

### RFZ vs. SFZ

**RFZ — Resistance Flip Zone:**
- Formed at resistance
- Bears reject the level
- Trade direction: **SELL**

**SFZ — Support Flip Zone:**
- Formed at support
- Bulls reject the level
- Trade direction: **BUY**

### The Wick Rule

The Rejection Block candle must have:

- **A long wick** — at least 2× the body size (3-5× is strong)
- **A small body** — the wick dominates

**If the body is bigger than the wick, it is not a Rejection Block.** It is a reversal pattern — different trade, different rules.

### The Zone

Once validated, the Rejection Block defines a zone:

- **Zone High** — top of the wick
- **Zone Low** — body close (or wick base)
- **CE (50%)** — the exact midpoint — your entry

### Why It Works

The wick tells you:

- **Liquidity was swept** — stops triggered above (RFZ) or below (SFZ)
- **Institutions defended** — they did not let price close beyond the level
- **They filled orders** — and now they want price to move away

**The Rejection Block is the fingerprint of institutional order filling.**

### The Two Types of Rejection Blocks

1. **Fresh RB** — first time the level is tested. Highest probability.
2. **Mitigated RB** — level has been tested before. Lower probability, but still tradeable.

**Always prefer fresh.**

### In Your System

- **RB Validator:** Validates the 3-candle formation
- **Setup Step 4:** You record the RB zone
- **CE Entry:** You enter at the 50% midpoint
- **RB Quality Score:** You grade the setup
- **Sweep Confluence:** You confirm the institutional tier

### What to Avoid

- **Fake RBs** — with bodies bigger than wicks
- **Faded RBs** — where the close did not go back inside
- **Isolated RBs** — where there was no sweep

**Rule:** If it does not have a sweep, a wick, and a close back inside — it is not a Rejection Block.

### The Golden Rule of Rejection Blocks

> "The Rejection Block is not a pattern. It is the fingerprint of an institutional order fill. Trade the fingerprint — not the pattern."

### Practice

For the next 10 charts:

- Mark every Flip Zone you see
- Wait for a candle to reject there
- Validate: wick ≥ 2× body, close back inside, sweep occurred
- Only then consider it a valid RB

You will start to see the pattern in real time — and you will stop seeing it everywhere else.

---

*Continue to Chapter 10 — Fair Value Gaps →*
    `,
  },

  ch10: {
    title: "Fair Value Gaps (FVG)",
    content: `
## Fair Value Gaps (FVG)

A Fair Value Gap (FVG) is a **3-candle imbalance** — where price moved so fast that it left a gap between candles.

**The market does not like imbalance. Price tends to return to fill the gap.**

### How to Identify a FVG

**Bullish FVG:**
- Candle 1: red (bearish)
- Candle 2: green (bullish) — big body
- Candle 3: red (bearish)
- **The gap** = the space between Candle 1's high and Candle 3's low

**Bearish FVG:**
- Candle 1: green (bullish)
- Candle 2: red (bearish) — big body
- Candle 3: green (bullish)
- **The gap** = the space between Candle 1's low and Candle 3's high

### What a FVG Means

- **Imbalance** — price moved too fast for orders to fill
- **Magnet** — price often returns to fill the gap
- **Context** — if a Rejection Block forms inside a FVG, probability increases

### The Rule

**Do not trade the FVG directly.** It is not a signal — it is a magnet.

The signal is the **Rejection Block that forms inside or aligned with the FVG.**

### Why FVGs Matter

Institutions use FVGs as:

- **Entry zones** — they enter as price fills the gap
- **Exit zones** — they take profit where the gap is
- **Reference levels** — they mark the gap to watch

When you have a FVG + a Rejection Block, you have institutional confluence.

### In Your System

**Context Layers — FVG:**
- Mark FVG presence: yes/no
- Direction: bullish or bearish
- Optional price range

This feeds into:
- **RB Quality Score:** +2 points if FVG aligns
- **Sweep Confluence:** enhances the tier
- **Setup notes:** recorded for review

### The Two Types

- **Unmitigated FVG** — gap not yet filled. Stronger.
- **Mitigated FVG** — gap already filled. Weaker.

**Always prefer unmitigated FVGs.**

### How to Trade a FVG

1. Mark the FVG
2. Wait for price to return
3. Watch for a Rejection Block inside the FVG
4. If confirmed — enter at CE with the RB rules

### What Not to Do

- Do not enter on the first touch without confirmation
- Do not treat the FVG as support/resistance
- Do not assume it will hold — it might be filled entirely

### The Golden Rule of FVGs

> "The FVG is the magnet. The Rejection Block is the trigger. Trade the trigger inside the magnet."

### Practice

For the next 10 charts:

- Circle every 3-candle gap you see
- Note whether price returned to fill it
- Note whether a Rejection Block formed inside

You will see the magnet pulling price — every time.

---

*Continue to Chapter 11 — Order Blocks →*
    `,
  },

  ch11: {
    title: "Order Blocks",
    content: `
## Order Blocks

An Order Block is the **last opposing candle** before a strong move.

It is where institutions placed their orders — the base of the institutional move.

### How to Identify an Order Block

**Bullish Order Block:**
- The **last red candle** before a strong up move
- Marked by: strong displacement up after

**Bearish Order Block:**
- The **last green candle** before a strong down move
- Marked by: strong displacement down after

### Why It Matters

Order Blocks tell you:

- **Where institutions placed orders**
- **Where the base of the move is**
- **Where to expect a reaction if price returns**

### The Rule

**Order Blocks are CONTEXT, not triggers.**

They tell you the story. But they do not trigger a trade.

The trigger is the Rejection Block. Order Blocks are the background.

### How Order Blocks Differ from Rejection Blocks

| | Order Block | Rejection Block |
|---|---|---|
| **Position** | Start of move | End of move |
| **Candle** | Last opposite candle | Rejection candle |
| **Role** | Base / context | Trigger |
| **Tradable?** | No — context only | Yes — trigger |

### Why Both Matter

When you have **Order Block + Rejection Block + FVG**:

- Order Block: "This is where institutions started"
- FVG: "This is the imbalance they created"
- Rejection Block: "This is where they defended the level"

**That is full confluence.** Highest-probability trade.

### In Your System

**Context Layers — Order Block:**
- Mark OB presence: yes/no
- Type: bullish or bearish
- Optional price range

This feeds into:
- **RB Quality Score:** bonus if OB aligns
- **Setup notes:** for later review

### Fresh vs. Used

- **Fresh OB** — never touched. Stronger.
- **Used OB** — retested before. Weaker.

### What Not to Do

- Do not trade the Order Block directly
- Do not assume it will hold
- Do not mix up OB and RB

### The Golden Rule of Order Blocks

> "The Order Block is the base. The Rejection Block is the trigger. Trade the trigger — remember the base."

### Practice

For the next 10 charts:

- Mark every "last opposite candle before a big move"
- Note if price returned to it
- Note if a Rejection Block formed there

You will start to see the pattern: institutions leave a base, then move.

---

*Continue to Chapter 12 — Consequent Encroachment →*
    `,
  },

  ch12: {
    title: "Consequent Encroachment (CE)",
    content: `
## Consequent Encroachment (CE)

The CE is the single most important price in this entire system.

**CE = 50% midpoint of the Rejection Block zone.**

It is where institutions filled their orders. It is where you enter.

### How to Calculate CE

**For an RFZ (bearish rejection):**
- Zone High = tip of the upper wick
- Zone Low = the body close
- **CE = (Zone High + Zone Low) / 2**

**For an SFZ (bullish rejection):**
- Zone High = the body close
- Zone Low = tip of the lower wick
- **CE = (Zone High + Zone Low) / 2**

The app computes this automatically when you enter the zone.

### Why the 50%?

- **The wick tip is where price was rejected**
- **The body close is where price settled**
- **The 50% midpoint is the "fair value" of the zone**

Institutions did not enter at the wick tip (too risky). They entered at the body close (too late). They entered at the **midpoint** — where risk and reward are balanced.

### Why CE Entries Win

**Without CE:**
- You enter at the wick tip — wide stop loss, poor RR

**With CE:**
- You enter at the 50% midpoint — tight stop loss, better RR
- You enter where institutions entered — the "correct" price
- Strong trends often tap the CE and reverse without touching the wick

### The Shot from CE

The highest-probability entry is:

**A shot candle that launches directly from the CE.**

**Criteria:**
- Body ≥ 1× ATR
- Opposing wick ≤ 10% of body
- Direction = aligned with the D1 bias
- Launch = immediately from the CE line

**This is the "institutional launch" — the exact moment the real move begins.**

### In Your System

- **Setup:** CE computed automatically from the RB zone
- **Entry Calculator:** Entry auto-fills to CE
- **RB Validator:** Shows the CE explicitly
- **Trade Checklist:** Confirms the entry at CE

### The Flip

If the CE is broken — price closes beyond the CE line — the level flips.

- **Bullish CE breaks below** → becomes resistance → SELL opportunity
- **Bearish CE breaks above** → becomes support → BUY opportunity

**The CE is the level that keeps giving.** It can trigger two trades: one in the original direction, one in the opposite direction after the flip.

### What Not to Do

- Do not enter above the CE (for bearish) or below the CE (for bullish)
- Do not chase price after the shot
- Do not enter before the CE is tapped

### The Golden Rule of CE

> "The CE is where institutions entered. Enter where they entered. Risk what they risk. Win what they win."

### Practice

For the next 10 charts:

- Find a Rejection Block
- Calculate the CE
- Watch price tap the CE
- See how often the shot launches from there

You will start to see the CE working every time.

---

*Continue to Chapter 13 — Timeframe Alignment →*
    `,
  },

  ch13: {
    title: "Timeframe Alignment",
    content: `
## Timeframe Alignment

The more timeframes agree, the higher the probability of the trade.

Timeframe alignment is the **confirmation layer** of the system.

### The Four Timeframes

| Timeframe | Role |
|---|---|
| **D1** | Overall direction (trend) |
| **H4** | Main structure — RB forms here |
| **H1** | Confirmation — how price approaches |
| **30M / M15** | Entry precision |

### How They Work Together

- **D1** tells you the direction: bullish or bearish
- **H4** tells you where the Rejection Block should form
- **H1** tells you if the approach is healthy (not exhausted)
- **30M / M15** tells you the exact entry trigger

**The D1 is your compass. The H4 is your map. The H1 is your confirmation. The lower timeframes are your trigger.**

### The Alignment Rule

Before any trade, ask:

- Does the D1 bias align with the H4 structure?
- Does the H4 structure align with the H1 approach?
- Does the H1 approach show a healthy move (not exhaustion)?

**If yes on all three — you have alignment.**

### When Timeframes Disagree

- **D1 up, H4 down** — wait. The market is in a pullback. Do not force a trade.
- **D1 up, H4 up, H1 down** — H1 is in a pullback. Watch for RB on H1 as continuation.
- **D1 sideways** — do not trade. The direction is unclear.

### In Your System

**Confluence Analyzer:**
- Checks D1, H4, H1 alignment
- Scores the confluence (High / Medium / Low)
- Tells you whether to proceed

**RB Quality Score — Alignment Factor:**
- 0 pts = single timeframe only
- 1 pt = 2 timeframes aligned
- 2 pts = H4 + H1 + D1 aligned

**Sweep Confluence — Very High tier:**
- Requires timeframe alignment

### The Practical Application

**Before every setup, verify:**

- [ ] D1 direction clear?
- [ ] H4 structure aligned?
- [ ] H1 approach healthy?
- [ ] Lower TF trigger present?

If any answer is no — do not trade. Wait.

### The Battlefield Approach

Price rarely moves in perfect alignment. There is always a pullback, a trap, a wick.

**The alignment rule is not "all timeframes agree at all times."** It is:

> "All timeframes are in a state that supports my trade direction."

A healthy pullback on H1 (into a support zone) is still alignment — if the D1 is up and the H4 zone is being respected.

### What Kills Alignment

- A trend change on D1 (rare, but final)
- A break of the H4 zone with body close (invalidates the setup)
- An H1 exhaustion move (price already moved, no room to run)

### The Golden Rule of Alignment

> "Trade with the D1. Enter with the H4. Confirm with the H1. Trigger with the lower timeframes."

### Practice

For the next 10 charts:

- Mark the D1 bias
- Mark the H4 zone
- Mark the H1 approach
- Only trade when all three align

You will see the difference immediately.

---

*Continue to Chapter 14 — EMA 50 Confluence →*
    `,
  },

  ch14: {
    title: "EMA 50 Confluence",
    content: `
## EMA 50 Confluence

The EMA 50 (Exponential Moving Average, period 50) is a **dynamic level** that acts as support or resistance depending on where price is.

It is a **confluence tool** — not a trigger.

### What It Does

The EMA 50 tracks the average price over the last 50 periods, weighting recent prices more heavily.

**In practice, the EMA 50 acts as:**

- **Support** in an uptrend — price bounces off it
- **Resistance** in a downtrend — price is rejected by it
- **A magnet** — price often returns to it

### How to Use It

**For a bullish setup:**
- Price above EMA 50 = uptrend context
- If price pulls back to EMA 50 and holds — bullish
- If price rejects at EMA 50 from below — bearish flip

**For a bearish setup:**
- Price below EMA 50 = downtrend context
- If price rallies to EMA 50 and rejects — bearish
- If price breaks above EMA 50 and holds — bullish flip

### Confluence Rules

- **Price above EMA 50** — bullish bias
- **Price below EMA 50** — bearish bias
- **RB aligned with EMA 50** — highest probability
- **RB against EMA 50** — lower probability

### In Your System

**Setup Step 1 — EMA 50 Position:**
You mark whether price is above or below.

**RB Quality Score — no direct factor, but feeds into Sweep Confluence:**
- Sweep + TF + EMA aligned = **Extreme tier** 🏆

**Sweep Confluence — Extreme requires EMA alignment:**
- Bullish bias + EMA below price = bullish support ✅
- Bearish bias + EMA above price = bearish resistance ✅

### What EMA Alignment Looks Like

**Bullish trade with EMA alignment:**
- D1 bias: bullish
- Price above EMA 50 (support)
- RB at support — held by EMA 50
- Shot launches up

**Bearish trade with EMA alignment:**
- D1 bias: bearish
- Price below EMA 50 (resistance)
- RB at resistance — rejected by EMA 50
- Shot launches down

### What EMA Conflict Looks Like

- D1 bias bullish, but price below EMA 50 = conflict → lower probability
- D1 bias bearish, but price above EMA 50 = conflict → lower probability

**When in conflict, wait for resolution or reduce position size.**

### The Golden Rule of EMA 50

> "The EMA 50 is not a signal. It is a confirmation. If the RB and the EMA agree, trade. If they disagree, wait."

### Practice

For the next 10 charts:

- Add EMA 50 to your chart
- Mark where price is relative to it
- Note how often a rejection happens at the EMA 50

You will start to see the EMA 50 as a **magnet** that price respects.

---

*Continue to Chapter 15 — The Battlefield →*
    `,
  },

  ch15: {
    title: "The Battlefield",
    content: `
## The Battlefield

The Battlefield is the **space between a key level and the newly formed Rejection Block**.

It tells you how much room price has to move — and how explosive the next move will be.

### What It Is

- **Key level** — the level you are watching (support, resistance, round number)
- **Rejection Block** — the new zone that formed
- **Battlefield** — the space between them

### How to Measure It

**Visually:**

\`\`\`
Key Level ───────────── 210,000
    ↑
    ↑  ← Battlefield (space)
    ↓
Rejection Block ─────── 209,500
\`\`\`

**The narrower the battlefield, the more explosive the move.**

### The Three Sizes

| Size | Meaning | Probability |
|---|---|---|
| **Wide** | Indecision — price has room to wander | Lower |
| **Narrow** | Compression — decision is coming | Higher |
| **Very Narrow** | Explosive — move is imminent | Very High |

### Why It Works

When price compresses between a key level and a rejection block:

- Liquidity builds on both sides
- Stops cluster tight
- Any break triggers cascading orders

**Compression = stored energy. When it releases, it moves fast.**

### How to Use It

**Setup Creation:**
- Mark the battlefield size (Wide / Narrow / Very Narrow)
- Feeds into **RB Quality Score** (0-2 points)

**Trade Timing:**
- Wide battlefield → wait
- Narrow battlefield → prepare
- Very Narrow → be ready to enter on break

### In Your System

**RB Quality Score — Battlefield Factor (0-2 pts):**
- 0 pts = Wide
- 1 pt = Narrow
- 2 pts = Very Narrow

This extends the quality score from 10 → 12 points.

**Sweep Confluence — Tier boost:**
- A very narrow battlefield can push a setup to a higher tier

### What Battlefield Tells You

- **Tight compression** = institutions building positions on both sides = big move coming
- **Wide battlefield** = market indecision = less predictable

### What Not to Do

- Do not trade the wide battlefield — too unpredictable
- Do not force a trade when the battlefield is unclear
- Do not ignore compression — it always resolves

### The Golden Rule of Battlefield

> "The narrower the battlefield, the more explosive the move. Prepare early. Enter on the break."

### Practice

For the next 10 charts:

- Mark key levels
- Mark where rejection blocks form
- Measure the space between them
- Note how price behaves when the battlefield is narrow

You will start to see compression as a signal — not noise.

---

*End of Part 2 — Continue to Part 3 (The System in the App) in Stage 3 →*
    `,
  },
};

// ============================================================
// HELPERS
// ============================================================

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

export function getNavigation(key) {
  const all = getAllChapters();
  const idx = all.findIndex((c) => c.key === key);
  return {
    prev: idx > 0 ? all[idx - 1] : null,
    next: idx < all.length - 1 ? all[idx + 1] : null,
  };
}