"use client";

import { formatPrice } from "@/lib/formatNumbers";
import { sldTypeInfo } from "@/lib/sldEngine";

function LayerPanel({ title, emoji, layer, accent = "blue", children }) {
  const accentMap = {
    blue: "border-blue-800/60 bg-blue-950/20",
    emerald: "border-emerald-800/60 bg-emerald-950/20",
    purple: "border-purple-800/60 bg-purple-950/20",
    orange: "border-orange-800/60 bg-orange-950/20",
    cyan: "border-cyan-800/60 bg-cyan-950/20",
  };
  const cls = accentMap[accent] || accentMap.blue;

  return (
    <div className={`ml-8 p-3 rounded-lg border space-y-2 ${cls}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-gray-200">
          {emoji} {title}
        </p>
        {typeof layer?.score === "number" && (
          <span
            className={`text-[10px] font-bold ${
              layer.ready ? "text-green-300" : "text-yellow-300"
            }`}
          >
            {layer.ready ? "READY" : "WAIT"} · {layer.score}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        {layer?.gates?.map((g, i) => (
          <div
            key={g.key || i}
            className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${
              g.pass
                ? "bg-green-950/20 border border-green-800"
                : g.bonus
                ? "bg-gray-900/40 border border-gray-700"
                : "bg-red-950/20 border border-red-800"
            }`}
          >
            <span className="text-sm leading-none mt-0.5">
              {g.pass ? "✅" : g.bonus ? "⚪" : "❌"}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={`font-semibold ${
                  g.pass
                    ? "text-green-200"
                    : g.bonus
                    ? "text-gray-300"
                    : "text-red-200"
                }`}
              >
                {g.label}
              </p>
              <p
                className={`mt-0.5 ${
                  g.pass
                    ? "text-green-300/90"
                    : g.bonus
                    ? "text-gray-400"
                    : "text-red-300/90"
                }`}
              >
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

function DolPanel({ dol, sequenceType }) {
  if (!dol?.dol) return null;
  const d = dol.dol;
  const dirOk = dol.correctDirection;

  const typeLabel = d.type === "bsl" ? "🔵 BSL (Buy-Side)" : "🟠 SSL (Sell-Side)";
  const strengthClass =
    d.strength === "strong"
      ? "bg-green-900/40 border-green-700 text-green-200"
      : d.strength === "normal"
      ? "bg-blue-900/40 border-blue-700 text-blue-200"
      : "bg-yellow-900/40 border-yellow-700 text-yellow-200";

  return (
    <div className="mt-1 p-2 rounded border bg-black/40 border-gray-800 space-y-1">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-bold text-white">
          🎯 DOL: {typeLabel}
        </span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${strengthClass}`}>
          {d.strength.toUpperCase()}
        </span>
      </div>
      <p className="text-sm font-bold tabular-nums text-yellow-300">
        {formatPrice(d.price)}
      </p>
      <div className="flex items-center gap-2 flex-wrap text-[10px] text-gray-400">
        <span>Rank: {d.rank || "—"}</span>
        <span>·</span>
        <span>Distance: {d.distanceClass}</span>
        {dirOk ? (
          <span className="text-green-300">· ✓ direction correct</span>
        ) : (
          <span className="text-red-300">· ✗ direction mismatch</span>
        )}
      </div>
    </div>
  );
}

function ManagementPanel({ layer4 }) {
  if (!layer4 || !layer4.rules || layer4.rules.length === 0) return null;

  return (
    <div className="ml-8 p-3 rounded-lg border bg-cyan-950/20 border-cyan-800 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-cyan-200">
          🛠️ Layer 4 — Trade Management
        </p>
        {layer4.currentR !== undefined && (
          <span
            className={`text-[10px] font-bold ${
              layer4.currentR >= 2 ? "text-green-300" : "text-cyan-300"
            }`}
          >
            {layer4.currentR >= 0 ? "+" : ""}
            {layer4.currentR?.toFixed(2)}R
          </span>
        )}
      </div>
      <div className="space-y-1">
        {layer4.rules.map((r, i) => (
          <div
            key={r.key || i}
            className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${
              r.pass
                ? "bg-green-950/20 border border-green-800"
                : r.ready
                ? "bg-yellow-950/20 border border-yellow-800"
                : "bg-black/40 border border-gray-800"
            }`}
          >
            <span className="text-sm leading-none mt-0.5">
              {r.pass ? "✅" : r.ready ? "⚠️" : "⏳"}
            </span>
            <div className="flex-1">
              <p className={`font-semibold ${
                r.pass ? "text-green-200" : r.ready ? "text-yellow-200" : "text-gray-300"
              }`}>
                {r.label}
              </p>
              <p className="text-gray-400 mt-0.5">{r.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DolUpdatePanel({ layer5 }) {
  if (!layer5) return null;
  return (
    <div className="ml-8 p-3 rounded-lg border bg-purple-950/20 border-purple-800 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-purple-200">
          🔄 Layer 5 — DOL Updates
        </p>
        <span
          className={`text-[10px] font-bold ${
            layer5.canReenter ? "text-green-300" : "text-purple-300/70"
          }`}
        >
          {layer5.canReenter ? "RE-ENTRY READY" : "WAITING"}
        </span>
      </div>
      <p className="text-xs text-gray-300">{layer5.detail}</p>
      {layer5.nextDol && (
        <div className="p-2 rounded bg-black/40 border border-gray-800 text-xs">
          <p className="text-gray-500">Next DOL</p>
          <p className="font-bold tabular-nums text-yellow-300">
            {layer5.nextDolType?.toUpperCase() || "—"} @ {formatPrice(layer5.nextDol)}
          </p>
        </div>
      )}
    </div>
  );
}

function ReasonsPanel({ reasons }) {
  if (!reasons || reasons.length === 0) return null;
  return (
    <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-800 space-y-2">
      <p className="text-xs font-bold text-yellow-200">
        ⏳ Why the system is saying WAIT
      </p>
      <ul className="text-xs text-yellow-200 space-y-1 ml-4 list-disc">
        {reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

function WarningPanel({ warnings }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div className="p-3 rounded-lg bg-red-950/40 border border-red-700 space-y-2">
      <p className="text-xs font-bold text-red-200">
        ⚠️ {warnings.length} warning{warnings.length === 1 ? "" : "s"}
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

export default function SldCard({ data, warnings, children }) {
  if (!data) return null;

  const { sequenceType, layer1, dol, layer2, layer3, layer4, layer5, trade, preEntryReady, reasons } = data;
  const typeInfo = sldTypeInfo(sequenceType);

  const verdict = preEntryReady && trade ? trade.direction : "WAIT";
  const verdictColor =
    verdict === "BUY"
      ? "bg-green-900/40 border-green-600 text-green-200"
      : verdict === "SELL"
      ? "bg-red-900/40 border-red-600 text-red-200"
      : "bg-yellow-950/40 border-yellow-700 text-yellow-200";
  const verdictEmoji = verdict === "BUY" ? "🟢" : verdict === "SELL" ? "🔴" : "⏳";

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-emerald-800 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-emerald-300">
            {typeInfo.emoji} SLD — {typeInfo.label}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Structure → Liquidity → Delivery · 5-layer workflow
          </p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full border-2 font-bold ${verdictColor}`}>
          {verdictEmoji} {verdict}
        </span>
      </div>

      <LayerPanel title="Layer 1 — Bias & DOL" emoji="🌍" layer={layer1} accent="blue">
        <DolPanel dol={dol} sequenceType={sequenceType} />
      </LayerPanel>

      <LayerPanel title="Layer 2 — POI (Entry Zone)" emoji="🎯" layer={layer2} accent="purple" />
      <LayerPanel title="Layer 3 — Entry Trigger" emoji="⚡" layer={layer3} accent="emerald" />

      {trade && preEntryReady && (
        <div className="p-4 rounded-lg bg-emerald-950/30 border-2 border-emerald-700 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-bold text-emerald-200">💰 Entry Card</p>
            <span className={`text-xs px-2 py-1 rounded-full font-bold ${
              trade.direction === "BUY" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
            }`}>
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
              <p className="text-xs text-gray-500">Take Profit (DOL)</p>
              <p className="font-bold tabular-nums text-green-400">{formatPrice(trade.tp)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">RR</p>
              <p className={`font-bold tabular-nums ${trade.rr >= 3 ? "text-green-300" : "text-yellow-300"}`}>
                1:{trade.rr?.toFixed(2) ?? "—"}
              </p>
            </div>
            {trade.slPips !== null && (
              <div>
                <p className="text-xs text-gray-500">SL distance</p>
                <p className="font-bold tabular-nums text-red-300">{trade.slPips} pips</p>
              </div>
            )}
            {trade.tpPips !== null && (
              <div>
                <p className="text-xs text-gray-500">TP distance</p>
                <p className="font-bold tabular-nums text-green-300">{trade.tpPips} pips</p>
              </div>
            )}
            {trade.lotSize !== undefined && (
              <div>
                <p className="text-xs text-gray-500">Lot size</p>
                <p className="font-bold tabular-nums text-white">{trade.lotSize}</p>
              </div>
            )}
          </div>
          {trade.rr !== undefined && trade.rr < 3 && (
            <p className="text-xs text-yellow-300 pt-2 border-t border-emerald-800/50">
              ⚠️ SLD requires RR ≥ 3:1. Consider a further DOL or a tighter entry.
            </p>
          )}
        </div>
      )}

      <ManagementPanel layer4={layer4} />
      <DolUpdatePanel layer5={layer5} />

      {!preEntryReady && <ReasonsPanel reasons={reasons} />}
      <WarningPanel warnings={warnings} />
      {children}
    </div>
  );
}