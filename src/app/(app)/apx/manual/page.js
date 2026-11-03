"use client";

import { useRouter } from "next/navigation";

function Section({ id, title, emoji, children, accent = "amber" }) {
  const accentMap = {
    indigo: "border-indigo-800 text-indigo-300",
    blue: "border-blue-800 text-blue-300",
    purple: "border-purple-800 text-purple-300",
    emerald: "border-emerald-800 text-emerald-300",
    amber: "border-amber-800 text-amber-300",
    gray: "border-gray-800 text-gray-300",
  };
  const cls = accentMap[accent] || accentMap.amber;

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
    amber: "border-amber-700 bg-amber-950/20 text-amber-200",
  };
  return (
    <div className={`p-3 rounded-lg border ${toneMap[tone]}`}>
      <p className="text-xs">{children}</p>
    </div>
  );
}

export default function ApxManualPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <button
            type="button"
            onClick={() => router.push("/apx")}
            className="text-xs text-amber-300 hover:text-amber-200 mb-2"
          >
            ← Back to APX
          </button>
          <h1 className="text-3xl font-bold">🎯 The APX Manual</h1>
          <p className="text-gray-400 text-sm mt-1">
            Institutional Flow — Standard, Shallow, Turtle Soup
          </p>
          <p className="text-gray-500 text-xs mt-2">
            The doctrine of reading institutional order flow.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
          <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">Contents</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
            {[
              { id: "philosophy", label: "1. The Philosophy" },
              { id: "the-stages", label: "2. The 4 Stages" },
              { id: "setup-types", label: "3. The 3 Setup Types" },
              { id: "zones", label: "4. Dealing Ranges & OTE" },
              { id: "rules", label: "5. The Hard Rules" },
            ].map((t) => (
              <a key={t.id} href={`#${t.id}`} className="text-amber-300 hover:text-amber-200 py-0.5">
                {t.label}
              </a>
            ))}
          </div>
        </div>

        {/* 1. Philosophy */}
        <Section id="philosophy" title="The Philosophy" emoji="🧭">
          <Rule tone="amber">
            <strong>"Institutions leave footprints. APX reads those footprints."</strong>
          </Rule>
          <p>
            Price does not move randomly. It moves to collect liquidity. Large players need counterparties to fill their orders, so they manipulate price into obvious zones (above old highs, below old lows), grab the liquidity, and then drive price in the true direction.
          </p>
          <p>
            APX tracks this process across 4 stages: <strong>Context, Liquidity, Structure, and Entry.</strong> If all 4 align, the trap has sprung and the institutional flow is on your side.
          </p>
        </Section>

        {/* 2. The 4 Stages */}
        <Section id="the-stages" title="The 4 Stages" emoji="📊" accent="blue">
          <p>
            Every valid APX setup must pass through these 4 stages, in order.
          </p>

          <div className="mt-3 space-y-2">
            {[
              { n: 1, name: "Context", q: "What is the HTF bias? Where is the Dealing Range? What are the Premium/Discount zones? Where is the OTE?" },
              { n: 2, name: "Liquidity", q: "Did we sweep a high/low? Did we close back inside? Is there displacement? Did the pullback tap the CE or 50 EMA?" },
              { n: 3, name: "Structure", q: "Was an inducement swept? Did we get an MSS (Market Structure Shift)? Is there an FVG on the correct side?" },
              { n: 4, name: "Entry", q: "Where is the entry? Is the stop loss in the right place? Is the target realistic? Is RR ≥ 2?" },
            ].map((l) => (
              <div key={l.n} className="p-3 rounded-lg border border-blue-800/60 bg-blue-950/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-300">{l.n}.</span>
                  <span className="text-sm font-bold text-white">{l.name}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1 ml-4">{l.q}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 3. Setup Types */}
        <Section id="setup-types" title="The 3 Setup Types" emoji="🎯" accent="purple">
          <p>
            Not every valid setup is the same. APX defines 3 distinct playbooks based on how price returns to the entry zone.
          </p>

          <SubSection title="🎯 Standard (Deep Pullback)">
            <p>
              Price makes a strong move, then pulls back <strong>deep</strong> (≥ 62% of the impulse). The entry is taken when price reaches the Premium (for shorts) or Discount (for longs) zone, leaving a tight risk.
            </p>
          </SubSection>

          <SubSection title="⚡ Shallow (Light Pullback)">
            <p>
              Price makes a strong move, but only pulls back <strong>shallowly</strong> (≤ 50% of the impulse). The entry is taken when price taps the CE (Consequent Encroachment) or the 50 EMA. These are high-conviction continuation setups.
            </p>
          </SubSection>

          <SubSection title="🐢 Turtle Soup (Sweep & Reversal)">
            <p>
              Price sweeps just beyond the dealing range high or low, traps breakout traders, and then immediately reverses. Requires the candle to <strong>close back inside the range</strong> and a strong displacement in the opposite direction.
            </p>
          </SubSection>
        </Section>

        {/* 4. Zones */}
        <Section id="zones" title="Dealing Ranges & OTE" emoji="📐" accent="emerald">
          <SubSection title="The Dealing Range">
            <p>
              The high and low of the recent swing. The midpoint is the <strong>CE (Consequent Encroachment)</strong>. Anything above the CE is <strong>Premium</strong> (expensive). Anything below the CE is <strong>Discount</strong> (cheap).
            </p>
            <Rule tone="gray">
              Rule: Shorts are taken in Premium. Longs are taken in Discount.
            </Rule>
          </SubSection>

          <SubSection title="OTE (Optimal Trade Entry)">
            <p>
              The OTE is the <strong>0.618 to 0.79 retracement</strong> of the impulse leg that caused the structure shift. We calculate it separately from the dealing range because the impulse leg is what created the imbalance.
            </p>
          </SubSection>
        </Section>

        {/* 5. Rules */}
        <Section id="rules" title="The Hard Rules" emoji="⚖️" accent="gray">
          <p>
            These rules are non-negotiable. If any of them are broken, the setup is invalid — no matter how good it looks.
          </p>

          <ul className="list-disc list-inside space-y-1.5 ml-2 text-xs text-gray-300">
            <li><strong>HTF bias must be set.</strong> Never trade against the higher timeframe narrative.</li>
            <li><strong>MSS must be confirmed.</strong> No shift in market structure = no trade.</li>
            <li><strong>Inducement must be broken.</strong> The trap must be sprung before the entry.</li>
            <li><strong>SL must be beyond the extreme.</strong> If your stop loss is inside the swing, you will be wicked out.</li>
            <li><strong>RR must be ≥ 2.</strong> If the target doesn't offer at least 2x the risk, the math is not on your side.</li>
          </ul>

          <Rule tone="red">
            <strong>Hard Veto:</strong> Turtle Soup setups are immediately invalid if the sweep candle does not close back inside the dealing range. A sweep without a close-back is just a breakout.
          </Rule>
        </Section>

        {/* Footer */}
        <div className="p-4 rounded-lg border border-amber-800 bg-amber-950/20 space-y-2">
          <p className="text-sm font-bold text-amber-200">
            🎯 Trade the footprint.
          </p>
          <p className="text-xs text-gray-300">
            APX is designed to keep you out of bad trades. When all 4 stages are green, you have a mechanical, institutional-grade setup. When they aren't, you wait.
          </p>
          <button
            type="button"
            onClick={() => router.push("/apx")}
            className="mt-2 w-full py-3 rounded-lg bg-amber-700 hover:bg-amber-600 font-bold text-sm text-white"
          >
            ← Go to APX
          </button>
        </div>
      </div>
    </main>
  );
}