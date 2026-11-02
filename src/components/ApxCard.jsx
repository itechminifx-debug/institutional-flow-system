// components/ApxCard.jsx
'use client';

import React, { useMemo } from 'react';

// ------------------------------------------------------------
// Theme — amber accent (distinct from FWT teal)
// ------------------------------------------------------------
const AMBER = {
  bg: 'rgba(245, 158, 11, 0.06)',
  border: 'rgba(245, 158, 11, 0.35)',
  borderSoft: 'rgba(245, 158, 11, 0.18)',
  text: '#f59e0b',
  textSoft: '#fbbf24',
  glow: 'rgba(245, 158, 11, 0.25)',
};

const STAGE_ORDER = [
  { key: 'context', label: 'Context', hint: 'HTF bias · dealing range · direction' },
  { key: 'liquidity', label: 'Liquidity', hint: 'Sweep · Premium/Discount · OTE' },
  { key: 'inducement', label: 'Inducement / MSS', hint: 'Inducement · MSS · FVG' },
  { key: 'entry', label: 'Entry', hint: 'Entry · SL · TP · RR' },
];

// Gates that belong to each stage (mirrors apxEngine STAGE_MAP)
const STAGE_GATES = {
  context: ['bias', 'dealingRange', 'direction'],
  liquidity: [
    'stdDeepZone',
    'stdZone',
    'shPullbackMax',
    'shTap',
    'tsSweep',
    'tsCloseBack',
    'tsDisplacement',
  ],
  inducement: ['mss', 'inducement', 'fvgSide', 'stdInducementDeep', 'tsMSS'],
  entry: [
    'levels',
    'slBeyondExtreme',
    'slSide',
    'tpSide',
    'rr',
    'shTightSL',
  ],
};

// ------------------------------------------------------------
// Small UI helpers
// ------------------------------------------------------------
const fmt = (v, dp = 4) =>
  typeof v === 'number' && Number.isFinite(v)
    ? v.toLocaleString(undefined, { maximumFractionDigits: dp })
    : '—';

const fmtPct = (p) =>
  typeof p === 'number' && Number.isFinite(p) ? `${(p * 100).toFixed(1)}%` : '—';

function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: 'rgba(255,255,255,0.06)', fg: '#e5e7eb', bd: 'rgba(255,255,255,0.12)' },
    amber: { bg: AMBER.bg, fg: AMBER.textSoft, bd: AMBER.border },
    good: { bg: 'rgba(16,185,129,0.10)', fg: '#6ee7b7', bd: 'rgba(16,185,129,0.35)' },
    bad: { bg: 'rgba(239,68,68,0.10)', fg: '#fca5a5', bd: 'rgba(239,68,68,0.35)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.2,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function GateDot({ ok }) {
  return (
    <span
      aria-hidden
      style={{
        width: 7,
        height: 7,
        borderRadius: 999,
        background: ok ? '#10b981' : '#ef4444',
        boxShadow: ok ? '0 0 6px rgba(16,185,129,0.6)' : '0 0 6px rgba(239,68,68,0.6)',
        display: 'inline-block',
      }}
    />
  );
}

// ------------------------------------------------------------
// StagePanel
// ------------------------------------------------------------
function StagePanel({ stage, gates, passed, total }) {
  const names = STAGE_GATES[stage.key] || [];
  const relevant = names
    .map((n) => ({ name: n, ...(gates?.[n] || {}) }))
    .filter((g) => g && (g.pass !== undefined || g.reason));

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: '10px 12px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${passed === total ? AMBER.borderSoft : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#f3f4f6', letterSpacing: 0.3 }}>
          {stage.label}
        </div>
        <div style={{ fontSize: 11, color: passed === total ? '#6ee7b7' : '#fca5a5', fontWeight: 600 }}>
          {passed}/{total}
        </div>
      </div>
      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, marginBottom: 8 }}>
        {stage.hint}
      </div>

      {relevant.length === 0 ? (
        <div style={{ fontSize: 11, color: '#6b7280' }}>No gates for this setup.</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 5 }}>
          {relevant.map((g) => (
            <li key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
              <GateDot ok={!!g.pass} />
              <span style={{ color: g.pass ? '#d1d5db' : '#fca5a5', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {labelFor(g.name)}
              </span>
              {!g.pass && g.reason ? (
                <span title={g.reason} style={{ color: '#f87171', fontSize: 10, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.reason}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function labelFor(name) {
  const map = {
    bias: 'HTF bias set',
    dealingRange: 'Dealing range defined',
    direction: 'Direction set',
    mss: 'MSS confirmed',
    inducement: 'Inducement broken',
    fvgSide: 'FVG correct side of MSS',
    stdInducementDeep: 'Inducement in deep zone',
    tsMSS: 'Reversal MSS confirmed',
    levels: 'Entry / SL / TP set',
    slBeyondExtreme: 'SL beyond extreme',
    slSide: 'SL correct side',
    tpSide: 'TP correct side',
    rr: 'RR ≥ 2',
    stdDeepZone: 'Pullback ≥ 62%',
    stdZone: 'Entry in Premium/Discount',
    shPullbackMax: 'Pullback ≤ 50%',
    shTap: 'Tapped CE / 50 EMA',
    shTightSL: 'Tight SL',
    tsSweep: 'Sweep beyond range',
    tsCloseBack: 'Closed back inside',
    tsDisplacement: 'Displacement ≥ gate',
  };
  return map[name] || name;
}

// ------------------------------------------------------------
// CandleVisual — schematic, not real candles.
// Draws: dealing range, CE, premium/discount, OTE band,
// sweep, MSS, inducement, FVG, entry/SL/TP.
// Long trades render with SL below / TP above.
// ------------------------------------------------------------
function CandleVisual({ setup, zones }) {
  const W = 520;
  const H = 260;
  const PAD = { top: 18, right: 16, bottom: 18, left: 16 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const values = useMemo(() => {
    const v = [
      setup.range_high,
      setup.range_low,
      setup.impulse_high,
      setup.impulse_low,
      setup.sweep_level,
      setup.mss_level,
      setup.inducement_level,
      setup.fvg_high,
      setup.fvg_low,
      setup.entry_price,
      setup.stop_loss,
      setup.target_price,
      zones?.ce,
    ].filter((n) => typeof n === 'number' && Number.isFinite(n));
    return v;
  }, [setup, zones]);

  if (values.length < 2) {
    return (
      <div style={{ padding: 16, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
        Not enough price data to render the chart.
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const y = (v) => PAD.top + chartH - ((v - min) / span) * chartH;
  const xMid = PAD.left + chartW * 0.5;

  const isLong = setup.direction === 'long';

  const band = (lo, hi, color, opacity) =>
    typeof lo === 'number' && typeof hi === 'number' ? (
      <rect
        x={PAD.left}
        y={y(Math.max(lo, hi))}
        width={chartW}
        height={Math.max(2, Math.abs(y(lo) - y(hi)))}
        fill={color}
        opacity={opacity}
      />
    ) : null;

  const line = (v, color, dash = '0', label) =>
    typeof v === 'number' ? (
      <g>
        <line
          x1={PAD.left}
          x2={PAD.left + chartW}
          y1={y(v)}
          y2={y(v)}
          stroke={color}
          strokeWidth={1.2}
          strokeDasharray={dash}
          opacity={0.9}
        />
        {label ? (
          <text x={PAD.left + chartW - 4} y={y(v) - 4} textAnchor="end" fontSize={9} fill={color}>
            {label} {fmt(v, 4)}
          </text>
        ) : null}
      </g>
    ) : null;

  const zone = zones || {};

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {/* dealing range background */}
      {band(setup.range_low, setup.range_high, 'rgba(255,255,255,0.03)', 1)}

      {/* premium (above CE) / discount (below CE) */}
      {band(zone.ce, setup.range_high, 'rgba(239,68,68,0.08)', 1)}
      {band(setup.range_low, zone.ce, 'rgba(16,185,129,0.08)', 1)}

      {/* OTE band */}
      {band(zone.oteLow, zone.oteHigh, AMBER.text, 0.16)}

      {/* FVG band */}
      {band(setup.fvg_low, setup.fvg_high, 'rgba(59,130,246,0.18)', 1)}

      {/* levels */}
      {line(setup.range_high, 'rgba(255,255,255,0.35)', '2 3', 'Range H')}
      {line(setup.range_low, 'rgba(255,255,255,0.35)', '2 3', 'Range L')}
      {line(zone.ce, AMBER.text, '4 3', 'CE')}
      {line(setup.sweep_level, '#a78bfa', '0', 'Sweep')}
      {line(setup.mss_level, '#60a5fa', '0', 'MSS')}
      {line(setup.inducement_level, '#f472b6', '0', 'IDM')}

      {/* entry / SL / TP */}
      {line(setup.entry_price, '#f3f4f6', '0', 'Entry')}
      {line(setup.stop_loss, '#ef4444', '0', 'SL')}
      {line(setup.target_price, '#10b981', '0', 'TP')}

      {/* impulse leg arrow */}
      {typeof setup.impulse_low === 'number' && typeof setup.impulse_high === 'number' ? (
        <g>
          <line
            x1={xMid}
            x2={xMid}
            y1={y(setup.impulse_low)}
            y2={y(setup.impulse_high)}
            stroke={AMBER.textSoft}
            strokeWidth={1.6}
            opacity={0.7}
          />
          <circle cx={xMid} cy={y(setup.impulse_low)} r={2.5} fill={AMBER.textSoft} />
          <circle cx={xMid} cy={y(setup.impulse_high)} r={2.5} fill={AMBER.textSoft} />
        </g>
      ) : null}

      {/* direction marker */}
      <text x={PAD.left + 4} y={PAD.top + 10} fontSize={10} fill={AMBER.textSoft} fontWeight={700}>
        {isLong ? 'LONG' : setup.direction === 'short' ? 'SHORT' : '—'}
      </text>
    </svg>
  );
}

// ------------------------------------------------------------
// ApxCard
// Props:
//   setup  — row shape from buildApxRecord (or DB row)
//   result — output of runGates (optional; if absent, gates inferred from setup.reasons)
//   onOpen — optional click handler (navigates to /apx/[id])
//   compact — optional boolean (hides chart)
// ------------------------------------------------------------
export default function ApxCard({ setup, result, onOpen, compact = false }) {
  if (!setup) return null;

  const gates = result?.gates || setup.reasons?.gates || {};
  const zones = result?.zones || {
    ce: setup.ce,
    oteLow: setup.ote_low,
    oteHigh: setup.ote_high,
  };
  const score = setup.reasons?.score?.total ?? setup.confluence_score ?? 0;
  const pass = result?.pass ?? setup.reasons?.pass ?? setup.status === 'complete';
  const vetoes = result?.vetoes || setup.reasons?.vetoes || [];
  const suggested = setup.reasons?.suggestedSetup;

  const stageStats = STAGE_ORDER.map((s) => {
    const names = STAGE_GATES[s.key] || [];
    const relevant = names.filter((n) => gates[n]);
    const passed = relevant.filter((n) => gates[n]?.pass).length;
    return { ...s, passed, total: relevant.length };
  });

  const tradeResultTone =
    setup.trade_result === 'won' ? 'good' : setup.trade_result === 'lost' ? 'bad' : 'neutral';

  return (
    <div
      onClick={onOpen}
      style={{
        cursor: onOpen ? 'pointer' : 'default',
        borderRadius: 16,
        border: `1px solid ${pass ? AMBER.border : 'rgba(239,68,68,0.35)'}`,
        background: `linear-gradient(180deg, ${AMBER.bg}, rgba(0,0,0,0) 60%)`,
        boxShadow: pass ? `0 0 0 1px ${AMBER.borderSoft}, 0 8px 30px ${AMBER.glow}` : 'none',
        padding: 14,
        color: '#e5e7eb',
        display: 'grid',
        gap: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#f9fafb', letterSpacing: 0.2 }}>
          {setup.pair || '—'}
        </div>
        <Pill tone="amber">{(setup.setup_type || '—').replace('_', ' ')}</Pill>
        <Pill tone="neutral">{setup.direction || '—'}</Pill>
        <Pill tone="neutral">{setup.timeframe_stack || '—'}</Pill>
        <Pill tone={setup.bias === 'bullish' ? 'good' : setup.bias === 'bearish' ? 'bad' : 'neutral'}>
          {setup.bias || '—'}
        </Pill>
        <div style={{ flex: 1 }} />
        <Pill tone={pass ? 'good' : 'bad'}>{pass ? 'VALID' : 'INVALID'}</Pill>
        {setup.trade_result ? <Pill tone={tradeResultTone}>{setup.trade_result.toUpperCase()}</Pill> : null}
        <Pill tone="amber">Score {score}</Pill>
      </div>

      {/* Body: stages + chart */}
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1.15fr 1fr', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {stageStats.map((s) => (
            <StagePanel key={s.key} stage={s} gates={gates} passed={s.passed} total={s.total} />
          ))}
        </div>

        {!compact ? (
          <div
            style={{
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(0,0,0,0.25)',
              padding: 6,
              minHeight: 180,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <CandleVisual setup={setup} zones={zones} />
          </div>
        ) : null}
      </div>

      {/* Footer: RR + vetoes + suggestion */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Pill tone="neutral">RR {fmt(setup.rr, 2)}</Pill>
        <Pill tone="neutral">Entry {fmt(setup.entry_price)}</Pill>
        <Pill tone="bad">SL {fmt(setup.stop_loss)}</Pill>
        <Pill tone="good">TP {fmt(setup.target_price)}</Pill>
        {suggested && suggested !== setup.setup_type ? (
          <Pill tone="amber">Suggested: {suggested.replace('_', ' ')}</Pill>
        ) : null}
        <div style={{ flex: 1 }} />
        {vetoes.length > 0 ? (
          <span style={{ fontSize: 11, color: '#fca5a5' }}>
            {vetoes.length} veto{vetoes.length > 1 ? 'es' : ''}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: '#6ee7b7' }}>No vetoes</span>
        )}
      </div>

      {vetoes.length > 0 ? (
        <ul
          style={{
            margin: 0,
            padding: '8px 10px',
            listStyle: 'none',
            borderRadius: 10,
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.25)',
            display: 'grid',
            gap: 4,
          }}
        >
          {vetoes.map((v, i) => (
            <li key={i} style={{ fontSize: 11, color: '#fca5a5' }}>
              • {v}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}