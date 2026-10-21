"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// Reusable components
// ============================================================

function Section({ id, title, emoji, children, accent = "orange" }) {
  const accentMap = {
    orange: "border-orange-800 text-orange-300",
    blue: "border-blue-800 text-blue-300",
    purple: "border-purple-800 text-purple-300",
    emerald: "border-emerald-800 text-emerald-300",
    cyan: "border-cyan-800 text-cyan-300",
    yellow: "border-yellow-800 text-yellow-300",
    red: "border-red-800 text-red-300",
    gray: "border-gray-800 text-gray-300",
  };
  const cls = accentMap[accent] || accentMap.orange;

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
    orange: "border-orange-700 bg-orange-950/20 text-orange-200",
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
// Main LQE Manual Page
// ============================================================
export default function LqeManualPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <button
            type="button"
            onClick={() => router.push("/lqe")}
            className="text-xs text-orange-300 hover:text-orange-200 mb-2"
          >
            ← Back to LQE System
          </button>
          <h1 className="text-3xl font-bold">⚙️ Liquidity Engine Manual</h1>
          <p className="text-gray-400 text-sm mt-1">
            The strict ICT Sequence: Context → Sweep → Structure → Ladder → Delivery
          </p>
          <p className="text-gray-500 text-xs mt-2">
            This manual explains the exact logic the LQE system uses to validate a setup.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
          <p className="text-xs font-bold text-orange-300 uppercase tracking-wider">Contents</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
            {[
              { id: "philosophy", label: "1. The Core Philosophy" },
              { id: "step-1", label: "2. Step 1 — Context & Time" },
              { id: "step-2", label: "3. Step 2 — Liquidity Sweep" },
              { id: "step-3", label: "4. Step 3 — Structure Shift" },
              { id: "step-4", label: "5. Step 4 — PD Array Matrix (Ladder)" },
              { id: "zones", label: "6. Zone Rules — Premium vs Discount" },
              { id: "step-6", label: "7. Step 5 & 6 — Delivery" },
              { id: "field-guide", label: "8. Form Field Guide" },
              { id: "golden-rules", label: "9. Golden Rules" },
            ].map((t) => (
              <a key={t.id} href={`#${t.id}`} className="text-orange-300 hover:text-orange-200 py-0.5">
                {t.label}
              </a>
            ))}
          </div>
        </div>

        {/* 1. Philosophy */}
        <Section id="philosophy" title="The Core Philosophy" emoji="🧭">
          <Rule tone="orange">
            <strong>Liquidity is the engine.</strong> Price is delivered from one pool of resting orders to another.
          </Rule>
          <p>
            The LQE system does not let you take a trade just because you see a Fair Value Gap. It enforces a strict sequence. In ICT, a setup is only valid if the context is right, the liquidity has been swept, the structure has shifted, and you are entering at the array that points toward a clear target.
          </p>
          <Rule tone="red">
            <strong>If the sequence is incomplete, the trade is invalid.</strong> The LQE engine will block you from saving a setup if you skip a step.
          </Rule>
        </Section>

        {/* 2. Step 1 */}
        <Section id="step-1" title="Step 1 — Context & Time" emoji="🌍" accent="blue">
          <p>
            Before looking for a sweep or an array, you must define the playing field.
          </p>
          <SubSection title="1. Daily Bias">
            <p>Are you bullish or bearish? You only take trades in the direction of the bias.</p>
          </SubSection>
          <SubSection title="2. Kill Zones">
            <p>
              The engine hard-filters for <strong>London (2-5 AM EST)</strong> and <strong>NY AM (7-10 AM EST)</strong>. If you are outside these windows, the context score will drop and the setup will be marked as low probability.
            </p>
          </SubSection>
          <SubSection title="3. Premium/Discount">
            <p>
              Mark your Dealing Range (High and Low). The engine checks if your current price is in the discount (for a bullish bias) or premium (for a bearish bias). If you are buying in premium, the system flags it.
            </p>
          </SubSection>
          <SubSection title="4. Zone Side Detection">
            <p>
              The engine can auto-detect whether your active array sits in Premium, Discount, or at Equilibrium — using your Dealing Range and the array&apos;s bounds. If the Dealing Range is missing or wrong, you can override the detection manually (Premium / Discount / Equilibrium).
            </p>
          </SubSection>
        </Section>

        {/* 3. Step 2 */}
        <Section id="step-2" title="Step 2 — Liquidity Sweep (AMD)" emoji="💧" accent="purple">
          <p>
            This is the Manipulation phase. Price must sweep liquidity to trap retail traders before the real move.
          </p>
          <SubSection title="Sweep Type & Level">
            <p>
              If you are bullish, you need a <strong>Sell-Side (SSL)</strong> sweep. If you are bearish, you need a <strong>Buy-Side (BSL)</strong> sweep. Enter the exact price level that was swept.
            </p>
          </SubSection>
          <SubSection title="Sweep Confirmed (Close)">
            <p>
              The engine requires the candle to <strong>close back inside the range</strong>. A wick alone is not enough. This is the &quot;Sweep vs Run&quot; distinction from the PDFs.
            </p>
          </SubSection>
          <SubSection title="SMT Divergence (Bonus)">
            <p>
              If you are watching a correlated pair (e.g., NQ and ES) and one sweeps the level while the other fails, this is SMT Divergence. Check the box if you saw it. It gives the setup a massive probability boost.
            </p>
          </SubSection>
        </Section>

        {/* 4. Step 3 */}
        <Section id="step-3" title="Step 3 — Structure Shift & Displacement" emoji="⚡" accent="emerald">
          <p>
            After the sweep, price must prove its intent by shifting structure aggressively.
          </p>
          <SubSection title="MSS & CHoCH">
            <p>
              Check both boxes if you have a <strong>Market Structure Shift (MSS)</strong> on the higher timeframe and a <strong>Change of Character (CHoCH)</strong> on the lower timeframe.
            </p>
          </SubSection>
          <SubSection title="Displacement">
            <p>
              The move must be aggressive, leaving an FVG. The engine checks the Displacement field. If there is no displacement, the CHoCH is likely a fakeout.
            </p>
          </SubSection>
        </Section>

        {/* 5. Step 4 — Ladder */}
        <Section id="step-4" title="Step 4 — PD Array Matrix (Ladder)" emoji="🪜" accent="yellow">
          <p>
            This is where the LQE system goes beyond a single FVG. You are logging <strong>every PD array</strong> that price could interact with — creating a ladder of arrays.
          </p>

          <SubSection title="The Ladder Concept">
            <p>
              When price creates multiple imbalances (FVGs, OBs, Breakers, etc.), it creates a <strong>magnet zone</strong>. The market is inefficient here and will rotate between the edges of the ladder to fill orders. The top of the ladder acts as Premium resistance, the bottom as Discount support.
            </p>
            <Rule tone="yellow">
              <strong>Do not trade the middle.</strong> The middle of the ladder is no-man&apos;s-land — the engine will block you.
            </Rule>
          </SubSection>

          <SubSection title="How to Log Each Array">
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
              <li><strong>Type:</strong> FVG, OB, Breaker, Mitigation, Rejection, Void, Imbalance, Propulsion, OTE, or CE.</li>
              <li><strong>Direction:</strong> Bullish or Bearish (as originally formed).</li>
              <li><strong>Low / High:</strong> The exact bounds of the array.</li>
              <li><strong>Date Formed:</strong> So the system knows if it&apos;s current or months old.</li>
              <li><strong>Mitigated:</strong> Has price already filled it, or is it still untouched?</li>
              <li><strong>Flip State:</strong> Intact (works in original direction) or Flipped (works in opposite direction).</li>
            </ul>
          </SubSection>

          <SubSection title="The Flip Concept">
            <p>
              A Bullish FVG formed 3-6 months ago during a bullish trend can become a valid <strong>bearish</strong> entry if price has closed cleanly through it. This is called a <strong>polarity flip</strong> (or IFVG).
            </p>
            <p className="text-xs text-purple-200">
              When you mark an array as Flipped, the engine reverses its direction. A Bullish-Flipped array behaves like a Bearish array. The engine requires you to log the <strong>Flip Date</strong> and <strong>Flip Price</strong> (the close that violated it).
            </p>
          </SubSection>

          <SubSection title="The Engine's Ladder Gates">
            <ol className="list-decimal list-inside space-y-1 ml-2 text-xs">
              <li>Price must be <strong>inside</strong> one of your arrays.</li>
              <li>Price must <strong>not</strong> be in the middle of the ladder.</li>
              <li>The active array&apos;s <strong>effective direction</strong> (intact or flipped) must match your bias.</li>
              <li>The active array must pass its <strong>type-specific requirements</strong> (e.g., Breaker needs a prior CHoCH).</li>
              <li>The active array must be in the <strong>correct zone</strong> (see next section).</li>
            </ol>
          </SubSection>
        </Section>

        {/* 6. Zone Rules */}
        <Section id="zones" title="Zone Rules: Premium vs Discount" emoji="⚖️" accent="yellow">
          <Rule tone="yellow">
            <strong>The Golden Rule:</strong> Premium shorts are about high probability and safety. Discount shorts are about extreme momentum, but require razor-thin stop losses and a perfect LTF trigger.
          </Rule>

          <SubSection title="What Premium & Discount Mean">
            <p>
              Every dealing range splits at its 50% midpoint (the Equilibrium, or CE). Anything <strong>above</strong> the CE is <strong>Premium</strong> (expensive — sell here). Anything <strong>below</strong> the CE is <strong>Discount</strong> (cheap — buy here).
            </p>
            <p>
              Shorting in Premium = selling expensive. Buying in Discount = buying cheap. Those are the correct zones.
            </p>
          </SubSection>

          <SubSection title="Trading in the Correct Zone (A+ Setup)">
            <p>
              If your bias is bearish and the array is above the CE (Premium), you are selling expensive. This is the ideal setup:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
              <li>Normal stop loss above the FVG or sweep extreme</li>
              <li>Target the Range Low (SSL)</li>
              <li>No extra confirmation required beyond the standard sequence</li>
            </ul>
            <p className="text-xs text-green-200 mt-2">
              ✅ Engine verdict: &quot;Premium — A+ Setup. Normal rules apply.&quot;
            </p>
          </SubSection>

          <SubSection title="Trading in the Wrong Zone (Shallow Pullback)">
            <p>
              If your bias is bearish and the array is <strong>below</strong> the CE (Discount), you are selling cheap. This only works when momentum is extreme, and requires three extra rules:
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2 text-xs">
              <li>
                <strong>LTF CHoCH is mandatory.</strong> No 5M CHoCH = no trade. The engine will block you.
              </li>
              <li>
                <strong>Stop is razor-thin.</strong> Placed at the FVG edge, not the sweep extreme. If price pushes back to Premium, your thesis is wrong — you want to be out at minimal cost.
              </li>
              <li>
                <strong>Target is immediate.</strong> Take the nearest Range Low / SSL, not the far DOL. Take partials quick.
              </li>
            </ol>
            <p className="text-xs text-yellow-200 mt-2">
              ⚠️ Engine verdict: &quot;Shallow Pullback — Stricter rules apply.&quot; The system requires the LTF CHoCH to unblock.
            </p>
          </SubSection>

          <SubSection title="The Mirror Case (Bullish)">
            <p>
              Everything above mirrors for a long. Bullish bias + Discount array = A+ setup (buy cheap). Bullish bias + Premium array = Shallow Pullback Exception (buying expensive — requires CHoCH, tight stop, quick target).
            </p>
          </SubSection>

          <SubSection title="Auto-Detection">
            <p>
              The engine auto-detects zone side by comparing the array&apos;s CE against the dealing range&apos;s CE. If your dealing range is missing or wrong, you can override the detection manually on the form (Premium / Discount / Equilibrium).
            </p>
          </SubSection>

          <Rule tone="red">
            <strong>The checkpoint answers:</strong>{" "}
            (1) Premium = safe, Discount = dangerous.{" "}
            (2) Discount short requires 5M CHoCH.{" "}
            (3) Stop goes at FVG edge — tight, because if price pushes back to Premium, your thesis is wrong.
          </Rule>
        </Section>

        {/* 7. Step 5 & 6 */}
        <Section id="step-6" title="Step 5 & 6 — Entry & Delivery" emoji="🎯" accent="orange">
          <p>
            Once all gates pass, the engine calculates the entry and target automatically.
          </p>
          <SubSection title="Entry Calculation">
            <p>
              The ideal entry is the <strong>50% CE (Consequent Encroachment)</strong> of the active array. From there, the engine also calculates the <strong>OTE (Optimal Trade Entry)</strong> — the 70.5% retracement of the leg from the sweep to the array CE. That is the highest-probability fill.
            </p>
          </SubSection>
          <SubSection title="Stop Loss">
            <p>
              <strong>Normal setups:</strong> Stop goes beyond the sweep extreme (the invalidation of the entire sequence).
            </p>
            <p>
              <strong>Shallow Pullback setups:</strong> Stop goes at the FVG edge (razor-thin). The engine automatically places it there when in shallow mode.
            </p>
          </SubSection>
          <SubSection title="Target">
            <p>
              The target is the <strong>Draw on Liquidity (DOL)</strong> — the next untapped liquidity pool in the direction of the trade. This is either EQH/EQL, PDH/PDL, a swing high/low, or a liquidity void.
            </p>
            <p>
              <strong>Shallow Pullback:</strong> Target the <strong>nearest</strong> pool (immediate Range Low/High), not the furthest.
            </p>
          </SubSection>
          <SubSection title="Risk-Reward">
            <p>
              The engine computes R:R automatically. If R:R is below 1:3, the card warns you — but it does not block the trade (that is your discretion).
            </p>
          </SubSection>
        </Section>

        {/* 8. Field Guide */}
        <Section id="field-guide" title="Form Field Guide" emoji="📋" accent="gray">
          <p className="text-xs text-gray-400 mb-2">Exact mapping of the LQE form fields.</p>
          <div className="space-y-2">
            <FieldGuide label="Daily Bias" field="dailyBias" description="Direction of the higher timeframe." />
            <FieldGuide label="Session" field="session" description="Must be London or NY AM for a valid killzone." />
            <FieldGuide label="Range High/Low" field="rangeHigh / rangeLow" description="The dealing range for premium/discount calculation." />
            <FieldGuide label="Zone Side Override" field="zoneSideOverride" description="Auto / Premium / Discount / Equilibrium. Auto uses dealing range." />
            <FieldGuide label="Sweep Level" field="sweepLevel" description="The exact price that was swept (the stop loss level of retail)." />
            <FieldGuide label="Sweep Confirmed" field="sweepConfirmed" description="Checked if the candle closed back inside the range." />
            <FieldGuide label="SMT Divergence" field="smtDivergence" description="Checked if a correlated pair failed to sweep the same level." />
            <FieldGuide label="MSS Confirmed" field="mssConfirmed" description="Higher-timeframe market structure shift." />
            <FieldGuide label="LTF CHoCH" field="chochConfirmed" description="Lower-timeframe change of character." />
            <FieldGuide label="Displacement" field="displacementPresent" description="Checked if the move was aggressive, leaving an FVG." />
            <FieldGuide label="Array Type" field="array_type" description="FVG, OB, Breaker, Mitigation, Rejection, Void, Imbalance, Propulsion, OTE, CE." />
            <FieldGuide label="Array Direction" field="direction" description="Bullish or Bearish — as originally formed." />
            <FieldGuide label="Array High/Low" field="pdArrayHigh / pdArrayLow" description="The boundaries of the entry zone." />
            <FieldGuide label="Array Date" field="date_formed" description="When the array formed. Old arrays are often flipped." />
            <FieldGuide label="Mitigated" field="is_mitigated" description="Has price already filled this array?" />
            <FieldGuide label="Flip State" field="flip_state" description="Intact (original direction) or Flipped (opposite)." />
            <FieldGuide label="Flip Date / Price" field="flip_date / flip_price" description="When price closed through the array (the flip event)." />
            <FieldGuide label="Target DOL Price" field="targetPrice" description="The next liquidity pool (EQH/EQL/PDH/PDL)." />
          </div>
        </Section>

        {/* 9. Golden Rules */}
        <Section id="golden-rules" title="Golden Rules" emoji="🏆" accent="emerald">
          <div className="space-y-2">
            {[
              "No sweep, no trade. The engine will block you if the sweep isn't confirmed.",
              "A wick is not a CHoCH. Wait for the candle close.",
              "You must have displacement. Without it, the structure shift is weak.",
              "If you are outside London or NY AM, you are trading a low-probability window.",
              "Do not trade the middle of the ladder. Wait for an edge.",
              "Never enter in the middle of the array. The engine calculates the 70.5% OTE for you.",
              "Target the nearest pool. If the R:R is below 1:3, skip the trade.",
              "Premium shorts are safe; Discount shorts are dangerous. Only take Discount shorts with LTF CHoCH, tight stop, and quick target.",
              "A flipped array reverses polarity. A bullish FVG that price closed through is now a bearish entry — log the flip.",
              "If the sequence is incomplete, the system will not let you save. Do not force it.",
              "Discipline beats intelligence. The sequence is the edge.",
            ].map((r, i) => (
              <Rule key={i} tone="green">
                {i + 1}. {r}
              </Rule>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div className="p-4 rounded-lg border border-orange-800 bg-orange-950/20 space-y-2">
          <p className="text-sm font-bold text-orange-200">🎯 You&apos;ve reached the end.</p>
          <p className="text-xs text-gray-300">
            The LQE system is your mechanical validator. Use it to enforce the sequence. If the engine says WAIT, you wait.
          </p>
          <button
            type="button"
            onClick={() => router.push("/lqe")}
            className="mt-2 w-full py-3 rounded-lg bg-orange-700 hover:bg-orange-600 font-bold text-sm"
          >
            ← Go to LQE Setup
          </button>
        </div>
      </div>
    </main>
  );
}