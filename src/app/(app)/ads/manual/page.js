"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// Reusable components
// ============================================================

function Section({ id, title, emoji, children, accent = "amber" }) {
  const accentMap = {
    amber:   "border-amber-800 text-amber-300",
    blue:    "border-blue-800 text-blue-300",
    purple:  "border-purple-800 text-purple-300",
    emerald: "border-emerald-800 text-emerald-300",
    orange:  "border-orange-800 text-orange-300",
    yellow:  "border-yellow-800 text-yellow-300",
    red:     "border-red-800 text-red-300",
    gray:    "border-gray-800 text-gray-300",
  };
  const cls = accentMap[accent] || accentMap.amber;

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
// Main ADS Manual Page
// ============================================================
export default function AdsManualPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <button
            type="button"
            onClick={() => router.push("/ads")}
            className="text-xs text-amber-300 hover:text-amber-200 mb-2"
          >
            ← Back to ADS System
          </button>
          <h1 className="text-3xl font-bold">👑 Apex Deep Search Manual</h1>
          <p className="text-gray-400 text-sm mt-1">
            D1 Narrative → M30 Trap → M1 Trigger
          </p>
          <p className="text-gray-500 text-xs mt-2">
            The complete blueprint — the WHERE, the WHEN, and the HOW.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
          <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">Contents</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
            {[
              { id: "golden-rule", label: "1. The Golden Rule" },
              { id: "phase-1", label: "2. Phase 1 — D1 Narrative (WHERE)" },
              { id: "phase-2", label: "3. Phase 2 — M30 Trap (WHEN)" },
              { id: "phase-3", label: "4. Phase 3 — M1 Trigger (HOW)" },
              { id: "red-flags", label: "5. The Red Flags ⚠️" },
              { id: "aplus", label: "6. The A+ Setup 🌟" },
              { id: "field-guide", label: "7. Form Field Guide" },
              { id: "execution", label: "8. Execution Rules" },
            ].map((t) => (
              <a key={t.id} href={`#${t.id}`} className="text-amber-300 hover:text-amber-200 py-0.5">
                {t.label}
              </a>
            ))}
          </div>
        </div>

        {/* Golden Rule */}
        <Section id="golden-rule" title="The Golden Rule" emoji="👑">
          <Rule tone="amber">
            <strong>The D1 tells you WHERE. The M30 tells you WHEN. The M1 tells you HOW. If you don&apos;t have all three, you don&apos;t have a trade.</strong>
          </Rule>
          <p>
            The Apex Deep Search System is a <strong>three-layer framework</strong> that combines the macro narrative of the Daily, the manipulation of the 30-Minute, and the sniper execution of the 1-Minute.
          </p>
          <p>
            Every setup must pass all three phases. If any phase is incomplete, the engine blocks you from saving. This is not a suggestion — it is the enforcement of the system.
          </p>
          <SubSection title="The Three Layers">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
              <div className="p-3 rounded-lg border border-blue-800 bg-blue-950/20">
                <p className="text-xs font-bold text-blue-300">D1 Narrative</p>
                <p className="text-[11px] text-gray-400 mt-1">WHERE — Bias, Range, DOL.</p>
              </div>
              <div className="p-3 rounded-lg border border-orange-800 bg-orange-950/20">
                <p className="text-xs font-bold text-orange-300">M30 Trap</p>
                <p className="text-[11px] text-gray-400 mt-1">WHEN — Kill Zone, Sweep, CHoCH, FVG.</p>
              </div>
              <div className="p-3 rounded-lg border border-emerald-800 bg-emerald-950/20">
                <p className="text-xs font-bold text-emerald-300">M1 Trigger</p>
                <p className="text-[11px] text-gray-400 mt-1">HOW — Rejection, CHoCH, Entry, Razor SL.</p>
              </div>
            </div>
          </SubSection>
        </Section>

        {/* Phase 1 */}
        <Section id="phase-1" title="Phase 1 — D1 Narrative (WHERE)" emoji="🌍" accent="blue">
          <p>
            Determine the macro direction, the dealing range, and the ultimate target. You do this <strong>once a day</strong>, before the session opens.
          </p>

          <SubSection title="Step 1: Identify the Bias">
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
              <li>Look at the last 3–5 swing highs and lows on the D1 chart.</li>
              <li><strong>Bullish:</strong> Higher Highs (HH) + Higher Lows (HL).</li>
              <li><strong>Bearish:</strong> Lower Highs (LH) + Lower Lows (LL).</li>
              <li>Rule: You <strong>only trade in the direction of the D1 bias</strong>.</li>
            </ul>
          </SubSection>

          <SubSection title="Step 2: Mark the Dealing Range">
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
              <li>Mark the most recent major D1 Swing High and Swing Low.</li>
              <li>Draw the 50% CE (Equilibrium).</li>
              <li>Identify if price is in <strong>Premium</strong> (expensive) or <strong>Discount</strong> (cheap).</li>
            </ul>
          </SubSection>

          <SubSection title="Step 3: Identify the Draw on Liquidity (DOL)">
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
              <li>Where is the nearest major pool of External Range Liquidity (ERL)?</li>
              <li>If Bearish, target the nearest major low (SSL). If Bullish, target the nearest major high (BSL).</li>
            </ul>
          </SubSection>

          <SubSection title="Step 4: Mark Daily FVGs">
            <p>
              Look for any massive Fair Value Gaps left on the D1 chart. These are your macro POIs.
            </p>
          </SubSection>

          <Rule tone="blue">
            <strong>Bonus — 50 EMA Confluence:</strong> If price is aligned with the 50 EMA (above for bullish, below for bearish), it confirms the trend. If not, the setup is counter-trend — reduce risk.
          </Rule>
        </Section>

        {/* Phase 2 */}
        <Section id="phase-2" title="Phase 2 — M30 Trap (WHEN)" emoji="🪤" accent="orange">
          <p>
            Wait for the market to trap retail traders and shift structure. You only do this during the London or New York Kill Zones.
          </p>

          <SubSection title="Step 1: The Kill Zone">
            <Rule tone="red">
              Do not do anything outside of <strong>London (2:00–5:00 AM EST)</strong> or <strong>New York AM (7:00–10:00 AM EST)</strong>.
            </Rule>
          </SubSection>

          <SubSection title="Step 2: The Sweep (The Judas Swing)">
            <p>
              Watch the M30 chart. Wait for price to push aggressively into an old high or low (the ERL).
            </p>
            <p className="text-xs text-gray-400 italic mt-1">
              Example: If the D1 bias is Bearish, wait for the M30 to push UP and sweep the Asian Session High (BSL). Retail traders buy the breakout. You wait.
            </p>
          </SubSection>

          <SubSection title="Step 3: The Shift (MSS / CHoCH)">
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
              <li>After the sweep, price must reverse aggressively.</li>
              <li>Wait for an M30 candle to close past the most recent M30 swing point (against the retail trap).</li>
              <li>This CHoCH <strong>must leave a Fair Value Gap (FVG) or an Order Block (OB)</strong> behind.</li>
              <li>If there is no FVG/OB, the shift is fake. <strong>Abort.</strong></li>
            </ul>
          </SubSection>

          <SubSection title="Step 4: Mark the POI">
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
              <li>Mark the M30 FVG left by the CHoCH.</li>
              <li>Ensure it sits in the correct Premium/Discount zone of the D1 range.</li>
              <li><strong>Bonus Confluence:</strong> If the 50 EMA overlaps this FVG, grade it as an A+ setup.</li>
            </ul>
          </SubSection>
        </Section>

        {/* Phase 3 */}
        <Section id="phase-3" title="Phase 3 — M1 Trigger (HOW)" emoji="🎯" accent="emerald">
          <p>
            Snipe the exact entry with a tiny stop loss. You only drop to the M1 when price is already inside the M30 POI.
          </p>

          <SubSection title="Step 1: The Pullback">
            <p>Price pulls back into the M30 FVG.</p>
          </SubSection>

          <SubSection title="Step 2: The IRL Wick (Rejection Block)">
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
              <li>Watch the M1 chart as price enters the FVG.</li>
              <li>Look for a <strong>Rejection Block</strong> (a long wick poking into the FVG that closes back out).</li>
              <li>Look for a <strong>1M CHoCH</strong> (a 1M candle closing past a recent 1M swing point).</li>
            </ul>
          </SubSection>

          <SubSection title="Step 3: The Entry">
            <p>
              Enter as soon as the 1M CHoCH closes, or on the retest of the 1M FVG created by that CHoCH.
            </p>
          </SubSection>

          <SubSection title="Step 4: Stop Loss (The Razor-Thin Stop)">
            <p>
              Place your Stop Loss just beyond the tip of the M30 Sweep Wick (the highest point of the Judas Swing).
            </p>
            <Rule tone="red">
              <strong>Why?</strong> Because if price goes back above that wick, the trap has failed, and the D1 bias is wrong.
            </Rule>
          </SubSection>

          <SubSection title="Step 5: Take Profit (The DOL)">
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
              <li><strong>Target 1 (Partial):</strong> The nearest Internal Range Liquidity (IRL) or M30 swing point. Take 50% off. Move Stop Loss to Breakeven.</li>
              <li><strong>Target 2 (Final):</strong> The D1 Draw on Liquidity (the ERL) you identified in Phase 1.</li>
            </ul>
          </SubSection>
        </Section>

        {/* Red Flags */}
        <Section id="red-flags" title="The Red Flags (When to Abort)" emoji="🚨" accent="red">
          <div className="space-y-2">
            {[
              { n: 1, flag: "Wrong Time", detail: "Setup happens outside the Kill Zone. (Abort)." },
              { n: 2, flag: "No Sweep", detail: "Price didn't take out an old high or low. (Abort)." },
              { n: 3, flag: "Weak CHoCH", detail: "The M30 shift didn't leave an FVG. (Abort)." },
              { n: 4, flag: "Wrong Zone", detail: "The M30 FVG is in the Discount zone on a Bearish setup. (Proceed with extreme caution or abort)." },
              { n: 5, flag: "No M1 Trigger", detail: "Price hit the M30 FVG, but the M1 didn't create a CHoCH or Rejection Block. (Do not front-run. Wait)." },
            ].map((r) => (
              <div key={r.n} className="p-3 rounded-lg border border-red-800 bg-red-950/20">
                <p className="text-sm font-bold text-red-200">🚩 #{r.n} — {r.flag}</p>
                <p className="text-xs text-red-100 mt-1">{r.detail}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* A+ Setup */}
        <Section id="aplus" title="The A+ Setup" emoji="🌟" accent="yellow">
          <p>
            The highest-quality Apex Deep Search setup is when all three phases align <strong>and</strong> the 50 EMA overlaps the M30 FVG.
          </p>

          <div className="mt-3 p-4 rounded-lg border-2 border-amber-500 bg-amber-950/30 space-y-2">
            <p className="text-sm font-bold text-amber-200">🌟 A+ Setup Conditions:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs text-amber-100">
              <li>D1 bias aligned with 50 EMA (price above EMA for bullish, below for bearish)</li>
              <li>M30 FVG sits <strong>on or contains</strong> the 50 EMA value</li>
              <li>All three phases pass the sequence</li>
            </ul>
            <p className="text-xs text-amber-300/90 italic mt-2">
              When this happens, the card shows a gold 🌟 A+ badge. These are the highest-probability trades in the system — size up here, not on the weaker setups.
            </p>
          </div>
        </Section>

        {/* Field Guide */}
        <Section id="field-guide" title="Form Field Guide" emoji="📋" accent="gray">
          <p className="text-xs text-gray-400 mb-2">Exact mapping of the ADS form fields.</p>
          <div className="space-y-2">
            <FieldGuide label="Pair" field="pair" description="The instrument being traded." />
            <FieldGuide label="D1 Bias" field="d1_bias" description="Bullish or bearish — determines the trade direction." />
            <FieldGuide label="D1 Range High/Low" field="d1_range_high / d1_range_low" description="The D1 dealing range for premium/discount." />
            <FieldGuide label="Current Price" field="current_price" description="Live price, checked against the D1 range." />
            <FieldGuide label="DOL Type" field="dol_type" description="BSL, SSL, or ERL — the ultimate target." />
            <FieldGuide label="DOL Level" field="dol_level" description="The exact price of the Draw on Liquidity." />
            <FieldGuide label="50 EMA Value" field="ema50_value" description="Optional — enables A+ detection and EMA conflict warning." />
            <FieldGuide label="Session" field="session" description="London or NY AM — hard-blocked if outside." />
            <FieldGuide label="M30 Sweep Direction" field="m30_sweep_direction" description="Upper (BSL) or Lower (SSL)." />
            <FieldGuide label="M30 Sweep Level" field="m30_sweep_level" description="The extreme of the Judas Swing — SL reference." />
            <FieldGuide label="M30 CHoCH Confirmed" field="m30_choch_confirmed" description="Structural break on the M30." />
            <FieldGuide label="M30 CHoCH Level" field="m30_choch_level" description="The price where structure broke." />
            <FieldGuide label="M30 FVG High/Low" field="m30_fvg_high / m30_fvg_low" description="The entry zone. Must exist." />
            <FieldGuide label="M1 CHoCH" field="m1_choch_confirmed" description="Lower-TF structure break as the trigger." />
            <FieldGuide label="M1 Rejection Block" field="m1_rejection_present" description="Alternative trigger — a wick poking into the FVG." />
            <FieldGuide label="M1 Entry Price" field="m1_entry_price" description="Where you actually entered." />
            <FieldGuide label="Stop Loss" field="stop_loss" description="Beyond the M30 sweep extreme." />
            <FieldGuide label="TP1 (Partial)" field="tp1_price" description="Nearest IRL — take 50% off, move SL to BE." />
            <FieldGuide label="TP2 (Final)" field="tp2_price" description="The D1 DOL — required." />
          </div>
        </Section>

        {/* Execution */}
        <Section id="execution" title="Execution Rules" emoji="⚔️" accent="amber">
          <div className="space-y-2">
            {[
              "Never trade outside London or NY AM Kill Zones.",
              "The M30 sweep must actually take out a prior high or low. No sweep, no trade.",
              "The M30 CHoCH must leave an FVG. Without it, the shift is fake.",
              "The stop loss is razor-thin — beyond the M30 sweep extreme, not the FVG edge.",
              "At TP1, take 50% off and move SL to break-even. This is non-negotiable.",
              "Run the remainder to TP2 — the D1 DOL. Do not exit early on fear.",
              "If the setup is A+ (50 EMA overlaps M30 FVG), size up. Otherwise, normal risk.",
              "If the M30 FVG is in the wrong D1 zone, reduce risk to 0.25–0.5%.",
            ].map((r, i) => (
              <Rule key={i} tone="amber">
                {i + 1}. {r}
              </Rule>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div className="p-4 rounded-lg border border-amber-800 bg-amber-950/20 space-y-2">
          <p className="text-sm font-bold text-amber-200">
            👑 You&apos;ve reached the end of the Apex Deep Search blueprint.
          </p>
          <p className="text-xs text-gray-300">
            The system is complete. The three timeframes, the three phases, the enforcement — it&apos;s all built in. The market will still be here tomorrow. Trade with discipline.
          </p>
          <button
            type="button"
            onClick={() => router.push("/ads")}
            className="mt-2 w-full py-3 rounded-lg bg-amber-700 hover:bg-amber-600 font-bold text-sm"
          >
            ← Go to ADS Setup
          </button>
        </div>
      </div>
    </main>
  );
}