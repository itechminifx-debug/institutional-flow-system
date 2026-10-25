"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// Reusable Components
// ============================================================

function Section({ id, title, emoji, children, accent = "cyan" }) {
  const accentMap = {
    cyan:    "border-cyan-800 text-cyan-300",
    blue:    "border-blue-800 text-blue-300",
    purple:  "border-purple-800 text-purple-300",
    emerald: "border-emerald-800 text-emerald-300",
    amber:   "border-amber-800 text-amber-300",
    gray:    "border-gray-800 text-gray-300",
  };
  const cls = accentMap[accent] || accentMap.cyan;

  return (
    <section id={id} className="scroll-mt-20">
      <div className={`border-l-4 pl-4 py-1 ${cls.split(" ")[0]}`}>
        <h2 className={`text-xl font-bold ${cls.split(" ")[1]}`}>{emoji} {title}</h2>
      </div>
      <div className="mt-3 space-y-4 text-sm text-gray-300 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function SubSection({ title, children }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-bold text-white mb-2">{title}</h3>
      <div className="space-y-2 text-sm text-gray-300">{children}</div>
    </div>
  );
}

function Rule({ children, tone = "gray" }) {
  const toneMap = {
    gray: "border-gray-700 bg-gray-900/40",
    green: "border-green-700 bg-green-950/20 text-green-200",
    red: "border-red-700 bg-red-950/20 text-red-200",
    cyan: "border-cyan-700 bg-cyan-950/20 text-cyan-200",
  };
  return (
    <div className={`p-3 rounded-lg border ${toneMap[tone]}`}>
      <p className="text-xs">{children}</p>
    </div>
  );
}

function ChapterSummary({ title, points }) {
  return (
    <div className="p-3 rounded-lg bg-gray-900 border border-cyan-900/50 space-y-2 mb-4">
      <p className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Chapter Summary — {title}</p>
      <ul className="list-disc list-inside space-y-1 ml-2 text-xs text-cyan-100/80">
        {points.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
    </div>
  );
}

// ============================================================
// Main Manual Page
// ============================================================
export default function IctManualPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <button
            type="button"
            onClick={() => router.push("/ict")}
            className="text-xs text-cyan-300 hover:text-cyan-200 mb-2"
          >
            ← Back to ICT Core Doctrine
          </button>
          <h1 className="text-3xl font-bold">📖 The ICT Trading Course</h1>
          <p className="text-gray-400 text-sm mt-1">
            From Beginner to Advanced — Understand, Execute, and Manage Trades
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Full text and chapter summaries. The complete reference for the Core Doctrine system.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
          <p className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Table of Contents</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
            {[
              { id: "part-1", label: "Part I — Foundations & Mindset" },
              { id: "part-2", label: "Part II — The Language of Price" },
              { id: "part-3", label: "Part III — Liquidity (The Engine)" },
              { id: "part-4", label: "Part IV — PD Arrays (The Toolkit)" },
              { id: "part-5", label: "Part V — Time & The Models" },
              { id: "part-6", label: "Part VI — Execution, Risk & Becoming a Trader" },
            ].map((t) => (
              <a key={t.id} href={`#${t.id}`} className="text-cyan-300 hover:text-cyan-200 py-0.5">
                {t.label}
              </a>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/* PART I — FOUNDATIONS */}
        {/* ============================================================ */}
        <Section id="part-1" title="Part I — Foundations & Mindset" emoji="🧭">
          <ChapterSummary
            title="Chapters 1-5"
            points={[
              "Read this course in order. Each part depends on the last.",
              "The core premise: Price is engineered to reach liquidity.",
              "Markets are not random. They are delivered by institutions.",
              "Retail traders provide the fuel (liquidity) for institutions.",
            ]}
          />

          <SubSection title="Ch 2: What ICT Trading Really Is">
            <p>
              The central premise of ICT can be stated in one sentence: <strong>price is engineered to reach liquidity.</strong>
            </p>
            <p>
              Markets are not a random walk of buyers and sellers meeting by chance. Price is delivered, deliberately, toward the places where orders are resting. If you can identify those places, you can anticipate where price is likely to go rather than merely reacting after it has already moved.
            </p>
            <p>
              Almost all retail education is built on indicators (RSI, MACD). These lag. They tell you what price <em>has already done</em>. Worse, because they are so widely used, institutions know exactly where indicator-based traders will act, and can engineer price to trigger those actions.
            </p>
            <p>
              ICT discards indicators entirely and reads price directly: the structure it forms, the liquidity it leaves, and the footprints (order blocks, fair value gaps) that institutional activity prints into the chart.
            </p>
          </SubSection>

          <SubSection title="Ch 3: Why Price is Engineered">
            <p>
              Imagine you need to buy a genuinely large position. If you simply market-buy, you will eat through every sell order available, pushing price sharply up against yourself. For an institution moving size, this problem is enormous. They cannot simply &quot;buy&quot;. They must find, or manufacture, enough opposing orders to fill against without moving price to their disadvantage.
            </p>
            <p>
              The most reliable place to find a pool of opposing orders is at obvious levels (support/resistance). Below an obvious support sit the stop-losses of everyone who bought that support. When an institution needs to buy, it drives price down into that sell-side pool, triggers those stops, and buys against them at a discount. To the retail trader, it looks like support failed. Mechanically, the institution just used that pool as fuel.
            </p>
          </SubSection>

          <SubSection title="Ch 4: Who Moves the Market">
            <p>
              You can divide market participants into two groups: the large, informed players (banks, hedge funds) and retail traders. The first group must engineer liquidity to operate. The second group, taught by mainstream education to trade obvious patterns, unknowingly provides that liquidity.
            </p>
            <p>
              You do not beat the institution by out-muscling it. You profit by recognising what it is doing and positioning alongside it. You are small and nimble. You do not have the institution&apos;s problem of size; you can enter and exit in a heartbeat.
            </p>
          </SubSection>
        </Section>

        {/* ============================================================ */}
        {/* PART II — LANGUAGE OF PRICE */}
        {/* ============================================================ */}
        <Section id="part-2" title="Part II — The Language of Price" emoji="📊" accent="blue">
          <ChapterSummary
            title="Chapters 6-10"
            points={[
              "Candles: Wicks are rejection. Bodies are conviction.",
              "Structure is the sequence of swings (HH/HL, LH/LL).",
              "BOS breaks with the trend. CHoCH breaks against it.",
              "Buy in Discount, Sell in Premium.",
              "Displacement is the quality filter for all structure breaks.",
            ]}
          />

          <SubSection title="Ch 6: Reading Candles">
            <p>
              A candlestick summarises one period of trading. The most useful habit you can build is reading <strong>wicks as rejection</strong>. A long wick means price tried to go somewhere and was forced back. The market rejected that level. A long lower wick says buyers overwhelmed a push down; a long upper wick says sellers slammed a push up.
            </p>
            <p>
              The <strong>body</strong>, by contrast, shows conviction: a large body closing near its extreme says one side was firmly in control for that period.
            </p>
          </SubSection>

          <SubSection title="Ch 7 & 8: Market Structure, BOS & CHoCH">
            <p>
              Structure is simply the sequence of its turning points. An uptrend is a market making higher highs and higher lows. A downtrend is the mirror: lower highs and lower lows.
            </p>
            <p>
              A <strong>Break of Structure (BOS)</strong> happens when price breaks the most recent swing point <em>in the direction of the trend</em>. It confirms the uptrend is intact.
            </p>
            <p>
              A <strong>Change of Character (CHoCH)</strong> is the first break <em>against</em> the trend. In an uptrend of higher highs and higher lows, the moment price breaks below the most recent higher low, the pattern is broken. That is the earliest structural signal that control may be shifting.
            </p>
            <Rule tone="cyan">
              The distinction in one line: a BOS breaks structure WITH the trend and signals continuation; a CHoCH breaks structure AGAINST the trend and signals a possible reversal.
            </Rule>
          </SubSection>

          <SubSection title="Ch 9: Dealing Range & Premium/Discount">
            <p>
              Retail traders think in horizontal lines — support here, resistance there. Institutions think in ranges. A dealing range is the span between a significant swing low and a significant swing high.
            </p>
            <p>
              Split the dealing range in half at its midpoint (Equilibrium). The upper half is <strong>Premium</strong>: price here is relatively expensive, the region you want to be selling from. The lower half is <strong>Discount</strong>: price is relatively cheap, the region you want to be buying from.
            </p>
            <Rule tone="cyan">Buy in discount, sell in premium. A perfect PD array in the wrong half of the range is a trade to skip.</Rule>
          </SubSection>

          <SubSection title="Ch 10: Displacement & Delivery">
            <p>
              Displacement is a strong, purposeful move — a run of large-bodied candles travelling decisively in one direction. It is the visual signature of institutions committing size. Ordinary price movement is choppy and two-sided; displacement is one-sided and urgent.
            </p>
            <p>
              Whenever you are about to trust a move — a break of structure, a reversal, a change of character — ask: <strong>did it happen on displacement?</strong> A break with displacement is intent. A break without it is often a trap that will be reclaimed.
            </p>
          </SubSection>
        </Section>

        {/* ============================================================ */}
        {/* PART III — LIQUIDITY */}
        {/* ============================================================ */}
        <Section id="part-3" title="Part III — Liquidity (The Engine)" emoji="💧" accent="emerald">
          <ChapterSummary
            title="Chapters 11-15"
            points={[
              "Liquidity = Resting orders (stops, limits).",
              "BSL rests above old highs. SSL rests below old lows.",
              "A Sweep wicks past and reverses. A Run closes through and continues.",
              "The Draw on Liquidity (DOL) is where price is being delivered.",
            ]}
          />

          <SubSection title="Ch 11 & 12: What Liquidity Is">
            <p>
              In ICT, liquidity means pools of resting orders — real stops waiting to be triggered, and pending orders waiting to be filled. They cluster at predictable places, and because institutions need them to fill size, price is drawn toward them.
            </p>
            <p>
              <strong>Buy-Side Liquidity (BSL)</strong> rests above price (above old highs). It is made of buy orders: the stop-losses of short-sellers (closing a short means buying) and the buy-stop entries of breakout traders. Counter-intuitively, a run up into this zone often precedes a move down.
            </p>
            <p>
              <strong>Sell-Side Liquidity (SSL)</strong> rests below price (below old lows). A run down into this zone often precedes a move up.
            </p>
          </SubSection>

          <SubSection title="Ch 13: Sweeps & Runs">
            <p>
              When price reaches a pool, one of two things happens.
            </p>
            <p>
              A <strong>Sweep</strong> (also called a raid or a stop hunt) pierces the level with a wick and then reverses — price pokes past the equal highs, triggers the orders, and closes back below. The liquidity was taken; there was no genuine intent to go higher. <strong>Expect a reversal.</strong>
            </p>
            <p>
              A <strong>Run</strong> (a genuine breakout) closes decisively through the level and continues — the level is broken, not raided. <strong>Expect continuation.</strong>
            </p>
            <Rule tone="cyan">The test is the close, not the touch. This one distinction will keep you out of countless bad trades.</Rule>
          </SubSection>

          <SubSection title="Ch 14 & 15: The Draw on Liquidity (DOL)">
            <p>
              The draw on liquidity is your judgement about which liquidity pool price is most likely being delivered toward right now. It is the master question of ICT trading, because it sets both your direction (you trade toward the draw) and your target (the draw is where you take profit).
            </p>
            <p>
              There is usually liquidity in both directions. Judging the draw means deciding which is the more likely destination. Structure tips the balance: an uptrend biases the draw toward buy-side liquidity above. Recent sweeps tip it: if price just took sell-side liquidity below and reversed, the draw has likely flipped up.
            </p>
            <Rule tone="cyan">Before every trade, state the draw out loud: &apos;price is in discount, structure is bullish, buy-side liquidity above is untapped — the draw is up.&apos; If you cannot state a clear draw, you do not have a trade.</Rule>
          </SubSection>
        </Section>

        {/* ============================================================ */}
        {/* PART IV — PD ARRAYS */}
        {/* ============================================================ */}
        <Section id="part-4" title="Part IV — PD Arrays (The Toolkit)" emoji="🧰" accent="purple">
          <ChapterSummary
            title="Chapters 16-20"
            points={[
              "PD Arrays are the footprints institutions leave behind.",
              "Order Block: The last opposing candle before displacement.",
              "FVG: The gap left by a 3-candle rapid move.",
              "The best entries are where an OB overlaps an FVG (Confluence).",
            ]}
          />

          <SubSection title="Ch 16: The Institutional Footprint">
            <p>
              PD Array stands for Price Delivery Array — a structure left in price by institutional activity, which price tends to react to when it returns. Every PD array shares one underlying idea: it marks a price level where institutions have unfinished business.
            </p>
          </SubSection>

          <SubSection title="Ch 17: Order Blocks (OB)">
            <p>
              An order block is the last opposing candle before a strong displacement move — the last down-candle before a sharp rally (a bullish order block), or the last up-candle before a sharp drop (a bearish order block).
            </p>
            <p>
              Before institutions drive price up, they must accumulate long positions — and they do so while price is still falling, in that last down-candle before the move. When price later returns to it, the institutions defend their entries, and price bounces.
            </p>
            <Rule tone="cyan">Quality checklist for an OB: (1) Strong displacement away from it. (2) It caused a structure break. (3) Correct premium/discount location. (4) Follows a liquidity sweep.</Rule>
          </SubSection>

          <SubSection title="Ch 18: Fair Value Gaps (FVG)">
            <p>
              A Fair Value Gap is an imbalance left by displacement — specifically, the gap between the high of one candle and the low of the candle two positions later, created when a large middle candle moves so fast that price skips a range.
            </p>
            <p>
              The market hates this inefficiency. Price frequently returns to the gap to let the missed orders fill before continuing in the original direction. This return is your opportunity: the gap is both a likely destination and, once reached, a precise entry.
            </p>
          </SubSection>

          <SubSection title="Ch 19: Breakers & Mitigation">
            <p>
              A <strong>Breaker Block</strong> is a failed Order Block that flips polarity. A bullish OB forms, but instead of holding, price breaks down through it and shifts structure. The level that was support has now failed, and it often flips to resistance. You trade the retest of the breaker.
            </p>
            <p>
              A <strong>Mitigation Block</strong> is a zone price returns to so institutions can mitigate (fill the remainder of their position). Unlike a breaker, no structure break is required.
            </p>
          </SubSection>

          <SubSection title="Ch 20: Confluence">
            <p>
              The skill that separates competent traders from confused ones is choosing which array to trade and stacking them into confluence. Confluence means several independent reasons pointing to the same conclusion at the same price.
            </p>
            <p>
              An order block that overlaps a fair value gap, sits in discount, points toward untapped buy-side liquidity, and formed right after a sell-side sweep is confluence — five reasons stacked at one location.
            </p>
          </SubSection>
        </Section>

        {/* ============================================================ */}
        {/* PART V — TIME & MODELS */}
        {/* ============================================================ */}
        <Section id="part-5" title="Part V — Time & The Models" emoji="⏱️" accent="amber">
          <ChapterSummary
            title="Chapters 21-25"
            points={[
              "Time is a filter. Price setups only work in Kill Zones.",
              "London and NY AM are the highest probability windows.",
              "The complete model requires a sweep, a shift, and an array in a Kill Zone.",
              "AMD: Accumulation → Manipulation → Distribution.",
            ]}
          />

          <SubSection title="Ch 21 & 22: Kill Zones">
            <p>
              The same price setup is not equally reliable at all hours. Time is not a vague backdrop; it is a structural filter as real as premium and discount.
            </p>
            <p>
              Kill zones are the session windows when institutional activity concentrates. The two windows that matter most are the <strong>London kill zone</strong> and the <strong>New York AM kill zone</strong>.
            </p>
            <Rule tone="cyan">If you did nothing but wait for high-quality setups in those two windows and ignore the rest of the day, you would be trading like a professional.</Rule>
          </SubSection>

          <SubSection title="Ch 23: The Silver Bullet">
            <p>
              Inside the kill zones sit even sharper windows — macros. The Silver Bullet is the most famous ICT timed setup. It is essentially a complete entry model constrained to a one-hour window (10:00-11:00 AM EST).
            </p>
            <p>
              Within that hour you look for a single, clean sequence: price sweeps a liquidity pool, displaces to leave a fair value gap, and you enter on the retrace into that gap, targeting the opposing liquidity.
            </p>
          </SubSection>

          <SubSection title="Ch 24: AMD (Power of 3)">
            <p>
              AMD stands for Accumulation, Manipulation, Distribution — the three phases price tends to move through, especially across a trading day.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Accumulation:</strong> Price consolidates in a range while institutions quietly build positions.</li>
              <li><strong>Manipulation:</strong> Price makes a sharp false move — sweeping liquidity on one side, trapping the crowd (The Judas Swing).</li>
              <li><strong>Distribution:</strong> Price delivers in the true direction, toward the real draw on liquidity.</li>
            </ul>
            <p>Accumulate, trick, deliver — that is the rhythm.</p>
          </SubSection>

          <SubSection title="Ch 25: The Complete Entry Model">
            <p>
              Here is the complete model, stated once: in a high-probability time window, wait for price to sweep liquidity against your intended direction, confirm a shift in structure on displacement, and enter on the retrace into the resulting PD array — in the correct premium/discount location — targeting the draw on liquidity.
            </p>
            <p>
              Every clause of that sentence is a concept you have already learned. The model is not new material; it is the ordered assembly of everything into a single, sequence. Each step gates the next. Only when all are present, in order, do you act.
            </p>
          </SubSection>
        </Section>

        {/* ============================================================ */}
        {/* PART VI — EXECUTION */}
        {/* ============================================================ */}
        <Section id="part-6" title="Part VI — Execution & Risk" emoji="🛡️" accent="gray">
          <ChapterSummary
            title="Chapters 26-32"
            points={[
              "The stop goes where the idea is wrong (beyond the sweep).",
              "Risk a fixed 1% per trade. Survival is prerequisite.",
              "Partial at 2R, move to BE, trail after the next BOS.",
              "Discipline beats intelligence. Follow your plan.",
            ]}
          />

          <SubSection title="Ch 26 & 27: Stops & Risk">
            <p>
              Your stop marks where you are wrong, not how much you are willing to lose. Find the price that invalidates the idea (beyond the sweep), place the stop there, and <em>then</em> size the position so that distance equals your chosen risk.
            </p>
            <p>
              Risk a small, fixed fraction of your account on every trade — commonly one percent. A trader risking one percent can lose ten in a row and still have ninety percent of their account; a trader risking ten percent per trade is one bad run from ruin.
            </p>
          </SubSection>

          <SubSection title="Ch 28: Managing the Trade">
            <p>
              Most trade management errors come from doing too much. Once you are in a well-defined trade with a logical stop and a liquidity target, the correct action is very often to leave it alone and let it resolve.
            </p>
            <p>
              Move to breakeven only after a logical milestone, not to soothe anxiety. Take partials if you wish, but decide the plan before you enter.
            </p>
          </SubSection>

          <SubSection title="Ch 31: Psychology">
            <p>
              The final obstacle is your own psychology. Fear makes you exit winners early; greed makes you oversize. The disciplined trader is not someone who feels no fear or greed — they feel it and follow the rules anyway.
            </p>
            <p>
              Discipline beats intelligence. A brilliant analyst who cannot follow their own rules will lose to a mediocre analyst who follows theirs mechanically.
            </p>
          </SubSection>
        </Section>

        {/* Footer */}
        <div className="p-4 rounded-lg border border-cyan-800 bg-cyan-950/20 space-y-2">
          <p className="text-sm font-bold text-cyan-200">
            📖 You have reached the end of the course.
          </p>
          <p className="text-xs text-gray-300">
            The knowledge is complete. The practice begins now. Backtest it, journal it, forward-test it, and let the edge reveal itself over a large sample.
          </p>
          <button
            type="button"
            onClick={() => router.push("/ict")}
            className="mt-2 w-full py-3 rounded-lg bg-cyan-700 hover:bg-cyan-600 font-bold text-sm"
          >
            ← Go to ICT Core Doctrine Setup
          </button>
        </div>
      </div>
    </main>
  );
}