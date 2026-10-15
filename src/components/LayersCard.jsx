"use client";

import { formatPrice } from "@/lib/formatNumbers";
import { layersTypeInfo, sessionInfo } from "@/lib/layersEngine";

// ------------------------------------------------------------
// Layer status badge
// ------------------------------------------------------------
function LayerBadge({ ready, label, passed, total }) {
  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border-2 ${
        ready
          ? "bg-green-950/40 border-green-700"
          : "bg-yellow-950/30 border-yellow-700"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none">
          {ready ? "✅" : "⏳"}
        </span>
        <span
          className={`text-xs font-bold ${
            ready ? "text-green-200" : "text-yellow-200"
          }`}
        >
          {label}
        </span>
      </div>
      <span
        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          ready
            ? "bg-green-900/60 text-green-200"
            : "bg-yellow-900/60 text-yellow-200"
        }`}
      >
        {passed}/{total}
      </span>
    </div>
  );
}

// ------------------------------------------------------------
// Individual gate row
// ------------------------------------------------------------
function GateRow({ gate }) {
  const pass = gate?.pass;
  const bonus = gate?.bonus;

  return (
    <div
      className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${
        pass
          ? "bg-green-950/20 border border-green-800"
          : bonus
          ? "bg-gray-900/40 border border-gray-700"
          : "bg-red-950/20 border border-red-800"
      }`}
    >
      <span className="text-sm leading-none mt-0.5">
        {pass ? "✅" : bonus ? "⚪" : "❌"}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={`font-semibold ${
              pass
                ? "text-green-200"
                : bonus
                ? "text-gray-300"
                : "text-red-200"
            }`}
          >
            {gate?.label || "—"}
          </p>
          {bonus && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-900/40 text-purple-300 font-bold">
              BONUS
            </span>
          )}
        </div>
        <p
          className={`mt-0.5 ${
            pass
              ? "text-green-300/90"
              : bonus
              ? "text-gray-400"
              : "text-red-300/90"
          }`}
        >
          {gate?.detail || "—"}
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Layer panel
// ------------------------------------------------------------
function LayerPanel({ title, emoji, layer, accent }) {
  const accentMap = {
    blue: "border-blue-800/60 bg-blue-950/20",
    purple: "border-purple-800/60 bg-purple-950/20",
    green: "border-green-800/60 bg-green-950/20",
  };
  const cls = accentMap[accent] || accentMap.blue;

  return (
    <div className={`p-3 rounded-lg border space-y-2 ${cls}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-gray-200">
          {emoji} {title}
        </p>
        <span
          className={`text-[10px] font-bold ${
            layer.ready ? "text-green-300" : "text-yellow-300"
          }`}
        >
          {layer.ready ? "READY" : "WAIT"} · {layer.score}%
        </span>
      </div>
      <div className="space-y-1">
        {layer.gates.map((g, i) => (
          <GateRow key={g.key || i} gate={g} />
        ))}
      </div>
      <p
        className={`text-xs italic pt-1 border-t ${
          layer.ready
            ? "text-green-300/90 border-green-800/50"
            : "text-yellow-300/90 border-yellow-800/50"
        }`}
      >
        {layer.summary}
      </p>
    </div>
  );
}

// ------------------------------------------------------------
// Entry card
// ------------------------------------------------------------
function EntryCard({ trade }) {
  if (!trade) return null;

  return (
    <div className="p-4 rounded-lg bg-green-950/30 border-2 border-green-600 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-bold text-green-200">
          🎯 Entry Card — All Layers Green
        </p>
        <span
          className={`text-xs px-2 py-1 rounded-full font-bold ${
            trade.direction === "BUY"
              ? "bg-green-900/60 text-green-200"
              : "bg-red-900/60 text-red-200"
          }`}
        >
          {trade.direction}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-500">Entry (CE)</p>
          <p className="font-bold tabular-nums text-yellow-400">
            {formatPrice(trade.entry)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Stop Loss</p>
          <p className="font-bold tabular-nums text-red-400">
            {formatPrice(trade.sl)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Take Profit</p>
          <p className="font-bold tabular-nums text-green-400">
            {formatPrice(trade.tp)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">RR</p>
          <p
            className={`font-bold tabular-nums ${
              trade.rr >= 2 ? "text-green-300" : "text-yellow-300"
            }`}
          >
            1:{trade.rr?.toFixed(2) ?? "—"}
          </p>
        </div>
        {trade.slPips !== undefined && trade.slPips !== null && (
          <div>
            <p className="text-xs text-gray-500">SL distance</p>
            <p className="font-bold tabular-nums text-red-300">
              {trade.slPips} pips
            </p>
          </div>
        )}
        {trade.tpPips !== undefined && trade.tpPips !== null && (
          <div>
            <p className="text-xs text-gray-500">TP distance</p>
            <p className="font-bold tabular-nums text-green-300">
              {trade.tpPips} pips
            </p>
          </div>
        )}
        {trade.lotSize !== undefined && trade.lotSize !== null && (
          <div>
            <p className="text-xs text-gray-500">Lot size</p>
            <p className="font-bold tabular-nums text-white">
              {trade.lotSize}
            </p>
          </div>
        )}
        {trade.riskAmount !== undefined && trade.riskAmount !== null && (
          <div>
            <p className="text-xs text-gray-500">Risk amount</p>
            <p className="font-bold tabular-nums text-white">
              {formatPrice(trade.riskAmount)}
            </p>
          </div>
        )}
      </div>

      {trade.rr !== undefined && trade.rr < 2 && (
        <p className="text-xs text-yellow-300 pt-2 border-t border-green-800/50">
          ⚠️ RR is below 2:1 — the setup is valid, but the reward is thin.
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Reasons panel
// ------------------------------------------------------------
function ReasonsPanel({ reasons, context, setup, trigger }) {
  if (!reasons || reasons.length === 0) return null;

  // Group by layer
  const grouped = {
    context: reasons.filter((r) => r.startsWith("Context —")),
    setup: reasons.filter((r) => r.startsWith("Setup —")),
    trigger: reasons.filter((r) => r.startsWith("Trigger —")),
  };

  return (
    <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-800 space-y-3">
      <p className="text-xs font-bold text-yellow-200">
        ⏳ Why the system is saying WAIT
      </p>

      {grouped.context.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-blue-300 font-bold">
            Layer 1 — Context
          </p>
          <ul className="text-xs text-yellow-200 space-y-1 ml-4 list-disc">
            {grouped.context.map((r, i) => (
              <li key={i}>{r.replace("Context — ", "")}</li>
            ))}
          </ul>
        </div>
      )}

      {grouped.setup.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-purple-300 font-bold">
            Layer 2 — Setup
          </p>
          <ul className="text-xs text-yellow-200 space-y-1 ml-4 list-disc">
            {grouped.setup.map((r, i) => (
              <li key={i}>{r.replace("Setup — ", "")}</li>
            ))}
          </ul>
        </div>
      )}

      {grouped.trigger.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-green-300 font-bold">
            Layer 3 — Trigger
          </p>
          <ul className="text-xs text-yellow-200 space-y-1 ml-4 list-disc">
            {grouped.trigger.map((r, i) => (
              <li key={i}>{r.replace("Trigger — ", "")}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Warning panel
// ------------------------------------------------------------
function WarningPanel({ warnings }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div className="p-3 rounded-lg bg-red-950/40 border border-red-700 space-y-2">
      <p className="text-xs font-bold text-red-200">
        ⚠️ {warnings.length} warning{warnings.length === 1 ? "" : "s"} detected
      </p>
      <div className="space-y-1">
        {warnings.map((w) => (
          <div key={w.key} className="text-xs">
            <p className="font-semibold text-red-200">{w.label}</p>
            <p className="text-red-300/90">{w.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Main card
// ------------------------------------------------------------
export default function LayersCard({
  data,
  warnings,
  children,
}) {
  if (!data) return null;

  const { sequenceType, context, setup, trigger, trade, verdict, reasons } = data;
  const typeInfo = layersTypeInfo(sequenceType);

  const verdictColor =
    verdict === "BUY"
      ? "bg-green-900/40 border-green-600 text-green-200"
      : verdict === "SELL"
      ? "bg-red-900/40 border-red-600 text-red-200"
      : "bg-yellow-950/40 border-yellow-700 text-yellow-200";

  const verdictEmoji =
    verdict === "BUY" ? "🟢" : verdict === "SELL" ? "🔴" : "⏳";

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-blue-800 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-blue-300">
            {typeInfo.emoji} Layers System — {typeInfo.label}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Context → Setup → Trigger
          </p>
        </div>
        <span
          className={`text-xs px-3 py-1 rounded-full border-2 font-bold ${verdictColor}`}
        >
          {verdictEmoji} {verdict}
        </span>
      </div>

      {/* Three layer badges — status summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <LayerBadge
          ready={context.ready}
          label="Layer 1 — Context"
          passed={context.passed}
          total={context.total}
        />
        <LayerBadge
          ready={setup.ready}
          label="Layer 2 — Setup"
          passed={setup.passed}
          total={setup.total}
        />
        <LayerBadge
          ready={trigger.ready}
          label="Layer 3 — Trigger"
          passed={trigger.passed}
          total={trigger.total}
        />
      </div>

      {/* Detailed layer panels */}
      <LayerPanel
        title="Layer 1 — Context"
        emoji="🌍"
        layer={context}
        accent="blue"
      />
      <LayerPanel
        title="Layer 2 — Setup"
        emoji="🎯"
        layer={setup}
        accent="purple"
      />
      <LayerPanel
        title="Layer 3 — Trigger"
        emoji="⚡"
        layer={trigger}
        accent="green"
      />

      {/* Entry Card — only when all layers green */}
      {trade && <EntryCard trade={trade} />}

      {/* Reasons — when blocked */}
      {!data.allReady && (
        <ReasonsPanel
          reasons={reasons}
          context={context}
          setup={setup}
          trigger={trigger}
        />
      )}

      {/* Warnings */}
      <WarningPanel warnings={warnings} />

      {/* Optional children slot (e.g., IRL/ERL panel, screenshots) */}
      {children}
    </div>
  );
}