// app/apx/[id]/page.jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { runGates } from '@/lib/apxEngine';
import ApxCard from '@/components/ApxCard';
import ScreenshotUploader from '@/components/ScreenshotUploader';
import ScreenshotGallery from '@/components/ScreenshotGallery';

const AMBER = '#f59e0b';

export default function ApxDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params?.id;

  const [row, setRow] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [tradeResult, setTradeResult] = useState('');
  const [rResult, setRResult] = useState('');
  const [savingResult, setSavingResult] = useState(false);

  const isDraft = row?.status === 'draft';

  // ---- load ----
  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const { data: setupData, error: setupErr } = await supabase
        .from('apx_setups')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (setupErr || !setupData) {
        setError(setupErr?.message || 'APX setup not found.');
        setLoading(false);
        return;
      }

      const { data: shotsData } = await supabase
        .from('apx_screenshots')
        .select('*')
        .eq('setup_id', id)
        .order('created_at');

      setRow(setupData);
      setScreenshots(shotsData || []);
      setNotesDraft(setupData.notes || '');
      setTradeResult(setupData.trade_result || '');
      setRResult(
        typeof setupData.r_result === 'number' ? String(setupData.r_result) : ''
      );
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  // ---- live evaluation (mirror FWT: recompute on load) ----
  const evaluation = useMemo(() => {
    if (!row) return null;
    const input = {
      setupType: row.setup_type,
      bias: row.bias,
      direction: row.direction,
      rangeHigh: row.range_high,
      rangeLow: row.range_low,
      impulseHigh: row.impulse_high,
      impulseLow: row.impulse_low,
      sweepLevel: row.sweep_level,
      sweepClosedBackInside: row.sweep_closed_back_inside,
      displacementRange: row.displacement_range,
      atrValue: row.atr_value,
      inducementLevel: row.inducement_level,
      inducementBroken: row.inducement_broken,
      mssLevel: row.mss_level,
      mssConfirmed: row.mss_confirmed,
      fvgHigh: row.fvg_high,
      fvgLow: row.fvg_low,
      ema50Value: row.ema50_value,
      ema50Tapped: row.ema50_tapped,
      entryPrice: row.entry_price,
      stopLoss: row.stop_loss,
      targetPrice: row.target_price,
    };
    return runGates(input);
  }, [row]);

  // ---- actions ----
  async function handleSaveNotes() {
    setSavingNotes(true);
    setNotesSaved(false);
    setError('');
    const { error: updErr } = await supabase
      .from('apx_setups')
      .update({ notes: notesDraft, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updErr) {
      setError(updErr.message);
      setSavingNotes(false);
      return;
    }
    setRow((prev) => (prev ? { ...prev, notes: notesDraft } : prev));
    setSavingNotes(false);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  async function handleSaveResult(newResult) {
    setSavingResult(true);
    setError('');
    const rNum = Number(rResult);
    const rValue =
      newResult === 'won' || newResult === 'lost'
        ? Number.isFinite(rNum) && rResult !== ''
          ? rNum
          : null
        : null;
    const { error: updErr } = await supabase
      .from('apx_setups')
      .update({
        trade_result: newResult || null,
        r_result: rValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (updErr) {
      setError(updErr.message);
      setSavingResult(false);
      return;
    }
    setRow((prev) =>
      prev ? { ...prev, trade_result: newResult || null, r_result: rValue } : prev
    );
    setTradeResult(newResult);
    setSavingResult(false);
  }

  async function handleSaveR() {
    const rNum = Number(rResult);
    const rValue = Number.isFinite(rNum) && rResult !== '' ? rNum : null;
    setSavingResult(true);
    setError('');
    const { error: updErr } = await supabase
      .from('apx_setups')
      .update({ r_result: rValue, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updErr) {
      setError(updErr.message);
      setSavingResult(false);
      return;
    }
    setRow((prev) => (prev ? { ...prev, r_result: rValue } : prev));
    setSavingResult(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete ${isDraft ? 'this draft' : 'this APX setup'}?`)) return;
    setDeleting(true);
    const { error: delErr } = await supabase.from('apx_setups').delete().eq('id', id);
    if (delErr) {
      setError(delErr.message);
      setDeleting(false);
      return;
    }
    router.push('/apx/journal');
  }

  // ---- render: loading / error ----
  if (loading) {
    return (
      <main style={{ minHeight: '100vh', padding: 24, background: '#000', color: '#fff' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', color: '#9ca3af' }}>
          Loading APX setup…
        </div>
      </main>
    );
  }

  if (error && !row) {
    return (
      <main style={{ minHeight: '100vh', padding: 24, background: '#000', color: '#fff' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gap: 16 }}>
          <div style={errorBox}>{error}</div>
          <button type="button" onClick={() => router.push('/apx')} style={btnDark}>
            ← Back
          </button>
        </div>
      </main>
    );
  }

  const resultBadges = {
    active: { label: '🎯 Active', cls: 'bg-blue-900/40 border-blue-700 text-blue-200' },
    won: { label: '✅ Won', cls: 'bg-green-900/40 border-green-700 text-green-200' },
    lost: { label: '🔴 Lost', cls: 'bg-red-900/40 border-red-700 text-red-200' },
  };
  const currentResultBadge = tradeResult ? resultBadges[tradeResult] : null;

  return (
    <main style={{ minHeight: '100vh', padding: 16, background: '#000', color: '#fff' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gap: 20 }}>
        {/* Draft banner */}
        {isDraft && (
          <div
            style={{
              padding: 16,
              borderRadius: 10,
              background: 'rgba(245,158,11,0.08)',
              border: '2px solid rgba(245,158,11,0.6)',
              display: 'grid',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: AMBER }}>📝 DRAFT</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#fbbf24' }}>
                  Last saved{' '}
                  {row.updated_at ? new Date(row.updated_at).toLocaleString() : '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/apx/manual?edit=${row.id}`)}
                style={{ ...btnAmber, padding: '8px 12px', fontSize: 12 }}
              >
                ▶ Continue editing
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
              <span style={{ color: AMBER }}>APX</span> Setup
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>
              {row.pair || '—'} · {row.timeframe_stack || '—'} ·{' '}
              <span style={{ color: AMBER }}>{(row.setup_type || '—').replace('_', ' ')}</span>
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6b7280' }}>
              Saved {new Date(row.created_at).toLocaleString()}
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {row.direction && (
                <span style={badgeNeutral}>{row.direction.toUpperCase()}</span>
              )}
              {row.bias && (
                <span
                  style={{
                    ...badgeNeutral,
                    color: row.bias === 'bullish' ? '#6ee7b7' : '#fca5a5',
                    borderColor:
                      row.bias === 'bullish'
                        ? 'rgba(16,185,129,0.5)'
                        : 'rgba(239,68,68,0.5)',
                  }}
                >
                  {row.bias.toUpperCase()}
                </span>
              )}
              {currentResultBadge && (
                <span style={badgeAmber}>{currentResultBadge.label}</span>
              )}
              {typeof row.confluence_score === 'number' && (
                <span style={badgeAmber}>Score {row.confluence_score}</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => router.push(`/apx/manual?edit=${row.id}`)}
              style={{ ...btnGhost, color: '#93c5fd', borderColor: 'rgba(59,130,246,0.5)' }}
            >
              ✏️ Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{ ...btnGhost, color: '#fca5a5', borderColor: 'rgba(239,68,68,0.5)' }}
            >
              {deleting ? 'Deleting…' : '🗑 Delete'}
            </button>
          </div>
        </div>

        {error ? <div style={errorBox}>{error}</div> : null}

        {/* Trade management */}
        {!isDraft && (
          <div style={panel}>
            <div>
              <p style={label}>Trade Result</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {[
                  { key: '', label: '— None' },
                  { key: 'active', label: '🎯 Active' },
                  { key: 'won', label: '✅ Won' },
                  { key: 'lost', label: '🔴 Lost' },
                ].map((opt) => {
                  const selected = tradeResult === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleSaveResult(opt.key)}
                      disabled={savingResult || selected}
                      style={{
                        padding: '8px 6px',
                        borderRadius: 8,
                        border: `1px solid ${
                          selected ? AMBER : 'rgba(255,255,255,0.14)'
                        }`,
                        background: selected ? 'rgba(245,158,11,0.16)' : 'rgba(255,255,255,0.03)',
                        color: selected ? AMBER : '#e5e7eb',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        opacity: savingResult ? 0.6 : 1,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {(tradeResult === 'won' || tradeResult === 'lost') && (
              <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>R multiple</span>
                <input
                  type="number"
                  step="any"
                  value={rResult}
                  onChange={(e) => setRResult(e.target.value)}
                  placeholder="e.g. 2.5"
                  style={{ ...inputStyle, maxWidth: 120 }}
                />
                <button
                  type="button"
                  onClick={handleSaveR}
                  disabled={savingResult}
                  style={{ ...btnGhost, padding: '6px 10px', fontSize: 11 }}
                >
                  Save R
                </button>
              </div>
            )}
          </div>
        )}

        {/* The Card */}
        {evaluation ? <ApxCard setup={row} result={evaluation} /> : null}

        {/* Screenshots */}
        <div
          style={{
            ...panel,
            borderColor: 'rgba(16,185,129,0.5)',
            borderWidth: 2,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#6ee7b7' }}>
              📸 Screenshots
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>
              {screenshots.length} attached
            </p>
          </div>

          <ScreenshotGallery
            screenshots={screenshots}
            onDelete={(deletedId) =>
              setScreenshots((prev) => prev.filter((s) => s.id !== deletedId))
            }
            table="apx_screenshots"
          />

          <div
            style={{
              paddingTop: 12,
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#9ca3af' }}>
              Add more
            </p>
            <ScreenshotUploader
              setupId={row.id}
              userId={userId}
              screenshots={screenshots}
              onChange={setScreenshots}
              table="apx_screenshots"
            />
          </div>
        </div>

        {/* Journal notes */}
        <div
          style={{
            ...panel,
            borderColor: 'rgba(168,85,247,0.5)',
            borderWidth: 2,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#d8b4fe' }}>
              📓 Journal Notes
            </h2>
            {notesSaved && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(16,185,129,0.16)', color: '#6ee7b7', fontWeight: 700 }}>
                ✅ Saved
              </span>
            )}
          </div>
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={6}
            placeholder="Observations, outcome, lessons…"
            style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
          />
          <button
            type="button"
            onClick={handleSaveNotes}
            disabled={savingNotes || notesDraft === (row.notes || '')}
            style={{ ...btnPurple, width: '100%' }}
          >
            {savingNotes ? 'Saving…' : '💾 Save Notes'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.push('/apx/journal')}
          style={{ ...btnDark, width: '100%' }}
        >
          ← Back to APX Journal
        </button>
      </div>
    </main>
  );
}

// ------------------------------------------------------------
// styles
// ------------------------------------------------------------
const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.14)',
  background: '#000',
  color: '#f3f4f6',
  fontSize: 13,
  outline: 'none',
};

const panel = {
  padding: 16,
  borderRadius: 10,
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.08)',
  display: 'grid',
  gap: 10,
};

const label = {
  margin: '0 0 8px',
  fontSize: 11,
  fontWeight: 700,
  color: '#d1d5db',
};

const btnDark = {
  padding: '12px 14px',
  borderRadius: 10,
  background: '#1f2937',
  color: '#e5e7eb',
  border: 'none',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

const btnGhost = {
  padding: '8px 12px',
  borderRadius: 10,
  background: 'transparent',
  color: '#e5e7eb',
  border: '1px solid rgba(255,255,255,0.16)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

const btnAmber = {
  padding: '10px 14px',
  borderRadius: 10,
  background: AMBER,
  color: '#111827',
  border: 'none',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

const btnPurple = {
  padding: '10px 14px',
  borderRadius: 10,
  background: '#6b21a8',
  color: '#f3e8ff',
  border: 'none',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

const badgeNeutral = {
  fontSize: 10,
  padding: '2px 8px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.2)',
  color: '#e5e7eb',
  fontWeight: 700,
};

const badgeAmber = {
  fontSize: 10,
  padding: '2px 8px',
  borderRadius: 999,
  border: '1px solid rgba(245,158,11,0.5)',
  background: 'rgba(245,158,11,0.1)',
  color: AMBER,
  fontWeight: 700,
};

const errorBox = {
  padding: 12,
  borderRadius: 8,
  background: 'rgba(239,68,68,0.15)',
  border: '1px solid rgba(239,68,68,0.5)',
  color: '#fecaca',
  fontSize: 13,
};