"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { TREND_FACTORS, computeVerdict, verdictStyle } from "@/lib/trendFactors";
import { PAIRS } from "@/lib/setupHelpers";

export default function TrendPage() {
  const router = useRouter();
  const supabase = createClient();

  const [pair, setPair] = useState("Volatility 80");
  const [timeframe, setTimeframe] = useState("D1");
  const [notes, setNotes] = useState("");
  const [answers, setAnswers] = useState({}); // { structure: 'bullish', ... }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setAnswer(key, value) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  const bullishCount = Object.values(answers).filter(
    (v) => v === "bullish"
  ).length;
  const bearishCount = Object.values(answers).filter(
    (v) => v === "bearish"
  ).length;
  const answered = bullishCount + bearishCount;
  const verdict = computeVerdict(bullishCount, bearishCount);
  const style = verdictStyle(verdict.key);

  async function handleSave() {
    if (answered < TREND_FACTORS.length) {
      setError("Please answer all 10 factors first.");
      return;
    }

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

    // Build payload with only answered factors
    const payload = {
      user_id: user.id,
      pair,
      timeframe,
      notes,
      bullish_count: bullishCount,
      bearish_count: bearishCount,
      verdict: verdict.label,
    };

    TREND_FACTORS.forEach((f) => {
      payload[f.key] = answers[f.key] || null;
    });

    const { error: insertError } = await supabase
      .from("trend_snapshots")
      .insert(payload);

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  function resetAll() {
    setAnswers({});
    setNotes("");
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="text-blue-400 text-sm hover:underline">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold mt-2">Trend Analyzer</h1>
          <p className="text-gray-400 text-sm">
            Confirm all 10 factors to determine the trend
          </p>
        </div>

        {/* Pair + Timeframe */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-2 text-gray-300">Pair</label>
              <select
                value={pair}
                onChange={(e) => setPair(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
              >
                {PAIRS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2 text-gray-300">
                Timeframe
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
              >
                <option value="D1">D1</option>
                <option value="H4">H4</option>
                <option value="H1">H1</option>
                <option value="30M">30M</option>
                <option value="15M">15M</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live verdict */}
        <div className={`p-4 rounded-lg border mb-4 ${style.bg} ${style.border}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">
              {answered}/10 factors answered
            </span>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-green-400">🟢 {bullishCount}</span>
              <span className="text-red-400">🔴 {bearishCount}</span>
            </div>
          </div>
          <div className="text-center py-2">
            <p className={`text-2xl font-bold ${style.text}`}>
              {verdict.emoji} {verdict.label}
            </p>
          </div>
        </div>

        {/* 10 Factor Cards */}
        <div className="space-y-3 mb-6">
          {TREND_FACTORS.map((factor) => {
            const selected = answers[factor.key];
            const isBullish = selected === "bullish";
            const isBearish = selected === "bearish";

            return (
              <div
                key={factor.key}
                className="p-4 rounded-lg bg-gray-900 border border-gray-800"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold">
                    {factor.number}
                  </span>
                  <h3 className="font-semibold">{factor.name}</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAnswer(factor.key, "bullish")}
                    className={`p-3 rounded-lg border text-sm transition ${
                      isBullish
                        ? "bg-green-900/40 border-green-500 text-green-200 font-bold"
                        : "bg-black border-gray-700 text-gray-400 hover:border-green-700"
                    }`}
                  >
                    🟢 {factor.bullish}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAnswer(factor.key, "bearish")}
                    className={`p-3 rounded-lg border text-sm transition ${
                      isBearish
                        ? "bg-red-900/40 border-red-500 text-red-200 font-bold"
                        : "bg-black border-gray-700 text-gray-400 hover:border-red-700"
                    }`}
                  >
                    🔴 {factor.bearish}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Notes */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 mb-4">
          <label className="block text-sm mb-2 text-gray-300">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional — any observations..."
            className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none resize-none"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || answered < TREND_FACTORS.length}
            className="w-full py-4 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save Trend Analysis"}
          </button>

          {answered > 0 && (
            <button
              type="button"
              onClick={resetAll}
              className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
            >
              Reset All
            </button>
          )}
        </div>
      </div>
    </main>
  );
}