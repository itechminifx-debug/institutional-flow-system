"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { PAIRS } from "@/lib/setupHelpers";
import { parseZone } from "@/lib/zoneHelpers";
import { computeCEPrice } from "@/lib/riskEngine";
import QualityScoreCard from "@/components/QualityScoreCard";
import { computeQualityScore } from "@/lib/rejectionBlockScorer";

export default function NewSetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    pair: "Volatility 80",
    d1_bias: "bullish",
    ema50_position: "above",
    block_breaker_level: "",
    aligned_liquidity: "",
    rejection_block_zone: "",
    notes: "",
  });

  const [qualityScores, setQualityScores] = useState({
    sweep: 0,
    wick_body: 0,
    displacement: 0,
    alignment: 0,
    freshness: 0,
  });

  const [useCeEntry, setUseCeEntry] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const parsedZone = form.rejection_block_zone
    ? parseZone(form.rejection_block_zone)
    : null;
  const cePrice = parsedZone ? computeCEPrice(parsedZone) : null;

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

    const { error: insertError } = await supabase.from("setups").insert({
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
      notes: form.notes,
      rb_quality_score: qualityTotal,
      rb_sweep_score: qualityScores.sweep,
      rb_wick_body_score: qualityScores.wick_body,
      rb_displacement_score: qualityScores.displacement,
      rb_alignment_score: qualityScores.alignment,
      rb_freshness_score: qualityScores.freshness,
      ce_price: cePrice,
      use_ce_entry: useCeEntry,
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

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
            Institutional Flow System — Steps 1 to 4
          </p>
        </div>

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

          {/* Consequent Encroachment */}
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
                <p className="text-xs text-gray-500 mt-1">
                  Strong trends often tap CE and reverse without touching the
                  wick extreme.
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

          {/* Quality Score */}
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