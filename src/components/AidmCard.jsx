'use client';

import { computeApexLevels, computeAidmTrade, evaluateAidm } from '@/lib/aidmEngine';

export default function AidmCard({ setup }) {
  if (!setup) return null;

  const levels = computeApexLevels({
    rangeHigh: setup.range_high,
    rangeLow: setup.range_low,
    direction: setup.direction,
  });

  const trade = computeAidmTrade({
    direction: setup.direction,
    entry: setup.entry_price,
    stopLoss: setup.stop_loss,
    takeProfit1: setup.take_profit_1,
    takeProfit2: setup.take_profit_2,
    accountSize: setup.account_size,
    riskPercent: setup.risk_percent,
  });

  const evalResult = evaluateAidm({
    ...setup,
    range_high: Number(setup.range_high),
    range_low: Number(setup.range_low),
    entry_price: Number(setup.entry_price),
    stop_loss: Number(setup.stop_loss),
    take_profit_1: Number(setup.take_profit_1),
    take_profit_2: Number(setup.take_profit_2),
    account_size: Number(setup.account_size),
    risk_percent: Number(setup.risk_percent),
  });

  const isBull = setup.direction === 'bullish';

  return (
    <div className="rounded border border-slate-700 bg-slate-900/60 p-4 space-y-3">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
            isBull ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
          }`}>
            {isBull ? 'LONG' : 'SHORT'}
          </span>
          <span className="text-slate-100 font-medium">{setup.pair || '—'}</span>
          <span className="text-xs text-slate-500">
            {setup.timeframe || '—'} · {setup.session || '—'}
          </span>
        </div>
        <span className={`text-xs font-medium ${
          evalResult.preEntryReady ? 'text-emerald-400' : 'text-amber-400'
        }`}>
          {evalResult.preEntryReady ? 'READY' : 'INCOMPLETE'}
        </span>
      </div>

      {/* LEVELS */}
      {levels.valid && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <Mini label="CE" value={fmt(levels.ce)} highlight />
          <Mini label="62%" value={fmt(levels.ote62)} />
          <Mini label="79%" value={fmt(levels.ote79)} />
          <Mini label="POI" value={(levels.poiZone || '—').toUpperCase()} highlight />
        </div>
      )}

      {/* TRADE */}
      {trade.valid && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <Mini label="Entry" value={fmt(trade.entry)} />
          <Mini label="SL" value={fmt(trade.sl)} />
          <Mini label="RR (TP1)" value={trade.rrTp1 ? trade.rrTp1.toFixed(2) : '—'} />
          <Mini label="Lots" value={trade.lotSize ?? '—'} highlight />
        </div>
      )}

      {trade.errors?.length > 0 && (
        <p className="text-xs text-red-400">⚠ {trade.errors[0]}</p>
      )}

      {/* LAYER SCORES */}
      <div className="space-y-1">
        {evalResult.layers.map(l => (
          <LayerRow key={l.part} label={`P${l.part} · ${l.title}`} ready={l.ready} />
        ))}
      </div>
    </div>
  );
}

function Mini({ label, value, highlight }) {
  return (
    <div className={`rounded p-2 ${highlight ? 'bg-emerald-950/40 border border-emerald-800' : 'bg-slate-900'}`}>
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
      <div className={`text-sm font-mono ${highlight ? 'text-emerald-300' : 'text-slate-200'}`}>
        {value}
      </div>
    </div>
  );
}

function LayerRow({ label, ready }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={ready ? 'text-emerald-400' : 'text-slate-600'}>
        {ready ? '✓' : '○'}
      </span>
      <span className="text-slate-400">{label}</span>
    </div>
  );
}

function fmt(v, dp = 5) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return Number(v).toFixed(dp).replace(/\.?0+$/, '');
}