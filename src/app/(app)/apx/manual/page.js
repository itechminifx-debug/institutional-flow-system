// app/apx/manual/page.jsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { evaluateApx, APX_SETUP_TYPES, APX_BIASES, APX_DIRECTIONS } from "@/lib/apxEngine";
import ApxCard from "@/components/ApxCard";

const initialForm = {
  pair: "", timeframe_stack: "Daily → 4H → 15M",
  setup_type: "standard", bias: "bullish", direction: "long",
  range_high: "", range_low: "",
  impulse_high: "", impulse_low: "",
  sweep_level: "", sweep_closed_back_inside: false,
  displacement_range: "", atr_value: "",
  inducement_level: "", inducement_broken: false,
  mss_level: "", mss_confirmed: false,
  fvg_high: "", fvg_low: "",
  ema50_value: "", ema50_tapped: false,
  entry_price: "", stop_loss: "", target_price: "", risk_percent: "",
  notes: "",
};

function rowToForm(row) {
  if (!row) return initialForm;
  const s = (v) => (typeof v === "number" ? String(v) : v ?? "");
  return {
    pair: row.pair ?? "", timeframe_stack: row.timeframe_stack ?? "",
    setup_type: row.setup_type ?? "standard", bias: row.bias ?? "bullish", direction: row.direction ?? "long",
    range_high: s(row.range_high), range_low: s(row.range_low),
    impulse_high: s(row.impulse_high), impulse_low: s(row.impulse_low),
    sweep_level: s(row.sweep_level), sweep_closed_back_inside: !!row.sweep_closed_back_inside,
    displacement_range: s(row.displacement_range), atr_value: s(row.atr_value),
    inducement_level: s(row.inducement_level), inducement_broken: !!row.inducement_broken,
    mss_level: s(row.mss_level), mss_confirmed: !!row.mss_confirmed,
    fvg_high: s(row.fvg_high), fvg_low: s(row.fvg_low),
    ema50_value: s(row.ema50_value), ema50_tapped: !!row.ema50_tapped,
    entry_price: s(row.entry_price), stop_loss: s(row.stop_loss), target_price: s(row.target_price),
    risk_percent: s(row.risk_percent), notes: row.notes ?? "",
  };
}

export default function ApxManualPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;
  const supabase = createClient();

  const [form, setForm] = useState(initialForm);
  const [originalRow, setOriginalRow] = useState(null);
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState(null);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      const { data, error: err } = await supabase.from("apx_setups").select("*").eq("id", editId).maybeSingle();
      if (err || !data) { setError(err?.message || "Setup not found."); setLoading(false); return; }
      setOriginalRow(data);
      setForm(rowToForm(data));
      setSavedId(data.id);
      setLoading(false);
    })();
  }, [editId, supabase]);

  const set = (key) => (e) => {
    const v = e?.target?.type === "checkbox" ? e.target.checked : e?.target?.value ?? e;
    setForm((f) => ({ ...f, [key]: v }));
  };

  const num = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  const input = useMemo(() => ({
    setupType: form.setup_type, bias: form.bias, direction: form.direction,
    pair: form.pair, timeframeStack: form.timeframe_stack,
    rangeHigh: num(form.range_high), rangeLow: num(form.range_low),
    impulseHigh: num(form.impulse_high), impulseLow: num(form.impulse_low),
    sweepLevel: num(form.sweep_level), sweepClosedBackInside: form.sweep_closed_back_inside,
    displacementRange: num(form.displacement_range), atrValue: num(form.atr_value),
    inducementLevel: num(form.inducement_level), inducementBroken: form.inducement_broken,
    mssLevel: num(form.mss_level), mssConfirmed: form.mss_confirmed,
    fvgHigh: num(form.fvg_high), fvgLow: num(form.fvg_low),
    ema50Value: num(form.ema50_value), ema50Tapped: form.ema50_tapped,
    entryPrice: num(form.entry_price), stopLoss: num(form.stop_loss), targetPrice: num(form.target_price),
    riskPercent: num(form.risk_percent),
  }), [form]);

  const evaluation = useMemo(() => evaluateApx(input), [input]);

  const onSave = useCallback(async () => {
    setSaving(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    const payload = {
      user_id: user.id,
      pair: form.pair || null,
      timeframe_stack: form.timeframe_stack || null,
      setup_type: form.setup_type,
      bias: form.bias,
      direction: form.direction,
      range_high: num(form.range_high),
      range_low: num(form.range_low),
      ce: evaluation.zones.ce,
      impulse_high: num(form.impulse_high),
      impulse_low: num(form.impulse_low),
      ote_low: evaluation.zones.oteLow,
      ote_high: evaluation.zones.oteHigh,
      sweep_level: num(form.sweep_level),
      sweep_closed_back_inside: !!form.sweep_closed_back_inside,
      displacement_range: num(form.displacement_range),
      atr_value: num(form.atr_value),
      inducement_level: num(form.inducement_level),
      inducement_broken: !!form.inducement_broken,
      mss_level: num(form.mss_level),
      mss_confirmed: !!form.mss_confirmed,
      fvg_high: num(form.fvg_high),
      fvg_low: num(form.fvg_low),
      ema50_value: num(form.ema50_value),
      ema50_tapped: !!form.ema50_tapped,
      entry_price: num(form.entry_price),
      stop_loss: num(form.stop_loss),
      target_price: num(form.target_price),
      rr: evaluation.trade?.rr ?? null,
      risk_percent: num(form.risk_percent),
      status: evaluation.preEntryReady ? "complete" : "draft",
      trade_result: isEdit ? (originalRow?.trade_result ?? null) : (evaluation.preEntryReady ? "active" : null),
      r_result: isEdit ? (originalRow?.r_result ?? null) : null,
      notes: form.notes || null,
    };

    let res;
    if (isEdit) {
      res = await supabase.from("apx_setups").update(payload).eq("id", editId).select("id").single();
    } else {
      res = await supabase.from("apx_setups").insert(payload).select("id").single();
    }

    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    setSavedId(res.data.id);
    router.push(`/apx/${res.data.id}`);
  }, [form, evaluation, isEdit, editId, originalRow, supabase, router]);

  if (loading) {
    return <main className="min-h-screen p-6 bg-black text-white"><p className="text-gray-400 text-sm">Loading…</p></main>;
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-amber-400">🎯 APX · {isEdit ? "Edit Setup" : "New Setup"}</h1>
            <p className="text-gray-400 text-xs">{isEdit ? "Update and save changes." : "Fill the fields — live preview updates as you type."}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href={isEdit ? `/apx/${editId}` : "/apx"} className="text-xs px-3 py-2 rounded-lg bg-gray-800 font-semibold">
              ← Back
            </Link>
          </div>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Section title="Header">
              <Row>
                <Field label="Pair"><input value={form.pair} onChange={set("pair")} placeholder="EURUSD" className={inputCls} /></Field>
                <Field label="Timeframe stack"><input value={form.timeframe_stack} onChange={set("timeframe_stack")} className={inputCls} /></Field>
              </Row>
              <Row>
                <Field label="Setup type">
                  <select value={form.setup_type} onChange={set("setup_type")} className={inputCls}>
                    {APX_SETUP_TYPES.map((s) => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
                  </select>
                </Field>
                <Field label="Bias">
                  <select value={form.bias} onChange={set("bias")} className={inputCls}>
                    {APX_BIASES.map((b) => <option key={b.key} value={b.key}>{b.emoji} {b.label}</option>)}
                  </select>
                </Field>
                <Field label="Direction">
                  <select value={form.direction} onChange={set("direction")} className={inputCls}>
                    {APX_DIRECTIONS.map((d) => <option key={d.key} value={d.key}>{d.emoji} {d.label}</option>)}
                  </select>
                </Field>
              </Row>
            </Section>

            <Section title="Dealing Range">
              <Row>
                <Field label="Range high"><input type="number" step="any" value={form.range_high} onChange={set("range_high")} className={inputCls} /></Field>
                <Field label="Range low"><input type="number" step="any" value={form.range_low} onChange={set("range_low")} className={inputCls} /></Field>
                <Field label="CE (auto)"><input readOnly value={evaluation.zones.ce ?? ""} className={inputCls + " opacity-60"} /></Field>
              </Row>
            </Section>

            <Section title="Impulse Leg (for OTE)">
              <Row>
                <Field label="Impulse high"><input type="number" step="any" value={form.impulse_high} onChange={set("impulse_high")} className={inputCls} /></Field>
                <Field label="Impulse low"><input type="number" step="any" value={form.impulse_low} onChange={set("impulse_low")} className={inputCls} /></Field>
              </Row>
              <Row>
                <Field label="OTE low (auto)"><input readOnly value={evaluation.zones.oteLow ?? ""} className={inputCls + " opacity-60"} /></Field>
                <Field label="OTE high (auto)"><input readOnly value={evaluation.zones.oteHigh ?? ""} className={inputCls + " opacity-60"} /></Field>
              </Row>
            </Section>

            <Section title="Liquidity / Sweep">
              <Row>
                <Field label="Sweep level"><input type="number" step="any" value={form.sweep_level} onChange={set("sweep_level")} className={inputCls} /></Field>
                <Field label="Displacement"><input type="number" step="any" value={form.displacement_range} onChange={set("displacement_range")} className={inputCls} /></Field>
                <Field label="ATR (opt)"><input type="number" step="any" value={form.atr_value} onChange={set("atr_value")} className={inputCls} /></Field>
              </Row>
              <Checkbox label="Sweep candle closed back inside range" checked={form.sweep_closed_back_inside} onChange={set("sweep_closed_back_inside")} />
            </Section>

            <Section title="Structure">
              <Row>
                <Field label="Inducement level"><input type="number" step="any" value={form.inducement_level} onChange={set("inducement_level")} className={inputCls} /></Field>
                <Field label="MSS level"><input type="number" step="any" value={form.mss_level} onChange={set("mss_level")} className={inputCls} /></Field>
              </Row>
              <Row>
                <Field label="FVG high"><input type="number" step="any" value={form.fvg_high} onChange={set("fvg_high")} className={inputCls} /></Field>
                <Field label="FVG low"><input type="number" step="any" value={form.fvg_low} onChange={set("fvg_low")} className={inputCls} /></Field>
                <Field label="50 EMA (opt)"><input type="number" step="any" value={form.ema50_value} onChange={set("ema50_value")} className={inputCls} /></Field>
              </Row>
              <div className="flex flex-wrap gap-3">
                <Checkbox label="Inducement broken" checked={form.inducement_broken} onChange={set("inducement_broken")} />
                <Checkbox label="MSS confirmed" checked={form.mss_confirmed} onChange={set("mss_confirmed")} />
                <Checkbox label="50 EMA tapped" checked={form.ema50_tapped} onChange={set("ema50_tapped")} />
              </div>
            </Section>

            <Section title="Trade">
              <Row>
                <Field label="Entry"><input type="number" step="any" value={form.entry_price} onChange={set("entry_price")} className={inputCls} /></Field>
                <Field label="Stop loss"><input type="number" step="any" value={form.stop_loss} onChange={set("stop_loss")} className={inputCls} /></Field>
                <Field label="Target"><input type="number" step="any" value={form.target_price} onChange={set("target_price")} className={inputCls} /></Field>
                <Field label="Risk %"><input type="number" step="any" value={form.risk_percent} onChange={set("risk_percent")} className={inputCls} /></Field>
              </Row>
            </Section>

            <Section title="Notes">
              <textarea value={form.notes} onChange={set("notes")} rows={3} className={inputCls} placeholder="Context, narrative, tags…" />
            </Section>

            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="w-full py-3 rounded-lg bg-amber-600 text-black font-bold disabled:opacity-50"
            >
              {saving ? "Saving…" : isEdit ? "💾 Save Changes" : "💾 Save Setup"}
            </button>
          </div>

          <div className="lg:sticky lg:top-4 self-start">
            <p className="text-xs text-gray-500 mb-2">Live preview</p>
            <ApxCard data={evaluation} />
          </div>
        </div>
      </div>
    </main>
  );
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm text-white focus:border-amber-600 outline-none";

function Section({ title, children }) {
  return (
    <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
      <p className="text-xs font-bold text-amber-400">{title}</p>
      {children}
    </div>
  );
}
function Row({ children }) { return <div className="grid grid-cols-2 md:grid-cols-3 gap-2">{children}</div>; }
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[10px] text-gray-500">{label}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  );
}
function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs text-gray-300">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}