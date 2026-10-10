"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import PairPicker from "@/components/PairPicker";
import LiquiditySequenceCard from "@/components/LiquiditySequenceCard";
import {
  SEQUENCE_TYPES,
  evaluateLiquiditySequence,
} from "@/lib/liquiditySequenceEngine";

function emptyCandle() {
  return { open: "", high: "", low: "", close: "" };
}

function CandleInput({ label, candle, onChange, hint }) {
  return (
    <div className="p-3 rounded-lg bg-black border border-gray-800 space-y-2">
      <p className="text-xs font-semibold text-gray-400">{label}</p>
      {hint && <p className="text-xs text-gray-500 -mt-1">{hint}</p>}
      {["open", "high", "low", "close"].map((f) => (
        <input
          key={f}
          type="number"
          step="any"
          value={candle[f]}
          onChange={(e) => onChange(f, e.target.value)}
          placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
          className="w-full px-2 py-1 rounded bg-black border border-gray-700 text-xs"
        />
      ))}
    </div>
  );
}

export default function LiquiditySequencePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "H4",
    sequenceType: "support",

    liquidityZoneHigh: "",
    liquidityZoneLow: "",

    mssReference: "",
    fvgHigh: "",
    fvgLow: "",
    rbHigh: "",
    rbLow: "",

    nextLiquidityLevel: "",
    pipSize: 1,
    notes: "",
  });

  const [sweepCandle, setSweepCandle] = useState(emptyCandle());
  const [mssCandle, setMssCandle] = useState(emptyCandle());
  const [closeCandle, setCloseCandle] = useState(emptyCandle());

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [existingId, setExistingId] = useState(null);

  // ----------------------------------------------------------
  // Load existing (edit mode)
  // ----------------------------------------------------------
  useEffect(() => {
    if (!isEdit) return;
    async function load() {
      setLoadingEdit(true);
      const { data, error: loadErr } = await supabase
        .from("liquidity_sequence_setups")
        .select("*")
        .eq("id", editId)
        .single();

      if (loadErr || !data) {
        setError(loadErr?.message || "Sequence not found.");
        setLoadingEdit(false);
        return;
      }

      setForm({
        pair: data.pair || "Volatility 80",
        timeframe: data.timeframe || "H4",
        sequenceType: data.sequence_type || "support",
        liquidityZoneHigh: data.liquidity_zone_high?.toString() || "",
        liquidityZoneLow: data.liquidity_zone_low?.toString() || "",
        mssReference: data.mss_reference?.toString() || "",
        fvgHigh: data.fvg_high?.toString() || "",
        fvgLow: data.fvg_low?.toString() || "",
        rbHigh: data.rb_high?.toString() || "",
        rbLow: data.rb_low?.toString() || "",
        nextLiquidityLevel: data.next_liquidity_level?.toString() || "",
        pipSize: data.pip_size || 1,
        notes: data.notes || "",
      });

      if (data.sweep_candle) {
        setSweepCandle({
          open: data.sweep_candle.open?.toString() || "",
          high: data.sweep_candle.high?.toString() || "",
          low: data.sweep_candle.low?.toString() || "",
          close: data.sweep_candle.close?.toString() || "",
        });
      }
      if (data.mss_candle) {
        setMssCandle({
          open: data.mss_candle.open?.toString() || "",
          high: data.mss_candle.high?.toString() || "",
          low: data.mss_candle.low?.toString() || "",
          close: data.mss_candle.close?.toString() || "",
        });
      }
      if (data.close_candle) {
        setCloseCandle({
          open: data.close_candle.open?.toString() || "",
          high: data.close_candle.high?.toString() || "",
          low: data.close_candle.low?.toString() || "",
          close: data.close_candle.close?.toString() || "",
        });
      }

      setExistingId(data.id);
      setLoadingEdit(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateCandle(setter) {
    return (field, value) => setter((c) => ({ ...c, [field]: value }));
  }

  // ----------------------------------------------------------
  // Live evaluation
  // ----------------------------------------------------------
  const evaluation = useMemo(() => {
    return evaluateLiquiditySequence({
      sequenceType: form.sequenceType,
      liquidityZoneHigh: form.liquidityZoneHigh,
      liquidityZoneLow: form.liquidityZoneLow,
      sweepCandle,
      mssCandle,
      mssReference: form.mssReference,
      fvgHigh: form.fvgHigh,
      fvgLow: form.fvgLow,
      rbHigh: form.rbHigh,
      rbLow: form.rbLow,
      closeCandle,
      nextLiquidityLevel: form.nextLiquidityLevel,
      pipSize: parseFloat(form.pipSize) || 1,
    });
  }, [
    form.sequenceType,
    form.liquidityZoneHigh,
    form.liquidityZoneLow,
    form.mssReference,
    form.fvgHigh,
    form.fvgLow,
    form.rbHigh,
    form.rbLow,
    form.nextLiquidityLevel,
    form.pipSize,
    sweepCandle,
    mssCandle,
    closeCandle,
  ]);

  const hasAnyInput =
    form.liquidityZoneHigh ||
    form.liquidityZoneLow ||
    form.mssReference ||
    form.fvgHigh ||
    form.fvgLow ||
    form.rbHigh ||
    form.rbLow ||
    form.nextLiquidityLevel ||
    Object.values(sweepCandle).some((v) => v) ||
    Object.values(mssCandle).some((v) => v) ||
    Object.values(closeCandle).some((v) => v);

  // ----------------------------------------------------------
  // Save gate — need zone + RB + close at minimum
  // ----------------------------------------------------------
  const canSave =
    form.liquidityZoneHigh &&
    form.liquidityZoneLow &&
    form.rbHigh &&
    form.rbLow &&
    form.nextLiquidityLevel;

  // ----------------------------------------------------------
  // Save
  // ----------------------------------------------------------
  async function handleSave() {
    if (!canSave) {
      setError(
        "Fill the liquidity zone (high + low), the RB (high + low), and the next liquidity target first."
      );
      return;
    }

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated.");
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      pair: form.pair,
      timeframe: form.timeframe,
      sequence_type: form.sequenceType,

      liquidity_zone_high: parseFloat(form.liquidityZoneHigh),
      liquidity_zone_low: parseFloat(form.liquidityZoneLow),

      mss_reference: form.mssReference
        ? parseFloat(form.mssReference)
        : null,

      fvg_high: form.fvgHigh ? parseFloat(form.fvgHigh) : null,
      fvg_low: form.fvgLow ? parseFloat(form.fvgLow) : null,

      rb_high: parseFloat(form.rbHigh),
      rb_low: parseFloat(form.rbLow),

      next_liquidity_level: parseFloat(form.nextLiquidityLevel),
      pip_size: parseFloat(form.pipSize) || 1,

      sweep_candle: {
        open: parseFloat(sweepCandle.open) || null,
        high: parseFloat(sweepCandle.high) || null,
        low: parseFloat(sweepCandle.low) || null,
        close: parseFloat(sweepCandle.close) || null,
      },
      mss_candle: {
        open: parseFloat(mssCandle.open) || null,
        high: parseFloat(mssCandle.high) || null,
        low: parseFloat(mssCandle.low) || null,
        close: parseFloat(mssCandle.close) || null,
      },
      close_candle: {
        open: parseFloat(closeCandle.open) || null,
        high: parseFloat(closeCandle.high) || null,
        low: parseFloat(closeCandle.low) || null,
        close: parseFloat(closeCandle.close) || null,
      },

      verdict: evaluation.verdict,
      entry: evaluation.trade?.entry || null,
      sl: evaluation.trade?.sl || null,
      tp: evaluation.trade?.tp || null,
      rr: evaluation.trade?.rr || null,

      rb_ce: evaluation.steps.rb?.rb?.ce ?? null,
      rb_position: evaluation.steps.rb?.alignment ?? null,
      premium_discount: evaluation.premiumDiscount?.position ?? null,
      close_vs_ce_pips: evaluation.premiumDiscount?.pipsFromCe ?? null,

      rb_fvg_alignment: evaluation.steps.rb?.alignment ?? null,
      rb_fvg_overlap: evaluation.steps.rb?.overlap ?? null,

      steps_passed: {
        liquidity: evaluation.steps.liquidity.pass,
        sweep: evaluation.steps.sweep.pass,
        mss: evaluation.steps.mss.pass,
        fvg: evaluation.steps.fvg.pass,
        rb: evaluation.steps.rb.pass,
        close: evaluation.steps.close.pass,
      },
      reasons: evaluation.reasons,

      notes: form.notes,
    };

    let rowId;

    if (isEdit && existingId) {
      const { error: updErr } = await supabase
        .from("liquidity_sequence_setups")
        .update(payload)
        .eq("id", existingId);
      if (updErr) {
        setError(updErr.message);
        setSaving(false);
        return;
      }
      rowId = existingId;
    } else {
      const { data, error: insErr } = await supabase
        .from("liquidity_sequence_setups")
        .insert(payload)
        .select()
        .single();
      if (insErr) {
        setError(insErr.message);
        setSaving(false);
        return;
      }
      rowId = data.id;
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => router.push(`/liquidity-sequence/${rowId}`), 800);
  }

  if (loadingEdit) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-gray-400">
          Loading sequence...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit ? "Edit Liquidity Sequence" : "Liquidity Sequence"}
          </h1>
          <p className="text-gray-400 text-sm">
            Zone → Sweep → MSS → FVG → RB → Close → Premium/Discount verdict.
            All five systems collaborate. The entry card prints only when every
            system agrees.
          </p>
        </div>

        {/* Context */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <PairPicker
              value={form.pair}
              onChange={(pair) => update("pair", pair)}
              label="Pair"
            />
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Timeframe
              </label>
              <select
                value={form.timeframe}
                onChange={(e) => update("timeframe", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                <option value="D1">D1</option>
                <option value="H4">H4</option>
                <option value="H1">H1</option>
                <option value="M30">M30</option>
                <option value="M15">M15</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1 text-gray-400">
              Sequence Type
            </label>
            <select
              value={form.sequenceType}
              onChange={(e) => update("sequenceType", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            >
              {SEQUENCE_TYPES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.emoji} {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SYSTEM 1 — Liquidity Zone */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            1️⃣ Liquidity Zone
          </h2>
          <p className="text-xs text-gray-500 -mt-1">
            Mark the pool where stops rest.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Zone Low *
              </label>
              <input
                type="number"
                step="any"
                value={form.liquidityZoneLow}
                onChange={(e) => update("liquidityZoneLow", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Zone High *
              </label>
              <input
                type="number"
                step="any"
                value={form.liquidityZoneHigh}
                onChange={(e) => update("liquidityZoneHigh", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* SYSTEM 2 — Liquidity Sweep */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            2️⃣ Liquidity Sweep
          </h2>
          <p className="text-xs text-gray-500 -mt-1">
            The candle that poked through the zone.
          </p>
          <CandleInput
            label="Sweep Candle"
            candle={sweepCandle}
            onChange={updateCandle(setSweepCandle)}
          />
        </div>

        {/* SYSTEM 3 — MSS */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">3️⃣ MSS</h2>
          <p className="text-xs text-gray-500 -mt-1">
            Structure shift — close breaks the reference.
          </p>
          <div>
            <label className="block text-xs mb-1 text-gray-400">
              MSS Reference (swing level to break)
            </label>
            <input
              type="number"
              step="any"
              value={form.mssReference}
              onChange={(e) => update("mssReference", e.target.value)}
              placeholder={
                form.sequenceType === "support"
                  ? "Swing high to break above"
                  : "Swing low to break below"
              }
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            />
          </div>
          <CandleInput
            label="MSS Candle"
            candle={mssCandle}
            onChange={updateCandle(setMssCandle)}
            hint="The candle that broke structure."
          />
        </div>

        {/* SYSTEM 4 — FVG */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">4️⃣ FVG</h2>
          <p className="text-xs text-gray-500 -mt-1">
            Mark the fair value gap boundaries.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                FVG Low
              </label>
              <input
                type="number"
                step="any"
                value={form.fvgLow}
                onChange={(e) => update("fvgLow", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                FVG High
              </label>
              <input
                type="number"
                step="any"
                value={form.fvgHigh}
                onChange={(e) => update("fvgHigh", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* SYSTEM 5 — Rejection Block */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            5️⃣ Rejection Block
          </h2>
          <p className="text-xs text-gray-500 -mt-1">
            Mark the RB. It must align with the FVG (inside / above / below).
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                RB Low *
              </label>
              <input
                type="number"
                step="any"
                value={form.rbLow}
                onChange={(e) => update("rbLow", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                RB High *
              </label>
              <input
                type="number"
                step="any"
                value={form.rbHigh}
                onChange={(e) => update("rbHigh", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* SYSTEM 6 — Close in RB + Verdict */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            6️⃣ Close in RB + Premium/Discount Verdict
          </h2>
          <p className="text-xs text-gray-500 -mt-1">
            The candle that closes inside the RB. Premium/discount is judged at
            the RB CE.
          </p>
          <CandleInput
            label="Close Candle"
            candle={closeCandle}
            onChange={updateCandle(setCloseCandle)}
            hint="Must close within the RB range."
          />
        </div>

        {/* Target + pip size */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            🎯 Target & Pip
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Next Liquidity Target *
              </label>
              <input
                type="number"
                step="any"
                value={form.nextLiquidityLevel}
                onChange={(e) =>
                  update("nextLiquidityLevel", e.target.value)
                }
                placeholder={
                  form.sequenceType === "support"
                    ? "Swing high above"
                    : "Swing low below"
                }
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Pip size
              </label>
              <select
                value={form.pipSize}
                onChange={(e) =>
                  update("pipSize", parseFloat(e.target.value))
                }
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              >
                <option value={0.0001}>0.0001</option>
                <option value={0.001}>0.001</option>
                <option value={0.01}>0.01</option>
                <option value={0.1}>0.1</option>
                <option value={1}>1.0 (VOL)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Result card */}
        {hasAnyInput && <LiquiditySequenceCard data={evaluation} />}

        {/* Notes */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <label className="block text-xs mb-1 text-gray-400">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={2}
            placeholder="Any observations..."
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none resize-none text-sm"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        {saved && (
          <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">
            ✅ {isEdit ? "Updated" : "Saved"} — redirecting...
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !canSave}
          className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${
            isEdit
              ? "bg-blue-700 hover:bg-blue-600"
              : evaluation.verdict === "BUY"
              ? "bg-green-700 hover:bg-green-600"
              : evaluation.verdict === "SELL"
              ? "bg-red-700 hover:bg-red-600"
              : "bg-gray-800 hover:bg-gray-700"
          }`}
        >
          {saving
            ? "Saving..."
            : isEdit
            ? "✏️ Update Sequence"
            : evaluation.verdict === "BUY"
            ? "✅ Save BUY Sequence"
            : evaluation.verdict === "SELL"
            ? "🔴 Save SELL Sequence"
            : "💾 Save Sequence"}
        </button>

        {!canSave && (
          <p className="text-xs text-gray-500 text-center">
            Fill the required fields (marked *) to enable save.
          </p>
        )}
      </div>
    </main>
  );
}