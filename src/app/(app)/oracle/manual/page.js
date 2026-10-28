"use client";

import { useRouter } from "next/navigation";

function Section({ id, title, emoji, children, accent = "indigo" }) {
  const accentMap = {
    indigo: "border-indigo-800 text-indigo-300",
    blue: "border-blue-800 text-blue-300",
    purple: "border-purple-800 text-purple-300",
    emerald: "border-emerald-800 text-emerald-300",
    amber: "border-amber-800 text-amber-300",
    gray: "border-gray-800 text-gray-300",
  };
  const cls = accentMap[accent] || accentMap.indigo;

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
    indigo: "border-indigo-700 bg-indigo-950/20 text-indigo-200",
  };
  return (
    <div className={`p-3 rounded-lg border ${toneMap[tone]}`}>
      <p className="text-xs">{children}</p>
    </div>
  );
}

export default function OracleManualPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <button
            type="button"
            onClick={() => router.push("/oracle")}
            className="text-xs text-indigo-300 hover:text-indigo-200 mb-2"
          >
            ← Back to Oracle
          </button>
          <h1 className="text-3xl font-bold">🧠 The IFS Oracle Manual</h1>
          <p className="text-gray-400 text-sm mt-1">
            Master Chart Reader — Weekly to 1M
          </p>
          <p className="text-gray-500 text-xs mt-2">
            The doctrine of reading a chart. Every timeframe, every layer, in one system.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
          <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Contents</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
            {[
              { id: "philosophy", label: "1. The Philosophy" },
              { id: "the-8-layers", label: "2. The 8 Layers" },
              { id: "prediction", label: "3. How the Prediction Works" },
              { id: "confidence", label: "4. Confidence Levels" },
              { id: "linking", label: "5. Linking to Setups" },
              { id: "accuracy", label: "6. Tracking Accuracy" },
            ].map((t) => (
              <a key={t.id} href={`#${t.id}`} className="text-indigo-300 hover:text-indigo-200 py-0.5">
                {t.label}
              </a>
            ))}
          </div>
        </div>

        {/* 1. Philosophy */}
        <Section id="philosophy" title="The Philosophy" emoji="🧭">
          <Rule tone="indigo">
            <strong>"A chart is a story. The Oracle reads the story from the highest timeframe to the lowest, layer by layer, until the whole picture is clear."</strong>
          </Rule>
          <p>
            Most traders look at one chart and try to guess. A master trader looks at the weekly, then the daily, then the 4H, and asks: "What is each one telling me?" The Oracle does the same thing, in code.
          </p>
          <p>
            It doesn't predict the future. It <em>reads the present</em> — and based on the doctrine, it tells you what is most likely to happen next. That is the only way to trade: read the chart, do the analysis, then act.
          </p>
        </Section>

        {/* 2. The 8 Layers */}
        <Section id="the-8-layers" title="The 8 Layers" emoji="📊" accent="blue">
          <p>
            The Oracle walks through 8 layers, one per timeframe. Each layer has its own questions, and each layer feeds the next.
          </p>

          <div className="mt-3 space-y-2">
            {[
              { n: 1, tf: "Weekly",    q: "What is the macro bias? Bullish, bearish, or ranging?" },
              { n: 2, tf: "Daily",     q: "What is the daily bias? Where is the dealing range? Is price in premium or discount?" },
              { n: 3, tf: "4H",        q: "Is structure making HH/HL or LH/LL? Was the last break a BOS (trap) or CHoCH (reversal)? Was it on displacement?" },
              { n: 4, tf: "1H",        q: "Is there a 1H FVG or Order Block? Are we in a Kill Zone?" },
              { n: 5, tf: "15M",       q: "Did we sweep liquidity? Did we get an MSS? Is there an FVG?" },
              { n: 6, tf: "5M",        q: "Is there a 5M CHoCH or Rejection Block?" },
              { n: 7, tf: "1M",        q: "Is there a 1M CHoCH or Rejection Block?" },
              { n: 8, tf: "Execution", q: "Where is the entry? Where is the stop? Where is the target?" },
            ].map((l) => (
              <div key={l.n} className="p-3 rounded-lg border border-blue-800/60 bg-blue-950/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-300">{l.n}.</span>
                  <span className="text-sm font-bold text-white">{l.tf}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1 ml-4">{l.q}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 3. Prediction */}
        <Section id="prediction" title="How the Prediction Works" emoji="🎯" accent="purple">
          <p>
            Once all 8 layers are filled in, the Oracle weighs them and produces a prediction.
          </p>

          <SubSection title="The HTF Decides Direction">
            <p>
              The higher timeframes (Weekly + Daily + 4H) decide the direction. If the HTF bias is strongly bullish, the prediction is BUY. If strongly bearish, SELL. If mixed or ranging, WAIT.
            </p>
            <p>
              The LTF layers (15M, 5M, 1M) are used for <strong>timing</strong>, not direction. They confirm that the trap has sprung and the trigger has fired.
            </p>
          </SubSection>

          <SubSection title="The Rule">
            <Rule tone="indigo">
              HTF = Direction. LTF = Timing. If HTF and LTF disagree, WAIT.
            </Rule>
          </SubSection>

          <SubSection title="The Probability Score">
            <p>
              The probability (0-100%) is the average of all 8 layer scores. A score of 90% means every layer is green. A score of 40% means most layers are failing.
            </p>
          </SubSection>
        </Section>

        {/* 4. Confidence */}
        <Section id="confidence" title="Confidence Levels" emoji="🌟" accent="emerald">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
            <div className="p-3 rounded-lg border border-green-800 bg-green-950/20">
              <p className="text-sm font-bold text-green-300">🟢 High Confidence</p>
              <p className="text-xs text-gray-400 mt-1">
                Average layer score ≥ 85% AND at least 2 HTF layers agree.
              </p>
              <p className="text-xs text-gray-500 mt-2 italic">
                Take this trade. Size up if the R:R is good.
              </p>
            </div>
            <div className="p-3 rounded-lg border border-yellow-800 bg-yellow-950/20">
              <p className="text-sm font-bold text-yellow-300">🟡 Medium Confidence</p>
              <p className="text-xs text-gray-400 mt-1">
                Average layer score ≥ 60% AND at least 1 HTF layer agrees.
              </p>
              <p className="text-xs text-gray-500 mt-2 italic">
                Take this trade with normal risk. Wait for more confirmation.
              </p>
            </div>
            <div className="p-3 rounded-lg border border-red-800 bg-red-950/20">
              <p className="text-sm font-bold text-red-300">🔴 Low Confidence</p>
              <p className="text-xs text-gray-400 mt-1">
                Score below 60% OR no HTF alignment.
              </p>
              <p className="text-xs text-gray-500 mt-2 italic">
                Do not take this trade. Wait for a better setup.
              </p>
            </div>
          </div>
        </Section>

        {/* 5. Linking */}
        <Section id="linking" title="Linking to Setups" emoji="🔗" accent="amber">
          <p>
            The Oracle isn't a standalone system. It is the <strong>connective tissue</strong> between all the systems you've built.
          </p>
          <SubSection title="Why Link">
            <p>
              When you're not sure about an LQE setup, an AMS setup, or a TS setup, run an Oracle reading and link it to that setup. The Oracle will tell you: "This is a valid LQE setup, but the HTF bias conflicts with the LTF trigger. The Oracle says WAIT."
            </p>
            <p>
              Linking gives you a <strong>second opinion</strong> from the master system.
            </p>
          </SubSection>

          <SubSection title="How to Link">
            <p>
              On the Oracle form, there's a "Linked Setup" field at the top. Click it, choose a system (SLD / SMC / LQE / FWT / ADS / AMS / TS / ICT), and pick the specific setup. The Oracle reading will be permanently linked.
            </p>
          </SubSection>
        </Section>

        {/* 6. Accuracy */}
        <Section id="accuracy" title="Tracking Accuracy" emoji="📈" accent="gray">
          <p>
            The Oracle journal tracks accuracy — the percentage of predictions that turned out to be correct.
          </p>

          <SubSection title="What accuracy means">
            <p>
              Accuracy = Won / (Won + Lost) * 100. Every time you mark an Oracle reading as Won or Lost, it contributes to your overall accuracy.
            </p>
          </SubSection>

          <SubSection title="What a good accuracy looks like">
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
              <li><strong>Below 50%</strong> — something is wrong. Review failed readings and find the pattern.</li>
              <li><strong>50-60%</strong> — average. The Oracle is working but not yet reliable.</li>
              <li><strong>60-70%</strong> — good. With proper R:R, this is highly profitable.</li>
              <li><strong>70%+</strong> — excellent. You've mastered the doctrine.</li>
            </ul>
          </SubSection>

          <Rule tone="green">
            <strong>The real value:</strong> Even at 55% accuracy, the Oracle is enormously profitable if you demand R:R ≥ 3:1. The math: 0.55 × 3 - 0.45 × 1 = +1.20 per trade. Over 100 trades, you're up 120R.
          </Rule>
        </Section>

        {/* Footer */}
        <div className="p-4 rounded-lg border border-indigo-800 bg-indigo-950/20 space-y-2">
          <p className="text-sm font-bold text-indigo-200">
            🧠 You are now the Oracle.
          </p>
          <p className="text-xs text-gray-300">
            The Oracle doesn't replace your judgment — it amplifies it. When the Oracle is green, you have confidence. When it's yellow, you size down. When it's red, you walk away. Over time, you will learn to read the chart the way the Oracle reads the chart. And then you won't need the Oracle at all.
          </p>
          <button
            type="button"
            onClick={() => router.push("/oracle")}
            className="mt-2 w-full py-3 rounded-lg bg-indigo-700 hover:bg-indigo-600 font-bold text-sm"
          >
            ← Go to Oracle
          </button>
        </div>
      </div>
    </main>
  );
}