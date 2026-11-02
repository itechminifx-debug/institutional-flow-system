// app/apx/history/page.jsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ApxCard from '@/components/ApxCard';
import { SETUP_TYPES } from '@/lib/apxEngine';

const AMBER = '#f59e0b';

export default function ApxHistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [setups, setSetups] = useState([]);

  // filters
  const [q, setQ] = useState('');
  const [setupType, setSetupType] = useState('all');
  const [status, setStatus] = useState('all');
  const [result, setResult] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

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
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) setError(error.message);
    else setSetups(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- derived ----
  const filtered = useMemo(() => {
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1 : null;
    const needle = q.trim().toLowerCase();

    return setups.filter((s) => {
      if (setupType !== 'all' && s.setup_type !== setupType) return false;
      if (status !== 'all' && s.status !== status) return false;
      if (result !== 'all') {
        if (result === 'none' && s.trade_result) return false;
        if (result !== 'none' && s.trade_result !== result) return false;
      }
      if (fromTs || toTs) {
        const ts = new Date(s.created_at).getTime();
        if (fromTs && ts < fromTs) return false;
        if (toTs && ts > toTs) return false;
      }
      if (needle) {
        const hay = [
          s.pair,
          s.timeframe_stack,
          s.setup_type,
          s.bias,
          s.direction,
          s.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [setups, q, setupType, status, result, from, to]);

  const resetFilters = () => {
    setQ('');
    setSetupType('all');
    setStatus('all');
    setResult('all');
    setFrom('');
    setTo('');
  };

  // ---- CSV export ----
  const onExportCsv = () => {
    const cols = [
      'created_at',
      'pair',
      'timeframe_stack',
      'setup_type',
      'bias',
      'direction',
      'status',
      'trade_result',
      'rr',
      'r_result',
      'confluence_score',
      'range_high',
      'range_low',
      'ce',
      'impulse_high',
      'impulse_low',
      'ote_low',
      'ote_high',
      'sweep_level',
      'sweep_closed_back_inside',
      'displacement_range',
      'atr_value',
      'inducement_level',
      'inducement_broken',
      'mss_level',
      'mss_confirmed',
      'fvg_high',
      'fvg_low',
      'ema50_value',
      'ema50_tapped',
      'entry_price',
      'stop_loss',
      'target_price',
      'risk_percent',
      'notes',
    ];
    const escape = (v) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const lines = [cols.join(',')];
    for (const s of filtered) {
      lines.push(cols.map((c) => escape(s[c])).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apx_history_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1180, margin: '0 auto', color: '#e5e7eb' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f9fafb' }}>
            <span style={{ color: AMBER }}>APX</span> · History
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>
            Full log of every APX setup.
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <Link href="/apx" style={ghostLink}>← Dashboard</Link>
        <Link href="/apx/journal" style={ghostLink}>Journal</Link>
        <button onClick={onExportCsv} style={ghostBtn}>Export CSV</button>
      </div>

      {/* Filters */}
      <div
        style={{
          marginTop: 18,
          padding: 12,
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.02)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 10,
        }}
      >
        <Field label="Search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="pair, notes, bias…" style={inputStyle} />
        </Field>
        <Field label="Setup type">
          <select value={setupType} onChange={(e) => setSetupType(e.target.value)} style={inputStyle}>
            <option value="all">All</option>
            {SETUP_TYPES.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="complete">Complete</option>
          </select>
        </Field>
        <Field label="Result">
          <select value={result} onChange={(e) => setResult(e.target.value)} style={inputStyle}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="none">No result</option>
          </select>
        </Field>
        <Field label="From">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="To">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
        </Field>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <button onClick={resetFilters} style={ghostBtn}>Reset</button>
          <button onClick={load} style={ghostBtn}>Refresh</button>
        </div>
      </div>

      {/* Count */}
      <div style={{ marginTop: 12, fontSize: 12, color: '#9ca3af' }}>
        Showing <b style={{ color: '#f3f4f6' }}>{filtered.length}</b> of {setups.length} setups
      </div>

      {/* Body */}
      <div style={{ marginTop: 12 }}>
        {loading ? (
          <SkeletonRows />
        ) : error ? (
          <ErrorBox message={error} onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyRow text="No setups match these filters." />
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {filtered.map((s) => (
              <ApxCard
                key={s.id}
                setup={s}
                compact
                onOpen={() => router.push(`/apx/${s.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Small UI
// ------------------------------------------------------------
function Field({ label, children }) {
  return (
    <label style={{ display: 'grid', gap: 4, fontSize: 11, color: '#9ca3af' }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function SkeletonRows() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ height: 100, borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.06), rgba(255,255,255,0.02))' }} />
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

function ErrorBox({ message, onRetry }) {
  return (
    <div style={{ padding: 16, borderRadius: 12, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)', color: '#fca5a5', fontSize: 13 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Could not load history</div>
      <div style={{ marginBottom: 10 }}>{message}</div>
      <button onClick={onRetry} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.18)', color: '#fecaca', border: '1px solid rgba(239,68,68,0.4)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
    </div>
  );
}

// ------------------------------------------------------------
// styles
// ------------------------------------------------------------
const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.03)',
  color: '#f3f4f6',
  fontSize: 13,
  outline: 'none',
};

const ghostBtn = {
  padding: '8px 12px',
  borderRadius: 10,
  background: 'transparent',
  color: '#e5e7eb',
  border: '1px solid rgba(255,255,255,0.14)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
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