"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// Reusable components (Borrowed from SLD Manual)
// ============================================================

function Section({ id, title, emoji, children, accent = "blue" }) {
  const accentMap = {
    blue: "border-blue-800 text-blue-300",
    purple: "border-purple-800 text-purple-300",
    emerald: "border-emerald-800 text-emerald-300",
    orange: "border-orange-800 text-orange-300",
    cyan: "border-cyan-800 text-cyan-300",
    yellow: "border-yellow-800 text-yellow-300",
    red: "border-red-800 text-red-300",
    gray: "border-gray-800 text-gray-300",
  };
  const cls = accentMap[accent] || accentMap.blue;

  return (
    <section id={id} className="scroll-mt-20">
      <div className={`border-l-4 pl-4 py-1 ${cls.split(" ")[0]}`}>
        <h2 className={`text-lg font-bold ${cls.split(" ")[1]}`}>
          {emoji} {title}
        </h2>
      </div>
      <div className="mt-3 space-y-3 text-sm text-gray-300 leading-relaxed">
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

function TermCard({ term, definition, identify, example, accent = "blue" }) {
  const [open, setOpen] = useState(false);
  const accentMap = {
    blue: "border-blue-800 bg-blue-950/20",
    emerald: "border-emerald-800 bg-emerald-950/20",
    purple: "border-purple-800 bg-purple-950/20",
    orange: "border-orange-800 bg-orange-950/20",
    cyan: "border-cyan-800 bg-cyan-950/20",
    yellow: "border-yellow-800 bg-yellow-950/20",
    red: "border-red-800 bg-red-950/20",
  };
  const cls = accentMap[accent] || accentMap.blue;

  return (
    <div className={`p-3 rounded-lg border ${cls}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left flex items-start justify-between gap-2"
      >
        <p className="text-sm font-bold text-white">{term}</p>
        <span className="text-gray-400 text-xs">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2 text-xs text-gray-300">
          <div>
            <p className="text-gray-500 uppercase tracking-wider font-semibold text-[10px]">Definition</p>
            <p className="mt-0.5">{definition}</p>
          </div>
          {identify && (
            <div>
              <p className="text-gray-500 uppercase tracking-wider font-semibold text-[10px]">How to identify it</p>
              <p className="mt-0.5">{identify}</p>
            </div>
          )}
          {example && (
            <div className="p-2 rounded bg-black/40 border border-gray-800">
              <p className="text-gray-500 uppercase tracking-wider font-semibold text-[10px]">Example</p>
              <p className="mt-0.5 italic text-gray-400">{example}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Rule({ children, tone = "gray" }) {
  const toneMap = {
    gray: "border-gray-700 bg-gray-900/40",
    green: "border-green-700 bg-green-950/20 text-green-200",
    red: "border-red-700 bg-red-950/20 text-red-200",
    yellow: "border-yellow-700 bg-yellow-950/20 text-yellow-200",
    blue: "border-blue-700 bg-blue-950/20 text-blue-200",
    purple: "border-purple-700 bg-purple-950/20 text-purple-200",
  };
  return (
    <div className={`p-3 rounded-lg border ${toneMap[tone]}`}>
      <p className="text-xs">{children}</p>
    </div>
  );
}

function Checklist({ title, items }) {
  return (
    <div className="p-3 rounded-lg border border-gray-800 bg-gray-900/40 space-y-2">
      <p className="text-xs font-bold text-white uppercase tracking-wider">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
            <span className="text-gray-500">☐</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// Main SMC Manual Page
// ============================================================
export default function SmcManualPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <button
            type="button"
            onClick={() => router.push("/smc")}
            className="text-xs text-blue-300 hover:text-blue-200 mb-2"
          >
            ← Back to SMC System
          </button>
          <h1 className="text-3xl font-bold">📘 SMC / ICT System Manual</h1>
          <p className="text-gray-400 text-sm mt-1">
            Inner Circle Trader Methodology
          </p>
          <p className="text-gray-500 text-xs mt-2">
            The complete reference — philosophy, the 6-step model, liquidity, PD arrays, time, and execution.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
          <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">Contents</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
            {[
              { id: "philosophy", label: "1. The Core Philosophy" },
              { id: "structure", label: "2. Market Structure" },
              { id: "liquidity", label: "3. Liquidity (The Engine)" },
              { id: "pd-arrays", label: "4. PD Arrays (The Toolkit)" },
              { id: "time", label: "5. Time & Kill Zones" },
              { id: "the-model", label: "6. The 6-Step Model ⭐" },
              { id: "glossary", label: "7. Full Glossary" },
              { id: "checklist", label: "8. The Checklist" },
              { id: "rules", label: "9. Golden Rules & Risk" },
            ].map((t) => (
              <a key={t.id} href={`#${t.id}`} className="text-blue-300 hover:text-blue-200 py-0.5">
                {t.label}
              </a>
            ))}
          </div>
        </div>

        {/* 1. Philosophy */}
        <Section id="philosophy" title="The Core Philosophy" emoji="🧭">
          <Rule tone="green">
            <strong>Price is engineered to reach liquidity.</strong> Markets are delivered, not random.
          </Rule>
          <p>
            Institutions cannot fill large orders at a single price. They must find, or manufacture, enough opposing orders to fill against. Where that liquidity is thin, they must engineer it by driving price into pools of resting orders (retail stop-losses).
          </p>
          <p>
            This leaves footprints. ICT is the framework for reading those footprints — structure, liquidity, and PD arrays — to anticipate where price is being delivered next.
          </p>
          <SubSection title="Reacting vs Anticipating">
            <p>
              A reactive trader sees price break resistance and buys. An anticipatory trader saw the buy-side liquidity above, waited for the sweep, and positioned for the reversal.
            </p>
          </SubSection>
        </Section>

        {/* 2. Structure */}
        <Section id="structure" title="Market Structure" emoji="⚖️" accent="purple">
          <p>
            Structure is the skeleton. It answers one question: <em>Which direction is the market currently delivering?</em>
          </p>
          <SubSection title="BOS vs CHoCH">
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
              <li><strong>BOS (Break of Structure):</strong> Break WITH the trend. Continuation.</li>
              <li><strong>CHoCH (Change of Character):</strong> First break AGAINST the trend. Reversal warning.</li>
            </ul>
          </SubSection>
          <Rule tone="purple">
            A CHoCH is only confirmed by a <strong>candle close</strong> on displacement. A wick does not count.
          </Rule>
        </Section>

        {/* 3. Liquidity */}
        <Section id="liquidity" title="Liquidity (The Engine)" emoji="💧" accent="cyan">
          <p>
            Liquidity is not abstract volume; it is resting orders at specific levels.
          </p>
          <SubSection title="BSL & SSL">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 border border-blue-800 bg-blue-950/20 rounded text-xs">
                <strong className="text-blue-300">Buy-Side (BSL)</strong>
                <p className="mt-1">Above highs. Short stops + breakout buys. Swept to sell.</p>
              </div>
              <div className="p-2 border border-orange-800 bg-orange-950/20 rounded text-xs">
                <strong className="text-orange-300">Sell-Side (SSL)</strong>
                <p className="mt-1">Below lows. Long stops + breakdown sells. Swept to buy.</p>
              </div>
            </div>
          </SubSection>
          <SubSection title="Sweep vs Run">
            <p>
              <strong>Sweep:</strong> Wicks past the level, closes back inside. (Liquidity taken, reversal expected).
            </p>
            <p>
              <strong>Run:</strong> Closes decisively through the level. (Level broken, continuation expected).
            </p>
          </SubSection>
        </Section>

        {/* 4. PD Arrays */}
        <Section id="pd-arrays" title="PD Arrays (The Toolkit)" emoji="🧰" accent="emerald">
          <p>
            PD Arrays are the footprints institutions leave behind. They mark where institutions have unfinished business.
          </p>
          <div className="space-y-2 mt-2">
            <TermCard
              term="Fair Value Gap (FVG)"
              definition="A 3-candle imbalance left by displacement. Price returns to rebalance it."
              identify="Look for a large middle candle where the wick of candle 1 and wick of candle 3 do not overlap."
              accent="blue"
            />
            <TermCard
              term="Order Block (OB)"
              definition="The last opposing candle before a strong displacement move."
              identify="For a bullish OB: the last down-candle before a strong up-move."
              accent="emerald"
            />
            <TermCard
              term="Breaker Block"
              definition="A failed Order Block that flips polarity. A bullish OB that fails becomes a bearish Breaker."
              identify="Requires a structure break through the original OB."
              accent="purple"
            />
            <TermCard
              term="Unicorn Model"
              definition="The overlap of an Order Block and a Fair Value Gap at the exact same price level."
              identify="High-confluence zone where both footprints align."
              accent="yellow"
            />
          </div>
        </Section>

        {/* 5. Time */}
        <Section id="time" title="Time & Kill Zones" emoji="⏱️" accent="orange">
          <p>
            The same setup is not equally reliable at all hours. Time is a filter.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="p-3 border border-gray-700 bg-gray-900/40 rounded">
              <p className="text-xs font-bold text-white">Asian</p>
              <p className="text-[10px] text-gray-400 mt-1">Accumulation. Sets the range.</p>
            </div>
            <div className="p-3 border border-orange-700 bg-orange-950/20 rounded">
              <p className="text-xs font-bold text-orange-300">London KZ</p>
              <p className="text-[10px] text-gray-400 mt-1">Manipulation. Judas Swing.</p>
            </div>
            <div className="p-3 border border-blue-700 bg-blue-950/20 rounded">
              <p className="text-xs font-bold text-blue-300">NY AM KZ</p>
              <p className="text-[10px] text-gray-400 mt-1">Distribution. Heaviest volume.</p>
            </div>
            <div className="p-3 border border-gray-700 bg-gray-900/40 rounded">
              <p className="text-xs font-bold text-white">NY PM</p>
              <p className="text-[10px] text-gray-400 mt-1">Secondary window.</p>
            </div>
          </div>
          <SubSection title="AMD (Power of 3)">
            <p>
              Every session has a rhythm: Accumulate (build range) → Manipulate (sweep the wrong way) → Distribute (true move). Do not trade the manipulation. Trade the distribution.
            </p>
          </SubSection>
        </Section>

        {/* 6. The Model */}
        <Section id="the-model" title="The 6-Step Complete Entry Model" emoji="🎯" accent="blue">
          <Rule tone="blue">
            In a high-probability time window, wait for price to sweep liquidity against your intended direction, confirm a shift in structure on displacement, and enter on the retrace into the resulting PD array — in the correct premium/discount location — targeting the draw on liquidity.
          </Rule>

          <div className="space-y-2 mt-3">
            {[
              { n: 1, title: "Context", detail: "Establish structure, judge the draw, and note the premium/discount split." },
              { n: 2, title: "Time", detail: "Wait for a Kill Zone. Do not act outside your window." },
              { n: 3, title: "Sweep", detail: "Wait for price to sweep liquidity against your direction." },
              { n: 4, title: "Shift", detail: "Confirm a CHoCH on displacement. Wicks do not count." },
              { n: 5, title: "Entry", detail: "Enter on the retrace into the PD Array (OB + FVG overlap is ideal)." },
              { n: 6, title: "Stop & Target", detail: "Stop just beyond the sweep extreme. Target the DOL." },
            ].map((step) => (
              <div key={step.n} className="flex gap-3 p-2 rounded bg-black/40 border border-gray-800">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900/60 text-blue-200 text-xs font-bold flex items-center justify-center">
                  {step.n}
                </span>
                <div>
                  <p className="text-xs font-bold text-white">{step.title}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 7. Glossary */}
        <Section id="glossary" title="Full Glossary" emoji="📚" accent="cyan">
          <p className="text-xs text-gray-400">Tap any term to expand.</p>
          <SubSection title="Liquidity">
            <TermCard term="Judas Swing" definition="The manipulation phase at the London Kill Zone. A false move that sweeps one side of the Asian range." accent="orange" />
            <TermCard term="Double Purge" definition="When both BSL and SSL are swept in a single session before the true move begins." accent="orange" />
            <TermCard term="Liquidity Void" definition="A price area skipped entirely. Attracts price back to fill the gap." accent="blue" />
          </SubSection>
          <SubSection title="Arrays & Models">
            <TermCard term="OTE (Optimal Trade Entry)" definition="The 61.8% - 78.6% retracement of a displacement move. The 70.5% level is the ideal." accent="emerald" />
            <TermCard term="SMT Divergence" definition="When two correlated instruments disagree at a key level (one sweeps, the other fails). Confirms a true sweep." accent="purple" />
            <TermCard term="Silver Bullet" definition="A specific FVG entry model strictly limited to the 10:00-11:00 AM EST window." accent="yellow" />
            <TermCard term="CRT (Candle Range Theory)" definition="Using a reference candle to define the range. Seek & Destroy sweeps one extreme, Delivery targets the other." accent="cyan" />
            <TermCard term="Turtle Soup" definition="A reversal entry targeting the false breakout of equal highs or equal lows." accent="red" />
          </SubSection>
        </Section>

        {/* 8. Checklist */}
        <Section id="checklist" title="The Checklist" emoji="✅" accent="yellow">
          <Checklist
            title="Pre-Trade Context"
            items={[
              "Daily bias confirmed (Bullish or Bearish)",
              "Dealing range marked (High / Low)",
              "Price is in the correct zone (Discount for longs, Premium for shorts)",
              "Inside a Kill Zone (London or NY AM)",
              "Clear Draw on Liquidity (DOL) identified",
            ]}
          />
          <Checklist
            title="The Setup"
            items={[
              "Opposing liquidity swept (BSL for shorts, SSL for longs)",
              "Sweep confirmed by a close (not just a wick)",
              "CHoCH confirmed on displacement",
              "PD Array marked (FVG, OB, or Unicorn)",
              "Entry is on the retrace into the array",
              "Stop is beyond the sweep extreme",
              "RR is at least 1:3",
            ]}
          />
          <Checklist
            title="Management"
            items={[
              "Do not meddle. Let the trade breathe.",
              "Move to break-even only after a logical milestone.",
              "Target the draw on liquidity.",
            ]}
          />
        </Section>

        {/* 9. Rules */}
        <Section id="rules" title="Golden Rules & Risk" emoji="🏆" accent="emerald">
          <div className="space-y-2">
            {[
              "Price is engineered to reach liquidity. That is the only constant.",
              "If the daily bias is unclear, do not trade.",
              "Only trade inside the London or NY AM Kill Zones.",
              "The sweep gives the reason. The CHoCH gives the trigger.",
              "A wick is not a CHoCH. Wait for the candle close.",
              "If the array is in the wrong half of the range, skip it. No chasing.",
              "The stop goes where the idea is wrong — beyond the sweep extreme.",
              "You need winners much larger than losers. Demand 1:3 minimum.",
              "Risk a fixed, small percentage (1%) per trade. Never oversize on conviction.",
              "Discipline beats intelligence. Follow the plan mechanically.",
            ].map((r, i) => (
              <Rule key={i} tone="green">
                {i + 1}. {r}
              </Rule>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div className="p-4 rounded-lg border border-blue-800 bg-blue-950/20 space-y-2">
          <p className="text-sm font-bold text-blue-200">🎯 You've reached the end.</p>
          <p className="text-xs text-gray-300">
            The knowledge is complete. The practice begins now. Backtest it, journal it, forward-test it, and let the edge reveal itself over a large sample.
          </p>
          <button
            type="button"
            onClick={() => router.push("/smc")}
            className="mt-2 w-full py-3 rounded-lg bg-blue-700 hover:bg-blue-600 font-bold text-sm"
          >
            ← Go to SMC Setup
          </button>
        </div>
      </div>
    </main>
  );
}