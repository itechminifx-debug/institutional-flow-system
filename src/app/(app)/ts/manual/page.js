"use client";

import { useRouter } from "next/navigation";

// ============================================================
// Reusable Components
// ============================================================

function Section({ id, title, emoji, children, accent = "violet" }) {
  const accentMap = {
    violet: "border-violet-800 text-violet-300",
    orange: "border-orange-800 text-orange-300",
    purple: "border-purple-800 text-purple-300",
    emerald: "border-emerald-800 text-emerald-300",
    gray: "border-gray-800 text-gray-300",
  };
  const cls = accentMap[accent] || accentMap.violet;

  return (
    <section id={id} className="scroll-mt-20">
      <div className={`border-l-4 pl-4 py-1 ${cls.split(" ")[0]}`}>
        <h2 className={`text-lg font-bold ${cls.split(" ")[1]}`}>{emoji} {title}</h2>
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
    violet: "border-violet-700 bg-violet-950/20 text-violet-200",
  };
  return (
    <div className={`p-3 rounded-lg border ${toneMap[tone]}`}>
      <p className="text-xs">{children}</p>
    </div>
  );
}

// ============================================================
// Main Manual Page
// ============================================================
export default function TsManualPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <button
            type="button"
            onClick={() => router.push("/ts")}
            className="text-xs text-violet-300 hover:text-violet-200 mb-2"
          >
            ← Back to Time-Slice Setup
          </button>
          <h1 className="text-3xl font-bold">⏱️ The Time-Slice Setup</h1>
          <p className="text-gray-400 text-sm mt-1">
            Previous 1H Candle → 15M Trap → 5M Zone → 1M Trigger
          </p>
          <p className="text-gray-500 text-xs mt-2">
            The complete blueprint for executing a precision trade inside the previous 1H candle.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
          <p className="text-xs font-bold text-violet-300 uppercase tracking-wider">Contents</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
            {[
              { id: "philosophy", label: "1. The Philosophy" },
              { id: "phase-1", label: "2. Phase 1 — The Container (1H)" },
              { id: "phase-2", label: "3. Phase 2 — The Trap (15M)" },
              { id: "phase-3", label: "4. Phase 3 — The Zone (5M)" },
              { id: "phase-4", label: "5. Phase 4 — The Trigger (1M)" },
              { id: "phase-5", label: "6. Phase 5 — Risk & Targets" },
              { id: "visual", label: "7. The Visual (Bearish Example)" },
              { id: "golden", label: "8. The Golden Rule" },
            ].map((t) => (
              <a key={t.id} href={`#${t.id}`} className="text-violet-300 hover:text-violet-200 py-0.5">
                {t.label}
              </a>
            ))}
          </div>
        </div>

        {/* 1. Philosophy */}
        <Section id="philosophy" title="The Philosophy" emoji="🧭">
          <Rule tone="violet">
            <strong>"The previous 1H candle is a container. Its High is the Buy-Side Liquidity (BSL) and its Low is the Sell-Side Liquidity (SSL). We use the 15M to find the trap, the 5M to find the shift (MSS), and the 1M to pull the trigger at the 50% CE."</strong>
          </Rule>
          <p>
            The 1H Time-Slice Setup is the ultimate mechanical execution model. It takes the best concepts from the entire ICT methodology and anchors them to a single, objective timeframe: <strong>the previous 1H candle.</strong>
          </p>
          <p>
            By using the previous 1H candle as the dealing range, you eliminate ambiguity. You know exactly where the liquidity is (the high and low), exactly where the premium/discount boundary is (the 50% CE), and exactly where you are in the delivery cycle.
          </p>
        </Section>

        {/* 2. Phase 1 */}
        <Section id="phase-1" title="Phase 1 — The Container (1H)" emoji="📦" accent="violet">
          <p><strong>Goal:</strong> Define the boundaries of the trade.</p>
          <SubSection title="Steps">
            <ol className="list-decimal list-inside space-y-1 ml-2 text-xs">
              <li><strong>Mark the Candle:</strong> Look at the Previous 1H Candle (the one that just closed).</li>
              <li><strong>Draw the Range:</strong> Mark its High and its Low.
                <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5 text-gray-400">
                  <li>High = BSL (Buy-Side Liquidity)</li>
                  <li>Low = SSL (Sell-Side Liquidity)</li>
                </ul>
              </li>
              <li><strong>Draw the CE:</strong> Find the 50% midpoint of that previous 1H candle.</li>
              <li><strong>Determine the D1 Bias:</strong> Is the Daily chart Bullish or Bearish?
                <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5 text-gray-400">
                  <li>If Bearish: You want to sell. You will target the 1H Low (SSL).</li>
                  <li>If Bullish: You want to buy. You will target the 1H High (BSL).</li>
                </ul>
              </li>
            </ol>
          </SubSection>
        </Section>

        {/* 3. Phase 2 */}
        <Section id="phase-2" title="Phase 2 — The Trap (15M)" emoji="🪤" accent="orange">
          <p><strong>Goal:</strong> Wait for the manipulation (Sweep) and the shift (MSS).</p>
          <SubSection title="Steps">
            <ol className="list-decimal list-inside space-y-1 ml-2 text-xs">
              <li><strong>The Sweep:</strong> Drop to the 15M. Wait for price to push outside the previous 1H candle and sweep the liquidity.
                <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5 text-gray-400">
                  <li>If Bearish Bias: Wait for price to push above the previous 1H High (sweeping the BSL).</li>
                </ul>
              </li>
              <li><strong>The Shift (MSS):</strong> Once the sweep happens, wait for a 15M candle to close aggressively back inside the range, breaking structure (MSS) and leaving a Fair Value Gap (FVG).</li>
              <li><strong>The Rule:</strong> If the MSS is weak and leaves no FVG, abort the trade.</li>
            </ol>
          </SubSection>
        </Section>

        {/* 4. Phase 3 */}
        <Section id="phase-3" title="Phase 3 — The Zone (5M)" emoji="🎯" accent="purple">
          <p><strong>Goal:</strong> Locate the precise Point of Interest (POI).</p>
          <SubSection title="Steps">
            <ol className="list-decimal list-inside space-y-1 ml-2 text-xs">
              <li><strong>Mark the FVG:</strong> Look at the 15M MSS. Find the Fair Value Gap left behind by the displacement.</li>
              <li><strong>The Confluence Check:</strong> Where is the FVG?
                <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5 text-gray-400">
                  <li>If Bearish: The FVG must be in the Premium zone of the 1H candle (above the 50% CE). If it's below the CE, it's a Shallow Pullback (abort or use extreme caution).</li>
                </ul>
              </li>
              <li><strong>Mark the POI:</strong> Draw a box around the 5M or 15M FVG. This is where price must return.</li>
            </ol>
          </SubSection>
        </Section>

        {/* 5. Phase 4 */}
        <Section id="phase-4" title="Phase 4 — The Trigger (1M)" emoji="⚡" accent="emerald">
          <p><strong>Goal:</strong> Snipe the entry with a tiny stop loss.</p>
          <SubSection title="Steps">
            <ol className="list-decimal list-inside space-y-1 ml-2 text-xs">
              <li><strong>The Pullback:</strong> Wait for price to pull back up (or down) into your FVG.</li>
              <li><strong>The Trigger:</strong> Drop to the 1M chart.</li>
              <li><strong>The Confirmation:</strong> Wait for a 1M Rejection Block or a 1M CHoCH inside the FVG.</li>
              <li><strong>The Entry:</strong> Enter the trade.</li>
            </ol>
          </SubSection>
        </Section>

        {/* 6. Phase 5 */}
        <Section id="phase-5" title="Phase 5 — Risk & Targets" emoji="🛡️" accent="gray">
          <p><strong>Goal:</strong> Set the stop loss and the two profit targets.</p>
          <SubSection title="Rules">
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
              <li><strong>Stop Loss:</strong> Just above the high of the 15M sweep wick (the manipulation).</li>
              <li><strong>Target 1 (Partial):</strong> The 50% CE of the previous 1H candle. Take 50% profit here.</li>
              <li><strong>Target 2 (Final):</strong> The opposite side of the 1H candle (the SSL or BSL).</li>
            </ul>
          </SubSection>
          <Rule tone="green">
            <strong>Execution:</strong> At TP1, take 50% off and move the Stop Loss to break-even. Let the remainder run to TP2.
          </Rule>
        </Section>

        {/* 7. The Visual */}
        <Section id="visual" title="The Visual (Bearish Example)" emoji="📊" accent="gray">
          <div className="p-4 rounded-lg bg-black border border-gray-800 font-mono text-xs space-y-1">
            <p className="text-gray-400">[ 1H High (BSL) ] ◄── (1) Price sweeps this.</p>
            <p className="text-gray-400">      │                 (2) 15M MSS confirms.</p>
            <p className="text-orange-300">[ 15M FVG ] ◄── (3) Your POI. (Must be above the CE).</p>
            <p className="text-gray-400">      ▲</p>
            <p className="text-gray-400">      │             ◄── (4) Price pulls back up.</p>
            <p className="text-gray-400">      │</p>
            <p className="text-amber-300">──────┼────── 1H CE (50%) ◄── (5) Target 1 (Partial Profit).</p>
            <p className="text-gray-400">      │</p>
            <p className="text-gray-400">      │</p>
            <p className="text-green-300">[ 1H Low (SSL) ] ◄── (6) Target 2 (The DOL).</p>
          </div>
        </Section>

        {/* 8. Golden Rule */}
        <Section id="golden" title="The Golden Rule" emoji="🏆" accent="violet">
          <Rule tone="violet">
            <strong>"The Previous 1H candle gives you the boundaries. The 15M gives you the trap (Sweep + MSS). The 5M gives you the POI (FVG). The 1M gives you the trigger. You enter at the CE, and you target the opposite side."</strong>
          </Rule>
        </Section>

        {/* Footer */}
        <div className="p-4 rounded-lg border border-violet-800 bg-violet-950/20 space-y-2">
          <p className="text-sm font-bold text-violet-200">🎯 You&apos;ve reached the end.</p>
          <p className="text-xs text-gray-300">
            The Time-Slice setup is mechanical, precise, and rule-based. The engine enforces the sequence. Trust the process.
          </p>
          <button
            type="button"
            onClick={() => router.push("/ts")}
            className="mt-2 w-full py-3 rounded-lg bg-violet-700 hover:bg-violet-600 font-bold text-sm"
          >
            ← Go to Time-Slice Setup
          </button>
        </div>
      </div>
    </main>
  );
}