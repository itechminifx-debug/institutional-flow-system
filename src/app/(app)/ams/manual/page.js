"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// Reusable components
// ============================================================

function Section({ id, title, emoji, children, accent = "red" }) {
  const accentMap = {
    red:     "border-red-800 text-red-300",
    amber:   "border-amber-800 text-amber-300",
    blue:    "border-blue-800 text-blue-300",
    purple:  "border-purple-800 text-purple-300",
    emerald: "border-emerald-800 text-emerald-300",
    orange:  "border-orange-800 text-orange-300",
    yellow:  "border-yellow-800 text-yellow-300",
    gray:    "border-gray-800 text-gray-300",
  };
  const cls = accentMap[accent] || accentMap.red;

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

function Rule({ children, tone = "gray" }) {
  const toneMap = {
    gray: "border-gray-700 bg-gray-900/40",
    green: "border-green-700 bg-green-950/20 text-green-200",
    red: "border-red-700 bg-red-950/20 text-red-200",
    yellow: "border-yellow-700 bg-yellow-950/20 text-yellow-200",
    blue: "border-blue-700 bg-blue-950/20 text-blue-200",
    amber: "border-amber-700 bg-amber-950/20 text-amber-200",
    purple: "border-purple-700 bg-purple-950/20 text-purple-200",
  };
  return (
    <div className={`p-3 rounded-lg border ${toneMap[tone]}`}>
      <p className="text-xs">{children}</p>
    </div>
  );
}

function CommandmentCard({ n, text }) {
  return (
    <div className="flex gap-2 p-2 rounded-lg border border-red-800 bg-red-950/20">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-900 text-red-200 text-xs font-bold flex items-center justify-center">
        {n}
      </span>
      <p className="text-xs text-red-100">{text}</p>
    </div>
  );
}

// ============================================================
// Main AMS Manual Page
// ============================================================
export default function AmsManualPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <button
            type="button"
            onClick={() => router.push("/ams")}
            className="text-xs text-red-300 hover:text-red-200 mb-2"
          >
            ← Back to AMS System
          </button>
          <h1 className="text-3xl font-bold">👑 Apex Master System</h1>
          <p className="text-gray-400 text-sm mt-1">
            The Complete Blueprint
          </p>
          <p className="text-gray-500 text-xs mt-2">
            The Anatomy of the Market · The Three Scenarios · The 5-Step Execution · The 10 Commandments
          </p>
        </div>

        {/* Core Philosophy */}
        <div className="p-4 rounded-lg bg-red-950/30 border-2 border-red-800 space-y-2">
          <p className="text-sm font-bold text-red-200">The Core Philosophy</p>
          <p className="text-xs text-red-100 italic leading-relaxed">
            &ldquo;The market is a breathing mechanism. It accumulates, it manipulates (sweeps liquidity),
            and it distributes (delivers to the opposite liquidity pool).
            We trade the transition from Manipulation to Distribution.&rdquo;
          </p>
        </div>

        {/* Table of Contents */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
          <p className="text-xs font-bold text-red-300 uppercase tracking-wider">Contents</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
            {[
              { id: "anatomy", label: "1. The Anatomy of the Market" },
              { id: "scenarios", label: "2. The Three Market Scenarios" },
              { id: "execution", label: "3. The 5-Step Execution ⭐" },
              { id: "commandments", label: "4. The 10 Commandments" },
              { id: "hybrid", label: "5. The Hybrid Entry System" },
              { id: "aplus", label: "6. The A+ Setup 🌟" },
              { id: "field-guide", label: "7. Form Field Guide" },
            ].map((t) => (
              <a key={t.id} href={`#${t.id}`} className="text-red-300 hover:text-red-200 py-0.5">
                {t.label}
              </a>
            ))}
          </div>
        </div>

        {/* 1. The Anatomy */}
        <Section id="anatomy" title="The Anatomy of the Market" emoji="🦴" accent="red">
          <p>
            Before you can trade, you must be able to label the chart with these <strong>three pillars</strong>:
          </p>

          <SubSection title="1. The Liquidity (The Fuel)">
            <div className="space-y-1 text-xs">
              <p><strong className="text-blue-300">BSL (Buy-Side Liquidity):</strong> Stops resting above old highs, equal highs, and lower highs.</p>
              <p><strong className="text-orange-300">SSL (Sell-Side Liquidity):</strong> Stops resting below old lows, equal lows, and higher lows.</p>
              <p><strong className="text-amber-300">ERL (External Range Liquidity):</strong> The outer edges of the dealing range (the highs and lows).</p>
              <p><strong className="text-purple-300">IRL (Internal Range Liquidity):</strong> The imbalances (FVGs) and Order Blocks inside the range.</p>
            </div>
          </SubSection>

          <SubSection title="2. The Swing Points (The Bones)">
            <div className="space-y-1 text-xs">
              <p><strong className="text-green-300">HH / HL:</strong> Higher Highs and Higher Lows (Uptrend).</p>
              <p><strong className="text-red-300">LH / LL:</strong> Lower Highs and Lower Lows (Downtrend).</p>
              <p><strong className="text-pink-300">EQH / EQL:</strong> Equal Highs and Equal Lows. These are massive liquidity magnets.</p>
            </div>
          </SubSection>

          <SubSection title="3. The Structural Breaks (The Signals)">
            <div className="space-y-1 text-xs">
              <p><strong className="text-gray-300">BOS (Break of Structure):</strong> Price breaks a swing point WITH the trend. (Continuation). <em className="text-red-300">This is the trap.</em></p>
              <p><strong className="text-yellow-300">CHoCH (Change of Character):</strong> Price breaks a swing point AGAINST the trend for the first time. (The warning).</p>
              <p><strong className="text-purple-300">MSS (Market Structure Shift):</strong> A CHoCH that happens with Displacement (a massive candle) and leaves an FVG. (The confirmation).</p>
            </div>
          </SubSection>
        </Section>

        {/* 2. The Three Scenarios */}
        <Section id="scenarios" title="The Three Market Scenarios" emoji="🎬" accent="purple">
          <p>
            The market only does three things. Here is how to trade each one.
          </p>

          <div className="mt-3 space-y-3">
            {/* Scenario A */}
            <div className="p-3 rounded-lg border border-blue-800 bg-blue-950/20">
              <p className="text-sm font-bold text-blue-200">📈 Scenario A: The Healthy Trend (Continuation)</p>
              <div className="mt-2 space-y-1 text-xs text-gray-300">
                <p><strong>The Setup:</strong> Price is making LH and LL (or HH and HL).</p>
                <p><strong>The Move:</strong> Price drops, makes a new LL (BOS), pulls back to an IRL (FVG), and drops again (BOS).</p>
                <p><strong>The Trade:</strong> Sell the pullback into the IRL (FVG). Target the next ERL (SSL).</p>
              </div>
            </div>

            {/* Scenario B */}
            <div className="p-3 rounded-lg border border-orange-800 bg-orange-950/20">
              <p className="text-sm font-bold text-orange-200">🔄 Scenario B: The Reversal (Trend Change)</p>
              <div className="mt-2 space-y-1 text-xs text-gray-300">
                <p><strong>The Setup:</strong> Price is making LH and LL.</p>
                <p><strong>The Manipulation:</strong> Price sweeps a major SSL (old low) with a long wick.</p>
                <p><strong>The Shift:</strong> Price rallies and breaks the most recent Internal Lower High with a massive candle (MSS). It leaves an FVG.</p>
                <p><strong>The Trade:</strong> Buy the pullback into the MSS FVG.</p>
                <p><strong>Target 1:</strong> The First Lower High (ERL).</p>
                <p><strong>Target 2:</strong> The Higher High (Macro BSL).</p>
              </div>
            </div>

            {/* Scenario C */}
            <div className="p-3 rounded-lg border border-purple-800 bg-purple-950/20">
              <p className="text-sm font-bold text-purple-200">📦 Scenario C: The Accumulation Range (The Coil)</p>
              <div className="mt-2 space-y-1 text-xs text-gray-300">
                <p><strong>The Setup:</strong> Price is trapped between a Higher High (ERL/BSL) and a Lower Low (ERL/SSL). It is chopping in the middle (IRL).</p>
                <p><strong>The Manipulation:</strong> Price suddenly breaks out of the range—either sweeping the High or sweeping the Low.</p>
                <p><strong>The Shift:</strong> After the sweep, price aggressively reverses back into the range with an MSS.</p>
                <p><strong>The Trade:</strong> Enter on the MSS, targeting the opposite edge of the range.</p>
              </div>
            </div>
          </div>
        </Section>

        {/* 3. The 5-Step Execution */}
        <Section id="execution" title="The 5-Step Execution" emoji="⭐" accent="amber">
          <p>
            Here is the exact checklist you run on every chart.
          </p>

          <div className="mt-3 space-y-2">
            {[
              {
                n: 1,
                title: "The D1 (Daily) Context",
                items: [
                  "What is the macro bias? (HH/HL or LH/LL?)",
                  "Where is the next major DOL? (ERL).",
                  "Are we in Premium or Discount?",
                ],
              },
              {
                n: 2,
                title: "The M30 (30-Minute) Trap",
                items: [
                  "Wait for the Kill Zone (London or NY).",
                  "Wait for a Liquidity Sweep of a major high or low (ERL). Retail traders enter; you wait.",
                  "Wait for the MSS (Displacement candle that breaks the internal swing point and leaves an FVG).",
                ],
              },
              {
                n: 3,
                title: "The M1 (1-Minute) Trigger",
                items: [
                  "Wait for price to pull back into the M30 FVG (IRL).",
                  "Drop to M1. Wait for a 1M Rejection Block or a 1M CHoCH.",
                  "Enter the trade.",
                ],
              },
              {
                n: 4,
                title: "The Risk",
                items: [
                  "Stop Loss: Just above the sweep wick (the tip of the manipulation).",
                  "Target: The next pool of liquidity (IRL, then ERL).",
                ],
              },
              {
                n: 5,
                title: "The Management",
                items: [
                  "Take 50% profit at the first IRL.",
                  "Move Stop Loss to Breakeven.",
                  "Let the rest run to the ERL.",
                ],
              },
            ].map((step) => (
              <div key={step.n} className="p-3 rounded-lg border border-amber-800/60 bg-amber-950/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-900 text-amber-200 text-xs font-bold flex items-center justify-center">
                    {step.n}
                  </span>
                  <p className="text-sm font-bold text-amber-200">{step.title}</p>
                </div>
                <ul className="text-xs text-gray-300 space-y-1 ml-8 list-disc">
                  {step.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* 4. The 10 Commandments */}
        <Section id="commandments" title="The 10 Commandments" emoji="📜" accent="red">
          <p>
            These are the non-negotiable rules. The AMS engine scores every setup against all 10. <strong>4 of them are hard blocks</strong> — you cannot save a Final setup if any of those fail.
          </p>

          <div className="mt-3 space-y-1.5">
            <CommandmentCard n={1} text="Never trade a BOS breakout. It is the trap. (Hard Block)" />
            <CommandmentCard n={2} text="Never trade a CHoCH without displacement. It is a fake-out. (Hard Block)" />
            <CommandmentCard n={3} text="Always wait for the Sweep (Manipulation) before looking for the MSS (Distribution)." />
            <CommandmentCard n={4} text="A Lower Low is not a BOS unless it breaks the previous Lower Low." />
            <CommandmentCard n={5} text="A Lower High is the level that must break to create a Bullish MSS." />
            <CommandmentCard n={6} text="If price is in the middle of an Accumulation Range, do nothing. (Hard Block)" />
            <CommandmentCard n={7} text="In a downtrend, you short the Premium MSS FVG, targeting the SSL." />
            <CommandmentCard n={8} text="The 50 EMA is a filter, not a checkpoint." />
            <CommandmentCard n={9} text="Never risk more than 1% of your account per trade." />
            <CommandmentCard n={10} text="If you don't have a clear Draw on Liquidity (DOL), you don't have a trade. (Hard Block)" />
          </div>

          <Rule tone="red">
            <strong>The 4 hard blocks:</strong> #1 (BOS), #2 (CHoCH without displacement), #6 (middle of range), #10 (no DOL). If any of these fail, the engine locks the Save Final button.
          </Rule>
        </Section>

        {/* 5. The Hybrid Entry System */}
        <Section id="hybrid" title="The Hybrid Entry System" emoji="⚔️" accent="purple">
          <p>
            The AMS gives you two ways to enter: <strong>AUTO</strong> (the system computes) or <strong>MANUAL</strong> (you enter, the engine validates).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="p-3 rounded-lg border border-blue-800 bg-blue-950/20">
              <p className="text-sm font-bold text-blue-200">🤖 AUTO</p>
              <p className="text-xs text-gray-300 mt-2">The engine computes:</p>
              <ul className="text-xs text-gray-400 mt-1 ml-4 list-disc space-y-0.5">
                <li><strong>Entry</strong> = CE of the active IRL zone</li>
                <li><strong>SL</strong> = beyond the sweep extreme</li>
                <li><strong>TP1</strong> = the sweep level (IRL target)</li>
                <li><strong>TP2</strong> = the D1 DOL</li>
              </ul>
              <p className="text-[10px] text-blue-300/70 mt-2">Read-only. Just review and save.</p>
            </div>
            <div className="p-3 rounded-lg border border-purple-800 bg-purple-950/20">
              <p className="text-sm font-bold text-purple-200">✍️ MANUAL</p>
              <p className="text-xs text-gray-300 mt-2">You enter, the engine checks:</p>
              <ul className="text-xs text-gray-400 mt-1 ml-4 list-disc space-y-0.5">
                <li>Entry must be inside the IRL zone</li>
                <li>SL must be beyond the sweep extreme</li>
                <li>TP2 must be in the correct direction</li>
                <li>TP1 direction (if set)</li>
              </ul>
              <p className="text-[10px] text-purple-300/70 mt-2">Each field gets its own pass/fail.</p>
            </div>
          </div>

          <Rule tone="purple">
            <strong>Why this matters:</strong> The system stores <em>all three</em> sets of values — auto, manual, and active (what you actually traded). Over time, you can compare your manual entries to what the system would have done. If AUTO consistently beats you, follow it. If you beat it, trust your reads.
          </Rule>
        </Section>

        {/* 6. The A+ Setup */}
        <Section id="aplus" title="The A+ Setup" emoji="🌟" accent="yellow">
          <p>
            The highest-quality AMS setup is when <strong>all 10 Commandments pass</strong> AND the <strong>50 EMA is aligned</strong> with the D1 bias.
          </p>

          <div className="mt-3 p-4 rounded-lg border-2 border-amber-500 bg-amber-950/30 space-y-2">
            <p className="text-sm font-bold text-amber-200">🌟 A+ Setup Conditions:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs text-amber-100">
              <li>All 10 Commandments pass (score 10/10)</li>
              <li>50 EMA aligned with D1 bias (price above for bullish, below for bearish)</li>
              <li>No hard-block violations</li>
            </ul>
            <p className="text-xs text-amber-300/90 italic mt-2">
              When the card shows the gold 🌟 A+ badge, these are the highest-probability trades in the entire IFS system — size up here, not on the weaker setups.
            </p>
          </div>
        </Section>

        {/* 7. Field Guide */}
        <Section id="field-guide" title="Form Field Guide" emoji="📋" accent="gray">
          <p className="text-xs text-gray-400 mb-2">Exact mapping of the AMS form fields.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { l: "Scenario", f: "scenario", d: "Trend / Reversal / Range — locks the form until picked." },
              { l: "D1 Bias", f: "d1_bias", d: "Bullish or bearish macro direction." },
              { l: "D1 Range High/Low", f: "d1_range_high/low", d: "The dealing range for premium/discount." },
              { l: "Current Price", f: "current_price", d: "Live price for zone + anatomy calculations." },
              { l: "DOL Type & Level", f: "dol_type / dol_level", d: "The Draw on Liquidity — the ultimate target." },
              { l: "50 EMA", f: "ema50_value", d: "Optional. Enables A+ detection." },
              { l: "Last HH/HL/LH/LL", f: "last_hh/hl/lh/ll", d: "Swing points — the bones." },
              { l: "EQH/EQL", f: "eqh_eql_level", d: "Optional magnet level." },
              { l: "BOS / CHoCH / MSS", f: "bos/choch/mss_level", d: "Structural break levels — the signals." },
              { l: "IRL Type/Bounds", f: "pullback_irl_*", d: "Scenario A only: the pullback FVG/OB." },
              { l: "Session", f: "session", d: "London or NY AM (Scenarios B/C)." },
              { l: "Sweep Dir/Level", f: "m30_sweep_*", d: "Scenarios B/C: the Judas Swing." },
              { l: "M30 MSS", f: "m30_mss_*", d: "Scenarios B/C: the confirmed shift + FVG." },
              { l: "M1 Trigger", f: "m1_trigger_type", d: "CHoCH / Rejection / Both." },
              { l: "M1 Entry Price", f: "m1_entry_price", d: "Where you actually entered." },
              { l: "Entry Mode", f: "entry_mode", d: "AUTO (system) or MANUAL (user)." },
              { l: "Manual Entry/SL/TP", f: "manual_*", d: "Your values when in manual mode." },
              { l: "TP1 Taken", f: "tp1_taken", d: "Marks the partial at 50%." },
            ].map((f, i) => (
              <div key={i} className="p-2 rounded bg-black border border-gray-800">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white">{f.l}</p>
                  <span className="text-[10px] text-gray-500 font-mono">{f.f}</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{f.d}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div className="p-4 rounded-lg border border-red-800 bg-red-950/20 space-y-2">
          <p className="text-sm font-bold text-red-200">
            👑 You&apos;ve reached the end of the Apex Master System blueprint.
          </p>
          <p className="text-xs text-gray-300">
            You now have the knowledge to read the market. You know what a trap is (BOS). You know what a reversal is (MSS). You know where the money is (ERL). And you know where to enter (IRL FVG).
          </p>
          <p className="text-xs text-red-200/80 italic mt-2">
            The knowledge is complete. The practice begins now.
          </p>
          <button
            type="button"
            onClick={() => router.push("/ams")}
            className="mt-2 w-full py-3 rounded-lg bg-red-700 hover:bg-red-600 font-bold text-sm"
          >
            ← Go to AMS Setup
          </button>
        </div>
      </div>
    </main>
  );
}