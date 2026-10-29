"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// Reusable components (same pattern as FwtManualPage)
// ============================================================

function Section({ id, title, emoji, children, accent = "sky" }) {
  const accentMap = {
    sky:     "border-sky-800 text-sky-300",
    blue:    "border-blue-800 text-blue-300",
    purple:  "border-purple-800 text-purple-300",
    emerald: "border-emerald-800 text-emerald-300",
    orange:  "border-orange-800 text-orange-300",
    yellow:  "border-yellow-800 text-yellow-300",
    red:     "border-red-800 text-red-300",
    gray:    "border-gray-800 text-gray-300",
    teal:    "border-teal-800 text-teal-300",
  };
  const cls = accentMap[accent] || accentMap.sky;

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
    gray:   "border-gray-700 bg-gray-900/40",
    green:  "border-green-700 bg-green-950/20 text-green-200",
    red:    "border-red-700 bg-red-950/20 text-red-200",
    yellow: "border-yellow-700 bg-yellow-950/20 text-yellow-200",
    blue:   "border-blue-700 bg-blue-950/20 text-blue-200",
    sky:    "border-sky-700 bg-sky-950/20 text-sky-200",
    teal:   "border-teal-700 bg-teal-950/20 text-teal-200",
    purple: "border-purple-700 bg-purple-950/20 text-purple-200",
  };
  return (
    <div className={`p-3 rounded-lg border ${toneMap[tone]}`}>
      <p className="text-xs">{children}</p>
    </div>
  );
}

function FieldGuide({ label, field, description }) {
  return (
    <div className="p-2 rounded bg-black border border-gray-800 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-white">{label}</p>
        <span className="text-[10px] text-gray-500 font-mono">{field}</span>
      </div>
      <p className="text-[11px] text-gray-400">{description}</p>
    </div>
  );
}

// ============================================================
// Main AIDM Manual Page
// ============================================================
export default function AidmManualPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <button
            type="button"
            onClick={() => router.push("/aidm")}
            className="text-xs text-sky-300 hover:text-sky-200 mb-2"
          >
            ← Back to AIDM System
          </button>
          <h1 className="text-3xl font-bold">📐 AIDM System Manual</h1>
          <p className="text-gray-400 text-sm mt-1">
            APEX-IDM — the complete institutional flow blueprint
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Philosophy, dealing-range mapping, kill zones, structure shift, and sniper execution.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
          <p className="text-xs font-bold text-sky-300 uppercase tracking-wider">Contents</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
            {[
              { id: "philosophy", label: "1. The Core Philosophy" },
              { id: "map", label: "2. The Map (Range + CE + OTE)" },
              { id: "time-trap", label: "3. Time & Trap (Kill Zones)" },
              { id: "structure", label: "4. Structure Shift (MSS + FVG)" },
              { id: "entry", label: "5. Sniper Entry (Deep vs Shallow)" },
              { id: "risk", label: "6. Risk & Targets" },
              { id: "field-guide", label: "7. Form Field Guide" },
              { id: "golden-rules", label: "8. The 10 Golden Rules" },
              { id: "mistakes", label: "9. Common Mistakes" },
              { id: "checklist", label: "10. Pre-Trade Checklist" },
            ].map((t) => (
              <a key={t.id} href={`#${t.id}`} className="text-sky-300 hover:text-sky-200 py-0.5">
                {t.label}
              </a>
            ))}
          </div>
        </div>

        {/* 1. Philosophy */}
        <Section id="philosophy" title="The Core Philosophy" emoji="🧭" accent="sky">
          <Rule tone="sky">
            <strong>The market is a breathing mechanism.</strong> It accumulates, it manipulates (sweeps liquidity), and it distributes (delivers to the opposite liquidity pool). We do not predict — we wait for the algorithm to sweep ERL, shift structure, and offer a precise entry at IRL during specific time windows.
          </Rule>
          <p>
            AIDM is a <strong>model of the institutional algorithm</strong>, not a pattern. Every element maps to one of three phases: Accumulation (range forming), Manipulation (sweep of ERL), Distribution (delivery to the opposite DOL).
          </p>
          <SubSection title="ERL vs IRL">
            <p>
              <strong>ERL (External Range Liquidity)</strong> — the high or low of the dealing range. Old highs (BSL) and old lows (SSL). These are the pools institutions need to fill orders.
            </p>
            <p>
              <strong>IRL (Internal Range Liquidity)</strong> — the FVGs, order blocks, and equilibria inside the range. These are the entry POIs <em>after</em> the sweep.
            </p>
          </SubSection>
        </Section>

        {/* 2. Map */}
        <Section id="map" title="The Map (Range + CE + OTE)" emoji="🗺️" accent="blue">
          <SubSection title="The Dealing Range (The Container)">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Daily Range:</strong> High and Low of the previous <em>closed</em> daily candle. Never use an open candle — the high/low is a moving target until close.</li>
              <li><strong>4H / 1H Ranges:</strong> Most recent swing High and Low inside the Daily range.</li>
            </ul>
          </SubSection>

          <SubSection title="The 50% CE (Equilibrium)">
            <Rule tone="yellow">
              <strong>Formula:</strong> CE = (Range High + Range Low) ÷ 2
            </Rule>
            <p>
              CE splits the range into <strong>Premium</strong> (above, expensive, sell zone) and <strong>Discount</strong> (below, cheap, buy zone). It is the institutional battlefield and fair price.
            </p>
          </SubSection>

          <SubSection title="The OTE (Optimal Trade Entry)">
            <p>The 62–79% retracement band is where institutions trap retail traders.</p>
            <Rule tone="green">
              <strong>Bullish (Buy in Discount):</strong><br />
              62% = Low + (Size × 0.62)<br />
              79% = Low + (Size × 0.79)<br />
              → POI sits <em>below</em> CE.
            </Rule>
            <Rule tone="red">
              <strong>Bearish (Sell in Premium):</strong><br />
              62% = High − (Size × 0.62)<br />
              79% = High − (Size × 0.79)<br />
              → POI sits <em>above</em> CE.
            </Rule>
            <p className="text-xs text-gray-500 italic">
              The engine auto-computes these from the range High/Low and direction. You never enter them manually.
            </p>
          </SubSection>

          <SubSection title="Draw on Liquidity (DOL)">
            <p>
              Find the nearest ERL in the direction of your bias. If you can't identify a clear DOL, you don't have a trade.
            </p>
          </SubSection>
        </Section>

        {/* 3. Time & Trap */}
        <Section id="time-trap" title="Time & Trap (Kill Zones)" emoji="⏰" accent="orange">
          <SubSection title="Kill Zones">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>London Open:</strong> 02:00–05:00 EST</li>
              <li><strong>New York AM:</strong> 07:00–10:00 EST</li>
            </ul>
            <Rule tone="orange">
              <strong>Rule:</strong> Outside these windows — do nothing. Noon chop and Asian lunch are where retail dies.
            </Rule>
          </SubSection>

          <SubSection title="Daily Wick (AMD)">
            <p>Every candle is a story:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Open = Accumulation</strong></li>
              <li><strong>Wick = Manipulation (Judas Swing)</strong></li>
              <li><strong>Body = Distribution (the true move)</strong></li>
            </ul>
            <Rule tone="purple">
              A 4H bullish bias with a massive upper wick is a trap — the manipulation was up, the distribution is down.
            </Rule>
          </SubSection>

          <SubSection title="The Sweep (ERL)">
            <p>
              Price must sweep a major high or low (BSL/SSL) to trap retail and provide fuel. Without a sweep, there is no manipulation — and no high-probability trade.
            </p>
            <Rule tone="red">
              <strong>Sweep side must match direction:</strong> Bearish → BSL swept above. Bullish → SSL swept below.
            </Rule>
          </SubSection>
        </Section>

        {/* 4. Structure Shift */}
        <Section id="structure" title="Structure Shift (MSS + FVG)" emoji="🔍" accent="purple">
          <SubSection title="Inducement (IDM)">
            <p>
              After the sweep, price creates a small swing low (or high). This is the "bait" — retail stop losses sit just behind it.
            </p>
          </SubSection>

          <SubSection title="MSS (Market Structure Shift)">
            <p>
              Price aggressively breaks the IDM with a <strong>massive displacement candle</strong> that leaves a <strong>Fair Value Gap (FVG)</strong> behind it.
            </p>
            <Rule tone="red">
              ❌ CHoCH on weak, overlapping candles = trap.<br />
              ✅ CHoCH on a displacement candle with FVG = MSS. Only trade the MSS.
            </Rule>
          </SubSection>

          <SubSection title="HTF Veto">
            <Rule tone="red">
              <strong>The 4H sets the Entry Bias — the Daily sets the Ultimate Limit.</strong> If the Daily is Bearish and the 4H prints a Bullish BOS, that BOS is a Premium Retracement designed to trap buyers. Until the Daily makes a Higher High (CHoCH), only look for Shorts on the 1H/15M.
            </Rule>
          </SubSection>
        </Section>

        {/* 5. Sniper Entry */}
        <Section id="entry" title="Sniper Entry (Deep vs Shallow)" emoji="🎯" accent="emerald">
          <SubSection title="Scenario 1 — Deep Pullback (Standard OTE)">
            <ul className="list-disc list-inside space-y-1">
              <li>Price drops aggressively, breaking the 50% CE</li>
              <li>Pullback UP into the 62–79% OTE (Discount zone for bullish / Premium for bearish)</li>
              <li>Wait for a 5M/1M Bearish MSS + FVG inside the OTE</li>
              <li>Enter on the 1M rejection block inside the 5M FVG</li>
            </ul>
          </SubSection>

          <SubSection title="Scenario 2 — Shallow Pullback (Aggressive)">
            <Rule tone="yellow">
              In violent trends, the market never reaches deep OTE. If the HTF trend is aggressive and the pullback taps the <strong>50 EMA</strong> or an FVG inside the discount zone (for shorts), you may take the trade <strong>IF and only IF</strong> you get a lower-timeframe CHoCH. Because you are entering in the "wrong" zone, your stop loss must be razor-thin — just above the pullback high.
            </Rule>
          </SubSection>

          <SubSection title="Origin Retest (Turtle Soup / Breaker)">
            <p>
              When price retraces to the absolute origin of a major move (the sweep that started the BOS), it must make a decision:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Breaks it</strong> → the trend is dead.</li>
              <li><strong>Wicks it and reverses</strong> (Breaker Block) → highest probability entry in the entire system.</li>
            </ul>
          </SubSection>

          <SubSection title="EQH / EQL Magnet">
            <p>
              Equal Highs above price are a magnet for a Bullish DOL. Equal Lows below price are a magnet for a Bearish DOL.
            </p>
            <Rule tone="sky">
              Never short EQH until price sweeps it. Target EQH/EQL as your primary DOL.
            </Rule>
          </SubSection>
        </Section>

        {/* 6. Risk & Targets */}
        <Section id="risk" title="Risk & Targets (Delivery)" emoji="💰" accent="teal">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Entry trigger:</strong> 1M Rejection Block or 1M CHoCH inside the 5M FVG.</li>
            <li><strong>Stop Loss:</strong> Just above the IDM high (or above the 1H/4H sweep wick). Never inside the FVG.</li>
            <li><strong>Target 1 (Partial):</strong> The 50% CE. Take 50% off, move SL to Breakeven.</li>
            <li><strong>Target 2 (Final):</strong> The opposite ERL (Range Low / Deep Discount).</li>
          </ul>
          <Rule tone="yellow">
            <strong>1% rule:</strong> Never risk more than 1% of account size per trade. AIDM is a high-frequency model with a tight stop — protect the account.
          </Rule>
        </Section>

        {/* 7. Field Guide */}
        <Section id="field-guide" title="Form Field Guide" emoji="📋" accent="gray">
          <p className="text-xs text-gray-400 mb-2">Exact mapping of the AIDM form fields.</p>
          <div className="space-y-2">
            <FieldGuide label="Pair" field="pair" description="The instrument being traded." />
            <FieldGuide label="Timeframe" field="timeframe" description="The timeframe you're mapping the range on (Daily recommended)." />
            <FieldGuide label="Session" field="session" description="London or NY AM kill zone." />
            <FieldGuide label="Direction" field="direction" description="Bullish (buy in Discount) or Bearish (sell in Premium)." />
            <FieldGuide label="Range High" field="range_high" description="High of the previous closed candle." />
            <FieldGuide label="Range Low" field="range_low" description="Low of the previous closed candle." />
            <FieldGuide label="Current Price" field="current_price" description="Live price — checked against the range." />
            <FieldGuide label="Swept ERL" field="swept_erl" description="Did price sweep a major high or low?" />
            <FieldGuide label="Swept Side" field="liquidity_swept_type" description="BSL (above) or SSL (below) — must match direction." />
            <FieldGuide label="MSS Confirmed" field="mss_confirmed" description="Displacement CHoCH with FVG on the entry TF." />
            <FieldGuide label="MSS Level" field="mss_level" description="Price level of the CHoCH." />
            <FieldGuide label="FVG High/Low" field="fvg_high / fvg_low" description="The Fair Value Gap bounds created by the MSS." />
            <FieldGuide label="HTF Veto" field="structure_flipped" description="Check when the setup fights the HTF bias." />
            <FieldGuide label="Entry / SL" field="entry_price / stop_loss" description="Must be on the correct side of direction." />
            <FieldGuide label="TP1 / TP2" field="take_profit_1 / _2" description="TP1 = 50% CE. TP2 = opposite ERL." />
            <FieldGuide label="Trade Result" field="trade_result" description="Active / Won / Lost — set on the detail page." />
          </div>
        </Section>

        {/* 8. Golden Rules */}
        <Section id="golden-rules" title="The 10 Golden Rules" emoji="🏆" accent="emerald">
          <div className="space-y-2">
            {[
              "Never trade a BOS breakout. It is the trap.",
              "Never trade a CHoCH without displacement. It is a fake-out.",
              "Always wait for the sweep (Manipulation) before looking for the MSS (Distribution).",
              "A Lower Low is not a BOS unless it breaks the previous Lower Low.",
              "In a downtrend, the 50% CE and the FVG are your primary POIs.",
              "If price is in the middle of an Accumulation Range, do nothing.",
              "In a downtrend, short the Premium MSS FVG, targeting the SSL.",
              "The 50 EMA is a filter, not a checkpoint.",
              "Never risk more than 1% of your account per trade.",
              "If you don't have a clear Draw on Liquidity (DOL), you don't have a trade.",
            ].map((r, i) => (
              <Rule key={i} tone="green">
                {i + 1}. {r}
              </Rule>
            ))}
          </div>
        </Section>

        {/* 9. Mistakes */}
        <Section id="mistakes" title="Common Mistakes" emoji="⚠️" accent="red">
          <div className="space-y-2">
            {[
              {
                m: "Buying in Premium / selling in Discount",
                fix: "Bullish setups live BELOW the 50% CE. Bearish setups live ABOVE. Never reverse the zones.",
              },
              {
                m: "Entering without a sweep",
                fix: "No liquidity sweep = no manipulation = no high-probability entry. Wait.",
              },
              {
                m: "Treating every CHoCH as an MSS",
                fix: "Weak overlapping CHoCH is a trap. Demand a displacement candle with an FVG.",
              },
              {
                m: "Ignoring the Daily bias",
                fix: "A 4H reversal against a Daily trend is a retracement, not a reversal. Mark structure flipped and treat the trade accordingly.",
              },
              {
                m: "Placing SL inside the FVG",
                fix: "SL must go beyond the IDM high (or the sweep wick). Inside the FVG, you'll get wicked out.",
              },
              {
                m: "Taking profit only at TP2",
                fix: "TP1 (50% CE) is where you bank 50% and move SL to BE. TP2 is the runner.",
              },
              {
                m: "Trading outside kill zones",
                fix: "London and NY AM only. Noon chop is where edges die.",
              },
            ].map((r, i) => (
              <div key={i} className="p-3 rounded-lg border border-red-800 bg-red-950/20">
                <p className="text-sm font-bold text-red-200">❌ {r.m}</p>
                <p className="text-xs text-red-100 mt-1">✅ {r.fix}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 10. Checklist */}
        <Section id="checklist" title="Pre-Trade Checklist" emoji="✅" accent="sky">
          <p>Answer all five. If you can't, you wait.</p>
          <div className="space-y-1">
            {[
              "Where is my dealing range?",
              "Where is the 50% CE?",
              "Did we sweep the liquidity?",
              "Where is the Inducement?",
              "Did we get a displacement MSS with an FVG?",
            ].map((q, i) => (
              <Rule key={i} tone="sky">
                <strong>{i + 1}.</strong> {q}
              </Rule>
            ))}
          </div>
          <p className="text-xs text-gray-400 italic">
            If you can answer all five, you have a trade. If you can't, you wait.
          </p>
        </Section>

        {/* Footer */}
        <div className="p-4 rounded-lg border border-sky-800 bg-sky-950/20 space-y-2">
          <p className="text-sm font-bold text-sky-200">
            🎯 You&apos;ve reached the end.
          </p>
          <p className="text-xs text-gray-300">
            AIDM rewards patience. The market rewards those who wait for the sweep, wait for the MSS, and enter with a razor-thin stop at the correct zone. Every step is a filter — one wrong filter, no trade.
          </p>
          <button
            type="button"
            onClick={() => router.push("/aidm")}
            className="mt-2 w-full py-3 rounded-lg bg-sky-700 hover:bg-sky-600 font-bold text-sm"
          >
            ← Go to AIDM Setup
          </button>
        </div>
      </div>
    </main>
  );
}