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
                ? g.warning
                  ? "bg-yellow-950/30 border border-yellow-800"
                  : "bg-green-950/20 border border-green-800"
                : g.bonus
                ? "bg-gray-900/40 border border-gray-700"
                : "bg-red-950/20 border border-red-800"
            }`}
          >
            <span className="text-sm leading-none mt-0.5">
              {g.pass ? (g.warning ? "⚠️" : "✅") : g.bonus ? "⚪" : "❌"}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={`font-semibold ${
                  g.pass
                    ? g.warning
                      ? "text-yellow-200"
                      : "text-green-200"
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
                    ? g.warning
                      ? "text-yellow-300/90"
                      : "text-green-300/90"
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

// ============================================================
// NEW — Update 1: HTF Veto banner
// ============================================================
function HtfVetoBanner({ htfVeto }) {
  if (!htfVeto?.conflict) return null;

  return (
    <div className="p-3 rounded-lg bg-red-950/40 border-2 border-red-700 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">🚫</span>
        <p className="text-xs font-bold text-red-200 uppercase tracking-wider">
          HTF Veto — 4H vs Daily conflict
        </p>
      </div>
      <p className="text-xs text-red-100 leading-relaxed">{htfVeto.detail}</p>
      <div className="pt-2 border-t border-red-800/60">
        <p className="text-[10px] text-red-300 font-semibold uppercase tracking-wider">
          If you take this trade
        </p>
        <p className="text-xs text-red-200 mt-0.5">
          Treat it as a <strong>counter-trend scalp</strong>. Half-size or less.
          Exit at the nearest liquidity pool. Do not hold for the full DOL.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// NEW — Update 2: Shallow Pullback banner
// ============================================================
function ShallowPullbackBanner({ shallowException, gates }) {
  if (!shallowException) return null;
  const zoneGate = gates?.find((g) => g.key === "zone");
  const anchor = zoneGate?.detail?.match(/\(([^)]+)\)/)?.[1];

  return (
    <div className="p-3 rounded-lg bg-fuchsia-950/40 border-2 border-fuchsia-700 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">⚡</span>
        <p className="text-xs font-bold text-fuchsia-200 uppercase tracking-wider">
          Shallow Pullback Exception active
        </p>
      </div>
      <p className="text-xs text-fuchsia-100 leading-relaxed">
        POI is in the wrong zone (you are entering against the discount/premium
        rule because the trend is aggressive). Anchor:{" "}
        <strong>{anchor || "not specified"}</strong>.
      </p>
      <div className="pt-2 border-t border-fuchsia-800/60">
        <p className="text-[10px] text-fuchsia-300 font-semibold uppercase tracking-wider">
          Non-negotiable
        </p>
        <p className="text-xs text-fuchsia-200 mt-0.5">
          Stop must be <strong>razor-thin</strong>, just beyond the pullback
          extreme. If the pullback low/high breaks, the setup is dead. No
          averaging down.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// NEW — Update 3: Origin Breaker banner
// ============================================================
function OriginBreakerBanner({ originHeld, gates }) {
  if (!originHeld) return null;
  const originGate = gates?.find((g) => g.key === "origin_retest");

  return (
    <div className="p-3 rounded-lg bg-pink-950/40 border-2 border-pink-600 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔨</span>
          <p className="text-xs font-bold text-pink-200 uppercase tracking-wider">
            A+ Breaker — Origin held
          </p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-800/60 text-pink-100 font-bold">
          HIGHEST PROBABILITY
        </span>
      </div>
      <p className="text-xs text-pink-100 leading-relaxed">
        {originGate?.detail ||
          "Price returned to the origin of the move and wicked + reversed. This is the highest-probability entry in the system."}
      </p>
    </div>
  );
}

// ============================================================
// NEW — Update 4: EQH/EQL magnet banner
// ============================================================
function EqhEqlBanner({ gates }) {
  const gate = gates?.find((g) => g.key === "eqh_eql_between");
  if (!gate) return null;

  return (
    <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-700 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-base">🧲</span>
        <p className="text-xs font-bold text-amber-200 uppercase tracking-wider">
          EQH/EQL magnet between price and DOL
        </p>
      </div>
      <p className="text-xs text-amber-100 leading-relaxed">{gate.detail}</p>
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

// ============================================================
// NEW — Invalid trade guard
// ============================================================
function InvalidTradePanel({ trade }) {
  if (!trade?.invalid) return null;
  return (
    <div className="p-4 rounded-lg bg-red-950/50 border-2 border-red-600 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">🚨</span>
        <p className="text-xs font-bold text-red-200 uppercase tracking-wider">
          Invalid trade — stop is on the wrong side
        </p>
      </div>
      <p className="text-xs text-red-100 leading-relaxed">{trade.invalidReason}</p>
      <p className="text-[10px] text-red-300/90 pt-2 border-t border-red-800/60">
        Fix the sweep level, origin level, or POI zone before this trade can be saved.
      </p>
    </div>
  );
}

export default function SldCard({ data, warnings, children }) {
  if (!data) return null;

  const {
    sequenceType,
    layer1,
    dol,
    layer2,
    layer3,
    layer4,
    layer5,
    trade,
    preEntryReady,
    reasons,
    htfVeto,
    shallowException,
    originHeld,
  } = data;

  const typeInfo = sldTypeInfo(sequenceType);

  // Verdict — WAIT if invalid trade
  const verdict = trade?.invalid
    ? "INVALID"
    : preEntryReady && trade
    ? trade.direction
    : "WAIT";

  const verdictColor =
    verdict === "BUY"
      ? "bg-green-900/40 border-green-600 text-green-200"
      : verdict === "SELL"
      ? "bg-red-900/40 border-red-600 text-red-200"
      : verdict === "INVALID"
      ? "bg-red-950/60 border-red-500 text-red-100"
      : "bg-yellow-950/40 border-yellow-700 text-yellow-200";

  const verdictEmoji =
    verdict === "BUY" ? "🟢" :
    verdict === "SELL" ? "🔴" :
    verdict === "INVALID" ? "🚨" :
    "⏳";

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-emerald-800 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-emerald-300">
            {typeInfo.emoji} SLD — {typeInfo.label}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Structure → Liquidity → Delivery · Adaptive 5-layer workflow
          </p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full border-2 font-bold ${verdictColor}`}>
          {verdictEmoji} {verdict}
        </span>
      </div>

      {/* Adaptive banners — top of card */}
      <HtfVetoBanner htfVeto={htfVeto} />
      <OriginBreakerBanner originHeld={originHeld} gates={layer2?.gates} />
      <ShallowPullbackBanner
        shallowException={shallowException}
        gates={layer2?.gates}
      />
      <EqhEqlBanner gates={layer2?.gates} />
      <InvalidTradePanel trade={trade} />

      <LayerPanel title="Layer 1 — Bias & DOL" emoji="🌍" layer={layer1} accent="blue">
        <DolPanel dol={dol} sequenceType={sequenceType} />
      </LayerPanel>

      <LayerPanel title="Layer 2 — POI (Entry Zone)" emoji="🎯" layer={layer2} accent="purple" />
      <LayerPanel title="Layer 3 — Entry Trigger" emoji="⚡" layer={layer3} accent="emerald" />

      {/* Entry Card — only when trade is valid */}
      {trade && preEntryReady && !trade.invalid && (
        <div className="p-4 rounded-lg bg-emerald-950/30 border-2 border-emerald-700 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-bold text-emerald-200">💰 Entry Card</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {trade.usedShallowException && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-fuchsia-800/60 text-fuchsia-100 font-bold">
                  ⚡ SHALLOW
                </span>
              )}
              {trade.usedOriginRetest && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-800/60 text-pink-100 font-bold">
                  🔨 BREAKER
                </span>
              )}
              <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                trade.direction === "BUY" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
              }`}>
                {trade.direction}
              </span>
            </div>
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
            {trade.riskAmount !== undefined && (
              <div>
                <p className="text-xs text-gray-500">Risk</p>
                <p className="font-bold tabular-nums text-white">${trade.riskAmount}</p>
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