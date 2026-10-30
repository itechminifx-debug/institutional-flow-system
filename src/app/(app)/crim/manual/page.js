"use client";

import { useRouter } from "next/navigation";

// Reusable components matching FwtManualPage
function Section({ id, title, emoji, children, accent = "sky" }) {
  const accentMap = {
    sky: "border-sky-800 text-sky-300",
    blue: "border-blue-800 text-blue-300",
    purple: "border-purple-800 text-purple-300",
    emerald: "border-emerald-800 text-emerald-300",
    orange: "border-orange-800 text-orange-300",
    yellow: "border-yellow-800 text-yellow-300",
    red: "border-red-800 text-red-300",
    gray: "border-gray-800 text-gray-300",
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
    gray: "border-gray-700 bg-gray-900/40",
    green: "border-green-700 bg-green-950/20 text-green-200",
    red: "border-red-700 bg-red-950/20 text-red-200",
    yellow: "border-yellow-700 bg-yellow-950/20 text-yellow-200",
    blue: "border-blue-700 bg-blue-950/20 text-blue-200",
    sky: "border-sky-700 bg-sky-950/20 text-sky-200",
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

// Main Page
export default function CrimManualPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <button
            type="button"
            onClick={() => router.push("/crim")}
            className="text-xs text-sky-300 hover:text-sky-200 mb-2"
          >
            ← Back to CRIM System
          </button>
          <h1 className="text-3xl font-bold">🎯 CRIM System Manual</h1>
          <p className="text-gray-400 text-sm mt-1">
            CRT + IDM + MSS — The Golden Pipeline
          </p>
          <p className="text-gray-500 text-xs mt-2">
            The complete reference — Reference Candle, Seek &amp; Destroy, Inducement, Displacement, and Entry.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
          <p className="text-xs font-bold text-sky-300 uppercase tracking-wider">Contents</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
            {[
              { id: "philosophy", label: "1. The Core Philosophy" },
              { id: "crt", label: "2. Reference Candle (CRT)" },
              { id: "sweep", label: "3. Seek & Destroy (Sweep)" },
              { id: "idm", label: "4. Inducement (The Bait)" },
              { id: "mss", label: "5. Displacement & MSS" },
              { id: "entry", label: "6. PD Array Entry & Target" },
              { id: "field-guide", label: "7. Form Field Guide" },
              { id: "golden-rules", label: "8. The Golden Rules" },
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
            <strong>The Algorithm is a Pipeline.</strong> It accumulates, manipulates (sweeps liquidity), shifts structure, and distributes. We do not predict; we wait for the sequence to align and execute at the exact moment the trap springs.
          </Rule>
          <p>
            The CRIM system forces you to obey the exact chronological sequence of an institutional move. It maps the <strong>CRT</strong> (Candle Range Theory) to find the range, identifies the <strong>Sweep</strong> to confirm the manipulation, locates the <strong>IDM</strong> (Inducement) to find the bait, and demands the <strong>MSS</strong> (Market Structure Shift) to confirm the delivery.
          </p>
          <p>
            If any link in the chain is broken, the app blocks you from saving the trade. This prevents you from entering early on a fake-out.
          </p>
        </Section>

        {/* 2. CRT */}
        <Section id="crt" title="Reference Candle (CRT)" emoji="📦" accent="blue">
          <SubSection title="Defining the Range">
            <p>
              The Reference Candle (RC) is typically the previous session's candle (e.g., the Asian Range for a London setup, or the London Range for a NY setup). 
            </p>
            <p>
              You input the <strong>RC High</strong> and <strong>RC Low</strong>. The app then automatically calculates the 50% Equilibrium (CE) and the 62% / 79% OTE levels.
            </p>
          </SubSection>
          <Rule tone="yellow">
            <strong>Auto-Calculated Levels:</strong><br/>
            <strong>Bullish:</strong> OTE is calculated from the Low. POI is in the Discount.<br/>
            <strong>Bearish:</strong> OTE is calculated from the High. POI is in the Premium.
          </Rule>
        </Section>

        {/* 3. Sweep */}
        <Section id="sweep" title="Seek & Destroy (Sweep)" emoji="⚡" accent="orange">
          <p>
            Price must sweep one side of the Reference Candle to trap retail traders and grab liquidity.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Bullish Setup:</strong> Must sweep the SSL (below the RC Low).</li>
            <li><strong>Bearish Setup:</strong> Must sweep the BSL (above the RC High).</li>
          </ul>
          <Rule tone="red">
            You cannot fake this. The app validates that the sweep extreme is actually outside the Reference Candle bounds. If it's inside the range, it's not a sweep.
          </Rule>
        </Section>

        {/* 4. IDM */}
        <Section id="idm" title="Inducement (The Bait)" emoji="🪝" accent="purple">
          <SubSection title="What is the IDM?">
            <p>
              After the sweep, price creates a small pullback. This minor swing high/low is the "bait" where retail traders place their stop losses. They think the trend is reversing, but it's just a trap.
            </p>
          </SubSection>
          <Rule tone="purple">
            The app validates that the IDM formed <em>after</em> the sweep. (For a bullish setup, the IDM must be higher than the sweep extreme).
          </Rule>
        </Section>

        {/* 5. MSS */}
        <Section id="mss" title="Displacement & MSS" emoji="🔍" accent="emerald">
          <SubSection title="The Trigger">
            <p>
              After the IDM is formed, price must aggressively break it with a displacement candle that leaves a Fair Value Gap (FVG). This is the Market Structure Shift (MSS).
            </p>
          </SubSection>
          <Rule tone="green">
            <strong>Strict Validation:</strong> The app checks the CHoCH level. If the CHoCH did not break the IDM level, the app blocks the trade. No broken IDM = no MSS.
          </Rule>
        </Section>

        {/* 6. Entry */}
        <Section id="entry" title="PD Array Entry & Target" emoji="🎯" accent="sky">
          <p>
            Once the MSS is confirmed, you enter on the retrace into the FVG. 
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Entry:</strong> Must be inside the correct half of the range (Discount for longs, Premium for shorts).</li>
            <li><strong>Stop Loss:</strong> Must be placed just beyond the sweep extreme.</li>
            <li><strong>Target (DOL):</strong> Must target the opposite extreme of the Reference Candle.</li>
          </ul>
          <Rule tone="sky">
            The app checks all three of these rules. If your target doesn't reach the other side of the range, or your stop is too tight, it will block the trade.
          </Rule>
        </Section>

        {/* 7. Field Guide */}
        <Section id="field-guide" title="Form Field Guide" emoji="📋" accent="gray">
          <p className="text-xs text-gray-400 mb-2">Exact mapping of the CRIM form fields.</p>
          <div className="space-y-2">
            <FieldGuide label="Pair" field="pair" description="The instrument being traded." />
            <FieldGuide label="Timeframe" field="timeframe" description="The timeframe of the Reference Candle (e.g., 1H)." />
            <FieldGuide label="Session" field="session" description="London or NY AM kill zone." />
            <FieldGuide label="Direction" field="direction" description="Bullish (sweep SSL) or Bearish (sweep BSL)." />
            <FieldGuide label="RC High / Low" field="rc_high / rc_low" description="The bounds of the Reference Candle." />
            <FieldGuide label="Swept Side" field="swept_side" description="Which side of the RC was swept (BSL or SSL)." />
            <FieldGuide label="Sweep Extreme" field="sweep_extreme" description="The actual wick high/low of the sweep." />
            <FieldGuide label="IDM Level" field="idm_level" description="The minor pullback (bait) after the sweep." />
            <FieldGuide label="CHoCH Level" field="choch_level" description="The price level that broke the IDM." />
            <FieldGuide label="FVG High / Low" field="fvg_high / fvg_low" description="The imbalance left by the displacement." />
            <FieldGuide label="Entry / SL / TP" field="entry_price / stop_loss / take_profit" description="The final execution numbers." />
          </div>
        </Section>

        {/* 8. Golden Rules */}
        <Section id="golden-rules" title="The Golden Rules" emoji="🏆" accent="emerald">
          <div className="space-y-2">
            {[
              "Wait for the sweep. If price hasn't taken out the RC High/Low, you have no trade.",
              "The IDM is the bait. Never trade before the IDM is broken.",
              "A CHoCH without displacement is a trap. The break must leave an FVG.",
              "Bullish setups live in the Discount. Bearish setups live in the Premium.",
              "The Stop Loss goes beyond the sweep wick. Never inside the FVG.",
              "The Take Profit is the opposite extreme of the Reference Candle.",
              "If the app says 'Sequence Incomplete', you are trying to force a trade. Wait.",
            ].map((r, i) => (
              <Rule key={i} tone="green">
                {i + 1}. {r}
              </Rule>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div className="p-4 rounded-lg border border-sky-800 bg-sky-950/20 space-y-2">
          <p className="text-sm font-bold text-sky-200">
            🎯 You&apos;ve reached the end.
          </p>
          <p className="text-xs text-gray-300">
            CRIM is a mechanical system. It rewards patience. The market will try to trick you into entering early. The app is designed to stop you from doing that. Trust the pipeline.
          </p>
          <button
            type="button"
            onClick={() => router.push("/crim")}
            className="mt-2 w-full py-3 rounded-lg bg-sky-700 hover:bg-sky-600 font-bold text-sm"
          >
            ← Go to CRIM Setup
          </button>
        </div>
      </div>
    </main>
  );
}