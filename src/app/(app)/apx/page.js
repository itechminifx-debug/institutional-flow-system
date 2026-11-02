// app/apx/page.jsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ApxCard from '@/components/ApxCard';

const AMBER = '#f59e0b';

export default function ApxDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [setups, setSetups] = useState([]);
  const [filter, setFilter] = useState('all'); // all | complete | draft | active | won | lost

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

  // ---- fetch ----
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('apx_setups')
      .select('*')
      .eq('user_id', user.id)
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
  const filtered = useMemo(() => {
    if (filter === 'all') return setups;
    if (filter === 'complete' || filter === 'draft') {
      return setups.filter((s) => s.status === filter);
    }
    return setups.filter((s) => s.trade_result === filter);
  }, [setups, filter]);

  const stats = useMemo(() => {
    const total = setups.length;
    const complete = setups.filter((s) => s.status === 'complete').length;
    const active = setups.filter((s) => s.trade_result === 'active').length;
    const won = setups.filter((s) => s.trade_result === 'won').length;
    const lost = setups.filter((s) => s.trade_result === 'lost').length;
    const closed = won + lost;
    const winRate = closed > 0 ? Math.round((won / closed) * 100) : null;
    const avgScore =
      total > 0
        ? Math.round(
            setups.reduce((acc, s) => acc + (s.confluence_score || 0), 0) / total
          )
        : 0;
    return { total, complete, active, won, lost, winRate, avgScore };
  }, [setups]);

  return (
    <div style={{ padding: 24, color: '#e5e7eb', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f9fafb', letterSpacing: 0.2 }}>
            <span style={{ color: AMBER }}>APX</span> System
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>
            Institutional flow · standard / shallow / turtle soup
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <Link
          href="/apx/manual"
          style={{
            padding: '9px 14px',
            borderRadius: 10,
            background: AMBER,
            color: '#111827',
            fontSize: 13,
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 6px 20px rgba(245,158,11,0.35)',
          }}
        >
          + New Setup
        </Link>
        <Link
          href="/apx/journal"
          style={{
            padding: '9px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.14)',
            color: '#e5e7eb',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Journal
        </Link>
        <Link
          href="/apx/history"
          style={{
            padding: '9px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.14)',
            color: '#e5e7eb',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          History
        </Link>
      </div>

      {/* Stats */}
      <div
        style={{
          marginTop: 18,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 10,
        }}
      >
        <Stat label="Total setups" value={stats.total} />
        <Stat label="Complete" value={stats.complete} tone="good" />
        <Stat label="Active" value={stats.active} tone="amber" />
        <Stat label="Won / Lost" value={`${stats.won} / ${stats.lost}`} />
        <Stat label="Win rate" value={stats.winRate == null ? '—' : `${stats.winRate}%`} tone="good" />
        <Stat label="Avg score" value={stats.avgScore} tone="amber" />
      </div>

      {/* Filters */}
      <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          ['all', 'All'],
          ['complete', 'Complete'],
          ['draft', 'Drafts'],
          ['active', 'Active'],
          ['won', 'Won'],
          ['lost', 'Lost'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: filter === key ? 'rgba(245,158,11,0.14)' : 'rgba(255,255,255,0.04)',
              color: filter === key ? AMBER : '#d1d5db',
              border: `1px solid ${filter === key ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            {label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={load}
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.04)',
            color: '#d1d5db',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          Refresh
        </button>
      </div>

      {/* Body */}
      <div style={{ marginTop: 16 }}>
        {loading ? (
          <SkeletonList />
        ) : error ? (
          <ErrorBox message={error} onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {filtered.map((s) => (
              <ApxCard
                key={s.id}
                setup={s}
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
// Small components
// ------------------------------------------------------------

function Stat({ label, value, tone = 'neutral' }) {
  const color =
    tone === 'good' ? '#6ee7b7' : tone === 'amber' ? AMBER : tone === 'bad' ? '#fca5a5' : '#f3f4f6';
  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <div style={{ fontSize: 11, color: '#9ca3af', letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            height: 140,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.06)',
            background:
              'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
          }}
        />
      ))}
    </div>
  );
}

function ErrorBox({ message, onRetry }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        border: '1px solid rgba(239,68,68,0.35)',
        background: 'rgba(239,68,68,0.06)',
        color: '#fca5a5',
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Could not load setups</div>
      <div style={{ marginBottom: 10 }}>{message}</div>
      <button
        onClick={onRetry}
        style={{
          padding: '6px 12px',
          borderRadius: 8,
          background: 'rgba(239,68,68,0.18)',
          color: '#fecaca',
          border: '1px solid rgba(239,68,68,0.4)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        padding: 32,
        borderRadius: 16,
        border: '1px dashed rgba(245,158,11,0.35)',
        background: 'rgba(245,158,11,0.04)',
        textAlign: 'center',
        color: '#d1d5db',
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, color: '#f9fafb', marginBottom: 6 }}>
        No APX setups yet
      </div>
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>
        Start with a manual setup — standard, shallow, or turtle soup.
      </div>
      <Link
        href="/apx/manual"
        style={{
          display: 'inline-block',
          padding: '9px 14px',
          borderRadius: 10,
          background: AMBER,
          color: '#111827',
          fontSize: 13,
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        + New Setup
      </Link>
    </div>
  );
}