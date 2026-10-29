'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

export default function AidmHistoryPage() {
  const supabase = createClient();
  const router = useRouter();

  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Not signed in'); setLoading(false); return; }

      const { data, error } = await supabase
        .from('aidm_setups')
        .select('id, pair, direction, status, session, timeframe, created_at, poi_zone')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) { setError(error.message); setLoading(false); return; }
      setSetups(data || []);
      setLoading(false);
    })();
  }, []);

  // group by date (YYYY-MM-DD)
  const grouped = setups.reduce((acc, s) => {
    const day = new Date(s.created_at).toISOString().slice(0, 10);
    (acc[day] = acc[day] || []).push(s);
    return acc;
  }, {});

  const days = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (error)   return <div className="p-8 text-red-400">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">AIDM History</h1>
          <p className="text-sm text-slate-400">Timeline grouped by day</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/aidm/journal')}
            className="px-3 py-1.5 text-sm rounded border border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Journal
          </button>
          <button
            onClick={() => router.push('/aidm')}
            className="px-3 py-1.5 text-sm rounded bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            + New Setup
          </button>
        </div>
      </header>

      {days.length === 0 && (
        <div className="rounded border border-slate-700 bg-slate-900/50 p-8 text-center text-slate-500">
          No setups yet. Create your first AIDM setup.
        </div>
      )}

      {days.map(day => (
        <section key={day} className="space-y-2">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide sticky top-0 bg-slate-950 py-2">
            {formatDay(day)} · {grouped[day].length} setup{grouped[day].length !== 1 ? 's' : ''}
          </h2>
          <div className="space-y-2">
            {grouped[day].map(s => (
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
                    <span className="text-[10px] uppercase text-slate-500">
                      {s.poi_zone}
                    </span>
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
                    {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function formatDay(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}