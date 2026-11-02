// app/apx/manual/page.jsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import ApxCard from '@/components/ApxCard';
import {
  SETUP_TYPES,
  DIRECTIONS,
  BIASES,
  computeZones,
  runGates,
  suggestSetup,
  buildApxRecord,
} from '@/lib/apxEngine';

const AMBER = '#f59e0b';

const initialForm = {
  pair: '',
  timeframeStack: 'Daily → 4H → 15M',
  setupType: 'standard',
  bias: 'bullish',
  direction: 'long',

  rangeHigh: '',
  rangeLow: '',

  impulseHigh: '',
  impulseLow: '',

  sweepLevel: '',
  sweepClosedBackInside: false,
  displacementRange: '',
  atrValue: '',

  inducementLevel: '',
  inducementBroken: false,
  mssLevel: '',
  mssConfirmed: false,
  fvgHigh: '',
  fvgLow: '',

  ema50Value: '',
  ema50Tapped: false,

  entryPrice: '',
  stopLoss: '',
  targetPrice: '',
  riskPercent: '',
  notes: '',
};

// ---- map a DB row to the form shape (for ?edit=) ----
function rowToForm(row) {
  if (!row) return initialForm;
  const n = (v) => (typeof v === 'number' ? String(v) : v ?? '');
  return {
    pair: row.pair ?? '',
    timeframeStack: row.timeframe_stack ?? 'Daily → 4H → 15M',
    setupType: row.setup_type ?? 'standard',
    bias: row.bias ?? 'bullish',
    direction: row.direction ?? 'long',

    rangeHigh: n(row.range_high),
    rangeLow: n(row.range_low),

    impulseHigh: n(row.impulse_high),
    impulseLow: n(row.impulse_low),

    sweepLevel: n(row.sweep_level),
    sweepClosedBackInside: !!row.sweep_closed_back_inside,
    displacementRange: n(row.displacement_range),
    atrValue: n(row.atr_value),

    inducementLevel: n(row.inducement_level),
    inducementBroken: !!row.inducement_broken,
    mssLevel: n(row.mss_level),
    mssConfirmed: !!row.mss_confirmed,
    fvgHigh: n(row.fvg_high),
    fvgLow: n(row.fvg_low),

    ema50Value: n(row.ema50_value),
    ema50Tapped: !!row.ema50_tapped,

    entryPrice: n(row.entry_price),
    stopLoss: n(row.stop_loss),
    targetPrice: n(row.target_price),
    riskPercent: n(row.risk_percent),
    notes: row.notes ?? '',
  };
}

export default function ApxManualPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('edit') || null;
  const isEdit = !!editId;

  const supabase = createClient();

  const [user, setUser] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [preview, setPreview] = useState(null); // { result, record }
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadEditError, setLoadEditError] = useState(null);
  const [originalRow, setOriginalRow] = useState(null);

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
  }, [router, supabase]);

  // ---- load existing row when ?edit= ----
  useEffect(() => {
    if (!editId || !user) return;
    let mounted = true;
    (async () => {
      setLoadingEdit(true);
      setLoadEditError(null);
      const { data, error } = await supabase
        .from('apx_setups')
        .select('*')
        .eq('id', editId)
        .maybeSingle();
      if (!mounted) return;
      if (error || !data) {
        setLoadEditError(error?.message || 'Setup not found.');
        setLoadingEdit(false);
        return;
      }
      setOriginalRow(data);
      setForm(rowToForm(data));
      setSavedId(data.id);
      setLoadingEdit(false);
    })();
    return () => {
      mounted = false;
    };
  }, [editId, user, supabase]);

  // ---- helpers ----
  const set = (key) => (e) => {
    const value =
      e?.target?.type === 'checkbox'
        ? e.target.checked
        : e?.target?.value ?? e;
    setForm((f) => ({ ...f, [key]: value }));
    setPreview(null);
    setSaveError(null);
  };

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && v !== '' ? n : undefined;
  };

  const input = useMemo(
    () => ({
      userId: user?.id,
      pair: form.pair.trim() || undefined,
      timeframeStack: form.timeframeStack.trim() || undefined,
      setupType: form.setupType,
      bias: form.bias,
      direction: form.direction,

      rangeHigh: num(form.rangeHigh),
      rangeLow: num(form.rangeLow),
      impulseHigh: num(form.impulseHigh),
      impulseLow: num(form.impulseLow),

      sweepLevel: num(form.sweepLevel),
      sweepClosedBackInside: !!form.sweepClosedBackInside,
      displacementRange: num(form.displacementRange),
      atrValue: num(form.atrValue),

      inducementLevel: num(form.inducementLevel),
      inducementBroken: !!form.inducementBroken,
      mssLevel: num(form.mssLevel),
      mssConfirmed: !!form.mssConfirmed,
      fvgHigh: num(form.fvgHigh),
      fvgLow: num(form.fvgLow),

      ema50Value: num(form.ema50Value),
      ema50Tapped: !!form.ema50Tapped,

      entryPrice: num(form.entryPrice),
      stopLoss: num(form.stopLoss),
      targetPrice: num(form.targetPrice),
      riskPercent: num(form.riskPercent),
      notes: form.notes.trim() || undefined,
    }),
    [form, user]
  );

  const liveZones = useMemo(
    () =>
      computeZones({
        rangeHigh: input.rangeHigh,
        rangeLow: input.rangeLow,
        impulseHigh: input.impulseHigh,
        impulseLow: input.impulseLow,
        direction: input.direction,
      }),
    [input.rangeHigh, input.rangeLow, input.impulseHigh, input.impulseLow, input.direction]
  );

  // ---- run preview ----
  const onPreview = useCallback(() => {
    setSaveError(null);
    const result = runGates(input);
    const record = buildApxRecord(input, result);
    setPreview({ result, record });
  }, [input]);

  // ---- save (insert or update) ----
  const onSave = useCallback(async () => {
    if (!user) return;
    if (!preview) {
      onPreview();
      return;
    }
    setSaving(true);
    setSaveError(null);

    // Don't overwrite journal fields on edit — preserve trade_result / r_result
    const record = { ...preview.record };
    if (isEdit && originalRow) {
      record.trade_result = originalRow.trade_result ?? null;
      record.r_result = originalRow.r_result ?? null;
    }

    let response;
    if (isEdit) {
      response = await supabase
        .from('apx_setups')
        .update(record)
        .eq('id', editId)
        .select('id')
        .single();
    } else {
      response = await supabase
        .from('apx_setups')
        .insert(record)
        .select('id')
        .single();
    }

    setSaving(false);
    if (response.error) {
      setSaveError(response.error.message);
      return;
    }
    setSavedId(response.data.id);
    setOriginalRow((prev) => (prev ? { ...prev, ...record } : prev));
  }, [preview, user, onPreview, isEdit, originalRow, editId, supabase]);

  const resetForm = () => {
    if (isEdit && originalRow) {
      setForm(rowToForm(originalRow));
    } else {
      setForm(initialForm);
    }
    setPreview(null);
    setSaveError(null);
  };

  const suggestion = useMemo(() => {
    const result = runGates(input);
    const sweepBeyondRange =
      Number.isFinite(input.sweepLevel) &&
      Number.isFinite(input.rangeHigh) &&
      Number.isFinite(input.rangeLow) &&
      (input.sweepLevel > input.rangeHigh || input.sweepLevel < input.rangeLow);
    return suggestSetup({
      pullbackPct: result.pullbackPct,
      sweepClosedBackInside: input.sweepClosedBackInside,
      sweepBeyondRange,
    });
  }, [input]);

  // ---- render ----
  return (
    <div style={{ padding: 24, maxWidth: 1180, margin: '0 auto', color: '#e5e7eb' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f9fafb' }}>
            <span style={{ color: AMBER }}>APX</span> · {isEdit ? 'Edit Setup' : 'New Setup'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>
            {isEdit
              ? 'Update the fields, preview the gates, then save changes.'
              : 'Fill the fields, preview the gates, then save.'}
          </p>
        </div>
        <div style={{ flex: 1 }} />
        {isEdit ? (
          <Link
            href={`/apx/${editId}`}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#e5e7eb',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            ← Detail
          </Link>
        ) : null}
        <Link
          href="/apx"
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.14)',
            color: '#e5e7eb',
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          ← Dashboard
        </Link>
      </div>

      {loadingEdit ? (
        <div style={{ marginTop: 24, color: '#9ca3af', fontSize: 13 }}>
          Loading setup…
        </div>
      ) : loadEditError ? (
        <div
          style={{
            marginTop: 24,
            padding: 14,
            borderRadius: 10,
            border: '1px solid rgba(239,68,68,0.4)',
            background: 'rgba(239,68,68,0.08)',
            color: '#fca5a5',
            fontSize: 13,
          }}
        >
          Could not load setup: {loadEditError}
        </div>
      ) : (
        <div
          style={{
            marginTop: 18,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
            gap: 16,
          }}
        >
          {/* FORM */}
          <div style={{ display: 'grid', gap: 14 }}>
            <Section title="Header">
              <Row>
                <Field label="Pair">
                  <input value={form.pair} onChange={set('pair')} placeholder="EURUSD" style={inputStyle} />
                </Field>
                <Field label="Timeframe stack">
                  <input value={form.timeframeStack} onChange={set('timeframeStack')} placeholder="Daily → 4H → 15M" style={inputStyle} />
                </Field>
              </Row>
              <Row>
                <Field label="Setup type">
                  <select value={form.setupType} onChange={set('setupType')} style={inputStyle}>
                    {SETUP_TYPES.map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Bias">
                  <select value={form.bias} onChange={set('bias')} style={inputStyle}>
                    {BIASES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Direction">
                  <select value={form.direction} onChange={set('direction')} style={inputStyle}>
                    {DIRECTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </Field>
              </Row>
              {suggestion && suggestion !== form.setupType ? (
                <div style={{ fontSize: 12, color: AMBER, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', padding: '8px 10px', borderRadius: 10 }}>
                  Suggestion: this looks like a <b>{suggestion.replace('_', ' ')}</b> setup.
                </div>
              ) : null}
            </Section>

            <Section title="Dealing range">
              <Row>
                <Field label="Range high">
                  <input value={form.rangeHigh} onChange={set('rangeHigh')} type="number" step="any" style={inputStyle} />
                </Field>
                <Field label="Range low">
                  <input value={form.rangeLow} onChange={set('rangeLow')} type="number" step="any" style={inputStyle} />
                </Field>
                <Field label="CE (auto)">
                  <input value={liveZones.ce ?? ''} readOnly style={{ ...inputStyle, opacity: 0.7 }} />
                </Field>
              </Row>
            </Section>

            <Section title="Impulse leg (for OTE)">
              <Row>
                <Field label="Impulse high">
                  <input value={form.impulseHigh} onChange={set('impulseHigh')} type="number" step="any" style={inputStyle} />
                </Field>
                <Field label="Impulse low">
                  <input value={form.impulseLow} onChange={set('impulseLow')} type="number" step="any" style={inputStyle} />
                </Field>
              </Row>
              <Row>
                <Field label="OTE low (auto)">
                  <input value={liveZones.oteLow ?? ''} readOnly style={{ ...inputStyle, opacity: 0.7 }} />
                </Field>
                <Field label="OTE high (auto)">
                  <input value={liveZones.oteHigh ?? ''} readOnly style={{ ...inputStyle, opacity: 0.7 }} />
                </Field>
              </Row>
            </Section>

            <Section title="Liquidity / sweep">
              <Row>
                <Field label="Sweep level">
                  <input value={form.sweepLevel} onChange={set('sweepLevel')} type="number" step="any" style={inputStyle} />
                </Field>
                <Field label="Displacement range">
                  <input value={form.displacementRange} onChange={set('displacementRange')} type="number" step="any" style={inputStyle} />
                </Field>
                <Field label="ATR (optional)">
                  <input value={form.atrValue} onChange={set('atrValue')} type="number" step="any" style={inputStyle} />
                </Field>
              </Row>
              <Checkbox label="Sweep candle closed back inside range" checked={form.sweepClosedBackInside} onChange={set('sweepClosedBackInside')} />
            </Section>

            <Section title="Structure">
              <Row>
                <Field label="Inducement level">
                  <input value={form.inducementLevel} onChange={set('inducementLevel')} type="number" step="any" style={inputStyle} />
                </Field>
                <Field label="MSS level">
                  <input value={form.mssLevel} onChange={set('mssLevel')} type="number" step="any" style={inputStyle} />
                </Field>
              </Row>
              <Row>
                <Field label="FVG high">
                  <input value={form.fvgHigh} onChange={set('fvgHigh')} type="number" step="any" style={inputStyle} />
                </Field>
                <Field label="FVG low">
                  <input value={form.fvgLow} onChange={set('fvgLow')} type="number" step="any" style={inputStyle} />
                </Field>
                <Field label="50 EMA (optional)">
                  <input value={form.ema50Value} onChange={set('ema50Value')} type="number" step="any" style={inputStyle} />
                </Field>
              </Row>
              <Row>
                <Checkbox label="Inducement broken" checked={form.inducementBroken} onChange={set('inducementBroken')} />
                <Checkbox label="MSS confirmed" checked={form.mssConfirmed} onChange={set('mssConfirmed')} />
                <Checkbox label="50 EMA tapped" checked={form.ema50Tapped} onChange={set('ema50Tapped')} />
              </Row>
            </Section>

            <Section title="Trade">
              <Row>
                <Field label="Entry price">
                  <input value={form.entryPrice} onChange={set('entryPrice')} type="number" step="any" style={inputStyle} />
                </Field>
                <Field label="Stop loss">
                  <input value={form.stopLoss} onChange={set('stopLoss')} type="number" step="any" style={inputStyle} />
                </Field>
                <Field label="Target price">
                  <input value={form.targetPrice} onChange={set('targetPrice')} type="number" step="any" style={inputStyle} />
                </Field>
                <Field label="Risk % (optional)">
                  <input value={form.riskPercent} onChange={set('riskPercent')} type="number" step="any" style={inputStyle} />
                </Field>
              </Row>
            </Section>

            <Section title="Notes">
              <textarea
                value={form.notes}
                onChange={set('notes')}
                rows={3}
                placeholder="Context, narrative, tags…"
                style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }}
              />
            </Section>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={onPreview} style={primaryBtn}>
                Preview gates
              </button>
              <button
                onClick={onSave}
                disabled={!preview || saving}
                style={{
                  ...primaryBtn,
                  background: savedId && !saving ? 'rgba(16,185,129,0.9)' : AMBER,
                  color: savedId && !saving ? '#0b1020' : '#111827',
                  opacity: !preview || saving ? 0.6 : 1,
                  cursor: !preview || saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save setup'}
              </button>
              <button onClick={resetForm} style={ghostBtn}>
                Reset
              </button>
              {savedId ? (
                <Link href={`/apx/${savedId}`} style={{ ...ghostBtn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                  Open detail →
                </Link>
              ) : null}
            </div>

            {saveError ? (
              <div style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)', color: '#fca5a5', fontSize: 12 }}>
                Save failed: {saveError}
              </div>
            ) : null}
          </div>

          {/* PREVIEW */}
          <div style={{ position: 'sticky', top: 16, alignSelf: 'start', display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Live preview (engine output)</div>
            {preview ? (
              <ApxCard setup={preview.record} result={preview.result} />
            ) : (
              <div style={{ padding: 20, borderRadius: 14, border: '1px dashed rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.04)', fontSize: 12, color: '#d1d5db' }}>
                Click <b>Preview gates</b> to run the engine and see the card with pass/fail per stage, vetoes, and score.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// primitives
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

const primaryBtn = {
  padding: '10px 16px',
  borderRadius: 10,
  background: AMBER,
  color: '#111827',
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

function Section({ title, children }) {
  return (
    <div style={{ padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: AMBER, letterSpacing: 0.3 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>{children}</div>;
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'grid', gap: 4, fontSize: 11, color: '#9ca3af' }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#d1d5db' }}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}