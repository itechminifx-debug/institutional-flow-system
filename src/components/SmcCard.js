"use client";

import { formatPrice } from "@/lib/formatNumbers";
import { PD_ARRAY_TYPES } from "@/lib/smcEngine";

function StepPanel({ title, emoji, step, accent = "blue", children }) {
  const accentMap = {
    blue: "border-blue-800/60 bg-blue-950/20",
    purple: "border-purple-800/60 bg-purple-950/20",
    emerald: "border-emerald-800/60 bg-emerald-950/20",
  };
  const cls = accentMap[accent] || accentMap.blue;

  return (
    <div className={`ml-8 p-3 rounded-lg border space-y-2 ${cls}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-gray-200">
          {emoji} {title}
        </p>
        {typeof step?.score === "number" && (
          <span className={`text-[10px] font-bold ${step.ready ? "text-green-300" : "text-yellow-300"}`}>
            {step.ready ? "READY" : "WAIT"} · {step.score}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        {step?.gates?.map((g, i) => (
          <div
            key={g.key || i}
            className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${
              g.pass ? "bg-green-950/20 border border-green-800" : g.bonus ? "bg-gray-900/40 border border-gray-700" : "bg-red-950/20 border border-red-800"
            }`}
          >
            <span className="text-sm leading-none mt-0.5">
              {g.pass ? "✅" : g.bonus ? "⚪" : "❌"}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${g.pass ? "text-green-200" : g.bonus ? "text-gray-300" : "text-red-200"}`}>
                {g.label}
              </p>
              <p className={`mt-0.5 ${g.pass ? "text-green-300/90" : g.bonus ? "text-gray-400" : "text-red-300/90"}`}>
                {g.detail}
              </p>
            </div>
          </div>
        ))}
        {children}
      </div>
    </div>
  );
}

export default function SmcCard({ data, warnings }) {
  if (!data) return null;

  const { context, liquidity, entry, trade, preEntryReady, reasons } = data;
  const verdict = preEntryReady && trade ? trade.direction : "WAIT";
  const verdictColor = verdict === "BUY" ? "bg-green-900/40 border-green-600 text-green-200" : verdict === "SELL" ? "bg-red-900/40 border-red-600 text-red-200" : "bg-yellow-950/40 border-yellow-700 text-yellow-200";
  const verdictEmoji = verdict === "BUY" ? "🟢" : verdict === "SELL" ? "🔴" : "⏳";

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-blue-800 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-blue-300">🏛️ SMC / ICT Model</h2>
          <p className="text-xs text-gray-500 mt-0.5">Context → Time → Sweep → CHoCH → PD Array → DOL</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full border-2 font-bold ${verdictColor}`}>
          {verdictEmoji} {verdict}
        </span>
      </div>

      <StepPanel title="Step 1 & 2 — Context & Time" emoji="🌍" step={context} accent="blue" />
      <StepPanel title="Step 3 — Liquidity (Sweep)" emoji="💧" step={liquidity} accent="purple" />
      <StepPanel title="Step 4 & 5 — Confirmation & Entry" emoji="⚡" step={entry} accent="emerald" />

      {trade && preEntryReady && !trade.invalid && (
        <div className="p-4 rounded-lg bg-blue-950/30 border-2 border-blue-700 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-bold text-blue-200">💰 Entry Card</p>
            <span className={`text-xs px-2 py-1 rounded-full font-bold ${trade.direction === "BUY" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>
              {trade.direction}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Entry</p>
              <p className="font-bold tabular-nums text-yellow-400">{formatPrice(trade.entry)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Stop Loss</p>
              <p className="font-bold tabular-nums text-red-400">{formatPrice(trade.sl)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Target (DOL)</p>
              <p className="font-bold tabular-nums text-green-400">{formatPrice(trade.tp)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">RR</p>
              <p className={`font-bold tabular-nums ${trade.rr >= 3 ? "text-green-300" : "text-yellow-300"}`}>
                1:{trade.rr?.toFixed(2) ?? "—"}
              </p>
            </div>
            {trade.riskAmount !== undefined && (
              <div>
                <p className="text-xs text-gray-500">Risk</p>
                <p className="font-bold tabular-nums text-white">${trade.riskAmount}</p>
              </div>
            )}
          </div>
          {trade.rr !== undefined && trade.rr < 3 && (
            <p className="text-xs text-yellow-300 pt-2 border-t border-blue-800/50">
              ⚠️ ICT requires RR ≥ 3:1. Consider a further DOL or a tighter entry.
            </p>
          )}
        </div>
      )}

      {trade?.invalid && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-700 text-red-200 text-xs">
          <strong>Invalid Trade:</strong> {trade.invalidReason}
        </div>
      )}

      {!preEntryReady && reasons && reasons.length > 0 && (
        <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-800 space-y-2">
          <p className="text-xs font-bold text-yellow-200">⏳ Why the system is saying WAIT</p>
          <ul className="text-xs text-yellow-200 space-y-1 ml-4 list-disc">
            {reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}