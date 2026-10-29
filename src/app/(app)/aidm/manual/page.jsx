'use client';

import { useRouter } from 'next/navigation';

export default function AidmManualPage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">AIDM Manual</h1>
          <p className="text-sm text-slate-400">APEX Master System — the complete blueprint</p>
        </div>
        <button
          onClick={() => router.push('/aidm')}
          className="px-3 py-1.5 text-sm rounded border border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          ← Back to Form
        </button>
      </header>

      {/* CORE PHILOSOPHY */}
      <Section title="Core Philosophy">
        <p className="text-slate-300 italic leading-relaxed">
          "The market is a breathing mechanism. It accumulates, it manipulates (sweeps
          liquidity), and it distributes (delivers to the opposite liquidity pool). We do
          not predict; we wait for the algorithm to sweep External Range Liquidity (ERL),
          shift structure, and offer us a precise entry at Internal Range Liquidity (IRL)
          during specific time windows."
        </p>
      </Section>

      {/* PART 1 */}
      <Section title="Part 1 · The Map (Higher Timeframe Analysis)">
        <Subtitle>The Dealing Range (The Container)</Subtitle>
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          <li><b>Daily Range:</b> High and Low of the previous closed daily candle. Never use an open candle.</li>
          <li><b>4H and 1H Ranges:</b> Most recent swing High and Low inside the Daily range.</li>
        </ul>

        <Subtitle>The 50% CE (Equilibrium)</Subtitle>
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          <li><b>Calculation:</b> (Range High + Range Low) ÷ 2</li>
          <li>Splits the range into Premium (expensive, sell zone) and Discount (cheap, buy zone)</li>
          <li>The institutional battlefield — fair price</li>
        </ul>

        <Subtitle>The OTE (Optimal Trade Entry)</Subtitle>
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          <li><b>Bullish:</b> 62% = Low + (Size × 0.62); 79% = Low + (Size × 0.79) → POI in Discount</li>
          <li><b>Bearish:</b> 62% = High − (Size × 0.62); 79% = High − (Size × 0.79) → POI in Premium</li>
          <li>The deep pullback where institutions trap retail</li>
        </ul>

        <Subtitle>Draw on Liquidity (DOL)</Subtitle>
        <p className="text-slate-300">
          Find the nearest ERL (old high / BSL or old low / SSL) in the direction of your bias.
        </p>
      </Section>

      {/* PART 2 */}
      <Section title="Part 2 · Time & The Trap (Kill Zones)">
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          <li><b>Kill Zones:</b> London Open (02:00–05:00 EST) or New York AM (07:00–10:00 EST). Outside — do nothing.</li>
          <li><b>Daily Wick (AMD):</b> Open = Accumulation · Wick = Manipulation (Judas Swing) · Body = Distribution (true move)</li>
          <li><b>The Sweep (ERL):</b> Price must sweep a major high or low (BSL/SSL)</li>
        </ul>
      </Section>

      {/* PART 3 */}
      <Section title="Part 3 · Structure Shift (The Confirmation)">
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          <li><b>Inducement (IDM):</b> Small swing low/high created after the sweep — the bait for retail stops.</li>
          <li><b>MSS (Market Structure Shift):</b> Aggressive break of the IDM with a displacement candle that leaves an FVG behind it.</li>
          <li><b>Rule:</b> Only trade the MSS. Weak, overlapping CHoCH = trap.</li>
        </ul>
      </Section>

      {/* PART 4 */}
      <Section title="Part 4 · Sniper Entry (5M / 1M Execution)">
        <Subtitle>Scenario 1 — Deep Pullback (Standard OTE)</Subtitle>
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          <li>Price drops aggressively, breaking the 50% CE</li>
          <li>Entry: pullback UP into 62–79% OTE (Discount zone)</li>
          <li>Trigger: 5M/1M Bearish MSS + FVG inside the OTE</li>
        </ul>

        <Subtitle>Scenario 2 — Shallow Pullback (Aggressive)</Subtitle>
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          <li>Market is violently bearish, refuses deep pullback</li>
          <li>Entry: pullback only to Premium zone or 50% CE</li>
          <li>Trigger: 5M/1M Bearish MSS + FVG at the CE</li>
          <li>Use a razor-thin stop loss</li>
        </ul>
      </Section>

      {/* PART 5 */}
      <Section title="Part 5 · Risk & Targets (Delivery)">
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          <li><b>Entry Trigger:</b> 1M Rejection Block or 1M CHoCH inside the 5M FVG</li>
          <li><b>Stop Loss:</b> Just above the high of the Inducement (or above the 1H/4H sweep wick). Never inside the FVG.</li>
          <li><b>Target 1 (Partial):</b> 50% CE. Take 50% profit, move SL to Breakeven.</li>
          <li><b>Target 2 (Final):</b> Opposite ERL (Range Low / Deep Discount).</li>
        </ul>
      </Section>

      {/* PART 6 */}
      <Section title="Part 6 · The 10 Golden Rules">
        <ol className="list-decimal list-inside space-y-1 text-slate-300">
          <li>Never trade a BOS breakout. It is the trap.</li>
          <li>Never trade a CHoCH without displacement. It is a fake-out.</li>
          <li>Always wait for the Sweep (Manipulation) before looking for the MSS (Distribution).</li>
          <li>A Lower Low is not a BOS unless it breaks the previous Lower Low.</li>
          <li>In a downtrend, the 50% CE and the FVG are your primary POIs.</li>
          <li>If price is in the middle of an Accumulation Range, do nothing.</li>
          <li>In a downtrend, short the Premium MSS FVG, targeting the SSL.</li>
          <li>The 50 EMA is a filter, not a checkpoint.</li>
          <li>Never risk more than 1% of your account per trade.</li>
          <li>If you don't have a clear Draw on Liquidity (DOL), you don't have a trade.</li>
        </ol>
      </Section>

      {/* PRE-TRADE QUESTIONS */}
      <Section title="Pre-Trade Checklist — Answer All Five">
        <ol className="list-decimal list-inside space-y-1 text-slate-300">
          <li>Where is my dealing range?</li>
          <li>Where is the 50% CE?</li>
          <li>Did we sweep the liquidity?</li>
          <li>Where is the Inducement?</li>
          <li>Did we get a displacement MSS with an FVG?</li>
        </ol>
        <p className="text-slate-400 italic text-sm">
          If you can answer all five, you have a trade. If you can't, you wait.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded border border-slate-700 bg-slate-900/50 p-5 space-y-3">
      <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">
        {title}
      </h2>
      <div className="space-y-3 text-sm">{children}</div>
    </section>
  );
}

function Subtitle({ children }) {
  return <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-3">{children}</h3>;
}