"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { PAIRS } from "@/lib/setupHelpers";
import { parseZone } from "@/lib/zoneHelpers";
import { computeCEPrice } from "@/lib/riskEngine";
import { computeQualityScore } from "@/lib/rejectionBlockScorer";
import {
  computeSweepOverlap,
  computeEffectivenessTier,
  effectivenessScore,
} from "@/lib/sweepConfluence";
import QualityScoreCard from "@/components/QualityScoreCard";
import ContextLayersCard from "@/components/ContextLayersCard";

function NewSetupPageContent() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  const prefillPair = searchParams.get("rb_pair");
  const prefillLow = searchParams.get("rb_zone_low");
  const prefillHigh = searchParams.get("rb_zone_high");
  const prefillCe = searchParams.get("rb_ce");
  const prefillConfidence = searchParams.get("rb_confidence");
  const prefillDirection = searchParams.get("rb_direction");

  const [form, setForm] = useState({
    pair: prefillPair || "Volatility 80",
    d1_bias:
      prefillDirection === "rfz"
        ? "bearish"
        : prefillDirection === "sfz"
        ? "bullish"
        : "bullish",
    ema50_position: "above",
    block_breaker_level: "",
    aligned_liquidity: "",
    rejection_block_zone:
      prefillLow && prefillHigh ? `${prefillLow}-${prefillHigh}` : "",
    sweep_price: "",
    notes: prefillConfidence
      ? `RB validated with confidence ${prefillConfidence}/10`
      : "",
  });

  const [qualityScores, setQualityScores] = useState({
    sweep: 0,
    wick_body: 0,
    displacement: 0,
    alignment: 0,
    freshness: 0,
    battlefield: 0,
  });

  const [context, setContext] = useState({
    institutional_cycle: null,
    fvg_present: false,
    fvg_direction: null,
    fvg_low: "",
    fvg_high: "",
    ob_present: false,
    ob_type: null,
    ob_low: "",
    ob_high: "",
    twice_blocked: false,
    twice_blocked_notes: "",
  });

  const [useCeEntry, setUseCeEntry] = useState(!!prefillCe);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const parsedZone = form.rejection_block_zone
    ? parseZone(form.rejection_block_zone)
    : null;
  const cePrice = parsedZone
    ? prefillCe && !form.cePrice
      ? parseFloat(prefillCe)
      : computeCEPrice(parsedZone)
    : null;

  const sweepPrice = form.sweep_price ? parseFloat(form.sweep_price) : null;
  const sweepOverlap =
    sweepPrice && parsedZone
      ? computeSweepOverlap(sweepPrice, parsedZone)
      : false;

  const computedTier = computeEffectivenessTier({
    sweepConfirmed: sweepOverlap,
    tfAligned: (qualityScores.alignment || 0) >= 2,
    emaAligned:
      (form.d1_bias === "bearish" && form.ema50_position === "above") ||
      (form.d1_bias === "bullish" && form.ema50_position === "below"),
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }

    const qualityTotal = computeQualityScore(qualityScores);

    const { data: insertedSetup, error: insertError } = await supabase
      .from("setups")
      .insert({
        user_id: user.id,
        pair: form.pair,
        d1_bias: form.d1_bias,
        ema50_position: form.ema50_position,
        block_breaker_level: form.block_breaker_level
          ? parseFloat(form.block_breaker_level)
          : null,
        aligned_liquidity: form.aligned_liquidity
          ? parseFloat(form.aligned_liquidity)
          : null,
        rejection_block_zone: form.rejection_block_zone,
        sweep_price: sweepPrice,
        sweep_overlap: sweepOverlap,
        effectiveness_tier: computedTier.key,
        effectiveness_score: effectivenessScore(computedTier),
        notes: form.notes,
        rb_quality_score: qualityTotal,
        rb_sweep_score: qualityScores.sweep,
        rb_wick_body_score: qualityScores.wick_body,
        rb_displacement_score: qualityScores.displacement,
        rb_alignment_score: qualityScores.alignment,
        rb_freshness_score: qualityScores.freshness,
        rb_battlefield_score: qualityScores.battlefield || 0,
        battlefield_size:
          qualityScores.battlefield === 2
            ? "very_narrow"
            : qualityScores.battlefield === 1
            ? "narrow"
            : qualityScores.battlefield === 0
            ? "wide"
            : null,
        ce_price: cePrice,
        use_ce_entry: useCeEntry,
        institutional_cycle: context.institutional_cycle,
        fvg_present: context.fvg_present,
        fvg_direction: context.fvg_direction,
        fvg_low: context.fvg_low ? parseFloat(context.fvg_low) : null,
        fvg_high: context.fvg_high ? parseFloat(context.fvg_high) : null,
        ob_present: context.ob_present,
        ob_type: context.ob_type,
        ob_low: context.ob_low ? parseFloat(context.ob_low) : null,
        ob_high: context.ob_high ? parseFloat(context.ob_high) : null,
        twice_blocked: context.twice_blocked,
        twice_blocked_notes: context.twice_blocked_notes,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Auto-create CE flip tracker entry
    if (cePrice && insertedSetup) {
      await supabase.from("ce_flips").insert({
        user_id: user.id,
        setup_id: insertedSetup.id,
        pair: form.pair,
        ce_price: cePrice,
        original_direction:
          form.d1_bias === "bullish" ? "bullish" : "bearish",
        state: "fresh",
      });
    }

    setLoading(false);
    router.push("/setups");
    router.refresh();
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/setups"
            className="text-blue-400 text-sm hover:underline"
          >
            ← Back to Setups
          </Link>
          <h1 className="text-2xl font-bold mt-2">New Setup</h1>
          <p className="text-gray-400 text-sm">
            Institutional Flow System — Steps 1 to 4 + Context Layers
          </p>
        </div>

        {prefillConfidence && (
          <div className="mb-4 p-3 rounded-lg bg-blue-950/40 border border-blue-800">
            <p className="text-blue-300 text-xs font-semibold">
              🔍 Pre-filled from RB Validator
            </p>
            <p className="text-blue-200/80 text-xs mt-1">
              Confidence: {prefillConfidence}/10 · Zone: {prefillLow}-
              {prefillHigh}
              {prefillCe ? ` · CE: ${prefillCe}` : ""}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1 */}
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-4">
            <h2 className="text-lg font-semibold text-blue-400">
              Step 1 — D1 Direction
            </h2>

            <div>
              <label className="block text-sm mb-2 text-gray-300">Pair</label>
              <select
                value={form.pair}
                onChange={(e) => update("pair", e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
              >
                {PAIRS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-2 text-gray-300">
                  D1 Bias
                </label>
                <select
                  value={form.d1_bias}
                  onChange={(e) => update("d1_bias", e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
                >
                  <option value="bullish">Bullish</option>
                  <option value="bearish">Bearish</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-300">
                  EMA 50 Position
                </label>
                <select
                  value={form.ema50_position}
                  onChange={(e) => update("ema50_position", e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
                >
                  <option value="above">Above</option>
                  <option value="below">Below</option>
                </select>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-4">
            <h2 className="text-lg font-semibold text-blue-400">
              Step 2 — Block Breaker
            </h2>
            <div>
              <label className="block text-sm mb-2 text-gray-300">
                Block Breaker Level (Flip Zone)
              </label>
              <input
                type="number"
                step="any"
                value={form.block_breaker_level}
                onChange={(e) =>
                  update("block_breaker_level", e.target.value)
                }
                placeholder="e.g. 2450.50"
                className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-4">
            <h2 className="text-lg font-semibold text-blue-400">
              Step 3 — Aligned Liquidity
            </h2>
            <div>
              <label className="block text-sm mb-2 text-gray-300">
                Liquidity Level
              </label>
              <input
                type="number"
                step="any"
                value={form.aligned_liquidity}
                onChange={(e) => update("aligned_liquidity", e.target.value)}
                placeholder="e.g. 2448.00"
                className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-4">
            <h2 className="text-lg font-semibold text-blue-400">
              Step 4 — Rejection Block
            </h2>
            <div>
              <label className="block text-sm mb-2 text-gray-300">
                Rejection Block Zone
              </label>
              <input
                type="text"
                value={form.rejection_block_zone}
                onChange={(e) =>
                  update("rejection_block_zone", e.target.value)
                }
                placeholder="e.g. 208700-208900"
                className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
              />
              <Link
                href="/rb-validator"
                target="_blank"
                className="inline-block text-xs text-blue-400 hover:underline mt-2"
              >
                🔍 Validate this Rejection Block first →
              </Link>
            </div>
            <div>
              <label className="block text-sm mb-2 text-gray-300">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
                placeholder="Any additional context..."
                className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Sweep Confluence */}
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-blue-400">
                Sweep Confluence
              </h2>
              <p className="text-gray-500 text-xs mt-1">
                Was the Rejection Block formed inside a liquidity sweep?
              </p>
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-400">
                Swept Price (swing high/low that was swept)
              </label>
              <input
                type="number"
                step="any"
                value={form.sweep_price}
                onChange={(e) => update("sweep_price", e.target.value)}
                placeholder="e.g. 209500"
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
              />
            </div>

            {sweepPrice && parsedZone && (
              <div
                className={`p-3 rounded-lg border ${
                  sweepOverlap
                    ? "bg-green-950/40 border-green-800"
                    : "bg-yellow-950/40 border-yellow-800"
                }`}
              >
                <p
                  className={`text-xs font-semibold ${
                    sweepOverlap ? "text-green-300" : "text-yellow-300"
                  }`}
                >
                  {sweepOverlap
                    ? "✅ Sweep inside RB zone — Confluence confirmed"
                    : "⚠️ Sweep price is outside the RB zone"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {sweepOverlap
                    ? "Liquidity collected. Orders filled. High-probability zone."
                    : "Rejection Block may not be institutional. Verify the zone."}
                </p>
              </div>
            )}

            {!form.sweep_price && (
              <p className="text-xs text-gray-500">
                Enter the swept price to enable confluence detection.
              </p>
            )}
          </div>

          {/* CE */}
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-blue-400">
                Consequent Encroachment (CE)
              </h2>
              <p className="text-gray-500 text-xs mt-1">
                50% midpoint of rejection block — precision entry
              </p>
            </div>

            {parsedZone && cePrice && (
              <div className="p-3 rounded-lg bg-black border border-gray-800">
                <p className="text-xs text-gray-400 mb-1">CE Price</p>
                <p className="text-lg font-bold tabular-nums text-yellow-400">
                  {cePrice.toFixed(2)}
                </p>
              </div>
            )}

            {!parsedZone && (
              <p className="text-xs text-gray-500">
                Enter a rejection block zone to compute CE.
              </p>
            )}

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-black border border-gray-800">
              <input
                type="checkbox"
                checked={useCeEntry}
                onChange={(e) => setUseCeEntry(e.target.checked)}
                className="w-5 h-5 accent-blue-500"
              />
              <span className="text-sm">
                Use CE price as my default entry on checklist
              </span>
            </label>
          </div>

          <ContextLayersCard values={context} onChange={setContext} />

          <QualityScoreCard
            scores={qualityScores}
            onChange={setQualityScores}
          />

          {error && (
            <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {loading ? "Saving setup..." : "Save Setup"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function NewSetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <NewSetupPageContent />
    </Suspense>
  );
}