"use client";

import { useRouter } from "next/navigation";

export default function CrtManualPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <button type="button" onClick={() => router.push("/crt")} className="text-xs text-teal-300 hover:text-teal-200 mb-2">← Back to CRT</button>
          <h1 className="text-3xl font-bold">🕯️ The CRT Manual</h1>
          <p className="text-gray-400 text-sm mt-1">Candle Range Theory</p>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
          <p className="text-xs font-bold text-teal-300 uppercase tracking-wider">Contents</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
            {[{ id: "philosophy", label: "1. The Philosophy" }, { id: "the-stages", label: "2. The 4 Stages" }, { id: "zones", label: "3. CRT Zones & OTE" }, { id: "rules", label: "4. The Hard Rules" }].map((t) => (
              <a key={t.id} href={`#${t.id}`} className="text-teal-300 hover:text-teal-200 py-0.5">{t.label}</a>
            ))}
          </div>
        </div>

        <section id="philosophy" className="scroll-mt-20">
          <div className="border-l-4 pl-4 py-1 border-teal-800"><h2 className="text-lg font-bold text-teal-300">🧭 The Philosophy</h2></div>
          <div className="mt-3 space-y-3 text-sm text-gray-300 leading-relaxed">
            <div className="p-3 rounded-lg border border-teal-700 bg-teal-950/20 text-teal-200"><p className="text-xs"><strong>"The 4H candle is a story of manipulation and distribution."</strong></p></div>
            <p>CRT is the study of the 4H candle range. Price opens, manipulates one side of the range to trap traders, and then distributes to the other side. We use the 4H range to determine the ultimate draw on liquidity, and the lower timeframes to refine the entry.</p>
          </div>
        </section>

        <section id="the-stages" className="scroll-mt-20">
          <div className="border-l-4 pl-4 py-1 border-blue-800"><h2 className="text-lg font-bold text-blue-300">📊 The 4 Stages</h2></div>
          <div className="mt-3 space-y-2">
            {[{ n: 1, name: "Context", q: "Define the 4H CRT High and Low. (You can combine up to 3 candles)." }, { n: 2, name: "Liquidity", q: "Did the 15M sweep the CRT high or low?" }, { n: 3, name: "Structure", q: "Did the 1M give a MSS? Was the IDM swept? Is there an FVG / OB?" }, { n: 4, name: "Entry", q: "Where is the entry, SL, and TP?" }].map((l) => (
              <div key={l.n} className="p-3 rounded-lg border border-blue-800/60 bg-blue-950/20">
                <div className="flex items-center gap-2"><span className="text-xs font-bold text-blue-300">{l.n}.</span><span className="text-sm font-bold text-white">{l.name}</span></div>
                <p className="text-xs text-gray-400 mt-1 ml-4">{l.q}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="zones" className="scroll-mt-20">
          <div className="border-l-4 pl-4 py-1 border-emerald-800"><h2 className="text-lg font-bold text-emerald-300">📐 CRT Zones & OTE</h2></div>
          <div className="mt-3 space-y-3 text-sm text-gray-300 leading-relaxed">
            <p><strong>The 50% Midpoint:</strong> The exact middle of the CRT range. Price often retraces to this level.</p>
            <p><strong>The OTE:</strong> The 61.8% to 79% retracement of the CRT range. This is where the highest probability entries occur.</p>
          </div>
        </section>

        <section id="rules" className="scroll-mt-20">
          <div className="border-l-4 pl-4 py-1 border-red-800"><h2 className="text-lg font-bold text-red-300">⚖️ The Hard Rules</h2></div>
          <div className="mt-3 space-y-3 text-sm text-gray-300 leading-relaxed">
            <ul className="list-disc list-inside space-y-1.5 ml-2 text-xs">
              <li><strong>HTF Bias must be set.</strong></li>
              <li><strong>15M Sweep must be confirmed.</strong></li>
              <li><strong>1M MSS must be confirmed.</strong></li>
              <li><strong>SL must be beyond the sweep.</strong></li>
              <li><strong>RR must be ≥ 2.</strong></li>
            </ul>
          </div>
        </section>

        <div className="p-4 rounded-lg border border-teal-800 bg-teal-950/20 space-y-2">
          <p className="text-sm font-bold text-teal-200">🕯️ Trade the 4H Range.</p>
          <button type="button" onClick={() => router.push("/crt")} className="mt-2 w-full py-3 rounded-lg bg-teal-700 hover:bg-teal-600 font-bold text-sm text-white">← Go to CRT</button>
        </div>
      </div>
    </main>
  );
}