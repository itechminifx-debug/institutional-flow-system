"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { PAIRS } from "@/lib/setupHelpers";
import {
  INTEGRATED_QUESTIONS,
  computeScore,
  getVerdict,
  PASS_THRESHOLD,
} from "@/lib/integratedChecklist";

function IntegratedContent() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const setupId = searchParams.get("setup");

  const [form, setForm] = useState({
    pair: "Volatility 80",
    notes: "",
  });

  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const score = computeScore(answers);
  const verdict = getVerdict(score);
  const total = INTEGRATED_QUESTIONS.length;

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // If setup_id, load setup data
      if (setupId) {
        const { data } = await supabase
          .from("setups")
          .select("*")
          .eq("id", setupId)
          .single();
        if (data) {
          setForm((f) => ({ ...f, pair: data.pair }));
        }
      }

      // Load recent history
      const { data: hist } = await supabase
        .from("integrated_checks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setHistory(hist || []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupId]);

  function toggle(key) {
    setAnswers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function resetAll() {
    if (!window.confirm("Reset all checkboxes?")) return;
    setAnswers({});
  }

  function checkAll() {
    const all = {};
    INTEGRATED_QUESTIONS.forEach((q) => {
      all[q.key] = true;
    });
    setAnswers(all);
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

    const payload = {
      user_id: user.id,
      setup_id: setupId || null,
      pair: form.pair,
      score,
      passed: verdict.pass,
      notes: form.notes,
    };

    INTEGRATED_QUESTIONS.forEach((q) => {
      payload[q.key] = !!answers[q.key];
    });

    const { data, error: insertError } = await supabase
      .from("integrated_checks")
      .insert(payload)
      .select()
      .single();

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSavedId(data.id);
    setHistory((prev) => [data, ...prev].slice(0, 5));
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <Link
            href={setupId ? `/trade?setup=${setupId}` : "/dashboard"}
            className="text-blue-400 text-sm hover:underline"
          >
            ← Back
          </Link>
          <h1 className="text-2xl font-bold mt-2">Integrated Checklist</h1>
          <p className="text-gray-400 text-sm">
            The 10-question gate — SMC + ICT + CRT
          </p>
        </div>

        {/* Context */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div>
            <label className="block text-xs mb-1 text-gray-400">Pair</label>
            <select
              value={form.pair}
              onChange={(e) =>
                setForm((f) => ({ ...f, pair: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            >
              {PAIRS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Score banner */}
        <div className={`p-4 rounded-lg border-2 ${verdict.color}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-70">Score</span>
            <span className="text-3xl font-bold tabular-nums">
              {score}/{total}
            </span>
          </div>
          <p className="text-2xl font-bold">
            {verdict.emoji} {verdict.label}
          </p>
          <p className="text-xs opacity-80 mt-2">{verdict.description}</p>
          {verdict.pass && (
            <div className="mt-3 pt-3 border-t border-current/30">
              <p className="text-xs font-semibold">
                ✅ PASS — {PASS_THRESHOLD}+ checked. Proceed.
              </p>
            </div>
          )}
          {!verdict.pass && score > 0 && (
            <div className="mt-3 pt-3 border-t border-current/30">
              <p className="text-xs font-semibold">
                ⚠️ FAIL — need {PASS_THRESHOLD - score} more check
                {PASS_THRESHOLD - score === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              verdict.pass ? "bg-green-500" : "bg-yellow-500"
            }`}
            style={{ width: `${(score / total) * 100}%` }}
          />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={checkAll}
            className="py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs"
          >
            ✓ Check All
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs"
          >
            ✗ Reset All
          </button>
        </div>

        {/* Questions */}
        <div className="space-y-2">
          {INTEGRATED_QUESTIONS.map((q) => {
            const isOn = answers[q.key];
            return (
              <button
                key={q.key}
                type="button"
                onClick={() => toggle(q.key)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  isOn
                    ? "bg-green-900/40 border-green-700"
                    : "bg-gray-900 border-gray-800 hover:border-gray-600"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isOn
                        ? "bg-green-500 text-black"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {isOn ? "✓" : q.number}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        isOn ? "text-green-200" : "text-white"
                      }`}
                    >
                      {q.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{q.hint}</p>
                    <p className="text-xs text-blue-400/70 mt-1">
                      → {q.module}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Notes */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <label className="block text-xs mb-1 text-gray-400">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) =>
              setForm((f) => ({ ...f, notes: e.target.value }))
            }
            rows={3}
            placeholder="Any observations..."
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none resize-none text-sm"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        {savedId && (
          <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">
            ✅ Saved to history.
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !!savedId}
          className={`w-full py-4 rounded-lg font-bold transition disabled:opacity-50 ${
            verdict.pass
              ? "bg-green-700 hover:bg-green-600"
              : "bg-gray-800 hover:bg-gray-700"
          }`}
        >
          {saving
            ? "Saving..."
            : savedId
            ? "✓ Saved"
            : verdict.pass
            ? "✅ Save & Proceed"
            : "💾 Save to History"}
        </button>

        {/* Recent history */}
        {history.length > 0 && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h3 className="text-sm font-semibold text-blue-400 mb-3">
              Recent Checks
            </h3>
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-black border border-gray-800"
                >
                  <div>
                    <p className="text-xs font-medium">{h.pair}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(h.created_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${
                        h.passed ? "text-green-400" : "text-yellow-400"
                      }`}
                    >
                      {h.score}/10
                    </p>
                    <p className="text-xs text-gray-500">
                      {h.passed ? "✅ Pass" : "⚠️ Fail"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-900/50">
          <h3 className="text-xs font-semibold text-blue-300 mb-2">
            💡 How to Use
          </h3>
          <ul className="text-xs text-gray-300 space-y-1 ml-4 list-disc">
            <li>Run this checklist before clicking ENTER TRADE</li>
            <li>7+ checked → trade is valid</li>
            <li>Below 7 → wait for a better setup</li>
            <li>Each question maps to an existing module</li>
            <li>Score & answers are saved for review</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

export default function IntegratedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <IntegratedContent />
    </Suspense>
  );
}