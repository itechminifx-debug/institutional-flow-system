'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import {
  computeApexLevels,
  computeAidmTrade,
  evaluateAidm,
  AIDM_DIRECTIONS,
  AIDM_TIMEFRAMES,
  AIDM_SESSIONS,
} from '@/lib/aidmEngine';
import PairPicker from '@/components/PairPicker';

const EMPTY = {
  direction: 'bullish',
  pair: '',
  timeframe: '4H',
  session: 'london',
  range_high: '',
  range_low: '',
  swept_erl: false,
  mss_confirmed: false,
  entry_price: '',
  stop_loss: '',
  take_profit_1: '',
  take_profit_2: '',
  risk_percent: 1,
  account_size: '',
  structure_flipped: false,
  notes: '',
};

export default function AidmPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('id');

  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [error, setError] = useState(null);
  const [isEdit, setIsEdit] = useState(false);

  // -------- load for edit --------
  useEffect(() => {
    if (!editId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('aidm_setups')
        .select('*')
        .eq('id', editId)
        .single();

      if (error) { setError(error.message); setLoading(false); return; }

      setForm({
        ...EMPTY,
        ...data,
        range_high: data.range_high ?? '',
        range_low: data.range_low ?? '',
        entry_price: data.entry_price ?? '',
        stop_loss: data.stop_loss ?? '',
        take_profit_1: data.take_profit_1 ?? '',
        take_profit_2: data.take_profit_2 ?? '',
        account_size: data.account_size ?? '',
        notes: data.notes ?? '',
      });
      setIsEdit(true);
      setLoading(false);
    })();
  }, [editId]);

  // -------- live calc --------
  const levels = useMemo(
    () => computeApexLevels({
      rangeHigh: form.range_high,
      rangeLow: form.range_low,
      direction: form.direction,
    }),
    [form.range_high, form.range_low, form.direction]
  );

  const trade = useMemo(
    () => computeAidmTrade({
      direction: form.direction,
      entry: form.entry_price,
      stopLoss: form.stop_loss,
      takeProfit1: form.take_profit_1,
      takeProfit2: form.take_profit_2,
      accountSize: form.account_size,
      riskPercent: form.risk_percent,
    }),
    [form]
  );

  const evalResult = useMemo(() => evaluateAidm({
    ...form,
    range_high: Number(form.range_high),
    range_low: Number(form.range_low),
    entry_price: Number(form.entry_price),
    stop_loss: Number(form.stop_loss),
    take_profit_1: Number(form.take_profit_1),
    take_profit_2: Number(form.take_profit_2),
    account_size: Number(form.account_size),
    risk_percent: Number(form.risk_percent),
  }), [form]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // -------- save --------
  async function handleSave(status) {
    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not signed in'); setSaving(false); return; }

    const payload = {
      user_id: user.id,
      status,
      direction: form.direction,
      pair: form.pair || null,
      timeframe: form.timeframe || null,
      session: form.session || null,

      range_high: Number(form.range_high),
      range_low:  Number(form.range_low),
      range_size: levels.rangeSize,
      ce_50:      levels.ce,
      ote_62:     levels.ote62,
      ote_79:     levels.ote79,
      ote_zone_low:  levels.oteZoneLow,
      ote_zone_high: levels.oteZoneHigh,
      poi_zone: levels.poiZone,

      swept_erl: !!form.swept_erl,
      mss_confirmed: !!form.mss_confirmed,

      entry_price: form.entry_price !== '' ? Number(form.entry_price) : null,
      stop_loss:   form.stop_loss   !== '' ? Number(form.stop_loss)   : null,
      take_profit_1: form.take_profit_1 !== '' ? Number(form.take_profit_1) : null,
      take_profit_2: form.take_profit_2 !== '' ? Number(form.take_profit_2) : null,

      risk_percent: Number(form.risk_percent) || 1,
      account_size: form.account_size !== '' ? Number(form.account_size) : null,
      lot_size: trade.lotSize,

      structure_flipped: !!form.structure_flipped,
      notes: form.notes || null,
    };

    let res;
    if (isEdit) {
      res = await supabase.from('aidm_setups').update(payload).eq('id', editId).select().single();
    } else {
      res = await supabase.from('aidm_setups').insert(payload).select().single();
    }

    setSaving(false);

    if (res.error) { setError(res.error.message); return; }
    router.push(`/aidm/${res.data.id}`);
  }

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            AIDM Setup {isEdit && <span className="text-sm text-slate-400">(editing)</span>}
          </h1>
          <p className="text-sm text-slate-400">APEX-IDM institutional flow model</p>
        </div>
        <button
          onClick={() => router.push('/aidm/journal')}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          → Journal
        </button>
      </header>

      {error && (
        <div className="rounded border border-red-700 bg-red-950/40 text-red-300 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {/* PART 1 — MAP */}
      <section className="rounded border border-slate-700 bg-slate-900/50 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          Part 1 · Map
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Pair">
            <PairPicker value={form.pair} onChange={(v) => set('pair', v)} />
          </Field>

          <Field label="Timeframe">
            <select
              value={form.timeframe}
              onChange={e => set('timeframe', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
            >
              {AIDM_TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
            </select>
          </Field>

          <Field label="Direction">
            <select
              value={form.direction}
              onChange={e => set('direction', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
            >
              {AIDM_DIRECTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </Field>

          <Field label="Range High">
            <input
              type="number"
              step="any"
              value={form.range_high}
              onChange={e => set('range_high', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
            />
          </Field>

          <Field label="Range Low">
            <input
              type="number"
              step="any"
              value={form.range_low}
              onChange={e => set('range_low', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
            />
          </Field>
        </div>

        {/* Auto-calc panel */}
        <div className="rounded bg-slate-950/60 border border-slate-700 p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">
            Auto-Calculated Levels
          </h3>
          {levels.valid ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Stat label="Range Size" value={fmt(levels.rangeSize)} />
              <Stat label="50% CE" value={fmt(levels.ce)} highlight />
              <Stat label="62%" value={fmt(levels.ote62)} />
              <Stat label="79%" value={fmt(levels.ote79)} />
              <Stat label="OTE Zone" value={`${fmt(levels.oteZoneLow)} – ${fmt(levels.oteZoneHigh)}`} />
              <Stat label="POI Zone" value={levels.poiZone.toUpperCase()} highlight />
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Enter a valid Range High / Low (High must be &gt; Low).
            </p>
          )}
        </div>
      </section>

      {/* PART 2 — TIME & TRAP */}
      <section className="rounded border border-slate-700 bg-slate-900/50 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          Part 2 · Time & Trap
        </h2>
        <Field label="Kill Zone">
          <select
            value={form.session}
            onChange={e => set('session', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
          >
            {AIDM_SESSIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Check
          label="ERL swept (BSL/SSL taken)"
          checked={form.swept_erl}
          onChange={v => set('swept_erl', v)}
        />
      </section>

      {/* PART 3 — STRUCTURE SHIFT */}
      <section className="rounded border border-slate-700 bg-slate-900/50 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          Part 3 · Structure Shift
        </h2>
        <Check
          label="Displacement MSS confirmed (with FVG)"
          checked={form.mss_confirmed}
          onChange={v => set('mss_confirmed', v)}
        />
        <Check
          label="Structure flipped against HTF (veto flag)"
          checked={form.structure_flipped}
          onChange={v => set('structure_flipped', v)}
        />
      </section>

      {/* PART 4 — SNIPER ENTRY */}
      <section className="rounded border border-slate-700 bg-slate-900/50 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          Part 4 · Sniper Entry
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Entry Price">
            <input type="number" step="any"
              value={form.entry_price}
              onChange={e => set('entry_price', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
            />
          </Field>
          <Field label="Stop Loss">
            <input type="number" step="any"
              value={form.stop_loss}
              onChange={e => set('stop_loss', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
            />
          </Field>
          <Field label="Risk %">
            <input type="number" step="0.1" min="0" max="1"
              value={form.risk_percent}
              onChange={e => set('risk_percent', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
            />
          </Field>
          <Field label="Account Size ($)">
            <input type="number" step="any"
              value={form.account_size}
              onChange={e => set('account_size', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
            />
          </Field>
        </div>

        {trade.errors.length > 0 && (
          <ul className="text-xs text-red-400 space-y-1">
            {trade.errors.map((er, i) => <li key={i}>• {er}</li>)}
          </ul>
        )}

        {trade.valid && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Risk (pips)" value={fmt(trade.riskPips, 1)} />
            <Stat label="Lot Size" value={trade.lotSize ?? '—'} highlight />
            <Stat label="RR (TP1)" value={trade.rrTp1 ? trade.rrTp1.toFixed(2) : '—'} />
            <Stat label="RR (TP2)" value={trade.rrTp2 ? trade.rrTp2.toFixed(2) : '—'} />
          </div>
        )}
      </section>

      {/* PART 5 — RISK & TARGETS */}
      <section className="rounded border border-slate-700 bg-slate-900/50 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          Part 5 · Risk & Targets
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="TP1 — 50% CE">
            <input type="number" step="any"
              value={form.take_profit_1}
              onChange={e => set('take_profit_1', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
            />
          </Field>
          <Field label="TP2 — Opposite ERL">
            <input type="number" step="any"
              value={form.take_profit_2}
              onChange={e => set('take_profit_2', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
            />
          </Field>
        </div>
      </section>

      {/* NOTES */}
      <section className="rounded border border-slate-700 bg-slate-900/50 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Notes</h2>
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={4}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
          placeholder="Chart context, narrative, what you're seeing…"
        />
      </section>

      {/* CHECKLIST SUMMARY */}
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
        <p className={`mt-3 text-sm font-medium ${evalResult.preEntryReady ? 'text-emerald-400' : 'text-amber-400'}`}>
          {evalResult.preEntryReady ? 'READY — all gates passed' : 'Not ready — finish checklist'}
        </p>
      </section>

      {/* ACTIONS */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => handleSave('draft')}
          disabled={saving}
          className="px-4 py-2 rounded border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
        >
          Save Draft
        </button>
        <button
          onClick={() => handleSave('complete')}
          disabled={saving}
          className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Complete'}
        </button>
      </div>
    </div>
  );
}

// ---------- helpers ----------
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-slate-400 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="accent-emerald-500"
      />
      {label}
    </label>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div className={`rounded p-2 ${highlight ? 'bg-emerald-950/40 border border-emerald-800' : 'bg-slate-900'}`}>
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
      <div className={`text-sm font-mono ${highlight ? 'text-emerald-300' : 'text-slate-200'}`}>
        {value}
      </div>
    </div>
  );
}

function fmt(v, dp = 5) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return Number(v).toFixed(dp).replace(/\.?0+$/, '');
}