"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// Reusable components
// ============================================================

function Section({ id, title, emoji, children, accent = "teal" }) {
  const accentMap = {
    teal: "border-teal-800 text-teal-300",
    blue: "border-blue-800 text-blue-300",
    purple: "border-purple-800 text-purple-300",
    emerald: "border-emerald-800 text-emerald-300",
    orange: "border-orange-800 text-orange-300",
    yellow: "border-yellow-800 text-yellow-300",
    red: "border-red-800 text-red-300",
    gray: "border-gray-800 text-gray-300",
  };
  const cls = accentMap[accent] || accentMap.teal;

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
    teal: "border-teal-700 bg-teal-950/20 text-teal-200",
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
// Main FWT Manual Page
// ============================================================
export default function FwtManualPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <button
            type="button"
            onClick={() => router.push("/fwt")}
            className="text-xs text-teal-300 hover:text-teal-200 mb-2"
          >
            ← Back to FWT System
          </button>
          <h1 className="text-3xl font-bold">🕯️ FWT System Manual</h1>
          <p className="text-gray-400 text-sm mt-1">
            4-Hour Wick Trap — Quick Profits Within 4 Hours
          </p>
          <p className="text-gray-500 text-xs mt-2">
            The complete reference — philosophy, the trap mechanics, entry triggers, and execution.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
          <p className="text-xs font-bold text-teal-300 uppercase tracking-wider">Contents</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
            {[
              { id: "philosophy", label: "1. The Core Philosophy" },
              { id: "amd-candle", label: "2. AMD Inside a Candle" },
              { id: "the-sequence", label: "3. The 4-Step Sequence ⭐" },
              { id: "mode", label: "4. Live vs Closed Mode" },
              { id: "visual", label: "5. The Visual Playbook" },
              { id: "field-guide", label: "6. Form Field Guide" },
              { id: "golden-rules", label: "7. Golden Rules" },
              { id: "mistakes", label: "8. Common Mistakes" },
            ].map((t) => (
              <a key={t.id} href={`#${t.id}`} className="text-teal-300 hover:text-teal-200 py-0.5">
                {t.label}
              </a>
            ))}
          </div>
        </div>

        {/* 1. Philosophy */}
        <Section id="philosophy" title="The Core Philosophy" emoji="🧭">
          <Rule tone="teal">
            <strong>The 4H candle is a container.</strong> The Open is accumulation, the Wick is manipulation, the Close is distribution.
          </Rule>

          <p>
            A single 4-Hour candle represents <strong>240 minutes of price action</strong>. To a retail trader, it&apos;s just a big red or green block. To you, it is a 4-hour movie of Accumulation, Manipulation, and Distribution.
          </p>

          <p>
            Your job is to ignore the close of the 4H candle. By the time a 4H candle closes, the move is usually already done. <strong>You want to trade inside the wick.</strong>
          </p>

          <SubSection title="Why the Wick is the Trap">
            <p>
              The wick is where institutions push price beyond a prior high or low to trigger retail stop-losses (Buy-Side or Sell-Side liquidity). The retail crowd thinks it&apos;s a breakout and piles in. Institutions use that burst of volume to fill their own large positions in the opposite direction.
            </p>
            <p>
              The wick is the <strong>manipulation phase</strong>. Your entry lives inside it, not after it.
            </p>
          </SubSection>

          <SubSection title="Why This System is a Cheat Code">
            <p>
              When you look at a 4H chart, you see 1 candle. When you drop to the 1M chart, you see 240 candles. Within a single 4H wick there is a whole 1M structure: a sweep, a CHoCH, an FVG, a rejection block.
            </p>
            <p>
              You cannot see the 1M rejection on the 4H chart. But if you wait for the 4H to sweep liquidity, then drop to the 1M to find the rejection, you can enter with a 5-pip stop loss and catch a 100-pip move.
            </p>
          </SubSection>
        </Section>

        {/* 2. AMD Inside a Candle */}
        <Section id="amd-candle" title="AMD Inside a 4H Candle" emoji="🎬" accent="purple">
          <p>
            Every 4H candle follows a three-act play:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
            <div className="p-3 rounded-lg border border-blue-800 bg-blue-950/20">
              <p className="text-xs font-bold text-blue-300">A — Accumulation</p>
              <p className="text-[11px] text-gray-400 mt-1">The Open. Quiet consolidation inside the candle as institutions quietly build.</p>
            </div>
            <div className="p-3 rounded-lg border border-orange-800 bg-orange-950/20">
              <p className="text-xs font-bold text-orange-300">M — Manipulation</p>
              <p className="text-[11px] text-gray-400 mt-1">The Wick. Sharp false move that sweeps liquidity and traps retail.</p>
            </div>
            <div className="p-3 rounded-lg border border-green-800 bg-green-950/20">
              <p className="text-xs font-bold text-green-300">D — Distribution</p>
              <p className="text-[11px] text-gray-400 mt-1">The Body / Close. The real move toward the DOL.</p>
            </div>
          </div>

          <Rule tone="purple">
            <strong>Read the candle as AMD:</strong> If the wick is on the top, the manipulation was up (a trap for buyers) and the distribution is down. If the wick is on the bottom, the manipulation was down (a trap for sellers) and the distribution is up.
          </Rule>
        </Section>

        {/* 3. The Sequence */}
        <Section id="the-sequence" title="The 4-Step Sequence" emoji="⭐" accent="teal">
          <p>
            FWT is a strict sequence. You cannot skip a step. The engine blocks saving if any step is missing.
          </p>

          <div className="space-y-2 mt-3">
            {[
              {
                n: 1,
                title: "Bias + Candle Bounds",
                tf: "4H",
                job: "Set the HTF bias and mark the current 4H candle's Open, High, Low, (Close if Closed mode).",
                steps: [
                  "Daily bias must be clear (Bullish or Bearish)",
                  "Log the current 4H candle bounds",
                  "Current price must be inside the candle range",
                  "In Closed mode, the candle close must also be logged",
                ],
              },
              {
                n: 2,
                title: "The 4H Wick (Manipulation)",
                tf: "4H",
                job: "Identify which wick is the trap and confirm the rejection.",
                steps: [
                  "Upper wick = trap for buyers → expect short",
                  "Lower wick = trap for sellers → expect long",
                  "Wick extreme must be at or beyond the candle high/low",
                  "Swept liquidity must match the wick (BSL for upper, SSL for lower)",
                  "Wick confirmed when price rejects it (not just touches)",
                ],
              },
              {
                n: 3,
                title: "15M Structure Shift",
                tf: "15M",
                job: "Wait for the CHoCH and mark the FVG inside the wick zone.",
                steps: [
                  "Wait for a 15M CHoCH (candle close below/above the last 15M swing)",
                  "Log the CHoCH price level",
                  "Mark the 15M FVG that formed from the CHoCH leg",
                  "The FVG must sit inside the wick zone (between the CHoCH and the wick extreme)",
                ],
              },
              {
                n: 4,
                title: "1M Entry Trigger",
                tf: "1M / 5M",
                job: "Drop to 1M and wait for the CHoCH or rejection block inside the 15M FVG.",
                steps: [
                  "Wait for a 1M CHoCH OR a 1M rejection block",
                  "Enter at the 1M FVG inside the 15M FVG",
                  "Stop Loss just beyond the 4H wick extreme",
                  "Target the opposite side of the 4H candle (or next ERL)",
                ],
              },
            ].map((l) => (
              <div key={l.n} className="p-3 rounded-lg border border-teal-800/60 bg-teal-950/20">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-bold text-teal-200">
                    Step {l.n} — {l.title}
                  </p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-900/40 text-teal-300 font-bold">
                    {l.tf}
                  </span>
                </div>
                <p className="text-xs text-gray-300 mt-1">{l.job}</p>
                <ul className="text-xs text-gray-400 mt-2 space-y-1 ml-4 list-disc">
                  {l.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* 4. Mode */}
        <Section id="mode" title="Live vs Closed Mode" emoji="🔄" accent="blue">
          <p>
            FWT supports two modes — because the 4H candle is either still forming (Live) or has already closed (Closed).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="p-3 rounded-lg border border-cyan-800 bg-cyan-950/20">
              <p className="text-xs font-bold text-cyan-300">🟦 Live (intra-candle)</p>
              <p className="text-[11px] text-gray-300 mt-1">
                You&apos;re entering while the 4H candle is still forming. The wick is live, the trigger is live. Fastest but requires candle close confirmation.
              </p>
              <p className="text-[10px] text-gray-500 mt-2">Candle close is optional</p>
            </div>
            <div className="p-3 rounded-lg border border-purple-800 bg-purple-950/20">
              <p className="text-xs font-bold text-purple-300">🟪 Closed (post-candle)</p>
              <p className="text-[11px] text-gray-300 mt-1">
                The 4H candle has closed with a confirmed rejection wick. You enter on the retracement in the NEXT candle. Slower but safer.
              </p>
              <p className="text-[10px] text-gray-500 mt-2">Candle close is required</p>
            </div>
          </div>

          <Rule tone="blue">
            <strong>Which should you use?</strong> Use <strong>Live</strong> if you have screen time and can act quickly. Use <strong>Closed</strong> if you set alerts and want a mechanical, backtestable edge. Both are valid.
          </Rule>
        </Section>

        {/* 5. Visual */}
        <Section id="visual" title="The Visual Playbook" emoji="📊" accent="orange">
          <p>
            Here is the exact sequence of what you see on the chart:
          </p>

          <div className="p-4 rounded-lg bg-black border border-gray-800 font-mono text-xs space-y-1">
            <p className="text-gray-400">[ 4H CANDLE ]</p>
            <p className="text-orange-300">      │  ◄── (1) Upper Wick Sweeps BSL (Retail Buys)</p>
            <p className="text-orange-300">      │</p>
            <p className="text-blue-300">      │  ◄── (2) You drop to 15M/1M here</p>
            <p className="text-blue-300">      │</p>
            <p className="text-yellow-300">      │  ◄── (3) Enter Short on 1M Rejection Block</p>
            <p className="text-yellow-300">      │</p>
            <p className="text-green-300">      │  ◄── (4) Target: The bottom of the 4H candle</p>
            <p className="text-gray-400">      ▼ (Close)</p>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            The card draws this visually. Every line on the card shows you where price is relative to the Open, Wick, Entry, SL and TP.
          </p>
        </Section>

        {/* 6. Field Guide */}
        <Section id="field-guide" title="Form Field Guide" emoji="📋" accent="gray">
          <p className="text-xs text-gray-400 mb-2">Exact mapping of the FWT form fields.</p>
          <div className="space-y-2">
            <FieldGuide label="Pair" field="pair" description="The instrument being traded." />
            <FieldGuide label="Session" field="session" description="Which 4H window: Asian, London, NY AM, NY PM." />
            <FieldGuide label="Mode" field="mode" description="Live (intra-candle) or Closed (post-candle)." />
            <FieldGuide label="Daily Bias" field="daily_bias" description="HTF direction — bullish or bearish." />
            <FieldGuide label="Current Price" field="current_price" description="Live price (used to check position inside the candle)." />
            <FieldGuide label="Candle Open/High/Low/Close" field="candle_*" description="The exact bounds of the current 4H candle." />
            <FieldGuide label="Wick Direction" field="wick_direction" description="Upper wick (trap for buyers) or Lower wick (trap for sellers)." />
            <FieldGuide label="Wick Extreme" field="wick_extreme" description="The exact wick high/low — this becomes your SL reference." />
            <FieldGuide label="Liquidity Swept Type" field="liquidity_swept_type" description="BSL (upper) or SSL (lower) — auto-matched to wick direction." />
            <FieldGuide label="Swept Level" field="liquidity_swept_level" description="The price of the prior high/low that was swept." />
            <FieldGuide label="Wick Confirmed" field="wick_confirmed" description="Did price reject the wick, or is it still forming?" />
            <FieldGuide label="15M CHoCH" field="m15_choch_confirmed" description="Confirmed structure shift on the 15M chart." />
            <FieldGuide label="15M CHoCH Level" field="m15_choch_level" description="The price the 15M CHoCH broke." />
            <FieldGuide label="15M FVG High/Low" field="m15_fvg_*" description="The 15M FVG bounds — must sit inside the wick zone." />
            <FieldGuide label="1M CHoCH" field="m1_choch_confirmed" description="Confirmed structure shift on the 1M chart." />
            <FieldGuide label="1M Rejection Block" field="m1_rejection_present" description="1M rejection candle (alternative to CHoCH)." />
            <FieldGuide label="Entry Price" field="entry_price" description="The price you fill at." />
            <FieldGuide label="Stop Loss" field="stop_loss" description="Must be beyond the wick extreme." />
            <FieldGuide label="Target Price" field="target_price" description="Opposite side of the 4H candle, or next ERL." />
          </div>
        </Section>

        {/* 7. Golden Rules */}
        <Section id="golden-rules" title="Golden Rules" emoji="🏆" accent="emerald">
          <div className="space-y-2">
            {[
              "The wick is the trap. The body is the move. Trade inside the wick, not after the close.",
              "The wick must sweep liquidity — a random wick is not a trap.",
              "Wick confirmation requires a rejection, not just a touch. If price hovers at the wick, wait.",
              "The 15M CHoCH is non-negotiable. No CHoCH, no trade.",
              "The 15M FVG must sit inside the wick zone. If it's outside, skip.",
              "The 1M trigger (CHoCH or rejection) is your timing tool. Do not enter early.",
              "The stop goes just beyond the wick extreme — this is what makes the R:R massive.",
              "RR must be ≥ 2:1. This is a quick-profit system. If the RR isn't there, the target is wrong.",
              "If the sequence is incomplete, do not force it. The engine will block you.",
              "Live mode = aggressive, Closed mode = mechanical. Both are valid — match your temperament.",
            ].map((r, i) => (
              <Rule key={i} tone="green">
                {i + 1}. {r}
              </Rule>
            ))}
          </div>
        </Section>

        {/* 8. Mistakes */}
        <Section id="mistakes" title="Common Mistakes" emoji="⚠️" accent="red">
          <div className="space-y-2">
            {[
              { m: "Waiting for the 4H candle to close", fix: "By the time it closes, the body has already been delivered. Enter inside the wick." },
              { m: "Entering without the 15M CHoCH", fix: "The wick is the reason. The CHoCH is the confirmation. No CHoCH, no trade." },
              { m: "Placing the stop too far above the wick", fix: "Keep the SL tight — just beyond the wick extreme + a small buffer. If it's too wide, the R:R collapses." },
              { m: "Trading a wick that didn't sweep liquidity", fix: "The wick must have taken out a prior high/low. A random wick is just noise." },
              { m: "Entering at the 15M FVG top instead of the 1M FVG inside", fix: "The 1M FVG inside the 15M FVG is the precision entry. That's where the R:R lives." },
              { m: "Targeting a fixed pip amount instead of the opposite candle side", fix: "The target is structural — the opposite side of the 4H candle. Not a round number." },
              { m: "Using Closed mode data in Live mode (or vice versa)", fix: "In Live mode, the candle is still forming — do not assume the wick is complete. In Closed mode, the candle is final." },
            ].map((r, i) => (
              <div key={i} className="p-3 rounded-lg border border-red-800 bg-red-950/20">
                <p className="text-sm font-bold text-red-200">❌ {r.m}</p>
                <p className="text-xs text-red-100 mt-1">✅ {r.fix}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div className="p-4 rounded-lg border border-teal-800 bg-teal-950/20 space-y-2">
          <p className="text-sm font-bold text-teal-200">
            🎯 You&apos;ve reached the end.
          </p>
          <p className="text-xs text-gray-300">
            The 4H Wick Trap is a precision system. It rewards patience — wait for the wick, wait for the CHoCH, and enter with a razor-thin stop. The reward is catching the entire body of the candle with a fraction of the risk.
          </p>
          <button
            type="button"
            onClick={() => router.push("/fwt")}
            className="mt-2 w-full py-3 rounded-lg bg-teal-700 hover:bg-teal-600 font-bold text-sm"
          >
            ← Go to FWT Setup
          </button>
        </div>
      </div>
    </main>
  );
}