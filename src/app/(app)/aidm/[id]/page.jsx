'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import {
  computeApexLevels,
  computeAidmTrade,
  evaluateAidm,
} from '@/lib/aidmEngine';
import ScreenshotGallery from '@/components/ScreenshotGallery';

export default function AidmDetailPage() {
  const supabase = createClient();
  const router = useRouter();
  const { id } = useParams();

  const [setup, setSetup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase
          .from('profiles')
          .select('account_size, risk_percent')
          .eq('id', user.id)
          .single();
        setProfile(p || null);
      }

      const { data, error } = await supabase
        .from('aidm_setups')
        .select('*')
        .eq('id', id)
        .single();

      if (error) { setError(error.message); setLoading(false); return; }
      setSetup(data);
      setLoading(false);
    })();
  }, [id]);

  // ---------- derived ----------
  const levels = useMemo(() => {
    if (!setup) return null;
    return computeApexLevels({
      rangeHigh: setup.range_high,
      rangeLow: setup.range_low,
      direction: setup.direction,
    });
  }, [setup]);

  const trade = useMemo(() => {
    if (!setup) return null;
    return computeAidmTrade({
      direction: setup.direction,
      entry: setup.entry_price,
      stopLoss: setup.stop_loss,
      takeProfit1: setup.take_profit_1,
      takeProfit2: setup.take_profit_2,
      accountSize: setup.account_size ?? profile?.account_size ?? 0,
      riskPercent: setup.risk_percent ?? profile?.risk_percent ?? 1,
    });
  }, [setup, profile]);

  const evalResult = useMemo(() => {
    if (!setup) return null;
    return evaluateAidm({
      ...setup,
      account_size: setup.account_size ?? profile?.account_size ?? 0,
      risk_percent: setup.risk_percent ?? profile?.risk_percent ?? 1,
    });
  }, [setup, profile]);

  // ---------- actions ----------
  async function handleDelete() {
    if (!confirm('Delete this setup permanently?')) return;
    const { error } = await supabase.from('aidm_setups').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    router.push('/aidm/journal');
  }

  async function handleComplete() {
    const { error } = await supabase
      .from('aidm_setups')
      .update({ status: 'complete' })
      .eq('id', id);
    if (error) { alert(error.message); return; }
    setSetup(s => ({ ...s, status: 'complete' }));
  }

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (error)   return <div className="p-8 text-red-400">{error}</div>;
  if (!setup)  return <div className="p-8 text-slate-400">Not found.</div>;

  const dirLabel = setup.direction === 'bullish' ? 'BULLISH' : 'BEARISH';
  const dirColor = setup.direction === 'bullish' ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-100">
              {setup.pair || 'Setup'}
            </h1>
            <span className={`text-xs font-semibold ${dirColor}`}>{dirLabel}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              {setup.status}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {setup.timeframe || '—'} · {setup.session || '—'} ·{' '}
            {new Date(setup.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/aidm?id=${setup.id}`)}
            className="px-3 py-1.5 text-sm rounded border border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Edit
          </button>
          {setup.status === 'draft' && (
            <button
              onClick={handleComplete}
              className="px-3 py-1.5 text-sm rounded bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Mark Complete
            </button>
          )}
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-sm rounded border border-red-800 text-red-400 hover:bg-red-950/40"
          >
            Delete
          </button>
        </div>
      </header>

      {/* PART 1 — MAP / LEVELS */}
      <section className="rounded border border-slate-700 bg-slate-900/50 p-5">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
          Part 1 · Map
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Stat label="Range High" value={fmt(setup.range_high)} />
          <Stat label="Range Low"  value={fmt(setup.range_low)} />
          <Stat label="Range Size" value={fmt(levels?.rangeSize)} />
          <Stat label="50% CE" value={fmt(levels?.ce)} highlight />
          <Stat label="62%" value={fmt(levels?.ote62)} />
          <Stat label="79%" value={fmt(levels?.ote79)} />
          <Stat
            label="OTE Zone"
            value={`${fmt(levels?.oteZoneLow)} – ${fmt(levels?.oteZoneHigh)}`}
          />
          <Stat
            label="POI Zone"
            value={(levels?.poiZone || '—').toUpperCase()}
            highlight
          />
        </div>
      </section>

      {/* PART 2 — TIME & TRAP */}
      <section className="rounded border border-slate-700 bg-slate-900/50 p-5">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
          Part 2 · Time & Trap
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Session" value={setup.session || '—'} />
          <Stat
            label="ERL Swept"
            value={setup.swept_erl ? 'YES' : 'NO'}
            highlight={setup.swept_erl}
          />
        </div>
      </section>

      {/* PART 3 — STRUCTURE SHIFT */}
      <section className="rounded border border-slate-700 bg-slate-900/50 p-5">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
          Part 3 · Structure Shift
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat
            label="MSS + FVG"
            value={setup.mss_confirmed ? 'YES' : 'NO'}
            highlight={setup.mss_confirmed}
          />
          <Stat
            label="Structure Flipped"
            value={setup.structure_flipped ? 'YES (veto)' : 'NO'}
            highlight={!setup.structure_flipped}
          />
        </div>
      </section>

      {/* PART 4 — SNIPER ENTRY / TRADE */}
      <section className="rounded border border-slate-700 bg-slate-900/50 p-5">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
          Part 4 · Sniper Entry
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Stat label="Entry" value={fmt(setup.entry_price)} />
          <Stat label="Stop Loss" value={fmt(setup.stop_loss)} />
          <Stat label="Risk (pips)" value={fmt(trade?.riskPips, 1)} />
          <Stat label="Lot Size" value={trade?.lotSize ?? '—'} highlight />
        </div>
        {trade?.errors?.length > 0 && (
          <ul className="mt-3 text-xs text-red-400 space-y-1">
            {trade.errors.map((er, i) => <li key={i}>• {er}</li>)}
          </ul>
        )}
      </section>

      {/* PART 5 — RISK & TARGETS */}
      <section className="rounded border border-slate-700 bg-slate-900/50 p-5">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
          Part 5 · Risk & Targets
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Stat label="TP1 (50% CE)" value={fmt(setup.take_profit_1)} />
          <Stat label="TP2 (Opp ERL)" value={fmt(setup.take_profit_2)} />
          <Stat label="RR (TP1)" value={trade?.rrTp1 ? trade.rrTp1.toFixed(2) : '—'} />
          <Stat label="RR (TP2)" value={trade?.rrTp2 ? trade.rrTp2.toFixed(2) : '—'} />
          <Stat label="Account Size" value={fmt(setup.account_size ?? profile?.account_size)} />
          <Stat label="Risk %" value={fmt(setup.risk_percent ?? profile?.risk_percent, 2)} />
        </div>
      </section>

      {/* CHECKLIST */}
      <section className="rounded border border-slate-700 bg-slate-900/50 p-5">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
          Pre-Entry Checklist
        </h2>
        <div className="space-y-1 text-sm">
          {evalResult.layers.map(l => (
            <div key={l.part} className="flex items-center gap-2">
              <span className={l.ready ? 'text-emerald-400' : 'text-slate-500'}>
                {l.ready ? '✓' : '○'}
              </span>
              <span className="text-slate-300">Part {l.part} — {l.title}</span>
            </div>
          ))}
        </div>
        <p className={`mt-3 text-sm font-medium ${
          evalResult.preEntryReady ? 'text-emerald-400' : 'text-amber-400'
        }`}>
          {evalResult.preEntryReady ? 'READY — all gates passed' : 'Not ready'}
        </p>
      </section>

      {/* NOTES */}
      {setup.notes && (
        <section className="rounded border border-slate-700 bg-slate-900/50 p-5">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
            Notes
          </h2>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{setup.notes}</p>
        </section>
      )}

      {/* SCREENSHOTS */}
      <section className="rounded border border-slate-700 bg-slate-900/50 p-5">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
          Screenshots
        </h2>
        <ScreenshotGallery setupId={setup.id} table="aidm_screenshots" />
      </section>
    </div>
  );
}

// ---------- helpers ----------
function Stat({ label, value, highlight }) {
  return (
    <div className={`rounded p-2 ${
      highlight ? 'bg-emerald-950/40 border border-emerald-800' : 'bg-slate-900'
    }`}>
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
      <div className={`text-sm font-mono ${
        highlight ? 'text-emerald-300' : 'text-slate-200'
      }`}>
        {value}
      </div>
    </div>
  );
}

function fmt(v, dp = 5) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return Number(v).toFixed(dp).replace(/\.?0+$/, '');
}