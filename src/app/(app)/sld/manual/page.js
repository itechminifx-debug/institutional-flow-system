"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// Reusable components
// ============================================================

function Section({ id, title, emoji, children, accent = "emerald" }) {
  const accentMap = {
    emerald: "border-emerald-800 text-emerald-300",
    blue: "border-blue-800 text-blue-300",
    purple: "border-purple-800 text-purple-300",
    orange: "border-orange-800 text-orange-300",
    cyan: "border-cyan-800 text-cyan-300",
    yellow: "border-yellow-800 text-yellow-300",
    red: "border-red-800 text-red-300",
    gray: "border-gray-800 text-gray-300",
    pink: "border-pink-800 text-pink-300",
    fuchsia: "border-fuchsia-800 text-fuchsia-300",
    amber: "border-amber-800 text-amber-300",
  };
  const cls = accentMap[accent] || accentMap.emerald;

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

function TermCard({ term, definition, identify, example, accent = "blue" }) {
  const [open, setOpen] = useState(false);
  const accentMap = {
    blue: "border-blue-800 bg-blue-950/20",
    emerald: "border-emerald-800 bg-emerald-950/20",
    purple: "border-purple-800 bg-purple-950/20",
    orange: "border-orange-800 bg-orange-950/20",
    cyan: "border-cyan-800 bg-cyan-950/20",
    yellow: "border-yellow-800 bg-yellow-950/20",
    red: "border-red-800 bg-red-950/20",
  };
  const cls = accentMap[accent] || accentMap.blue;

  return (
    <div className={`p-3 rounded-lg border ${cls}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left flex items-start justify-between gap-2"
      >
        <p className="text-sm font-bold text-white">{term}</p>
        <span className="text-gray-400 text-xs">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2 text-xs text-gray-300">
          <div>
            <p className="text-gray-500 uppercase tracking-wider font-semibold text-[10px]">
              Definition
            </p>
            <p className="mt-0.5">{definition}</p>
          </div>
          {identify && (
            <div>
              <p className="text-gray-500 uppercase tracking-wider font-semibold text-[10px]">
                How to identify it
              </p>
              <p className="mt-0.5">{identify}</p>
            </div>
          )}
          {example && (
            <div className="p-2 rounded bg-black/40 border border-gray-800">
              <p className="text-gray-500 uppercase tracking-wider font-semibold text-[10px]">
                Example
              </p>
              <p className="mt-0.5 italic text-gray-400">{example}</p>
            </div>
          )}
        </div>
      )}
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
    pink: "border-pink-700 bg-pink-950/20 text-pink-200",
    fuchsia: "border-fuchsia-700 bg-fuchsia-950/20 text-fuchsia-200",
    amber: "border-amber-700 bg-amber-950/20 text-amber-200",
  };
  return (
    <div className={`p-3 rounded-lg border ${toneMap[tone]}`}>
      <p className="text-xs">{children}</p>
    </div>
  );
}

function Checklist({ title, items }) {
  return (
    <div className="p-3 rounded-lg border border-gray-800 bg-gray-900/40 space-y-2">
      <p className="text-xs font-bold text-white uppercase tracking-wider">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
            <span className="text-gray-500">☐</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// NEW — Adaptive Rule card (big format for doctrine section)
// ============================================================
function AdaptiveRule({ n, title, emoji, problem, rule, why, tone = "blue" }) {
  const toneMap = {
    blue: "border-blue-700 bg-blue-950/20",
    fuchsia: "border-fuchsia-700 bg-fuchsia-950/20",
    pink: "border-pink-700 bg-pink-950/20",
    amber: "border-amber-700 bg-amber-950/20",
  };
  const cls = toneMap[tone] || toneMap.blue;

  const problemTone = {
    blue: "text-blue-300",
    fuchsia: "text-fuchsia-300",
    pink: "text-pink-300",
    amber: "text-amber-300",
  }[tone];

  const ruleTone = {
    blue: "text-blue-200",
    fuchsia: "text-fuchsia-200",
    pink: "text-pink-200",
    amber: "text-amber-200",
  }[tone];

  return (
    <div className={`p-4 rounded-lg border-2 ${cls} space-y-3`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-bold text-white">
          {emoji} Update {n} — {title}
        </p>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 border border-gray-700 text-gray-300 font-bold">
          ADAPTIVE
        </span>
      </div>

      <div>
        <p className={`text-[10px] uppercase tracking-wider font-bold ${problemTone}`}>
          The Problem
        </p>
        <p className="text-xs text-gray-300 mt-1">{problem}</p>
      </div>

      <div>
        <p className={`text-[10px] uppercase tracking-wider font-bold ${problemTone}`}>
          The Rule
        </p>
        <p className={`text-xs mt-1 ${ruleTone} font-semibold`}>{rule}</p>
      </div>

      <div>
        <p className={`text-[10px] uppercase tracking-wider font-bold ${problemTone}`}>
          Why it fits all conditions
        </p>
        <p className="text-xs text-gray-400 mt-1">{why}</p>
      </div>
    </div>
  );
}

// ============================================================
// Main Manual Page
// ============================================================
export default function SldManualPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <button
            type="button"
            onClick={() => router.push("/sld")}
            className="text-xs text-emerald-300 hover:text-emerald-200 mb-2"
          >
            ← Back to SLD
          </button>
          <h1 className="text-3xl font-bold">📘 SLD System Manual</h1>
          <p className="text-gray-400 text-sm mt-1">
            Structure → Liquidity → Delivery
          </p>
          <p className="text-gray-500 text-xs mt-2">
            The complete reference — philosophy, terms, identification rules,
            workflow, checklists, risk, and the adaptive system.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
          <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
            Contents
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
            {[
              { id: "philosophy", label: "1. The Core Philosophy" },
              { id: "structure-vs-liquidity", label: "2. Structure vs Liquidity" },
              { id: "the-5-layers", label: "3. The 5-Layer Model" },
              { id: "adaptive", label: "4. The Adaptive System ⭐" },
              { id: "glossary", label: "5. Terms Glossary" },
              { id: "identify", label: "6. How to Identify Each Term" },
              { id: "walkthrough", label: "7. Full Walkthrough" },
              { id: "checklist", label: "8. The Checklist" },
              { id: "risk", label: "9. Risk & Rules" },
              { id: "golden", label: "10. Golden Rules" },
              { id: "mistakes", label: "11. Common Mistakes" },
            ].map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                className="text-emerald-300 hover:text-emerald-200 py-0.5"
              >
                {t.label}
              </a>
            ))}
          </div>
        </div>

        {/* 1. Philosophy */}
        <Section id="philosophy" title="The Core Philosophy" emoji="🧭">
          <Rule tone="green">
            <strong>Price does not move randomly.</strong> It moves from one
            pool of liquidity to another.
          </Rule>

          <p>
            Every concept in this system — order blocks, FVGs, liquidity
            sweeps, market structure — is downstream of this one truth.
          </p>

          <SubSection title="What is liquidity?">
            <p>
              Liquidity = resting orders that institutions can fill against.
            </p>
            <p>
              When retail traders place stop losses above swing highs, below
              swing lows, buy limits above resistance, or sell limits below
              support — they create <strong>clusters of orders</strong> that
              smart money can target.
            </p>
          </SubSection>

          <SubSection title="Why institutions need liquidity">
            <p>
              Institutions can&apos;t buy or sell large sizes at one price
              without moving the market. They need someone on the other side.
              That someone is you — and everyone else whose stops are sitting
              at predictable levels.
            </p>
          </SubSection>

          <SubSection title="The one-sentence model">
            <Rule>
              <strong>Entry = where you get in (PD Array).</strong>{" "}
              <strong>DOL = where price is going.</strong>{" "}
              <strong>Everything between = the trade.</strong>
            </Rule>
          </SubSection>
        </Section>

        {/* 2. Structure vs Liquidity */}
        <Section id="structure-vs-liquidity" title="Structure vs Liquidity" emoji="⚖️" accent="blue">
          <p>
            These two ideas are often confused. Here&apos;s the precise
            distinction:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
            <div className="p-3 rounded-lg border border-blue-800 bg-blue-950/20">
              <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">Liquidity</p>
              <p className="text-xs text-gray-300 mt-1">
                <strong>Why</strong> price moves. The destination — the pool.
              </p>
            </div>
            <div className="p-3 rounded-lg border border-purple-800 bg-purple-950/20">
              <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">Structure</p>
              <p className="text-xs text-gray-300 mt-1">
                <strong>Where</strong> you are and whether the bias is intact — the map.
              </p>
            </div>
            <div className="p-3 rounded-lg border border-emerald-800 bg-emerald-950/20">
              <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">PD Arrays</p>
              <p className="text-xs text-gray-300 mt-1">
                <strong>Where</strong> you enter — the precision tool.
              </p>
            </div>
          </div>

          <SubSection title="The honest hierarchy">
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li><strong>Foundation:</strong> Price seeks liquidity (the why)</li>
              <li><strong>Framework:</strong> Structure (the map)</li>
              <li><strong>Precision:</strong> PD Arrays (the entry)</li>
              <li><strong>Execution:</strong> Risk + DOL targeting (the trade)</li>
            </ol>
          </SubSection>

          <Rule tone="yellow">
            Structure alone = you get stopped out by liquidity sweeps.
            Liquidity alone = you have no bias and no confirmation.
            <strong> Together = the edge.</strong>
          </Rule>
        </Section>

        {/* 3. The 5-Layer Model */}
        <Section id="the-5-layers" title="The 5-Layer Model" emoji="🧱" accent="purple">
          <p>
            The SLD System runs on 5 layers. Each layer has a specific job,
            and each must align before you enter.
          </p>

          <div className="space-y-2 mt-2">
            {[
              {
                n: 1,
                title: "Bias & DOL",
                tf: "D1 / H4",
                job: "Determine direction and identify the destination pool.",
                steps: [
                  "Mark daily swing highs/lows (last 3–5 swings)",
                  "Determine structure: HH+HL = bullish, LH+LL = bearish",
                  "Check for CHoCH on the daily",
                  "Confirm 4H bias agrees with Daily (HTF Veto — see §4)",
                  "Identify the nearest significant DOL in the bias direction",
                  "Confirm quarterly/higher-TF alignment (bonus, not required)",
                ],
              },
              {
                n: 2,
                title: "POI / Entry Zone",
                tf: "1H / 15M",
                job: "Find the PD Array where you'll enter.",
                steps: [
                  "Wait for opposing liquidity sweep (SSL swept in bullish, BSL swept in bearish)",
                  "Confirm BOS in bias direction — close through, not wick",
                  "Mark the PD Array (FVG, OB, or Breaker)",
                  "Check discount/premium — bullish entry must be in discount, bearish in premium",
                  "Verify path to DOL — no unmitigated opposing PD Array in the way",
                  "If trend is aggressive and pullback is shallow, use the Shallow Pullback Exception (§4)",
                  "If price has returned to the move origin, check the Origin Retest (§4)",
                ],
              },
              {
                n: 3,
                title: "Entry Trigger",
                tf: "5M / 1M",
                job: "Time the entry.",
                steps: [
                  "Price taps the POI",
                  "Look for lower-TF CHoCH in bias direction",
                  "Enter on the 5M FVG/OB inside the POI",
                  "Stop below swept low (bullish) / above swept high (bearish)",
                  "Target = the DOL from Layer 1",
                ],
              },
              {
                n: 4,
                title: "Trade Management",
                tf: "Live",
                job: "Protect capital and let winners run.",
                steps: [
                  "Partial at 2R — take 50% off",
                  "Move stop to break-even after partial",
                  "Trail stop after the next BOS in your direction",
                  "Full exit at DOL",
                  "Invalidation: exit immediately if price breaks the swept extreme",
                ],
              },
              {
                n: 5,
                title: "DOL Updates",
                tf: "After exit",
                job: "Re-enter as each pool clears.",
                steps: [
                  "Mark the new DOL (next liquidity pool in the same direction)",
                  "Wait for a fresh retracement into a new PD Array",
                  "Re-enter with the same rules",
                  "Repeat until structure flips (CHoCH on 1H or higher)",
                ],
              },
            ].map((l) => (
              <div key={l.n} className="p-3 rounded-lg border border-purple-800/60 bg-purple-950/20">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-bold text-purple-200">
                    Layer {l.n} — {l.title}
                  </p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 font-bold">
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

        {/* 4. NEW — The Adaptive System */}
        <Section id="adaptive" title="The Adaptive System (Advanced Rules)" emoji="🧠" accent="pink">
          <Rule tone="pink">
            <strong>The SLD system is not static.</strong> Markets change
            conditions — trend vs. range, aggressive vs. choppy, HTF alignment
            vs. conflict. These 4 rules make the base system <em>adaptive</em> so
            it doesn&apos;t break when the market shifts.
          </Rule>

          <p className="text-xs text-gray-400">
            Each rule below has a corresponding toggle / field on the SLD form.
            When triggered, the engine surfaces a banner on the setup card and
            adjusts the trade math accordingly.
          </p>

          <div className="space-y-3 mt-2">
            <AdaptiveRule
              n={1}
              title="The Trend Hierarchy (HTF Veto)"
              emoji="🚫"
              tone="blue"
              problem="A 4H bullish BOS can print while the Daily is still bearish. The 4H move is a pullback — not a reversal. Without a rule, you take the 4H long and get trapped."
              rule="The 4H sets the entry bias, but the Daily sets the ultimate limit. If they conflict, the 4H move is a premium/discount retracement. Only take trades in the Daily direction until Daily structure makes a real CHoCH. Counter-trend is scalp-only, exit at the nearest pool."
              why="Stops you from taking fake reversals. If a 4H setup fights the Daily trend, you skip it — or you treat it as a counter-trend scalp with fast profit-taking."
            />

            <AdaptiveRule
              n={2}
              title="The Shallow Pullback Exception"
              emoji="⚡"
              tone="fuchsia"
              problem="The strict rule says 'buy in discount, sell in premium.' But in a violent trend, price never reaches the correct zone. Waiting for premium means missing the entire move."
              rule="If the HTF trend is aggressive and the pullback taps the 50 EMA or an FVG inside the 'wrong' zone, you may take the trade — but ONLY with a lower-TF CHoCH confirmation. Because the zone is wrong, the stop must be razor-thin, just past the pullback extreme."
              why="Lets you catch aggressive trends without chasing the breakout. You enter where the market refuses to pull back further — with a tight stop that reflects the increased risk."
            />

            <AdaptiveRule
              n={3}
              title="The Origin Retest (Turtle Soup / Breaker)"
              emoji="🔨"
              tone="pink"
              problem="Price retraces all the way to the exact level that started the move. It looks like a crash or a dead trend — but it can be the highest-probability setup in the entire system."
              rule="When price returns to the origin of a major move (the sweep that started the BOS), it must decide. If it breaks → trend is dead, stand aside. If it wicks and reverses → it's a Breaker Block, the A+ entry of the system."
              why="Stops you from getting chopped in the middle of a range. Forces you to wait for the absolute extreme of the current dealing range — the binary decision point."
            />

            <AdaptiveRule
              n={4}
              title="The EQH/EQL Magnet"
              emoji="🧲"
              tone="amber"
              problem="Retail sees equal highs as strong resistance and tries to short. Institutions see equal highs as a pool of buy-side liquidity that needs to be swept."
              rule="Equal highs above price are a magnet for bullish DOL. Equal lows below price are a magnet for bearish DOL. Do NOT fade them — target them as primary DOL. Only trade the reaction AFTER the sweep."
              why="Aligns you with the institutional flow instead of against it. EQH/EQL are not resistance/support — they are destinations. This single reframe fixes most of the 'I shorted the high and got stopped out' losses."
            />
          </div>

          <SubSection title="How these rules change how you fill out the form">
            <ol className="list-decimal list-inside space-y-1 ml-2 text-xs">
              <li>
                <strong>Layer 1 (Bias):</strong> You now must verify the 4H
                trend against the Daily. If Daily is bearish and 4H is
                bullish, mark bias as Bearish (treating the 4H move as a
                retracement) and check the "4H Bias" field so the HTF Veto
                fires.
              </li>
              <li>
                <strong>Layer 2 (POI):</strong> If the trend is aggressive and
                the pullback never reaches premium/discount, enable the
                "Shallow Pullback Exception" toggle and select the anchor (50
                EMA / FVG / OB).
              </li>
              <li>
                <strong>Layer 2 (Origin):</strong> If price has returned to
                the level that started the move, mark the "Origin Retest"
                toggle. If the origin held with a wick + reverse, also mark
                "Wicked and reversed" — this promotes the setup to A+
                Breaker.
              </li>
              <li>
                <strong>Layer 2 (Magnet):</strong> If EQH/EQL sits between
                price and the DOL, check the "EQH/EQL between" toggle so the
                system warns you not to fade it.
              </li>
              <li>
                <strong>Layer 3 (Trigger):</strong> Always wait for the
                CHoCH — no matter which of the 4 adaptive rules is active.
                The CHoCH is the one non-negotiable confirmation.
              </li>
            </ol>
          </SubSection>

          <Rule tone="pink">
            <strong>Non-negotiable:</strong> The adaptive rules change{" "}
            <em>where</em> you look and <em>how tight</em> your stop is. They
            never override the CHoCH. If you don&apos;t have a lower-TF CHoCH,
            there is no trade — regardless of how perfect the setup looks.
          </Rule>
        </Section>

        {/* 5. Glossary */}
        <Section id="glossary" title="Terms Glossary" emoji="📚" accent="cyan">
          <p className="text-xs text-gray-400">
            Tap any term to expand its definition, how to identify it, and an example.
          </p>

          <SubSection title="Liquidity Terms">
            <TermCard
              term="Liquidity"
              definition="Resting orders that institutions can fill against — clusters of stops, breakout orders, and pending limits."
              identify="Look for obvious levels where retail would place stops: above highs, below lows, at round numbers."
              accent="blue"
            />
            <TermCard
              term="BSL — Buy-Side Liquidity"
              definition="Liquidity sitting ABOVE price. These are buy stops (short sellers' stops + breakout buyers' pending orders)."
              identify="Look above previous swing highs, equal highs, prior day/week highs."
              example="Price is at 205,000. A prior swing high is at 206,500. Buy stops rest just above 206,500 = BSL."
              accent="blue"
            />
            <TermCard
              term="SSL — Sell-Side Liquidity"
              definition="Liquidity sitting BELOW price. These are sell stops (long holders' stops + breakdown sellers' pending orders)."
              identify="Look below previous swing lows, equal lows, prior day/week lows."
              example="Price is at 205,000. A prior swing low is at 203,400. Sell stops rest just below 203,400 = SSL."
              accent="orange"
            />
            <TermCard
              term="EQH / EQL — Equal Highs / Equal Lows"
              definition="Two or more highs (or lows) at approximately the same level. The strongest liquidity pool — the most obvious level, so the most stops. See Adaptive Rule 4: they are a MAGNET, not resistance."
              identify="Scan for 2–3 candles that topped (or bottomed) at nearly the same price."
              example="Three highs at 206,480, 206,500, 206,510 = EQH. A very clean pool. Price is expected to sweep through them, not reverse."
              accent="emerald"
            />
            <TermCard
              term="PDH / PDL — Prior Day High / Low"
              definition="Yesterday's high or low. Session traders consistently place stops here."
              identify="Mark yesterday's range on your chart. The extremes are the pools."
              accent="emerald"
            />
            <TermCard
              term="Trendline liquidity"
              definition="Stops sitting along a diagonal trendline. Retail traders place them where a trendline might break."
              identify="Draw a trendline across recent highs or lows. Stop clusters form along it."
              accent="purple"
            />
            <TermCard
              term="Round number liquidity"
              definition="Psychological levels (e.g., 200,000, 210,000) where option strikes and retail stops cluster."
              identify="Mark clean round numbers near current price."
              accent="yellow"
            />
          </SubSection>

          <SubSection title="Structure Terms">
            <TermCard
              term="HH — Higher High"
              definition="A swing high that is above the previous swing high. Bullish structure."
              identify="Compare successive tops. Each top higher = HH."
              accent="emerald"
            />
            <TermCard
              term="HL — Higher Low"
              definition="A swing low that is above the previous swing low. Bullish structure."
              identify="Compare successive bottoms. Each bottom higher = HL."
              accent="emerald"
            />
            <TermCard
              term="LH — Lower High"
              definition="A swing high that is below the previous swing high. Bearish structure."
              identify="Each top lower than the last = LH."
              accent="red"
            />
            <TermCard
              term="LL — Lower Low"
              definition="A swing low that is below the previous swing low. Bearish structure."
              identify="Each bottom lower than the last = LL."
              accent="red"
            />
            <TermCard
              term="BOS — Break of Structure"
              definition="Price breaks the most recent swing point in the direction of the trend. Continuation signal."
              identify="Look for a CANDLE CLOSE through the swing point — not just a wick. The close is what counts."
              example="Bullish structure with a swing high at 206,500. Price closes at 206,650 = BOS up."
              accent="emerald"
            />
            <TermCard
              term="Failed BOS"
              definition="A BOS that reverses and comes back below the swing point it broke. Signals the BOS was a trap."
              identify="BOS up, then price reclaims back below that same swing high with a close."
              accent="red"
            />
            <TermCard
              term="CHoCH — Change of Character"
              definition="Price breaks the structural swing point AGAINST the trend. Bias may be flipping."
              identify="In bullish structure, a CHoCH is when the last HL breaks with a close. In bearish structure, when the last LH breaks."
              example="Bullish: HH + HL + HH. Then price drops and closes below the HL. That's a CHoCH → bearish."
              accent="orange"
            />
            <TermCard
              term="Failed CHoCH / Invalidated CHoCH"
              definition="A CHoCH that reverses — price breaks back through the swing point that caused the CHoCH. Structure returns to the original bias."
              identify="CHoCH bearish, then price closes back above the recent HH. The CHoCH is dead; bullish resumes."
              accent="yellow"
            />
          </SubSection>

          <SubSection title="Delivery Terms">
            <TermCard
              term="DOL — Draw on Liquidity"
              definition="The specific liquidity pool that the current institutional delivery is targeting. The destination."
              identify="The nearest significant pool in the direction of the bias. Not the biggest, not the furthest — the nearest significant."
              example="Bullish bias. EQH at 206,700 (30 pips up). Prior swing high at 207,200 (100 pips up). First DOL = 206,700."
              accent="emerald"
            />
            <TermCard
              term="DOL Rank (Strength Hierarchy)"
              definition="Not all DOLs are equal. The order of reliability: EQH/EQL > PDH/PDL > Swing > Trendline > Round number."
              identify="Classify the DOL by what kind of pool it is. Strong pools = clean, obvious, multiple touches. Weak pools = single-touch, old, vague."
              accent="emerald"
            />
            <TermCard
              term="Sweep / Liquidity Grab"
              definition="Price pokes beyond a liquidity pool with a wick, then reverses. The stops were triggered; the true move is now the opposite direction."
              identify="A wick that takes out a swing high or low, followed by a candle closing back inside the range."
              example="Price wicks to 206,510 (above the 206,500 EQH) then closes back at 206,420. That's a sweep of BSL — bearish signal."
              accent="orange"
            />
            <TermCard
              term="Displacement"
              definition="A strong, aggressive move away from a level. Large-bodied candles. Signals institutional conviction."
              identify="Compare candle bodies — displacement candles are visibly larger than surrounding candles."
              accent="emerald"
            />
            <TermCard
              term="Dealing Range"
              definition="The current high-low range you're operating in — the container your trade lives inside."
              identify="Mark the most recent significant swing high and swing low."
              accent="blue"
            />
            <TermCard
              term="Discount"
              definition="The lower half of the dealing range (below the 50% midpoint). Where you want to buy."
              identify="Compute the CE (50% of range). Anything below = discount."
              accent="emerald"
            />
            <TermCard
              term="Premium"
              definition="The upper half of the dealing range (above the 50% midpoint). Where you want to sell."
              identify="Compute the CE. Anything above = premium."
              accent="red"
            />
          </SubSection>

          <SubSection title="PD Array Terms">
            <TermCard
              term="PD Array — Premium/Discount Array"
              definition="The collective name for the entry zones used in ICT: FVG, OB, Breaker, etc."
              identify="Any zone that price can return to as a Point of Interest."
              accent="purple"
            />
            <TermCard
              term="FVG — Fair Value Gap"
              definition="A three-candle imbalance: candle 1's high and candle 3's low leave a gap (bullish), or candle 1's low and candle 3's high leave a gap (bearish). Created by displacement."
              identify="Look for three consecutive candles where the middle candle is a large displacement candle, and there's a visible gap between candle 1 and candle 3."
              example="Bullish FVG: candle 1 high = 206,400. Candle 3 low = 206,450. Gap = 206,400 – 206,450."
              accent="blue"
            />
            <TermCard
              term="OB — Order Block"
              definition="The last opposing candle before a displacement move. Where institutions entered."
              identify="For a bullish OB: the last down candle before the strong up move. For a bearish OB: the last up candle before the strong down move."
              accent="emerald"
            />
            <TermCard
              term="Breaker Block"
              definition="A failed Order Block that flips direction. A previous bullish OB that failed becomes a bearish zone on the retest (and vice versa). See Adaptive Rule 3: Origin Retest."
              identify="Look for a prior OB that was broken through by displacement — the level now acts as the opposite side."
              accent="purple"
            />
            <TermCard
              term="POI — Point of Interest"
              definition="The specific PD Array you've marked as your entry zone. The place you're waiting for price to return to."
              identify="It's the FVG or OB that meets all criteria: in the correct zone (discount/premium), on the correct side of the range, in the bias direction."
              accent="emerald"
            />
          </SubSection>

          <SubSection title="Trigger Terms">
            <TermCard
              term="LTF CHoCH"
              definition="A lower-timeframe (5M or 1M) change of character that confirms the entry timing."
              identify="Inside your POI, watch for a small structure flip on the 5M — a break of the most recent 5M swing point in your direction."
              accent="cyan"
            />
            <TermCard
              term="Entry Candle"
              definition="The candle that confirms your entry — typically a 5M FVG or OB formation inside the POI after the LTF CHoCH."
              identify="Wait for it. Do not enter before it. It's the final signature on the setup."
              accent="cyan"
            />
          </SubSection>

          <SubSection title="Adaptive System Terms (NEW)">
            <TermCard
              term="HTF Veto"
              definition="Rule that the Daily trend overrides any 4H move in the opposite direction. A 4H BOS against the Daily is a retracement, not a reversal."
              identify="Compare the 4H bias to the Daily bias. If they conflict, the HTF Veto is active — treat counter-trend trades as scalps only."
              accent="blue"
            />
            <TermCard
              term="Shallow Pullback"
              definition="An aggressive trend where price never reaches the 'correct' discount/premium zone. Entry at 50 EMA / FVG confluence is allowed — with a razor-thin stop."
              identify="Trend is strong, pullback is shallow, price taps the 50 EMA or an FVG without reaching premium/discount. Requires LTF CHoCH to confirm."
              accent="red"
            />
            <TermCard
              term="Origin Retest"
              definition="Price returns to the exact level where the current move started (the sweep that preceded the BOS). It's a binary decision point: break = trend dead, wick + reverse = A+ Breaker."
              identify="Mark the sweep low/high that started the current leg. When price returns to it, watch the reaction: wick beyond + close back = held."
              accent="purple"
            />
            <TermCard
              term="EQH/EQL Magnet"
              definition="Equal highs/lows are not resistance — they are liquidity magnets. Price is drawn to them. Do not fade them; target the sweep reaction instead."
              identify="Look for equal highs above current price (bullish magnet) or equal lows below (bearish magnet). Target these as DOL, not as reversal zones."
              accent="yellow"
            />
          </SubSection>
        </Section>

        {/* 6. Identify */}
        <Section id="identify" title="How to Identify Each Term on a Chart" emoji="🔍" accent="orange">
          <p className="text-xs text-gray-400">
            The step-by-step detection rules, in the order you use them.
          </p>

          <SubSection title="1. Identify the daily bias">
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Mark the last 3–5 swing highs and lows on the daily.</li>
              <li>Compare: are highs rising + lows rising (bullish) or highs falling + lows falling (bearish)?</li>
              <li>Check the EMA 50 on the daily — price above = bullish, below = bearish.</li>
              <li>If the two disagree → NO TRADE. Bias must be clear.</li>
            </ol>
          </SubSection>

          <SubSection title="2. Check the 4H bias (HTF Veto)">
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Same process as the Daily, but on the 4H.</li>
              <li>If 4H bias ≠ Daily bias → HTF Veto is active.</li>
              <li>The 4H move is a retracement. Only take trades in the Daily direction, or scalp the 4H move with fast exit.</li>
            </ol>
          </SubSection>

          <SubSection title="3. Identify the DOL">
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>In the direction of the bias, scan for liquidity pools.</li>
              <li>Rank them by strength (EQH/EQL &gt; PDH/PDL &gt; Swing &gt; Trendline &gt; Round).</li>
              <li>Pick the NEAREST significant pool — not the biggest.</li>
              <li>Confirm it&apos;s aligned with the higher timeframe bias (bonus).</li>
              <li>Write down the exact price. That is your DOL.</li>
            </ol>
          </SubSection>

          <SubSection title="4. Identify the sweep">
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Wait for price to wick beyond a liquidity pool (opposite your bias).</li>
              <li>Check the close: did it come back inside the range?</li>
              <li>If close inside → sweep confirmed. If close beyond → it&apos;s a real break, not a sweep.</li>
              <li>The swept level becomes your reference for the stop.</li>
            </ol>
          </SubSection>

          <SubSection title="5. Identify the BOS">
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Identify the most recent swing high (bullish) or swing low (bearish).</li>
              <li>Wait for a CLOSE beyond that level — not just a wick.</li>
              <li>If close beyond → BOS confirmed. Bias is engaged.</li>
              <li>If only the wick went beyond → potential failed BOS or sweep, not a BOS.</li>
            </ol>
          </SubSection>

          <SubSection title="6. Identify the PD Array (FVG or OB)">
            <p className="font-semibold text-white mt-2">For an FVG:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Look at three consecutive candles during displacement.</li>
              <li>Bullish FVG: candle 3&apos;s low is higher than candle 1&apos;s high → gap between them.</li>
              <li>Bearish FVG: candle 3&apos;s high is lower than candle 1&apos;s low → gap between them.</li>
              <li>Mark the gap. That&apos;s your FVG.</li>
            </ol>

            <p className="font-semibold text-white mt-3">For an Order Block:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Find the displacement move (the strong candle or series).</li>
              <li>Look at the last candle BEFORE the move in the opposite direction.</li>
              <li>Bullish OB: the last down candle before the strong up move.</li>
              <li>Bearish OB: the last up candle before the strong down move.</li>
              <li>Mark the OB&apos;s high-low range. That&apos;s your OB.</li>
            </ol>
          </SubSection>

          <SubSection title="7. Check discount/premium">
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Mark the current dealing range (recent swing high + low).</li>
              <li>Compute the CE — (high + low) / 2.</li>
              <li>For a bullish setup: your POI must sit BELOW the CE.</li>
              <li>For a bearish setup: your POI must sit ABOVE the CE.</li>
              <li>If the POI is on the wrong side → skip, or use the Shallow Pullback Exception (with LTF CHoCH and thin SL).</li>
            </ol>
          </SubSection>

          <SubSection title="8. Check origin retest (Adaptive Rule 3)">
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Identify the sweep that started the current leg.</li>
              <li>Mark that exact price as the origin.</li>
              <li>If price returns to the origin: watch the reaction.</li>
              <li>Wick beyond + close back inside → A+ Breaker. Enter.</li>
              <li>Close beyond → trend is dead. Stand aside.</li>
            </ol>
          </SubSection>

          <SubSection title="9. Check EQH/EQL (Adaptive Rule 4)">
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Scan for 2+ highs at nearly the same price (EQH) or lows (EQL).</li>
              <li>If EQH sits between current price and the DOL, it is a magnet — not resistance.</li>
              <li>Do NOT fade it. Target the sweep as your DOL.</li>
              <li>Enter on the reaction AFTER the sweep, not before.</li>
            </ol>
          </SubSection>

          <SubSection title="10. Identify the trigger">
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Wait for price to enter the POI.</li>
              <li>Switch to the 5M or 1M chart.</li>
              <li>Look for a CHoCH in your direction on the LTF.</li>
              <li>Look for a small FVG/OB inside the POI.</li>
              <li>Enter on the close of the entry candle.</li>
            </ol>
          </SubSection>

          <SubSection title="11. Manage the trade">
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Set SL beyond the swept extreme.</li>
              <li>Set TP at the DOL.</li>
              <li>At 2R → close 50%, move SL to BE.</li>
              <li>After the next BOS in your direction → trail.</li>
              <li>At DOL → full exit.</li>
              <li>If price breaks the swept extreme → exit immediately.</li>
            </ol>
          </SubSection>
        </Section>

        {/* 7. Walkthrough */}
        <Section id="walkthrough" title="Full Walkthrough (Example)" emoji="🎯" accent="emerald">
          <p className="text-xs text-gray-400">
            A real-world bullish setup, step by step — with the adaptive rules applied.
          </p>

          <div className="space-y-3">
            <div className="p-3 rounded-lg border border-blue-800 bg-blue-950/20">
              <p className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                Step 1 — Bias + HTF Veto
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Daily structure is HH + HL. EMA 50 is below price. Bias ={" "}
                <strong className="text-emerald-300">BULLISH</strong>.
                4H is also bullish → HTF Veto agrees. Proceed.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-emerald-800 bg-emerald-950/20">
              <p className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                Step 2 — DOL
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Above current price: prior swing high at 206,500 (nearest). EQH
                at 207,200. Buy-Side Liquidity sits at 206,500. DOL ={" "}
                <strong className="text-emerald-300">206,500 (BSL)</strong>.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-amber-800 bg-amber-950/20">
              <p className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                Step 2b — EQH/EQL Magnet (Rule 4)
              </p>
              <p className="text-xs text-gray-300 mt-1">
                EQH sits at 207,200 between current price and the DOL. This is a
                magnet — not resistance. Do NOT short it. Target the sweep as
                the eventual higher DOL.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-orange-800 bg-orange-950/20">
              <p className="text-xs font-bold text-orange-200 uppercase tracking-wider">
                Step 3 — Sweep
              </p>
              <p className="text-xs text-gray-300 mt-1">
                A prior SSL sat at 205,100. Price wicks down to 205,020 and
                closes back at 205,180. SSL swept ✓.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-emerald-800 bg-emerald-950/20">
              <p className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                Step 4 — BOS
              </p>
              <p className="text-xs text-gray-300 mt-1">
                After the sweep, price displaces up and closes at 205,400 —
                above the recent swing high at 205,350. BOS up ✓.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-fuchsia-800 bg-fuchsia-950/20">
              <p className="text-xs font-bold text-fuchsia-200 uppercase tracking-wider">
                Step 5 — POI + Shallow Pullback (Rule 2)
              </p>
              <p className="text-xs text-gray-300 mt-1">
                The displacement left a bullish FVG at 205,180 – 205,300.
                Dealing range: 205,020 (low) to 205,500 (high). CE = 205,260.
                FVG sits BELOW the CE → discount ✓. Trend is aggressive — if
                price refuses to pull deeper, we may use a shallow FVG anchor.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-cyan-800 bg-cyan-950/20">
              <p className="text-xs font-bold text-cyan-200 uppercase tracking-wider">
                Step 6 — Trigger
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Price retraces into the FVG. On the 5M, a small CHoCH up forms.
                Entry candle: 205,240. Enter LONG.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-emerald-800 bg-emerald-950/20">
              <p className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                Step 7 — Trade
              </p>
              <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                <div>
                  <p className="text-gray-500">Entry</p>
                  <p className="font-bold text-yellow-300">205,240</p>
                </div>
                <div>
                  <p className="text-gray-500">Stop Loss</p>
                  <p className="font-bold text-red-300">205,010 (below swept low)</p>
                </div>
                <div>
                  <p className="text-gray-500">Target (DOL)</p>
                  <p className="font-bold text-green-300">206,500</p>
                </div>
                <div>
                  <p className="text-gray-500">Risk / Reward</p>
                  <p className="font-bold text-emerald-300">230 / 1,260 ≈ 1:5.5</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-pink-800 bg-pink-950/20">
              <p className="text-xs font-bold text-pink-200 uppercase tracking-wider">
                Step 7b — Origin Retest (Rule 3, alt scenario)
              </p>
              <p className="text-xs text-gray-300 mt-1">
                If instead price had retraced to the origin at 205,020 and
                wicked + reversed, that would have been the A+ Breaker setup —
                highest probability in the system. Stop just beyond the wick,
                target the same DOL.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-cyan-800 bg-cyan-950/20">
              <p className="text-xs font-bold text-cyan-200 uppercase tracking-wider">
                Step 8 — Management
              </p>
              <ul className="text-xs text-gray-300 mt-1 space-y-1 ml-4 list-disc">
                <li>At 2R (205,700) → close 50%, move SL to 205,240 (BE)</li>
                <li>After the next BOS up → trail SL below the new HL</li>
                <li>At 206,500 (DOL) → full exit</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* 8. Checklist */}
        <Section id="checklist" title="The Checklist" emoji="✅" accent="yellow">
          <Checklist
            title="Pre-Trade"
            items={[
              "Daily bias confirmed (bullish or bearish)",
              "4H bias checked against Daily (HTF Veto)",
              "DOL identified — specific price level",
              "Opposing liquidity swept",
              "BOS confirmed in bias direction (close, not wick)",
              "PD Array marked (FVG / OB / Breaker)",
              "PD Array in correct zone (discount for bullish, premium for bearish)",
              "If shallow pullback: anchor identified (50 EMA / FVG / OB)",
              "If origin retest: wick + reverse confirmed on LTF",
              "If EQH/EQL between price and DOL: marked as magnet, not resistance",
              "Path to DOL clear — no opposing PD Array (other than magnets)",
              "RR ≥ 1:3",
            ]}
          />
          <Checklist
            title="Entry"
            items={[
              "Price tapped the POI",
              "Lower-TF CHoCH confirmed (non-negotiable)",
              "Entry on 5M FVG/OB",
              "Stop beyond the swept extreme (or pullback extreme for shallow, or origin level for Breaker)",
              "Target = DOL",
            ]}
          />
          <Checklist
            title="Management"
            items={[
              "Partial at 2R (50%)",
              "Stop to break-even after partial",
              "Trail after next BOS",
              "Full exit at DOL or invalidation",
            ]}
          />
        </Section>

        {/* 9. Risk */}
        <Section id="risk" title="Risk & Rules" emoji="🛡️" accent="red">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Risk per trade", value: "0.5–1% of account" },
              { label: "Counter-trend risk (HTF Veto)", value: "0.25–0.5% max" },
              { label: "Shallow pullback risk", value: "0.5% max (razor-thin SL)" },
              { label: "Max trades per day", value: "2–3" },
              { label: "Max daily loss", value: "2%" },
              { label: "No-trade rule (bias)", value: "If bias unclear → NO TRADE" },
              { label: "No-trade rule (news)", value: "No entry within 30 min of high-impact news" },
              { label: "No-trade rule (RR)", value: "If RR < 3:1 → NO TRADE" },
            ].map((r, i) => (
              <div key={i} className="p-3 rounded-lg border border-red-800 bg-red-950/20">
                <p className="text-xs text-gray-500">{r.label}</p>
                <p className="text-sm font-bold text-red-200 mt-0.5">{r.value}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 10. Golden Rules */}
        <Section id="golden" title="Golden Rules" emoji="🏆" accent="emerald">
          <div className="space-y-2">
            {[
              "Price moves from one liquidity pool to another. That is the only constant.",
              "Structure is the map. Liquidity is the destination. PD Arrays are the entry.",
              "The DOL is always the NEAREST significant pool — not the biggest, not the furthest.",
              "A wick through a level is a sweep. A close through a level is a BOS.",
              "A CHoCH is only confirmed when the structural HL (or LH) breaks — not when price simply reverses.",
              "Buy in discount. Sell in premium. If price never reaches the correct zone, use the Shallow Pullback Exception — with LTF CHoCH and a thin stop.",
              "Entry is on the retest of the POI — not on the breakout.",
              "Partial at 2R. Move to BE. Trail after the next BOS.",
              "If bias is unclear → NO TRADE.",
              "Daily over 4H. Always. The HTF Veto is not optional.",
              "EQH/EQL are magnets, not resistance. Target the sweep, don't fade it.",
              "The CHoCH is the one non-negotiable confirmation — adaptive rules never override it.",
              "Update the DOL after every cleared pool.",
            ].map((r, i) => (
              <Rule key={i} tone="green">
                {i + 1}. {r}
              </Rule>
            ))}
          </div>
        </Section>

        {/* 11. Mistakes */}
        <Section id="mistakes" title="Common Mistakes" emoji="⚠️" accent="orange">
          <div className="space-y-2">
            {[
              {
                m: "Trading the wick instead of the close",
                fix: "Always wait for the candle to close. A wick is a trap.",
              },
              {
                m: "Taking a 4H reversal against the Daily",
                fix: "HTF Veto — the 4H move is a retracement. Trade with the Daily, or scalp only.",
              },
              {
                m: "Waiting for premium forever in an aggressive trend",
                fix: "Use the Shallow Pullback Exception — but only with LTF CHoCH and a thin SL.",
              },
              {
                m: "Shorting EQH / buying EQL as if they were resistance/support",
                fix: "They are magnets. Target the sweep as DOL — enter on the reaction, not before.",
              },
              {
                m: "Entering on the breakout, not the retest",
                fix: "Wait for price to return to the POI. The breakout is where you got trapped before.",
              },
              {
                m: "Targeting the furthest pool instead of the nearest",
                fix: "The DOL is the NEXT significant pool. Not the ultimate one.",
              },
              {
                m: "Buying in premium / selling in discount without the shallow exception",
                fix: "Check the dealing range CE before entering. Trade the correct zone — or explicitly use the shallow exception with a thin stop.",
              },
              {
                m: "Ignoring the sweep",
                fix: "No sweep = no setup. The trap must be sprung before the trade is real.",
              },
              {
                m: "Missing the CHoCH on the daily",
                fix: "Check daily structure every session. A CHoCH flips your bias — and your DOL.",
              },
              {
                m: "Holding for the full DOL after 2R",
                fix: "Take partials along the way. Trail. The full DOL is the target, not the guarantee.",
              },
              {
                m: "Moving the stop loss against the trade",
                fix: "Never widen a stop. If you must move it, move it forward (BE or trail).",
              },
              {
                m: "Trading without a clear bias",
                fix: "If bullish and bearish readings conflict → NO TRADE. Wait for clarity.",
              },
              {
                m: "Re-entering immediately after a loss",
                fix: "Wait for a fresh sweep, fresh BOS, fresh POI. The market doesn't owe you a trade.",
              },
            ].map((r, i) => (
              <div key={i} className="p-3 rounded-lg border border-orange-800 bg-orange-950/20">
                <p className="text-sm font-bold text-orange-200">❌ {r.m}</p>
                <p className="text-xs text-orange-100 mt-1">✅ {r.fix}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div className="p-4 rounded-lg border border-emerald-800 bg-emerald-950/20 space-y-2">
          <p className="text-sm font-bold text-emerald-200">
            🎯 You&apos;ve reached the end.
          </p>
          <p className="text-xs text-gray-300">
            Use this manual as your reference. Open it whenever you need to
            check a term, verify a rule, or reset your mental model. The
            system only works if you follow the doctrine — and the adaptive
            rules only work if the CHoCH confirms them.
          </p>
          <button
            type="button"
            onClick={() => router.push("/sld")}
            className="mt-2 w-full py-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 font-bold text-sm"
          >
            ← Go to SLD Setup
          </button>
        </div>
      </div>
    </main>
  );
}