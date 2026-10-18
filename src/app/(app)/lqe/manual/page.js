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
            The strict ICT Sequence: Context → Sweep → Structure → Array → Delivery
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
              { id: "step-4", label: "5. Step 4 & 5 — Array & Entry" },
              { id: "step-6", label: "6. Step 6 — Delivery" },
              { id: "field-guide", label: "7. Form Field Guide" },
              { id: "golden-rules", label: "8. Golden Rules" },
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
              The engine hard-filters for **London (2-5 AM EST)** and **NY AM (7-10 AM EST)**. If you are outside these windows, the context score will drop and the setup will be marked as low probability.
            </p>
          </SubSection>
          <SubSection title="3. Premium/Discount">
            <p>
              Mark your Dealing Range (High and Low). The engine checks if your current price is in the discount (for a bullish bias) or premium (for a bearish bias). If you are buying in premium, the system flags it.
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
              If you are bullish, you need a **Sell-Side (SSL)** sweep. If you are bearish, you need a **Buy-Side (BSL)** sweep. Enter the exact price level that was swept.
            </p>
          </SubSection>
          <SubSection title="Sweep Confirmed (Close)">
            <p>
              The engine requires the candle to **close back inside the range**. A wick alone is not enough. This is the "Sweep vs Run" distinction from the PDFs.
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
              Check both boxes if you have a **Market Structure Shift (MSS)** on the higher timeframe and a **Change of Character (CHoCH)** on the lower timeframe.
            </p>
          </SubSection>
          <SubSection title="Displacement">
            <p>
              The move must be aggressive, leaving an FVG. The engine checks the Displacement field. If there is no displacement, the CHoCH is likely a fakeout.
            </p>
          </SubSection>
        </Section>

        {/* 5. Step 4 & 5 */}
        <Section id="step-4" title="Step 4 & 5 — PD Array & Entry" emoji="🧱" accent="yellow">
          <p>
            Where do you enter? The engine calculates this automatically based on the PD Array you mark.
          </p>
          <SubSection title="PD Array Types">
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
              <li><strong>FVG:</strong> The most common imbalance.</li>
              <li><strong>OB:</strong> The last opposing candle before displacement.</li>
              <li><strong>Rejection Block:</strong> A wick that pierced a level and closed back inside.</li>
              <li><strong>Breaker:</strong> A failed OB that flips polarity.</li>
              <li><strong>Unicorn:</strong> An OB overlapping an FVG (highest probability).</li>
            </ul>
          </SubSection>
          <SubSection title="OTE (Optimal Trade Entry)">
            <p>
              The engine automatically calculates the **70.5% retracement** of your entry zone. This is the highest-probability price to click the buy or sell button.
            </p>
          </SubSection>
        </Section>

        {/* 6. Step 6 */}
        <Section id="step-6" title="Step 6 — Delivery (Target)" emoji="🎯" accent="orange">
          <p>
            Where is the liquidity above or below that price wants to reach? This is your Draw on Liquidity (DOL).
          </p>
          <p>
            Enter the Target Price. The engine will calculate your R:R. If the R:R is less than 1:3, the system will warn you.
          </p>
          <Rule tone="green">
            <strong>Target the Nearest Pool.</strong> Do not target the furthest high if there is an equal high right in front of price.
          </Rule>
        </Section>

        {/* 7. Field Guide */}
        <Section id="field-guide" title="Form Field Guide" emoji="📋" accent="gray">
          <p className="text-xs text-gray-400 mb-2">Exact mapping of the LQE form fields.</p>
          <div className="space-y-2">
            <FieldGuide label="Daily Bias" field="dailyBias" description="Direction of the higher timeframe." />
            <FieldGuide label="Session" field="session" description="Must be London or NY AM for a valid killzone." />
            <FieldGuide label="Range High/Low" field="rangeHigh / rangeLow" description="The dealing range for premium/discount calculation." />
            <FieldGuide label="Sweep Level" field="sweepLevel" description="The exact price that was swept (the stop loss level of retail)." />
            <FieldGuide label="Sweep Confirmed" field="sweepConfirmed" description="Checked if the candle closed back inside the range." />
            <FieldGuide label="Displacement" field="displacementPresent" description="Checked if the move left an FVG and was aggressive." />
            <FieldGuide label="Array High/Low" field="pdArrayHigh / pdArrayLow" description="The boundaries of your entry zone (FVG/OB)." />
            <FieldGuide label="Target Price" field="targetPrice" description="The next liquidity pool (EQH/EQL/PDH/PDL)." />
          </div>
        </Section>

        {/* 8. Golden Rules */}
        <Section id="golden-rules" title="Golden Rules" emoji="🏆" accent="emerald">
          <div className="space-y-2">
            {[
              "No sweep, no trade. The engine will block you if the sweep isn't confirmed.",
              "A wick is not a CHoCH. Wait for the candle close.",
              "You must have displacement. Without it, the structure shift is weak.",
              "If you are outside London or NY AM, you are trading a low-probability window.",
              "Never enter in the middle of the array. The engine calculates the 70.5% OTE for you.",
              "Target the nearest pool. If the R:R is below 1:3, skip the trade.",
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