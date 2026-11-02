// app/apx/journal/page.jsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const AMBER = '#f59e0b';

export default function ApxJournalPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [setups, setSetups] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [prompt, setPrompt] = useState(null); // { id, outcome: 'won'|'lost', r: '' }

  // ---- auth ----
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error || !data?.user) {
        router.replace('/login');
        return;
      }
      setUser(data.user);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  // ---- load ----
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('apx_setups')
      .select('*')
      .eq('user_id', user.id)
      .not('trade_result', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) setError(error.message);
    else setSetups(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- derived ----
  const open = useMemo(() => setups.filter((s) => s.trade_result === 'active'), [setups]);
  const closed = useMemo(
    () => setups.filter((s) => s.trade_result === 'won' || s.trade_result === 'lost'),
    [setups]
  );

  const summary = useMemo(() => {
    const won = closed.filter((s) => s.trade_result === 'won').length;
    const lost = closed.filter((s) => s.trade_result === 'lost').length;
    const total = won + lost;
    const winRate = total ? Math.round((won / total) * 100) : null;
    const rValues = closed.map((s) => s.r_result).filter((r) => typeof r === 'number');
    const totalR = rValues.reduce((a, b) => a + b, 0);
    const avgR = rValues.length ? totalR / rValues.length : null;
    return { won, lost, total, winRate, totalR, avgR };
  }, [closed]);

  // ---- actions ----
  const startPrompt = (id, outcome) => {
    setPrompt({ id, outcome, r: '' });
  };

  const confirmPrompt = useCallback(async () => {
    if (!prompt) return;
    const { id, outcome, r } = prompt;
    const rNum = Number(r);
    const patch = {
      trade_result: outcome,
      r_result: Number.isFinite(rNum) && r !== '' ? rNum : null,
    };
    setBusyId(id);
    const { error } = await supabase.from('apx_setups').update(patch).eq('id', id);
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    setSetups((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setPrompt(null);
  }, [prompt]);

  const cancelPrompt = () => setPrompt(null);

  const reopen = useCallback(async (id) => {
    setBusyId(id);
    const patch = { trade_result: 'active', r_result: null };
    const { error } = await supabase.from('apx_setups').update(patch).eq('id', id);
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    setSetups((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1180, margin: '0 auto', color: '#e5e7eb' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f9fafb' }}>
            <span style={{ color: AMBER }}>APX</span> · Journal
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>
            Track open trades and close them with an R multiple.
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <Link href="/apx" style={ghostLink}>← Dashboard</Link>
        <Link href="/apx/manual" style={amberLink}>+ New Setup</Link>
      </div>

      {/* Summary */}
      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <Stat label="Open" value={open.length} tone="amber" />
        <Stat label="Closed" value={summary.total} />
        <Stat label="Won / Lost" value={`${summary.won} / ${summary.lost}`} />
        <Stat label="Win rate" value={summary.winRate == null ? '—' : `${summary.winRate}%`} tone="good" />
        <Stat label="Total R" value={fmtR(summary.totalR)} tone={summary.totalR >= 0 ? 'good' : 'bad'} />
        <Stat label="Avg R" value={summary.avgR == null ? '—' : fmtR(summary.avgR)} tone={summary.avgR != null && summary.avgR >= 0 ? 'good' : 'bad'} />
      </div>

      {error ? (
        <div style={errorBox}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Error</div>
          <div>{error}</div>
        </div>
      ) : null}

      {/* Open trades */}
      <SectionTitle title="Open trades" hint="trade_result = active" />
      {loading ? (
        <SkeletonRows />
      ) : open.length === 0 ? (
        <EmptyRow text="No open trades. Save a complete setup from Manual to start tracking." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {open.map((s) => (
            <JournalRow
              key={s.id}
              setup={s}
              busy={busyId === s.id}
              onOpen={() => router.push(`/apx/${s.id}`)}
              onWin={() => startPrompt(s.id, 'won')}
              onLoss={() => startPrompt(s.id, 'lost')}
            />
          ))}
        </div>
      )}

      {/* Closed trades */}
      <SectionTitle title="Closed trades" hint="won / lost · newest first" />
      {loading ? (
        <SkeletonRows />
      ) : closed.length === 0 ? (
        <EmptyRow text="No closed trades yet." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {closed.map((s) => (
            <JournalRow
              key={s.id}
              setup={s}
              busy={busyId === s.id}
              onOpen={() => router.push(`/apx/${s.id}`)}
              onReopen={() => reopen(s.id)}
            />
          ))}
        </div>
      )}

      {/* R prompt modal */}
      {prompt ? (
        <Modal onClose={cancelPrompt}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#f9fafb', marginBottom: 4 }}>
            Mark {prompt.outcome === 'won' ? 'won' : 'lost'}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
            Optional: enter the R multiple (e.g. 2.5 or -1). Leave blank to skip.
          </div>
          <input
            autoFocus
            type="number"
            step="any"
            value={prompt.r}
            onChange={(e) => setPrompt((p) => ({ ...p, r: e.target.value }))}
            placeholder="R multiple"
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
            <button onClick={cancelPrompt} style={ghostBtn}>Cancel</button>
            <button
              onClick={confirmPrompt}
              style={{
                ...primaryBtn,
                background: prompt.outcome === 'won' ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)',
                color: '#0b1020',
              }}
            >
              Confirm
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------
// Row
// ------------------------------------------------------------
function JournalRow({ setup, busy, onOpen, onWin, onLoss, onReopen }) {
  const isClosed = setup.trade_result === 'won' || setup.trade_result === 'lost';
  const tone =
    setup.trade_result === 'won' ? 'good' : setup.trade_result === 'lost' ? 'bad' : 'amber';

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        border: `1px solid ${
          tone === 'good'
            ? 'rgba(16,185,129,0.35)'
            : tone === 'bad'
            ? 'rgba(239,68,68,0.35)'
            : 'rgba(245,158,11,0.35)'
        }`,
        background: 'rgba(255,255,255,0.02)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) auto',
        gap: 10,
        alignItems: 'center',
      }}
    >
      <div
        onClick={onOpen}
        style={{ cursor: 'pointer', display: 'grid', gap: 4, minWidth: 0 }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#f9fafb' }}>
            {setup.pair || '—'}
          </span>
          <Pill tone={tone}>{setup.trade_result?.toUpperCase()}</Pill>
          <Pill tone="neutral">{setup.direction || '—'}</Pill>
          <Pill tone="neutral">{(setup.setup_type || '—').replace('_', ' ')}</Pill>
          <Pill tone="neutral">RR {fmt(setup.rr, 2)}</Pill>
          {typeof setup.r_result === 'number' ? (
            <Pill tone={setup.r_result >= 0 ? 'good' : 'bad'}>{fmtR(setup.r_result)}</Pill>
          ) : null}
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span>{setup.timeframe_stack || '—'}</span>
          <span>Entry {fmt(setup.entry_price)}</span>
          <span>SL {fmt(setup.stop_loss)}</span>
          <span>TP {fmt(setup.target_price)}</span>
          <span>Score {setup.confluence_score ?? '—'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {isClosed ? (
          <button onClick={onReopen} disabled={busy} style={ghostBtnSm}>
            Reopen
          </button>
        ) : (
          <>
            <button
              onClick={onWin}
              disabled={busy}
              style={{ ...ghostBtnSm, color: '#6ee7b7', borderColor: 'rgba(16,185,129,0.5)' }}
            >
              Won
            </button>
            <button
              onClick={onLoss}
              disabled={busy}
              style={{ ...ghostBtnSm, color: '#fca5a5', borderColor: 'rgba(239,68,68,0.5)' }}
            >
              Lost
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Small UI
// ------------------------------------------------------------
function Stat({ label, value, tone = 'neutral' }) {
  const color =
    tone === 'good' ? '#6ee7b7' : tone === 'amber' ? AMBER : tone === 'bad' ? '#fca5a5' : '#f3f4f6';
  return (
    <div style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ fontSize: 11, color: '#9ca3af' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function SectionTitle({ title, hint }) {
  return (
    <div style={{ marginTop: 22, marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#f9fafb', letterSpacing: 0.3 }}>{title}</div>
      {hint ? <div style={{ fontSize: 11, color: '#6b7280' }}>{hint}</div> : null}
    </div>
  );
}

function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: 'rgba(255,255,255,0.06)', fg: '#e5e7eb', bd: 'rgba(255,255,255,0.12)' },
    amber: { bg: 'rgba(245,158,11,0.10)', fg: '#fbbf24', bd: 'rgba(245,158,11,0.35)' },
    good: { bg: 'rgba(16,185,129,0.10)', fg: '#6ee7b7', bd: 'rgba(16,185,129,0.35)' },
    bad: { bg: 'rgba(239,68,68,0.10)', fg: '#fca5a5', bd: 'rgba(239,68,68,0.35)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: t.bg, color: t.fg, border: `1px solid ${t.bd}` }}>
      {children}
    </span>
  );
}

function SkeletonRows() {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ height: 64, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.06), rgba(255,255,255,0.02))' }} />
      ))}
    </div>
  );
}

function EmptyRow({ text }) {
  return (
    <div style={{ padding: 20, borderRadius: 12, border: '1px dashed rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.02)', fontSize: 12, color: '#9ca3af' }}>
      {text}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 380,
          padding: 18,
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.12)',
          background: '#0b1020',
          color: '#e5e7eb',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// utils / styles
// ------------------------------------------------------------
function fmt(v, dp = 4) {
  return typeof v === 'number' && Number.isFinite(v)
    ? v.toLocaleString(undefined, { maximumFractionDigits: dp })
    : '—';
}

function fmtR(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  const rounded = Math.round(v * 100) / 100;
  return `${rounded > 0 ? '+' : ''}${rounded}R`;
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.03)',
  color: '#f3f4f6',
  fontSize: 14,
  outline: 'none',
};

const primaryBtn = {
  padding: '10px 14px',
  borderRadius: 10,
  border: 'none',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

const ghostBtn = {
  padding: '10px 14px',
  borderRadius: 10,
  background: 'transparent',
  color: '#e5e7eb',
  border: '1px solid rgba(255,255,255,0.14)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const ghostBtnSm = {
  padding: '6px 10px',
  borderRadius: 8,
  background: 'transparent',
  color: '#e5e7eb',
  border: '1px solid rgba(255,255,255,0.16)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

const amberLink = {
  padding: '8px 12px',
  borderRadius: 10,
  background: AMBER,
  color: '#111827',
  fontSize: 12,
  fontWeight: 700,
  textDecoration: 'none',
};

const ghostLink = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.14)',
  color: '#e5e7eb',
  fontSize: 12,
  fontWeight: 600,
  textDecoration: 'none',
};

const errorBox = {
  marginTop: 14,
  padding: 12,
  borderRadius: 10,
  border: '1px solid rgba(239,68,68,0.35)',
  background: 'rgba(239,68,68,0.06)',
  color: '#fca5a5',
  fontSize: 12,
};