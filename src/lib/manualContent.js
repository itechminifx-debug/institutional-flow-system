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

  // ==========================================================
  // PART 3 — THE SYSTEM IN THE APP
  // ==========================================================

  ch16: {
    title: "Daily Routine",
    content: `
## Daily Routine

The system works best when used in a specific order. This chapter gives you the exact flow from waking up to end of day.

### Morning (Before Market)

1. **Pray / Meditate** — Clear your mind before the chart (see Chapter 17)
2. **Open the app** → complete the **Mindset Ritual**
3. **Open MT5** — log into Headway
4. **Start the bridge** — Terminal 1: \`python mt5_bridge.py\`
5. **Start the tunnel** — Terminal 2: \`cloudflared.exe tunnel --url http://localhost:5000\`
6. **Update Render** if the tunnel URL changed
7. **Walk the Chart Checklist** — 10 phases

### Pre-Market Analysis

8. Open the **Trend Analyzer** — mark D1 bias for your pairs
9. Open the **Confluence Analyzer** — check D1 + H4 + H1 alignment
10. Open the **News Protocol** — check for high-impact events
11. Open the **Liquidity Map** — mark today's liquidity levels

### During Market

12. **Create setups** on the Setup Planner
13. **Validate** each setup with the RB Validator
14. **Wait** for price to reach the RB zone
15. **Watch for the alert** — Telegram + LiveSetupCard
16. **Walk the Trade Checklist** — 7 gated steps
17. **Enter** via the Entry Calculator (CE entry)
18. **Manage** the trade in the Journal

### End of Day

19. **Journal** every trade — emotion + notes + screenshots
20. **Mark Partial / BE** if applied
21. **Close trade** as WON / LOST / BE
22. **Review** the day — did you follow the rules?

### Weekly

23. **Sunday** → complete the Weekly Review
24. **Check Stats** — RB correlation, rule adherence

### The Rule

> "Do the same thing, in the same order, every day. Repetition builds discipline. Discipline builds profit."

---

*Continue to Chapter 17 — The Mindset Ritual →*
    `,
  },

  ch17: {
    title: "The Mindset Ritual",
    content: `
## The Mindset Ritual

The Mindset Ritual is the **first thing you do** before touching the chart. It prepares the mind, heart, and spirit.

**Never skip it.** The day you skip it is the day you break your rules.

### The Six Sections

**1. Spiritual Preparation** (4 items)
- Have I prayed before this session?
- Have I asked for wisdom?
- Have I surrendered the outcome?
- Have I given thanks?

**2. Emotional Preparation** (5 items — CRITICAL)
- Am I calm?
- Am I patient?
- Am I free from greed?
- Am I free from fear?
- Am I free from revenge?

**3. Mental Preparation** (5 items)
- Have I reviewed my system?
- Have I marked my zones?
- Do I know my bias?
- Do I know my levels?
- Do I know my risk?

**4. Physical Preparation** (5 items)
- Am I well-rested?
- Have I eaten?
- Am I hydrated?
- Is my environment quiet?
- Is my chart clean?

**5. Discipline Commitment** (6 items)
- I will wait for my setup
- I will follow my system
- I will accept losses
- I will not move my stop loss
- I will not overtrade
- I will journal every trade

**6. Trading Rules Commitment** (5 items)
- I will risk only 1-2% per trade
- I will trade only high-probability setups
- I will wait for confirmation
- I will take partial profits at 1:1
- I will stop trading after 3 losses

### Total: 30 items

**You must complete ALL 30** before the app unlocks the dashboard.

### The Emotional Section

The **emotional section** is the gatekeeper. If any of the 5 emotional items is unchecked, the app shows a **red warning** before letting you proceed.

**This is not a formality.** If you are anxious, rushed, greedy, fearful, or revenge-driven — **do not trade today.**

Your capital will still be there tomorrow.

### After the Ritual

Once complete, the app redirects you to the **Chart Checklist**. Your mind is prepared. Now prepare your chart.

### The Golden Rule

> "The market will always be there. Your capital may not. Prepare your mind before you prepare your chart."

### Practice

For the next 30 sessions, complete the ritual **every single time**. After 30 days, it becomes automatic — and you will notice the difference on the days you skip it.

---

*Continue to Chapter 18 — The Chart Checklist →*
    `,
  },

  ch18: {
    title: "The Chart Checklist",
    content: `
## The Chart Checklist

After the Mindset Ritual, walk the Chart Checklist. **10 phases, ~30 items.**

This is your pre-session chart walkthrough. It prepares you to see the market clearly.

### The 10 Phases

**Phase 1 — Prepare the Chart**
- Correct pair selected
- Timeframe set (start on D1)
- Chart is clean (only EMA 50)
- MT5 bridge running
- Cloudflare tunnel active

**Phase 2 — Read the D1 Direction**
- D1 trend identified
- EMA 50 position checked
- D1 + H4 + H1 aligned (Confluence)
- Market Structure Shift checked

**Phase 3 — Find the Liquidity**
- Unmitigated highs/lows marked
- Equal highs/lows noted
- Round numbers noted
- Session extremes noted
- Nearest liquidity pool identified

**Phase 4 — Identify Structure Blocks**
- Block above current price
- Block below current price
- Block Breaker present
- Twice-blocked level checked

**Phase 5 — Find the Rejection Block**
- Sweep occurred
- Current candle made the wick
- Wick-to-body ratio ≥ 2×
- Close back inside
- Displacement ≥ 0.6× ATR
- Validated with RB Validator

**Phase 6 — Find the FVG**
- 3-candle imbalance visible
- Direction identified
- Mitigation checked
- Aligns with RB

**Phase 7 — Identify the Order Block**
- Last opposing candle before strong move
- Fresh or used checked
- Aligns with FVG

**Phase 8 — Check the Battlefield**
- Distance to next key level measured
- Compression checked

**Phase 9 — Traps & Timing**
- Not within 30 min of session open
- No obvious false breakout forming
- No stop hunt setting up

**Phase 10 — News Check**
- No high-impact news within 30 min
- No news within 60 min after release
- Manual news lock set if needed

### The Rule

**You cannot create a setup until the Chart Checklist is 100% complete.**

The app enforces this. Every checkbox must be ticked.

### After Completion

Once 100%, the app shows:
> "✅ Chart fully read — you may proceed to the Setup Planner"

Click **Create a Setup →** and move on.

### Why This Matters

- Forces you to **look at the chart** before reacting
- Prevents **impulse trades**
- Trains your eye to **see all context**
- Builds **muscle memory** for reading structure

After 30 sessions, you will see the chart differently. The checklist will become internal.

---

*Continue to Chapter 19 — The Trend Analyzer →*
    `,
  },

  ch19: {
    title: "The Trend Analyzer",
    content: `
## The Trend Analyzer

Before you can trade, you must know the direction. The Trend Analyzer tells you exactly that — based on 10 confirmation factors.

### What It Does

You check 10 factors. Each factor is either:
- 🟢 Bullish
- 🔴 Bearish

The app tallies them and gives you a verdict.

### The 10 Factors

1. **Structure** — HH + HL (bullish) or LH + LL (bearish)
2. **EMA 50** — Price above (bullish) or below (bearish)
3. **Flip Zones** — RFZ broken (bullish) or SFZ broken (bearish)
4. **Liquidity** — Lows swept (bullish) or highs swept (bearish)
5. **FVGs** — Bullish FVGs filled (bullish) or bearish filled (bearish)
6. **Block Breakers** — Breaker up (bullish) or down (bearish)
7. **Candles** — Large green bodies (bullish) or red (bearish)
8. **Alignment** — All TFs up (bullish) or down (bearish)
9. **Momentum** — Strong bullish or strong bearish
10. **Pullbacks** — Hold at support (bullish) or resistance (bearish)

### The Verdicts

Based on the tally:

| Bullish Count | Verdict |
|---|---|
| 9-10 | 🟢🟢 **Strong Uptrend** |
| 7-8 | 🟢 **Uptrend** |
| 4-6 | ⚪ **Sideways** |
| 2-3 | 🔴 **Downtrend** |
| 0-1 | 🔴🔴 **Strong Downtrend** |

### How to Use It

1. Open **Trend Analyzer** from the navbar
2. Select pair (Vol 80, XAUUSD, etc.)
3. Select timeframe (usually D1)
4. Check each of the 10 factors against your chart
5. Read the verdict
6. Save the analysis to Supabase

### When to Run It

- **Every morning** before setting up trades
- **When in doubt** about direction
- **After significant news** — the trend may have shifted

### Integration

- The **dashboard widget** shows your latest trend for quick reference
- **Setup Planner** uses the trend as Step 1 (D1 Bias)
- **Confluence Analyzer** cross-checks it with H4 and H1

### The Rule

**Do not create a setup that opposes your trend.**

If the Trend Analyzer says downtrend → only build bearish setups.

If it says uptrend → only build bullish setups.

If it says **Sideways** → **do not trade**. Wait for the trend to clarify.

### What to Watch For

- **Conflicting factors** — 5 bullish, 5 bearish → still sideways
- **New data** — rerun if major price action occurs
- **Timeframe-specific** — D1 trend is not the same as H4 trend

### The Golden Rule of Trend

> "The trend is not your friend. The trend is your context. Trade with it — or don't trade at all."

---

*Continue to Chapter 20 — The Confluence Analyzer →*
    `,
  },

  ch20: {
    title: "The Confluence Analyzer",
    content: `
## The Confluence Analyzer

The Trend Analyzer gives you the D1 direction. The Confluence Analyzer tells you whether **D1, H4, and H1 agree**.

### What It Checks

For each of 3 timeframes (D1, H4, H1), you check:

1. **Direction** — Up / Down / Sideways
2. **Rejection Block present** — Yes / No
3. **Zone range** — Price values
4. **Liquidity present** — Yes / No

### The Confluence Score

Total score = 100 points, from:

- **Direction alignment** (45 pts): 15 per timeframe
- **Rejection Blocks** (30 pts): 10 per timeframe
- **Zone overlap** (10 pts): Do the zones overlap?
- **Liquidity** (15 pts): 5 per timeframe

### The Verdicts

| Score | Verdict |
|---|---|
| 85-100 | 🟢🟢 **High Probability** |
| 65-84 | 🟢 **Medium-High** |
| 45-64 | 🟡 **Medium** |
| 25-44 | 🟠 **Low** |
| 0-24 | 🔴 **Skip** |

### When to Use It

- **Before creating a setup** — to confirm alignment
- **When you're uncertain** — to see if timeframes agree
- **After a big move** — to see if the trend has shifted

### How to Run It

1. Open **Confluence** in the navbar
2. Select pair and bias
3. Enter current price
4. Fill in the D1 checks:
   - Direction, RB present, zone range, liquidity
5. Fill in the H4 checks
6. Fill in the H1 checks
7. **Watch the score build live**
8. See the verdict
9. Save to history

### What the Output Shows

- **Confluence Score** (0-100)
- **Verdict** (High Probability / Medium-High / Medium / Low / Skip)
- **Overlap Zone** (the price range where all 3 timeframes agree)
- **Suggested Entry** (the overlap or H4 zone)
- **Suggested SL / TP** (based on zone)
- **RR Ratio**

### Integration

- The **dashboard widget** shows your latest analysis
- **Setup creation** can be cross-checked against this
- **Sweep Confluence tier** uses TF alignment as a factor

### The Rule

**Do not create a setup if the Confluence Score is below 45.**

The market is telling you the timeframes disagree. Wait for clarity.

### What to Watch For

- **Zones do not overlap** → no confluence, skip
- **Direction conflicts** → wait for resolution
- **Only 2 of 3 timeframes** → medium probability

### The Golden Rule of Confluence

> "One timeframe is a signal. Two is a probability. Three is a trade."

---

*Continue to Chapter 21 — The RB Validator →*
    `,
  },

  ch21: {
    title: "The RB Validator",
    content: `
## The RB Validator

The RB Validator verifies a **3-candle formation** before you mark a Rejection Block.

It checks all 5 conditions of a valid RB and gives you a confidence score.

### The 5 Conditions

For a valid RB to pass:

1. **Sweep** — The current candle's wick must exceed a previous swing high (RFZ) or low (SFZ)
2. **Current candle made the wick** — NOT the previous candle
3. **Close back inside** — The candle must close back within the previous range
4. **Wick-to-body ratio** ≥ 2.0× (upper wick for RFZ, lower wick for SFZ)
5. **Displacement** — The next candle must move ≥ 0.6× ATR in the opposite direction

### Inputs You Enter

- **Pair** (Vol 80, XAUUSD, etc.)
- **Timeframe** (D1, H4, H1, M30, M15, M5)
- **Direction** (RFZ = bearish, SFZ = bullish)
- **Swing Price** — The swing high/low that was swept
- **ATR (14)** — From MT5
- **Candle 1** (previous) — Open, High, Low, Close
- **Candle 2** (current — must create the wick) — O/H/L/C
- **Candle 3** (displacement) — O/H/L/C
- **Parameters** — Min wick/body ratio (default 2.0), displacement multiplier (default 0.6)

### Where to Find These Values

- **Swing High/Low** — The highest high or lowest low of the last 5 candles before Candle 2
- **ATR** — Read from MT5 chart (see Chapter 37)
- **OHLC** — Hover over each candle in MT5 (see Chapter 33-34)

### The Output

**If Valid:**
- ✅ **VALID RFZ** or **VALID SFZ**
- Confidence score (0-10)
- **Zone High, CE (50%), Zone Low**
- **CE Entry card** with Entry / SL / TP / RR
- **Shot Candle Check** (auto-detected)
- Buttons: **Copy Entry** | **Use in New Setup**

**If Invalid:**
- ❌ **INVALID REJECTION BLOCK**
- **Specific reason** — e.g., "Wick-to-body ratio 0.67× below minimum 2×"
- **Condition checks** — every rule, pass or fail

### The CE Entry Card (New)

When valid, the validator shows the **CE Entry** explicitly:

- **Entry** = 50% midpoint (the CE)
- **SL** = beyond the wick tip
- **TP** = 2R from entry
- **RR** = 1:2 minimum

**You can copy these values straight to your broker.**

### The Shot Candle Check

The validator auto-detects the "shot candle" pattern:

- **Direction correct** — bullish or bearish
- **Body ≥ 1× ATR**
- **Opposing wick ≤ 10% of body**

If all three pass → **⚡ SHOT CONFIRMED** banner.

### When to Use It

**Every time you find a potential RB on your chart.**

- Before saving the setup
- Before entering the trade
- Before validating the zone

**The validator is the gate. No RB passes without it.**

### The "Use in New Setup" Button

When valid, click this button. The app:

- Pre-fills the setup with the zone (High-Low)
- Pre-fills the CE as the entry
- Passes the shot flag to the setup
- Sets the D1 bias from the RB direction

**You just fill in the remaining fields and save.**

### What to Watch For

- **Swing High not sweeping** → invalid
- **Previous candle made the wick** → invalid
- **Body bigger than wick** → invalid (this is a reversal pattern, not an RB)
- **Displacement below 0.6×** → invalid

### The Golden Rule of RB Validation

> "If the validator says invalid, it is invalid. Do not negotiate with the rules."

---

*Continue to Chapter 22 — The Setup Planner →*
    `,
  },

  ch22: {
    title: "The Setup Planner",
    content: `
## The Setup Planner

The Setup Planner is where you **build the trade plan** before the trade happens. This is Steps 1-4 of the IFS.

### The Five Sections

**1. Step 1 — D1 Direction**
- Pair
- D1 bias (bullish / bearish)
- EMA 50 position (above / below)

**2. Step 2 — Block Breaker**
- Block Breaker Level (Flip Zone price)

**3. Step 3 — Aligned Liquidity**
- Liquidity Level (price being targeted)

**4. Step 4 — Rejection Block**
- Rejection Block Zone (e.g., "209000-209500")
- Notes

**5. Sweep Confluence**
- Swept Price (the swing high/low that was swept)
- Auto-checks if it's inside the RB zone

**6. Consequent Encroachment (CE)**
- Auto-computed from the RB zone
- Toggle: use CE as default entry

**7. Context Layers**
- Institutional Cycle
- FVG (present, direction, prices)
- Order Block (present, type, prices)
- Twice-Blocked Level

**8. RB Quality Score**
- 6 factors (sweep, wick/body, displacement, alignment, freshness, battlefield)
- Total 0-12

### The Workflow

1. **Complete the Mindset Ritual** (Chapter 17)
2. **Complete the Chart Checklist** (Chapter 18)
3. **Run the Trend Analyzer** (Chapter 19)
4. **Run the Confluence Analyzer** (Chapter 20)
5. **Validate the RB** (Chapter 21) — get the zone
6. **Open Setup Planner** — click "+ New Setup"
7. Fill in all fields (or accept pre-fill from validator)
8. **Save the setup**

### Auto-Fill from RB Validator

When you click **"Use in New Setup"** from the validator:

- ✅ Pair pre-filled
- ✅ D1 Bias pre-filled (bearish for RFZ, bullish for SFZ)
- ✅ Rejection Zone pre-filled
- ✅ CE pre-filled
- ✅ Notes pre-filled with confidence score
- ✅ Shot flag passed

**You fill in Step 2, Step 3, and Context Layers.**

### The Badges

Once saved, the setup shows badges:

- **Pair** + **Bias** (bullish / bearish)
- **RB Score** (X/12)
- **Scenario** (🎯 Strong Bullish/Bearish RB, ⚠️ Weak, 🟢/🔴 Failed)
- **Sweep Tier** (🥉 Moderate, 🥈 High, 🥇 Very High, 🏆 Extreme)
- **Institutional Cycle** (🟦 Accumulation, 🟨 Manipulation, 🟥 Distribution, 🔁 Re-accumulation)
- **FVG** — if present
- **OB** — if present
- **⚡ Twice-Blocked** — if flagged
- **CE** — if enabled

### After Saving

The setup appears in:

- **Setups list** — filterable by pair, bias, search
- **Dashboard** — Live Zone Watchdog monitors the zone
- **Trade page** — click "Convert to Trade" when ready

### The Rule

**One setup = one trade idea.**

Do not combine multiple setups into one. Each setup has:
- One pair
- One direction
- One zone
- One CE

**Clean data = clean trades = clean stats.**

### The Golden Rule of Setups

> "Plan the trade. Trade the plan. Do not improvise."

---

*Continue to Chapter 23 — The RB Quality Score →*
    `,
  },

  ch23: {
    title: "The RB Quality Score",
    content: `
## The RB Quality Score

Every setup gets a **quality score** out of 12. This score determines if you trade it.

**Rule: Only trade rejection blocks scoring ≥ 8/12** (configurable in Settings).

### The Six Factors

**1. Sweep of Key Level** (0-2 pts)
- 0 = No sweep / minor wick
- 1 = Swept a minor level
- 2 = Swept a major high/low ✅

**2. Wick-to-Body Ratio** (0-2 pts)
- 0 = < 2× body
- 1 = 3-4× body
- 2 = 5×+ body ✅

**3. Displacement** (0-3 pts)
- 0 = Weak (no follow-through)
- 1 = Moderate (0.3× ATR)
- 2 = Strong (0.6× ATR)
- 3 = Exceptional (> 1× ATR) ✅

**4. Timeframe Alignment** (0-2 pts)
- 0 = Single timeframe only
- 1 = 2 timeframes aligned
- 2 = H4 + H1 + D1 aligned ✅

**5. Freshness** (0-1 pt)
- 0 = Already mitigated
- 1 = First touch — fresh ✅

**6. Battlefield Size** (0-2 pts)
- 0 = Wide (indecision)
- 1 = Narrow (compression)
- 2 = Very Narrow (explosive) ✅

### Total: 12 points

### The Verdict

| Score | Label |
|---|---|
| 11-12 | 🏆 A+ Setup |
| 9-10 | ✅ A Setup |
| 7-8 | ⚠️ B Setup |
| 5-6 | 🟠 C Setup |
| 0-4 | 🔴 D Setup |

### The Gate

In Settings, you set your **RB Gate Threshold** (default 8). Only setups scoring ≥ this value can be traded.

**Options:**
- 7 = Lenient
- 8 = Standard (recommended)
- 9 = Strict
- 10 = Very Strict
- 11 = Elite only

### The Trade Page

When you open the trade page for a setup:

- If score ≥ threshold → **green banner** "✅ Passes the IFS filter"
- If score < threshold → **red banner** "⚠️ Rejection Block Quality: X/12 — below minimum"

**You can still trade below threshold, but you are warned.**

### The Stats Correlation

After 20+ trades, the Stats page shows:

- Win rate on high-quality trades (9+)
- Win rate on medium-quality (7-8)
- Win rate on low-quality (< 7)

**If your system works: high quality > low quality.** This proves the filter is real.

### How to Score

When creating a setup, scroll to the **Quality Score card**:

1. Click "Score each factor ▼"
2. Answer each of the 6 factors
3. Total updates live
4. Save with the setup

**Be honest.** If you rate everything 2, you lose the filter's value.

### The Golden Rule of Quality

> "The quality score is not a judgment of you. It is a judgment of the setup. Be honest — your stats will thank you."

---

*Continue to Chapter 24 — The Sweep Confluence →*
    `,
  },

  ch24: {
    title: "The Sweep Confluence",
    content: `
## The Sweep Confluence

The **Sweep Confluence** is the tier system that grades how institutional a setup is.

**A Rejection Block formed INSIDE a liquidity sweep is dramatically stronger than one that forms elsewhere.**

### The Concept

- **Sweep alone** — stops triggered, liquidity collected
- **RB alone** — a candle rejected a level
- **RB inside a sweep** — the exact moment institutions completed their orders

**The sweep is the trap. The RB is the evidence. Together they are deadly.**

### The Four Tiers

**🥉 Moderate**
- RB only, no sweep confirmed
- Weakest — trade with caution

**🥈 High**
- RB + Sweep
- Liquidity collected, orders filled

**🥇 Very High**
- RB + Sweep + Timeframe alignment
- Multiple timeframes agree

**🏆 Extreme**
- RB + Sweep + TF alignment + EMA 50 alignment
- Full confluence — the highest-probability setup

### How to Enter a Sweep

In the Setup Planner, after Step 4:

1. Find the **Sweep Confluence** section
2. Enter the **Swept Price** (the swing high/low that was swept)
3. The app auto-checks:
   - Is the swept price **inside** the RB zone?
   - If YES → **Sweep confirmed** ✅
   - If NO → warning

### The Auto-Computation

The app computes the tier from:

- **sweep_confirmed** = sweep price inside RB zone
- **tf_aligned** = RB alignment score = 2
- **ema_aligned** = EMA 50 position matches D1 bias

Result: **Moderate / High / Very High / Extreme**

### Where the Tier Appears

- **Setup card** — badge at the top
- **Dashboard LiveSetupCard** — badge
- **Trade page** — large badge
- **Journal** — next to the trade

### Score Impact

The tier adds points to the RB Quality Score:

- Moderate → +0
- High → +1
- Very High → +2
- Extreme → +3

**This extends the RB Score from 12 → up to 15 for the highest tier.**

### The Dashboard Widget

The **Sweep Confluence** widget shows your best-tier setup right now.

- If none exists → "No tiered setups"
- If one exists → shows the tier + pair

### The Golden Rule of Sweep Confluence

> "A Rejection Block without a sweep is a guess. A Rejection Block WITH a sweep is a confirmed institutional footprint. Trade the evidence — not the guess."

---

*Continue to Chapter 25 — The Trade Checklist →*
    `,
  },

  ch25: {
    title: "The Trade Checklist",
    content: `
## The Trade Checklist

The Trade Checklist is a **7-step gated flow** (Steps 5-11). You **cannot skip** steps.

**This is the discipline engine.**

### The 7 Steps

**Step 5 — Timeframe Flipping**
- D1 → H4 → H1 confirmed
- Direction context is clear

**Step 6 — D1 Direction Marked**
- Overall trend identified
- Bias locked in from setup

**Step 7 — H4 Rejection Block Aligned**
- H4 rejection block aligns with D1 direction

**Step 8 — Patience Applied**
- Waited patiently for price to reach the H4 zone
- No FOMO

**Step 9 — 30M Shifting Confirmation**
- 30M shows short-term control change within trend

**Step 10 — H1 Observation Done**
- Watched how price approaches the H4 zone
- Ready

**Step 11 — Entry Rules Confirmed**
- FVG identified
- Rejection Block marked
- Body close away from zone

### How It Works

Each step is a **button**. You must tap in order.

- ✅ Tap Step 5 → it's checked, Step 6 unlocks
- ❌ Step 6 stays locked until Step 5 is checked
- ✅ Tap Step 6 → Step 7 unlocks
- ...
- ✅ Tap Step 11 → Entry Calculator appears

**You cannot skip a step. You cannot check them out of order.**

### Undo

If you tapped a step by mistake, click **"Undo last step"** to uncheck the most recent.

### The Entry Unlock

Once Step 11 is checked → the **Entry Calculator** appears below.

**This is the moment you're allowed to enter.**

### Why It Matters

**Retail traders skip steps.** They enter when they feel like it, breaking their own rules.

**The checklist refuses.** It holds you accountable. It forces you to walk through your own process.

### The Rule

**No step skipped. No shortcut.**

If you find yourself wanting to skip a step → **the trade is not ready.**

### What to Watch For

- **Temptation to skip** → wait
- **"I'll just enter, it looks good"** → no. Walk the steps.
- **"I've already done this mentally"** → mental is not the same as confirmed

### The Golden Rule of the Checklist

> "The checklist is not a formality. It is the decision. If you skip it, you have already broken your system."

---

*Continue to Chapter 26 — The Entry Calculator →*
    `,
  },

  ch26: {
    title: "The Entry Calculator",
    content: `
## The Entry Calculator

The Entry Calculator takes over once Step 11 is checked. It computes the **entry, SL, TP, lot size, and RR**.

### The Inputs

- **Entry Price** — auto-fills to CE if enabled, else live price
- **Stop Loss** — auto-suggested beyond the RB zone
- **Take Profit** — auto-suggested at 2R

You can override any value manually.

### The Auto-Suggestions

**Entry:**
- If CE enabled → CE price (50% midpoint)
- Else → live MT5 price

**Stop Loss:**
- For BUY (bullish SFZ): Below the RB zone low
- For SELL (bearish RFZ): Above the RB zone high
- Buffer: 20% of the zone size

**Take Profit:**
- 2R from entry (default)
- BUY: Entry + (risk × 2)
- SELL: Entry − (risk × 2)

### The Display

Below the inputs, a 4-panel grid shows:

- **Lot Size** — auto-calculated from risk
- **Risk ($)** — dollar amount at risk
- **SL Distance** — points between entry and SL
- **RR Ratio** — reward:risk

### The Calculations

**Lot Size:**
\`\`\`
Risk Amount = Account Size × Risk %
SL Distance = |Entry − SL|
Lot Size = Risk Amount / (SL Distance × pip value)
\`\`\`

Default pip value = 1 for Vol 80 (synthetic).

**RR Ratio:**
\`\`\`
RR = |TP − Entry| / |Entry − SL|
\`\`\`

### Warnings

The calculator warns if:

- **RR < 1:1** — red warning, ENTER disabled
- **Direction mismatch** — e.g., BUY with SL above entry → error
- **Missing fields** — ENTER disabled
- **News window active** — ENTER blocked

### The Enter Button

**ENTER TRADE** is enabled only when:

- All fields are filled
- Direction validation passes
- RR ≥ 1:1
- No news window active

Once clicked:

1. Trade is created in Supabase
2. Linked to the original setup
3. Status = "open"
4. You're redirected to the Journal

### What Happens After Entry

The trade appears in:

- **Journal** — as an Open Trade
- **Trade page** — marked as entered
- **Stats** — as an open position

### The Golden Rule of Entry

> "Every field has a rule. Every rule has a reason. Trust the calculator — it protects your capital."

---

*Continue to Chapter 27 — The CE Entry →*
    `,
  },

  ch27: {
    title: "The CE Entry",
    content: `
## The CE Entry

The CE (Consequent Encroachment) is the **50% midpoint of the Rejection Block zone**. It's the precision entry point.

### What CE Is

For an RFZ (bearish):
- Zone High = Wick tip
- Zone Low = Body close
- **CE = (Zone High + Zone Low) / 2**

For an SFZ (bullish):
- Zone High = Body close
- Zone Low = Wick tip
- **CE = (Zone High + Zone Low) / 2**

### Why CE Wins

**Entering at the wick tip (retail):**
- Wide SL → poor RR
- Often stopped out by noise

**Entering at the CE (professional):**
- Tighter SL (just beyond wick) → better RR
- Institutions entered here — you join them
- Strong trends often tap CE and reverse without touching the wick

### How It's Computed

When you enter the RB zone (e.g., "209000-209500"):

- The app computes the midpoint
- CE = (209000 + 209500) / 2 = 209250
- This value shows in the Consequent Encroachment section

### The "Use CE" Toggle

In the Setup Planner, toggle:

> ☐ **Use CE price as my default entry on checklist**

When enabled:

- **Entry Calculator** auto-fills to the CE
- The **Entry Price** field shows "(CE)" badge
- A **blue CE Entry Active** banner appears on the trade page

### The Shot from CE

The highest-probability setup is when a **shot candle launches directly from the CE**.

**Shot candle criteria:**
- Body ≥ 1× ATR
- Opposing wick ≤ 10% of body
- Direction = aligned with D1 bias

**The RB Validator auto-detects this.**

If confirmed → **⚡ CE ENTRY + SHOT CONFIRMED** badge

### The CE Flip (Second Trade)

If price closes beyond the CE line → the CE flips:

- **Bullish CE breaks below** → becomes resistance → SELL setup
- **Bearish CE breaks above** → becomes support → BUY setup

The **CE Flip Tracker** (Chapter 28) manages this.

### What Not to Do

- Do not enter before the CE
- Do not chase after the shot
- Do not widen the SL to "be safe"

### The Golden Rule of CE

> "The CE is where institutions entered. Enter where they entered. Risk what they risk. Win what they win."

---

*Continue to Chapter 28 — The CE Flip Tracker →*
    `,
  },

  ch28: {
    title: "The CE Flip Tracker",
    content: `
## The CE Flip Tracker

The CE Flip Tracker monitors every CE line through its **lifecycle**: fresh → tapped → held → flipped → retested.

It gives you a **second trade opportunity** at the same zone.

### The Lifecycle States

**⚪ Fresh** — CE formed, no touch yet
**🟡 Tapped** — price tapped CE, waiting for reaction
**🟢 Held** — CE held, original direction confirmed
**🔴 Flipped** — price closed beyond the CE
**🟠 Retested** — price returned to the flipped CE
**⚫ Dead** — no longer relevant

### How It's Created

**Automatically** when you save a setup with a CE price. The tracker entry is created in state **Fresh**.

### How to Update It

Open **CE Tracker** in the navbar. For each line:

- **🟡 Tap** — price touched the CE
- **🟢 Held** — CE defended, original direction kept
- **🔴 Flipped** — price closed beyond CE
- **🟠 Retest** — price returned to the flipped CE
- **+1 Tap** — increment tap counter
- **⚫ Mark Dead** — no longer relevant

### The Flip Trade

When a CE flips (state = 🔴 Flipped):

- The original direction **failed**
- The CE is now the **opposite role**
- A **second trade** is coming

**Example:**
- Original: Bullish RB, CE = 209250
- Price closed below 209250 → CE flipped
- Now: **SELL at 209250** on the retest

### The Flip Alert

When state = Flipped or Retested:

- The **flip trade hint** appears on the card
- The dashboard widget turns **orange**
- "X flip ready" count shows

### The Retest Trade

When state = 🟠 Retested:

- Price has returned to the flipped CE
- The **second trade is ready**
- Enter the **opposite direction** of the original

### The Stats

The CE Tracker widget on the dashboard shows:

- **Total CE lines**
- **Active** (fresh, tapped, held, flipped, retested)
- **Flip Ready** (flipped + retested)

### The Golden Rule of CE Flips

> "The CE that fails becomes the level that traps. Trade the flip — the second trade is often the cleaner one."

---

*Continue to Chapter 29 — The Journal →*
    `,
  },

  ch29: {
    title: "The Journal",
    content: `
## The Journal

The Journal is where every trade is logged, managed, and closed.

### The Journal List

Two sections:

- **Open Trades** — currently running
- **Closed Trades** — completed

Each trade card shows:

- Pair + direction (buy/sell)
- Status (open / won / lost / BE)
- Entry / SL / TP / RR
- Flags (Partial @ 1:1, SL → BE)
- Screenshot count

### The Trade Detail Page

Click any trade to open it. The detail page shows:

**1. RB Scenario Banner**
- From the original setup (Strong/Weak/Failed Bullish/Bearish)

**2. Trade Summary**
- Entry, SL, TP
- Lot size, risk %, RR ratio

**3. Trade Management** (if open)
- ☐ Partial taken at 1:1
- ☐ SL moved to break-even

**4. Journal Entry**
- Emotion dropdown (Calm, Confident, Anxious, FOMO, Revenge, Patient, Disciplined)
- Notes textarea

**5. Screenshots**
- Upload up to 4 images

**6. Close Trade** (if open)
- Result (pips) + Result (%)
- WON / LOST / B/E buttons

**7. Delete Trade**
- Removes from journal (with confirmation)

### The Workflow

1. **After entering a trade** — the trade is auto-created
2. **During the trade** — add screenshots, notes
3. **At 1:1** — check "Partial taken"
4. **After 1:1** — check "SL moved to BE"
5. **When done** — enter result, click WON / LOST / BE

### The Emotion Tracker

You tag every trade with your emotion. After 30 trades, Stats shows:

- Win rate by emotion
- Which emotions correlate with wins
- Which emotions lead to losses

**This is the most underrated feature.** Most traders don't know they trade worse when anxious. The Journal reveals it.

### The Screenshots

Every trade can have up to 4 images. Use them for:

- Setup screenshot (before entry)
- Chart at entry
- Chart at partial
- Chart at close

**The journal is your visual memory. Future you will thank you.**

### The Golden Rule of the Journal

> "Journal every trade — win or lose. The journal is not for record. It's for review."

---

*Continue to Chapter 30 — The Stats →*
    `,
  },

  ch30: {
    title: "The Stats",
    content: `
## The Stats

The Stats page shows every metric that matters. This is where you find your edge.

### The KPIs

- **Win Rate** — % of closed trades won
- **Avg RR** — average reward:risk on winners
- **Total Pips** — cumulative result
- **Total %** — cumulative account %

### The Breakdown Sections

**1. Trades**
- Total / Won / Lost / BE counts

**2. Rejection Block Quality**
- High Quality (8+): win rate + count
- Medium (6-7): win rate + count
- Low (< 6): win rate + count
- Average quality score

**This is the proof that your RB filter works.**

**3. Rule Adherence**
- Partial @ 1:1: how often applied
- SL moved to BE: how often applied
- Overall adherence %

**If this number is below 80%, your discipline is the problem.**

**4. By Pair**
- Wins/losses per instrument
- Best pair
- Worst pair

**5. By Emotion**
- Win rate per emotion
- Shows which mindsets win
- Shows which mindsets lose

**6. Trap Correlation**
- Trap trades: win rate + count
- Non-trap trades: win rate + count
- By trap type

### What to Look For

After 20-30 trades:

- **Does RB quality predict success?**
  - If high-quality wins more → the filter works
  - If not → adjust your scoring

- **Does discipline matter?**
  - High adherence trades should win more
  - If not → your rules might need adjusting

- **Which emotions lose?**
  - If "Revenge" has a bad win rate → never trade revenge
  - If "Calm" has a high win rate → only trade calm

- **Which pair is your edge?**
  - Focus on the best pair
  - Drop or reduce the worst

### The Golden Rule of Stats

> "The stats don't lie. If the data says your edge is narrow, focus. If the data says your edge is broad, expand."

---

*Continue to Chapter 31 — The Weekly Review →*
    `,
  },

  ch31: {
    title: "The Weekly Review",
    content: `
## The Weekly Review

Every Sunday, complete the **Weekly Review**. It closes the loop.

### What It Shows

**1. This Week's KPIs**
- Trades (total + closed)
- Win Rate
- Pips
- Average Quality Score

**2. Rule Adherence**
- Partial + BE applied this week
- % adherence

**3. Reflection Fields**
- **"What did I do well this week?"**
- **"What will I change next week?"**

### How to Complete It

1. Open **Review** in the navbar
2. Review the auto-filled KPIs
3. Answer both reflection questions
4. Click **Save Weekly Review**

**Saved reviews are viewable in History.**

### Why It Matters

- **Reflection converts experience into learning**
- **Writing forces honesty**
- **Comparing weeks reveals patterns**
- **The habit compounds**

### The Question Prompts

**"What did I do well?"**
- Followed the checklist every time?
- Waited for the CE?
- Took partials at 1:1?
- Journaled every trade?

**"What will I change?"**
- Skipped setups below 8/10?
- Avoided the news window?
- Waited 30 min after session open?
- Journaled within 1 hour of closing?

### The Dashboard Widget

The Review widget shows:

- **✅ Submitted** — you completed this week's review
- **🔔 Sunday — Time to review** — reminder
- **This week's review** — not yet done

### The Rule

**Every Sunday. No exceptions.**

Even if the week was bad. Especially if the week was bad. The Sunday review is when you learn.

### The Golden Rule of Review

> "The trader who reflects weekly improves monthly. The trader who doesn't repeats the same mistakes forever."

---

*Continue to Chapter 32 — The Trading Plan →*
    `,
  },

  ch32: {
    title: "The Trading Plan",
    content: `
## The Trading Plan

The Trading Plan is the **business layer**. It defines your phases, lot sizing, and withdrawal rules.

### The Three Phases

**📚 Phase 1 — Learning**
- Trade 0.01 lots
- Goal: consistency, not profit
- Focus: following the rules 100%
- Rule: same lot size until you have 30 trades at 80%+ adherence

**📈 Phase 2 — Scaling**
- Increase lot by +0.01 every time account grows by 20%
- Never double up after a win
- Rule: protect gains, grow slowly

**💰 Phase 3 — Withdrawal**
- Withdraw 50% of profits monthly
- Pay yourself
- Rule: build real income

### How to Set It Up

1. Open **Plan** in the navbar
2. Click **Create Trading Plan**
3. Your starting balance pulls from Settings
4. You begin in **Phase 1 — Learning**

### The Plan Page

**Current Phase Card** — shows your phase with description, focus, lot rule

**KPIs**
- Starting balance
- Current balance
- Suggested lot size
- Next withdrawal

**Milestone Progress** (in Scaling phase)
- Progress bar to next +0.01 lot milestone

**Promotion Rules** — when you can move up

**Withdrawal / Deposit Buttons** — log money movement

**Business Summary**
- Total deposited
- Total withdrawn
- Net P&L

**Withdrawal History** — recent withdrawals

### The Promotion Rules

**Phase 1 → Phase 2:**
- 30+ closed trades
- AND 80%+ rule adherence

**Phase 2 → Phase 3:**
- Account has doubled
- (2× starting balance)

**Manual switch** — always allowed via dropdown

### The Demotion Warning

If you draw down 30% from starting balance:

- Demotion warning appears
- Suggested: return to Learning phase
- Rebuild discipline before scaling

### The Suggested Lot Size

- **Learning phase** → fixed 0.01
- **Scaling phase** → +0.01 per +20% growth
- **Withdrawal phase** → depends on remaining equity

### The Withdrawal

When you have profit:

- **Suggested withdrawal** = 50% of profit
- Click **Log Withdrawal** to record
- History tracks every withdrawal

### What This Gives You

- **Rules for growth** — not guesses
- **Rules for withdrawal** — you actually take profit
- **Business dashboard** — see everything at a glance
- **Phase tracking** — know where you are and where you're going

### The Golden Rule of the Plan

> "Trading is a business. Businesses have plans. Follow the plan and the plan will pay you."

---

*End of Part 3 — Continue to Part 4 (Chart Identification) in Stage 4 →*
    `,
  },

  // ==========================================================
  // PART 4 — CHART IDENTIFICATION
  // ==========================================================

  ch33: {
    title: "Finding a Swing High",
    content: `
## Finding a Swing High

A **swing high** is the previous peak that price swept — the top of the last meaningful upward move.

**Every Rejection Block starts with a swing high that gets swept.**

### The Exact Rules

A valid swing high must be:

1. **A HIGH, not a close** — the wick tip, not the body
2. **From a PREVIOUS candle** — never the current one
3. **The HIGHEST high in the last 5 candles** (your lookback window)
4. **Visible on the same timeframe** you're validating on

### How to Find It — Step by Step

**On your MT5 chart (say H4 Vol 80):**

1. Find the last **5 candles before the current one**
2. Zoom in so you can see the wicks clearly
3. Identify the **highest HIGH** among those 5 candles
4. **Hover over that candle** — the tooltip shows its OHLC
5. **Write down the HIGH value** — this is your swing high
6. Check: did the **current candle's wick exceed** that value?

### Visual Example

\`\`\`
Swing High: 209,500  ← highest high in the last 5

[ Candle -5 ]  H: 209,300
[ Candle -4 ]  H: 209,450
[ Candle -3 ]  H: 209,500  ← 🎯 THE SWING HIGH
[ Candle -2 ]  H: 209,350
[ Candle -1 ]  H: 209,200

[ Current Candle ]
  High: 209,650 ← ✅ exceeded the swing (sweep!)
  Close: 209,400 ← ✅ closed back below
\`\`\`

### Common Mistakes

- ❌ Using the current candle's high
- ❌ Using a close price instead of a wick
- ❌ Using a high from 20+ candles ago that wasn't swept
- ❌ Guessing instead of hovering for the exact value

### The Rule

> "The swing high is the last peak before the current candle. If the current candle's wick didn't exceed it, there is no sweep — and no valid Rejection Block."

### Practice

For the next 20 charts:

- Mark every swing high you see
- Note if the next candle swept it
- Note what happened after

You'll start to see swing highs instantly.

---

*Continue to Chapter 34 →*
    `,
  },

  ch34: {
    title: "Finding a Swing Low",
    content: `
## Finding a Swing Low

A **swing low** is the previous trough that price swept — the bottom of the last meaningful downward move.

**Every bullish Rejection Block (SFZ) starts with a swing low that gets swept.**

### The Exact Rules

A valid swing low must be:

1. **A LOW, not a close** — the wick tip, not the body
2. **From a PREVIOUS candle** — never the current one
3. **The LOWEST low in the last 5 candles** (your lookback window)
4. **Visible on the same timeframe** you're validating on

### How to Find It — Step by Step

**On your MT5 chart:**

1. Find the last **5 candles before the current one**
2. Zoom in on the wicks
3. Identify the **lowest LOW** among those 5 candles
4. Hover over that candle — note its LOW value
5. That's your swing low
6. Check: did the **current candle's wick go BELOW** that value?

### Visual Example

\`\`\`
Swing Low: 208,400  ← lowest low in the last 5

[ Candle -5 ]  L: 208,700
[ Candle -4 ]  L: 208,550
[ Candle -3 ]  L: 208,400  ← 🎯 THE SWING LOW
[ Candle -2 ]  L: 208,600
[ Candle -1 ]  L: 208,750

[ Current Candle ]
  Low: 208,250  ← ✅ swept the swing low
  Close: 208,900 ← ✅ closed back above
\`\`\`

### The Bullish RB Pattern

For a bullish rejection (SFZ):

1. Price sweeps a swing low (creates a lower wick)
2. Then closes back above the swing low
3. Next candle displaces up
4. **That's the bullish Rejection Block**

### Common Mistakes

- ❌ Using the current candle's low
- ❌ Using a low from an unswept level
- ❌ Using a low that's not the lowest in the lookback window

### The Golden Rule

> "The swing low is the last trough before the current candle. If the wick didn't go below it, there's no sweep — and no SFZ."

---

*Continue to Chapter 35 →*
    `,
  },

  ch35: {
    title: "Identifying a Rejection Block",
    content: `
## Identifying a Rejection Block

A **Rejection Block** is the candle formation that confirms a Flip Zone is being defended.

### The 5 Conditions

For a valid RB, ALL must be true:

1. **Sweep** — the current candle's wick exceeds a previous swing high (RFZ) or low (SFZ)
2. **Current candle made the wick** — NOT the previous one
3. **Close back inside** — the candle closes within the previous range
4. **Wick-to-body ratio ≥ 2.0×** — the wick is at least twice the body
5. **Displacement ≥ 0.6× ATR** — the next candle moves aggressively

### Valid RFZ (Bearish) — Visual

\`\`\`
       │  ← long upper wick (sweep)
      ╱ ╲
     │   │
     ╰───╯  ← small body, closes lower
      │
      ▼   ← displacement down
\`\`\`

### Valid SFZ (Bullish) — Visual

\`\`\`
      ▲   ← displacement up
      │
      ╭───╮ ← small body
     │   │
      ╲ ╱
       │  ← long lower wick (sweep)
\`\`\`

### What Invalid Looks Like

\`\`\`
     ╭───╮
     │   │
     │   │ ← big body
     ╰───╯
      │
\`\`\`

**Body bigger than wick → NOT an RB. This is a reversal pattern.**

### The Critical Rule

**The previous candle must NOT have made the swing.**

If Candle 1 already made the higher high (or lower low), and Candle 2 just follows it, then Candle 1 created the swing — not Candle 2. **Invalid RB.**

### The Sweep Rule

**No sweep = no RB.**

If the current candle didn't exceed a previous high/low, there is nothing to reject from.

### The Golden Rule

> "The Rejection Block is not a pattern. It is the fingerprint of an institutional order fill. If the wick isn't dominant, they didn't defend the level."

### Practice

For the next 20 charts:

- Circle every candle that looks like a rejection
- Check all 5 conditions
- Only call it an RB if all 5 pass

---

*Continue to Chapter 36 →*
    `,
  },

  ch36: {
    title: "Measuring Wick-to-Body Ratio",
    content: `
## Measuring Wick-to-Body Ratio

The wick-to-body ratio determines whether a candle is a **rejection** or a **reversal**.

### Which Candle?

**Candle 2 — the CURRENT candle** (the one that swept and closed back inside).

- Candle 1 = previous (context)
- **Candle 2 = the RB candle** — measure this one
- Candle 3 = displacement

### The Formula

**For RFZ (bearish):**
\`\`\`
Upper Wick = Candle 2 High − max(Candle 2 Open, Candle 2 Close)
Body = |Candle 2 Close − Candle 2 Open|
Ratio = Upper Wick ÷ Body
\`\`\`

**For SFZ (bullish):**
\`\`\`
Lower Wick = min(Candle 2 Open, Candle 2 Close) − Candle 2 Low
Body = |Candle 2 Close − Candle 2 Open|
Ratio = Lower Wick ÷ Body
\`\`\`

### Example — RFZ

**Candle 2:**
- Open: 209,400
- High: 209,600
- Low: 209,350
- Close: 209,420

\`\`\`
Upper Wick = 209,600 − max(209,400, 209,420)
           = 209,600 − 209,420
           = 180

Body = |209,420 − 209,400|
     = 20

Ratio = 180 ÷ 20 = 9.0×
\`\`\`

**9× ratio = exceptional rejection.**

### The Quality Ladder

| Ratio | Quality |
|---|---|
| < 2× | ❌ Not a valid RB |
| 2× | ⚠️ Minimum |
| 3-4× | ✅ Good |
| 5×+ | 🏆 Exceptional |
| 7×+ | 🏆🏆 Elite |

### How to Eyeball It

**On the chart, ask:**

> "Is the wick at least **twice as long** as the body?"

- Wick ≈ half body → 0.5× ❌
- Wick ≈ body → 1× ❌
- Wick ≈ 2× body → 2× ⚠️
- Wick ≈ 3-5× body → 3-5× ✅
- Wick dominates, body tiny → 5×+ 🏆

**After 50 charts, you'll read this without measuring.**

### The Golden Rule

> "If the wick doesn't dominate the body, the level wasn't defended. It was just passed through."

---

*Continue to Chapter 37 →*
    `,
  },

  ch37: {
    title: "Reading ATR from MT5",
    content: `
## Reading ATR from MT5

**ATR (Average True Range)** tells you how much price typically moves per candle on a given timeframe.

**You need it to check displacement.**

### What It Does

ATR measures the average of the last 14 candles' ranges (High − Low, with adjustment for gaps).

**Higher ATR = more volatile timeframe.**
**Lower ATR = quieter timeframe.**

### How to Add ATR in MT5

1. Open **MT5**
2. Open the chart for your pair (Vol 80, XAUUSD, etc.)
3. Set the **timeframe** you're validating on (D1, H4, H1, etc.)
4. Top menu → **Insert → Indicators → Oscillators → Average True Range**
5. Settings:
   - **Period:** 14 (default)
   - **Shift:** 0
   - **Apply to:** Close
6. Click **OK**

**ATR appears in a sub-panel below the chart.**

### Where to Read It

The current ATR value shows at the **bottom of the ATR sub-panel** — e.g., **"ATR(14): 415.32"**.

**That's your ATR for the current timeframe.**

### Alternative — Data Window

1. In MT5, press **Ctrl + D** (opens Data Window)
2. Scroll to **ATR(14)** in the list
3. Its current value shows next to it

### Typical ATR Ranges for Vol 80

| Timeframe | Typical ATR |
|---|---|
| D1 | 1,500 - 3,000 |
| H4 | 400 - 800 |
| H1 | 150 - 400 |
| M30 | 80 - 200 |
| M15 | 40 - 100 |

**If your ATR is wildly different, check you're on the right timeframe.**

### Typical ATR for XAUUSD

| Timeframe | Typical ATR |
|---|---|
| D1 | 20 - 40 |
| H4 | 8 - 15 |
| H1 | 4 - 8 |

### What to Enter in the RB Validator

Enter the **current ATR value** as shown on the chart.

**Example:** If MT5 shows **ATR(14): 415.32**, enter **415.32**.

### Why ATR Matters

- The **displacement check** uses ATR: the next candle must move ≥ 0.6× ATR
- The **shot candle check** uses ATR: the body must be ≥ 1× ATR

**Without ATR, the validator can't verify institutional conviction.**

### The Golden Rule

> "ATR is the ruler. Without it, you can't measure whether the move was big enough to be institutional."

---

*Continue to Chapter 38 →*
    `,
  },

  ch38: {
    title: "Calculating Displacement",
    content: `
## Calculating Displacement

**Displacement** measures how aggressively the next candle moved after the rejection.

**It's the fingerprint of institutional conviction.**

### Which Candle?

**Candle 3 — the one AFTER the rejection candle.**

- Candle 1 = previous
- Candle 2 = the rejection (measured for wick/body)
- **Candle 3 = displacement (measured for this)**

### The Formula

**For RFZ (bearish):**
\`\`\`
Displacement = Candle 2 Close − Candle 3 Close
\`\`\`

**For SFZ (bullish):**
\`\`\`
Displacement = Candle 3 Close − Candle 2 Close
\`\`\`

### The Threshold

\`\`\`
Threshold = ATR × Displacement Multiplier
\`\`\`

Default multiplier: **0.6**

**Valid if:** Displacement ≥ Threshold

### Example — SFZ (Bullish)

**Assume:**
- ATR = 400
- Multiplier = 0.6
- Threshold = **240**

**Candle 2 Close** = 208,900
**Candle 3 Close** = 209,300

\`\`\`
Displacement = 209,300 − 208,900 = 400
400 ≥ 240 ✅ VALID
\`\`\`

### Example — RFZ (Bearish)

**Assume:**
- ATR = 400
- Threshold = 240

**Candle 2 Close** = 209,400
**Candle 3 Close** = 208,800

\`\`\`
Displacement = 209,400 − 208,800 = 600
600 ≥ 240 ✅ VALID
\`\`\`

### The Strength Ladder

| Displacement | Meaning |
|---|---|
| < 0.3× ATR | ❌ No displacement |
| 0.3 - 0.6× ATR | ⚠️ Weak |
| = 0.6× ATR | ✅ Minimum valid |
| 0.6 - 1.0× ATR | ✅ Strong |
| ≥ 1.0× ATR | 🏆 Exceptional |

### The Shot Candle

When displacement is ≥ 1× ATR AND the body has almost no opposing wick, it's a **shot candle** — the highest-probability entry.

**The RB Validator auto-detects this.**

### What to Enter

In the RB Validator, the **Displacement Multiplier** field controls the threshold.

- Default: **0.6**
- Keep at 0.6 unless you want stricter filtering

The app does the rest.

### The Golden Rule

> "No displacement = no conviction. If the next candle didn't move hard, the 'rejection' was just noise."

---

*Continue to Chapter 39 →*
    `,
  },

  ch39: {
    title: "Finding the CE",
    content: `
## Finding the CE

The **CE (Consequent Encroachment)** is the **50% midpoint** of the Rejection Block zone.

**It is the exact price where institutions entered. It is your entry.**

### The Formula

**For RFZ (bearish):**
\`\`\`
Zone High = Wick tip (candle 2 High)
Zone Low = Body close (candle 2 Close)
CE = (Zone High + Zone Low) / 2
\`\`\`

**For SFZ (bullish):**
\`\`\`
Zone High = Body close (candle 2 Close)
Zone Low = Wick tip (candle 2 Low)
CE = (Zone High + Zone Low) / 2
\`\`\`

### Example — RFZ

- Wick tip (High) = 209,600
- Body close = 209,400

\`\`\`
CE = (209,600 + 209,400) / 2 = 209,500
\`\`\`

**CE = 209,500** — this is your entry.

### Example — SFZ

- Body close = 208,900
- Wick tip (Low) = 208,400

\`\`\`
CE = (208,900 + 208,400) / 2 = 208,650
\`\`\`

**CE = 208,650** — this is your entry.

### Why 50%?

- The **wick tip** is where price was rejected
- The **body close** is where price settled
- The **50% midpoint** is the fair value of the zone
- Institutions enter there — not at the extremes

### How It's Computed in the App

When you enter the RB zone (e.g., "209400-209600"):

- The app computes the midpoint
- CE = (209400 + 209600) / 2 = 209500
- It shows explicitly in the Consequent Encroachment section
- If enabled, it auto-fills as your entry

### The Shot from CE

**The highest-probability entry is when the shot candle launches from the CE.**

- Watch for price to tap the CE
- The next candle should be a shot (big body, small opposing wick)
- If yes → enter at CE

### The Flip

If price closes beyond the CE, the level flips:

- **Bullish CE breaks below** → becomes resistance → SELL setup
- **Bearish CE breaks above** → becomes support → BUY setup

**The CE is a level that keeps giving.**

### The Golden Rule

> "The CE is where institutions entered. Enter where they entered. Risk what they risk. Win what they win."

---

*Continue to Chapter 40 →*
    `,
  },

  ch40: {
    title: "Spotting a Sweep",
    content: `
## Spotting a Sweep

A **sweep** is when price briefly moves into a liquidity pool — triggering orders — then reverses.

**The sweep is the trap. The rejection is the evidence. Together, they are the institutional footprint.**

### What a Sweep Looks Like

**Bullish sweep (SFZ):**
- Lower wick extends below a previous swing low
- Close comes back ABOVE the swing low
- Confirms stops were swept and buyers filled

**Bearish sweep (RFZ):**
- Upper wick extends above a previous swing high
- Close comes back BELOW the swing high
- Confirms stops were swept and sellers filled

### Visual — Bullish Sweep

\`\`\`
    │   ← closes above the swing low
    │
   ╱ ╲
  │   │  ← small body
   ╲ ╱
    │
    │  ← long lower wick (swept the low)
    ▼
 Swing Low: 208,400
\`\`\`

### How to Spot It

Ask three questions:

1. **Did the wick extend beyond a previous swing?** (Yes = sweep candidate)
2. **Did the candle close back inside?** (Yes = confirmed rejection)
3. **Was there displacement after?** (Yes = institutional conviction)

**All three = valid sweep.**

### Why It Matters

A Rejection Block WITHOUT a sweep = a candle that just reversed at a level. **Might be random.**

A Rejection Block WITH a sweep = liquidity was collected, orders were filled. **Definitely institutional.**

### The Sweep Confluence Tier

The app grades sweep quality:

- 🥉 **Moderate** — RB only, no sweep
- 🥈 **High** — RB + sweep
- 🥇 **Very High** — RB + sweep + TF alignment
- 🏆 **Extreme** — RB + sweep + TF + EMA 50

**The sweep is the biggest jump in tier.**

### How to Enter It

In the Setup Planner's **Sweep Confluence** section:

1. Enter the **Swept Price** (the swing high/low that was swept)
2. The app auto-checks if it's inside the RB zone
3. If yes → sweep confirmed ✅
4. Tier auto-computes

### Common Mistakes

- ❌ Confusing the wick tip with the close
- ❌ Marking a sweep when the close stayed beyond the level (that's a break, not a sweep)
- ❌ Ignoring the sweep — treating the RB alone as enough

### The Golden Rule

> "A Rejection Block without a sweep is a guess. A Rejection Block WITH a sweep is a confirmed institutional footprint. Trade the evidence — not the guess."

---

*End of Part 4 — Continue to Part 5 (Worked Examples) in Stage 5 →*
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