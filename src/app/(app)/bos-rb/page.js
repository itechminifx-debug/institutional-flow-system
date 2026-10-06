"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import {
  BOS_RB_CHECKLIST,
  CHECKLIST_PASS_THRESHOLD,
  autoDetectChecklist,
  computeChecklistScore,
  checklistVerdict,
  computeBosRbTrade,
  detectBosDirection,
  detectRbPosition,
  rbPositionInfo,
  rbPositionRules,
} from "@/lib/bosRbEngine";
import PairPicker from "@/components/PairPicker";

export default function BosRbPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const editId = searchParams?.get("edit") || null;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    pair: "Volatility 80",
    timeframe: "H4",
    htfBias: "bullish",
    bosLevel: "",
    bosClose: "",
    liquidityRaid: false,
    liquidityRaidLevel: "",
    displacementAtr: "",
    rbZoneHigh: "",
    rbZoneLow: "",
    fvgPresent: false,
    lowerTfShift: false,
    useCe: true,
    atr: "",
    notes: "",
  });

  const [autoAnswers, setAutoAnswers] = useState({});
  const [manualAnswers, setManualAnswers] = useState({});
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [existingDetailId, setExistingDetailId] = useState(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(prof);

      if (!isEdit) return;

      setLoadingEdit(true);
      const { data: setupData, error: setupErr } = await supabase
        .from("setups")
        .select("*")
        .eq("id", editId)
        .single();

      if (setupErr || !setupData) {
        setError(setupErr?.message || "Setup not found.");
        setLoadingEdit(false);
        return;
      }

      const { data: detailData } = await supabase
        .from("bos_rb_setups")
        .select("*")
        .eq("setup_id", editId)
        .single();

      setForm((f) => ({
        ...f,
        pair: setupData.pair || f.pair,
        timeframe: detailData?.timeframe || f.timeframe,
        htfBias: detailData?.htf_bias || setupData.htf_bias || f.htfBias,
        bosLevel: detailData?.bos_level?.toString() || "",
        bosClose: detailData?.bos_close?.toString() || "",
        liquidityRaid: detailData?.liquidity_raid || false,
        liquidityRaidLevel:
          detailData?.liquidity_raid_level?.toString() || "",
        displacementAtr: detailData?.displacement_atr?.toString() || "",
        rbZoneHigh: detailData?.rb_zone_high?.toString() || "",
        rbZoneLow: detailData?.rb_zone_low?.toString() || "",
        fvgPresent: detailData?.fvg_present || false,
        lowerTfShift: detailData?.lower_tf_shift || false,
        useCe: setupData.use_ce_entry !== undefined ? setupData.use_ce_entry : true,
        atr: detailData?.atr?.toString() || "",
        notes: setupData.notes || "",
      }));

      if (detailData?.checklist_answers) {
        const savedAns = detailData.checklist_answers;
        const manual = {};
        Object.keys(savedAns).forEach((k) => {
          if (savedAns[k] === true) manual[k] = true;
        });
        setManualAnswers(manual);
      }

      setExistingDetailId(detailData?.id || null);
      setLoadingEdit(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const bosDirection = detectBosDirection(form.bosLevel, form.bosClose);
  const rbPosition = detectRbPosition({
    bosLevel: form.bosLevel,
    bosClose: form.bosClose,
    rbZoneHigh: form.rbZoneHigh,
    rbZoneLow: form.rbZoneLow,
  });

  useEffect(() => {
    const auto = autoDetectChecklist({
      htfBias: form.htfBias,
      bosLevel: form.bosLevel,
      bosClose: form.bosClose,
      displacementAtr: form.displacementAtr,
      liquidityRaid: form.liquidityRaid,
      rbZoneHigh: form.rbZoneHigh,
      rbZoneLow: form.rbZoneLow,
      fvgPresent: form.fvgPresent,
      lowerTfShift: form.lowerTfShift,
    });
    setAutoAnswers(auto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.htfBias,
    form.bosLevel,
    form.bosClose,
    form.displacementAtr,
    form.liquidityRaid,
    form.rbZoneHigh,
    form.rbZoneLow,
    form.fvgPresent,
    form.lowerTfShift,
  ]);

  const combinedAnswers = {};
  BOS_RB_CHECKLIST.forEach((q) => {
    combinedAnswers[q.key] =
      manualAnswers[q.key] !== undefined
        ? manualAnswers[q.key]
        : autoAnswers[q.key] || false;
  });

  const score = computeChecklistScore(combinedAnswers);
  const verdict = checklistVerdict(score);

  const trade = computeBosRbTrade({
    htfBias: form.htfBias,
    rbZoneHigh: form.rbZoneHigh,
    rbZoneLow: form.rbZoneLow,
    rbPosition,
    useCe: form.useCe,
    accountSize: profile?.account_size || 0,
    riskPercent: profile?.risk_percent || 1,
    atr: parseFloat(form.atr) || 0,
  });

  function toggleManual(key) {
    setManualAnswers((prev) => ({
      ...prev,
      [key]: !combinedAnswers[key],
    }));
  }

  async function handleSave() {
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

    const setupPayload = {
      user_id: user.id,
      pair: form.pair,
      setup_type: "bos_rb",
      d1_bias: form.htfBias,
      htf_bias: form.htfBias,
      ema50_position: "above",
      rejection_block_zone: `${form.rbZoneLow}-${form.rbZoneHigh}`,
      ce_price: trade?.entry || null,
      use_ce_entry: form.useCe,
      bos_level: form.bosLevel ? parseFloat(form.bosLevel) : null,
      bos_close: form.bosClose ? parseFloat(form.bosClose) : null,
      bos_displacement_atr: form.displacementAtr
        ? parseFloat(form.displacementAtr)
        : null,
      liquidity_raid_level: form.liquidityRaidLevel
        ? parseFloat(form.liquidityRaidLevel)
        : null,
      checklist_score: score,
      checklist_passed: verdict.passed,
      notes: form.notes,
    };

    let setup;
    if (isEdit) {
      const { data, error: updErr } = await supabase
        .from("setups")
        .update(setupPayload)
        .eq("id", editId)
        .select()
        .single();

      if (updErr) {
        setError(updErr.message);
        setSaving(false);
        return;
      }
      setup = data;
    } else {
      const { data, error: insErr } = await supabase
        .from("setups")
        .insert(setupPayload)
        .select()
        .single();

      if (insErr) {
        setError(insErr.message);
        setSaving(false);
        return;
      }
      setup = data;
    }

    const detailPayload = {
      user_id: user.id,
      setup_id: setup.id,
      pair: form.pair,
      timeframe: form.timeframe,
      htf_bias: form.htfBias,
      bos_level: form.bosLevel ? parseFloat(form.bosLevel) : null,
      bos_close: form.bosClose ? parseFloat(form.bosClose) : null,
      displacement_atr: form.displacementAtr
        ? parseFloat(form.displacementAtr)
        : null,
      liquidity_raid: form.liquidityRaid,
      liquidity_raid_level: form.liquidityRaidLevel
        ? parseFloat(form.liquidityRaidLevel)
        : null,
      rb_zone_high: form.rbZoneHigh ? parseFloat(form.rbZoneHigh) : null,
      rb_zone_low: form.rbZoneLow ? parseFloat(form.rbZoneLow) : null,
      ce_price: trade?.entry || null,
      fvg_present: form.fvgPresent,
      lower_tf_shift: form.lowerTfShift,
      checklist_score: score,
      checklist_passed: verdict.passed,
      checklist_answers: combinedAnswers,
      notes: form.notes,
    };

    if (isEdit && existingDetailId) {
      const { error: updErr } = await supabase
        .from("bos_rb_setups")
        .update(detailPayload)
        .eq("id", existingDetailId);

      if (updErr) {
        setError(updErr.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insErr } = await supabase
        .from("bos_rb_setups")
        .insert(detailPayload);

      if (insErr) {
        setError(insErr.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => router.push(`/setups/${setup.id}`), 800);
  }

  const rbInfo = rbPosition ? rbPositionInfo(rbPosition) : null;
  const positionRules = rbPositionRules(bosDirection || form.htfBias);

  if (loadingEdit) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-gray-400">
          Loading setup...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit ? "Edit BOS + RB Setup" : "BOS + RB Confluence"}
          </h1>
          <p className="text-gray-400 text-sm">
            Continuation setup — Break of Structure + Rejection Block
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
            <label className="block text-xs mb-2 text-gray-400">
              HTF Bias
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => update("htfBias", "bullish")}
                className={`py-2 rounded-lg text-sm transition ${
                  form.htfBias === "bullish"
                    ? "bg-green-900/40 border border-green-600 text-green-200 font-bold"
                    : "bg-black border border-gray-800 text-gray-400"
                }`}
              >
                🟢 Bullish
              </button>
              <button
                type="button"
                onClick={() => update("htfBias", "bearish")}
                className={`py-2 rounded-lg text-sm transition ${
                  form.htfBias === "bearish"
                    ? "bg-red-900/40 border border-red-600 text-red-200 font-bold"
                    : "bg-black border border-gray-800 text-gray-400"
                }`}
              >
                🔴 Bearish
              </button>
            </div>
          </div>
        </div>

        {/* BOS */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            Break of Structure (BOS)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                BOS Level (broken swing)
              </label>
              <input
                type="number"
                step="any"
                value={form.bosLevel}
                onChange={(e) => update("bosLevel", e.target.value)}
                placeholder="e.g. 209500"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                BOS Close
              </label>
              <input
                type="number"
                step="any"
                value={form.bosClose}
                onChange={(e) => update("bosClose", e.target.value)}
                placeholder="e.g. 209800"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {bosDirection && (
            <div
              className={`p-2 rounded-lg border ${
                bosDirection === "bullish"
                  ? "bg-green-950/40 border-green-800"
                  : "bg-red-950/40 border-red-800"
              }`}
            >
              <p
                className={`text-xs font-semibold ${
                  bosDirection === "bullish"
                    ? "text-green-300"
                    : "text-red-300"
                }`}
              >
                {bosDirection === "bullish"
                  ? "🟢 Bullish BOS detected"
                  : "🔴 Bearish BOS detected"}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs mb-1 text-gray-400">
              Displacement (ATR Multiple)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.displacementAtr}
              onChange={(e) => update("displacementAtr", e.target.value)}
              placeholder="e.g. 1.2"
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              ≥ 1.0× ATR = strong displacement
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.liquidityRaid}
              onChange={(e) => update("liquidityRaid", e.target.checked)}
              className="w-4 h-4 accent-yellow-500"
            />
            <span className="text-sm">Liquidity raid occurred before BOS</span>
          </label>

          {form.liquidityRaid && (
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Liquidity Raid Level
              </label>
              <input
                type="number"
                step="any"
                value={form.liquidityRaidLevel}
                onChange={(e) =>
                  update("liquidityRaidLevel", e.target.value)
                }
                placeholder="e.g. 209400"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          )}
        </div>

        {/* RB Zone */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-blue-400">
              Rejection Block
            </h2>
            {rbInfo && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${rbInfo.color}`}
              >
                {rbInfo.emoji} {rbInfo.label}
              </span>
            )}
          </div>

          {rbInfo && (
            <p className="text-xs text-gray-500">{rbInfo.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                RB Zone Low
              </label>
              <input
                type="number"
                step="any"
                value={form.rbZoneLow}
                onChange={(e) => update("rbZoneLow", e.target.value)}
                placeholder="e.g. 209500"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                RB Zone High
              </label>
              <input
                type="number"
                step="any"
                value={form.rbZoneHigh}
                onChange={(e) => update("rbZoneHigh", e.target.value)}
                placeholder="e.g. 209700"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800">
            <div>
              <label className="block text-xs mb-1 text-gray-400">
                ATR (14)
              </label>
              <input
                type="number"
                step="any"
                value={form.atr}
                onChange={(e) => update("atr", e.target.value)}
                placeholder="e.g. 120"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-5">
              <input
                type="checkbox"
                checked={form.useCe}
                onChange={(e) => update("useCe", e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-xs">Use CE as entry</span>
            </label>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.fvgPresent}
              onChange={(e) => update("fvgPresent", e.target.checked)}
              className="w-4 h-4 accent-purple-500"
            />
            <span className="text-sm">FVG present at RB</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.lowerTfShift}
              onChange={(e) => update("lowerTfShift", e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <span className="text-sm">
              Lower-TF shift confirmed (15M/5M)
            </span>
          </label>
        </div>

        {/* RB Position Rules Card */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-blue-400">
              RB Position — All Three Are Valid
            </h2>
            <span className="text-xs text-gray-500">
              BOS sets direction. RB is only where price negotiates.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {positionRules.map((rule) => {
              const isActive = rbPosition === rule.key;
              return (
                <div
                  key={rule.key}
                  className={`p-3 rounded-lg border ${rule.color} ${
                    isActive ? "ring-2 ring-white/40" : "opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold">
                      {rule.emoji} {rule.label}
                    </p>
                    {isActive && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-white/20">
                        current
                      </span>
                    )}
                  </div>
                  <p className="text-xs opacity-90 mb-2">{rule.approach}</p>
                  <div className="text-xs space-y-0.5">
                    <p>
                      <span className="opacity-70">Direction:</span>{" "}
                      <span className="font-bold">{rule.direction}</span>
                    </p>
                    <p>
                      <span className="opacity-70">Entry:</span> {rule.entry}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-500 pt-1 border-t border-gray-800">
            The RB can sit above, inside, or below the BOS zone — all
            three are valid. Price approaches the RB, tests it, and
            continues in the BOS direction. Entry is always the CE
            (50%) of the RB.
          </p>
        </div>

        {/* Trade Parameters */}
        {trade && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <h2 className="text-sm font-semibold text-blue-400">
              Trade Parameters
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Direction</p>
                <p
                  className={`font-bold ${
                    trade.direction === "BUY"
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {trade.direction}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  Entry ({trade.entryIsCe ? "CE — 50%" : "RB edge"})
                </p>
                <p className="font-bold tabular-nums text-yellow-400">
                  {formatPrice(trade.entry)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Stop Loss</p>
                <p className="font-bold tabular-nums text-red-400">
                  {formatPrice(trade.sl)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {trade.slSource === "wick+buffer"
                    ? "wick + buffer"
                    : "wick only"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Take Profit (2R)</p>
                <p className="font-bold tabular-nums text-green-400">
                  {formatPrice(trade.tp)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">CE (50%)</p>
                <p className="font-bold tabular-nums text-blue-300">
                  {formatPrice(trade.cePrice)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Risk</p>
                <p className="font-bold tabular-nums text-white">
                  {trade.risk.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Lot Size</p>
                <p className="font-bold tabular-nums text-white">
                  {trade.lotSize.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Risk ($)</p>
                <p className="font-bold tabular-nums text-yellow-400">
                  ${trade.riskAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* The 10-Question Checklist */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-blue-400">
                The 10-Question Checklist
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Auto-detected where possible. Tap to override.
              </p>
            </div>
            <div className="text-right">
              <p
                className={`text-xl font-bold ${
                  verdict.passed ? "text-green-400" : "text-yellow-400"
                }`}
              >
                {score}/10
              </p>
            </div>
          </div>

          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                verdict.passed ? "bg-green-500" : "bg-yellow-500"
              }`}
              style={{ width: `${(score / 10) * 100}%` }}
            />
          </div>

          <div className={`p-3 rounded-lg border ${verdict.color}`}>
            <p className="text-sm font-bold">
              {verdict.emoji} {verdict.label}
            </p>
            <p className="text-xs opacity-90 mt-1">{verdict.description}</p>
            {!verdict.passed && (
              <p className="text-xs opacity-70 mt-2">
                Need {CHECKLIST_PASS_THRESHOLD - score} more check
                {CHECKLIST_PASS_THRESHOLD - score === 1 ? "" : "s"} to pass
              </p>
            )}
          </div>

          <div className="space-y-2 pt-2">
            {BOS_RB_CHECKLIST.map((q) => {
              const isAuto = autoAnswers[q.key];
              const isManual = manualAnswers[q.key] !== undefined;
              const isOn = combinedAnswers[q.key];

              const showDirectionalBadge =
                q.key === "rb_aligned" && autoAnswers.rb_direction_ok === true;

              return (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => toggleManual(q.key)}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    isOn
                      ? "bg-green-900/40 border-green-700"
                      : "bg-black border-gray-800 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                        isOn
                          ? "bg-green-500 border-green-500"
                          : "border-gray-600"
                      }`}
                    >
                      {isOn && (
                        <span className="text-black text-xs font-bold">✓</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={`text-sm font-medium ${
                            isOn ? "text-green-200" : "text-white"
                          }`}
                        >
                          {q.number}. {q.label}
                        </p>
                        {isAuto && !isManual && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300">
                            auto
                          </span>
                        )}
                        {showDirectionalBadge && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300">
                            direction ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {q.hint}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

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
            ✅ {isEdit ? "Updated" : "Saved"} — redirecting to setup...
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !trade}
          className={`w-full py-4 rounded-lg font-bold disabled:opacity-50 ${
            verdict.passed
              ? "bg-green-700 hover:bg-green-600"
              : "bg-yellow-800 hover:bg-yellow-700"
          }`}
        >
          {saving
            ? isEdit
              ? "Updating..."
              : "Saving..."
            : isEdit
            ? "✏️ Update Setup"
            : verdict.passed
            ? "✅ Save & Trade"
            : `💾 Save (${score}/10 — Needs ${
                CHECKLIST_PASS_THRESHOLD - score
              } More)`}
        </button>

        {/* Info card */}
        <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-900/50">
          <h3 className="text-xs font-semibold text-blue-300 mb-2">
            💡 How BOS + RB Works
          </h3>
          <ul className="text-xs text-gray-300 space-y-1 ml-4 list-disc">
            <li>
              <strong>BOS</strong> — Break of Structure (continuation)
            </li>
            <li>
              <strong>Liquidity raid</strong> — the trap before the break
            </li>
            <li>
              <strong>Displacement</strong> — strong move after the BOS
            </li>
            <li>
              <strong>RB</strong> — can be above, inside, or below the BOS
              zone (all three are valid)
            </li>
            <li>
              <strong>Entry</strong> — the CE (50%) of the RB zone
            </li>
            <li>
              <strong>SL</strong> — beyond the wick extreme
            </li>
            <li>
              <strong>TP</strong> — 2R from entry
            </li>
            <li>
              <strong>7+ checklist</strong> — pass threshold
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}