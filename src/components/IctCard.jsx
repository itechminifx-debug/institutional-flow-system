"use client";

import { formatPrice } from "@/lib/formatNumbers";

// ============================================================
// Sub-components
// ============================================================

function DoctrineScoreDial({ score, tier }) {
  const tierColors = {
    green:  "text-green-400 stroke-green-500",
    yellow: "text-yellow-400 stroke-yellow-500",
    orange: "text-orange-400 stroke-orange-500",
    red:    "text-red-400 stroke-red-500",
  };
  const tierBgs = {
    green:  "bg-green-950/40 border-green-800",
    yellow: "bg-yellow-950/40 border-yellow-800",
    orange: "bg-orange-950/40 border-orange-800",
    red:    "bg-red-950/40 border-red-800",
  };
  const tierLabels = {
    green:  "🟢 Fully Aligned",
    yellow: "🟡 Minor Drift",
    orange: "🟠 Multiple Rules Broken",
    red:    "🔴 Major Drift",
  };

  const cls = tierColors[tier] || tierColors.red;
  const bg = tierBgs[tier] || tierBgs.red;
  const label = tierLabels[tier] || tierLabels.red;

  // SVG circle math
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className={`p-4 rounded-lg border-2 ${bg} flex items-center gap-4`}>
      <div className="relative shrink-0 w-24 h-24">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} className="stroke-gray-800 fill-none" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={radius}
            className={`fill-none ${cls.split(" ")[1]}`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${cls.split(" ")[0]}`}>{score}</span>
          <span className="text-[9px] text-gray-500 uppercase tracking-wider">Score</span>
        </div>
      </div>
      <div>
        <p className={`text-sm font-bold ${cls.split(" ")[0]}`}>{label}</p>
        <p className="text-xs text-gray-400 mt-1">
          Doctrine Score: <strong className="text-white">{score}/100</strong>
        </p>
      </div>
    </div>
  );
}

function PhasePanel({ title, phase, accent = "cyan", children }) {
  const accentMap = {
    cyan:    "border-cyan-800/60 bg-cyan-950/20",
    blue:    "border-blue-800/60 bg-blue-950/20",
    purple:  "border-purple-800/60 bg-purple-950/20",
    emerald: "border-emerald-800/60 bg-emerald-950/20",
    amber:   "border-amber-800/60 bg-amber-950/20",
  };
  const cls = accentMap[accent] || accentMap.cyan;

  return (
    <div className={`ml-8 p-3 rounded-lg border space-y-2 ${cls}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-gray-200">{title}</p>
        {typeof phase?.score === "number" && (
          <span className={`text-[10px] font-bold ${phase.score >= 70 ? "text-green-300" : phase.score >= 40 ? "text-yellow-300" : "text-red-300"}`}>
            {phase.score}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        {phase?.gates?.map((g, i) => (
          <div
            key={g.key || i}
            className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${
              g.pass
                ? "bg-green-950/20 border border-green-800"
                : "bg-yellow-950/20 border border-yellow-800" // Warnings are yellow, not red, because nothing is blocked
            }`}
          >
            <span className="text-sm leading-none mt-0.5">{g.pass ? "✅" : "⚠️"}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${g.pass ? "text-green-200" : "text-yellow-200"}`}>{g.label}</p>
              <p className={`mt-0.5 ${g.pass ? "text-green-300/90" : "text-yellow-300/90"}`}>{g.detail}</p>
            </div>
          </div>
        ))}
        {children}
      </div>
    </div>
  );
}

// ============================================================
// Main Card
// ============================================================
export default function IctCard({ data }) {
  if (!data) return null;

  const { context, liquidity, arrays, time, doctrine } = data;

  const isAplus = doctrine.tier === "green";
  const warnings = doctrine.warnings || [];

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-cyan-800 space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-cyan-300">📖 ICT Core Doctrine</h2>
          <p className="text-xs text-gray-500 mt-0.5">Validator for the complete book methodology.</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {isAplus && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border-2 border-green-500 bg-green-900/60 text-green-100 font-bold">
              🌟 A+ DOCTRINE
            </span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
            doctrine.tier === "green" ? "bg-green-900/40 border-green-700 text-green-200" :
            doctrine.tier === "yellow" ? "bg-yellow-900/40 border-yellow-700 text-yellow-200" :
            doctrine.tier === "orange" ? "bg-orange-900/40 border-orange-700 text-orange-200" :
            "bg-red-900/40 border-red-700 text-red-200"
          }`}>
            {doctrine.score}/100
          </span>
        </div>
      </div>

      {/* Doctrine Score Dial */}
      <DoctrineScoreDial score={doctrine.score} tier={doctrine.tier} />

      {/* Warning Summary — shows if there are any */}
      {warnings.length > 0 && (
        <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-800/60 space-y-1.5">
          <p className="text-xs font-bold text-yellow-200 flex items-center gap-1">
            ⚠️ Doctrine Drift Detected ({warnings.length} warning{warnings.length === 1 ? "" : "s"})
          </p>
          <ul className="text-[11px] text-yellow-100/90 space-y-1 ml-4 list-disc">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
          <p className="text-[10px] text-yellow-300/60 italic mt-1">These are informational. The system will never block a save.</p>
        </div>
      )}

      {/* Warnings clear message if score is perfect */}
      {warnings.length === 0 && (
        <div className="p-3 rounded-lg bg-green-950/30 border border-green-800/60">
          <p className="text-xs text-green-200 font-bold">✅ Flawless Execution</p>
          <p className="text-[11px] text-green-300/80 mt-1">Every rule in the book is satisfied. This is a textbook A+ setup.</p>
        </div>
      )}

      {/* The 4 Phases */}
      <div className="space-y-3 pt-2">
        <PhasePanel title="Phase 1 — Context & Structure (Ch. 6–10)" phase={context} accent="blue" />
        <PhasePanel title="Phase 2 — Liquidity (Ch. 11–15)" phase={liquidity} accent="cyan" />
        <PhasePanel title="Phase 3 — PD Arrays (Ch. 16–20)" phase={arrays} accent="purple" />
        <PhasePanel title="Phase 4 — Time & Model (Ch. 21–25)" phase={time} accent="emerald" />
      </div>

    </div>
  );
}