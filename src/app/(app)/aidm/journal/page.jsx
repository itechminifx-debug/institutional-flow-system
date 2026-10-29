'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'complete', label: 'Complete' },
];

export default function AidmJournalPage() {
  const supabase = createClient();
  const router = useRouter();

  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tab, setTab] = useState('all');
  const [dirFilter, setDirFilter] = useState('all');   // all | bullish | bearish
  const [pairFilter, setPairFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Not signed in'); setLoading(false); return; }

      const { data, error } = await supabase
        .from('aidm_setups')
        .select('id, pair, direction, status, session, timeframe, poi_zone, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) { setError(error.message); setLoading(false); return; }
      setSetups(data || []);
      setLoading(false);
    })();
  }, []);

  const pairs = useMemo(
    () => [...new Set(setups.map(s => s.pair).filter(Boolean))].sort(),
    [setups]
  );

  const filtered = useMemo(() => {
    return setups.filter(s => {
      if (tab !== 'all' && s.status !== tab) return false;
      if (dirFilter !== 'all' && s.direction !== dirFilter) return false;
      if (pairFilter && s.pair !== pairFilter) return false;
      if (search && !(s.pair || '').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [setups, tab, dirFilter, pairFilter, search]);

  const counts = useMemo(() => ({
    all: setups.length,
    draft: setups.filter(s => s.status === 'draft').length,
    complete: setups.filter(s => s.status === 'complete').length,
  }), [setups]);

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (error)   return <div className="p-8 text-red-400">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">AIDM Journal</h1>
          <p className="text-sm text-slate-400">All setups · drafts and complete</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/aidm/history')}
            className="px-3 py-1.5 text-sm rounded border border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            History
          </button>
          <button
            onClick={() => router.push('/aidm')}
            className="px-3 py-1.5 text-sm rounded bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            + New Setup
          </button>
        </div>
      </header>

      {/* TABS */}
      <div className="flex gap-1 border-b border-slate-700">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm border-b-2 transition ${
              tab === t.key
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
            <span className="ml-2 text-xs text-slate-500">({counts[t.key]})</span>
          </button>
        ))}
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search pair…"
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
        />
        <select
          value={dirFilter}
          onChange={e => setDirFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
        >
          <option value="all">All directions</option>
          <option value="bullish">Bullish</option>
          <option value="bearish">Bearish</option>
        </select>
        <select
          value={pairFilter}
          onChange={e => setPairFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
        >
          <option value="">All pairs</option>
          {pairs.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button
          onClick={() => { setSearch(''); setDirFilter('all'); setPairFilter(''); setTab('all'); }}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          Reset filters
        </button>
      </div>

      {/* LIST */}
      {filtered.length === 0 ? (
        <div className="rounded border border-slate-700 bg-slate-900/50 p-8 text-center text-slate-500">
          No setups match the current filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <button
              key={s.id}
              onClick={() => router.push(`/aidm/${s.id}`)}
              className="w-full text-left rounded border border-slate-700 bg-slate-900/50 hover:bg-slate-800 p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  s.direction === 'bullish'
                    ? 'bg-emerald-950 text-emerald-400'
                    : 'bg-red-950 text-red-400'
                }`}>
                  {s.direction === 'bullish' ? 'LONG' : 'SHORT'}
                </span>
                <span className="text-slate-100 font-medium">{s.pair || '—'}</span>
                <span className="text-xs text-slate-500">
                  {s.timeframe || '—'} · {s.session || '—'}
                </span>
                {s.poi_zone && (
                  <span className="text-[10px] uppercase text-slate-500">{s.poi_zone}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                  s.status === 'complete'
                    ? 'bg-emerald-950 text-emerald-400'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {s.status}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}