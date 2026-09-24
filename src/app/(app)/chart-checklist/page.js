"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { CHART_PHASES, totalChecklistItems } from "@/lib/chartChecklist";
import { PAIRS } from "@/lib/setupHelpers";

export default function ChartChecklistPage() {
  const supabase = createClient();

  const [pair, setPair] = useState("Volatility 80");
  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existing, setExisting] = useState(null);
  const [error, setError] = useState("");

  // Load today's session if it exists
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];

      const { data } = await supabase
        .from("chart_checklist_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("session_date", today)
        .maybeSingle();

      if (data) {
        setExisting(data);
        setPair(data.pair || "Volatility 80");
        setNotes(data.notes || "");
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleItem(key) {
    setChecked((c) => ({ ...c, [key]: !c[key] }));
  }

  function isPhaseComplete(phase) {
    return phase.items.every((_, idx) => checked[`${phase.key}-${idx}`]);
  }

  const totalItems = totalChecklistItems();
  const completedItems = Object.values(checked).filter(Boolean).length;
  const completedPhases = CHART_PHASES.filter((p) =>
    isPhaseComplete(p)
  ).length;
  const pct = Math.round((completedItems / totalItems) * 100);

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

    const today = new Date().toISOString().split("T")[0];

    const payload = {
      user_id: user.id,
      session_date: today,
      pair,
      notes,
      phase1_complete: isPhaseComplete(CHART_PHASES[0]),
      phase2_complete: isPhaseComplete(CHART_PHASES[1]),
      phase3_complete: isPhaseComplete(CHART_PHASES[2]),
      phase4_complete: isPhaseComplete(CHART_PHASES[3]),
      phase5_complete: isPhaseComplete(CHART_PHASES[4]),
      phase6_complete: isPhaseComplete(CHART_PHASES[5]),
      phase7_complete: isPhaseComplete(CHART_PHASES[6]),
      phase8_complete: isPhaseComplete(CHART_PHASES[7]),
      phase9_complete: isPhaseComplete(CHART_PHASES[8]),
      phase10_complete: isPhaseComplete(CHART_PHASES[9]),
      completed_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("chart_checklist_logs")
      .upsert(payload, { onConflict: "user_id,session_date" });

    setSaving(false);

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    setSaved(true);
    setExisting(payload);
    setTimeout(() => setSaved(false), 2000);
  }

  function resetAll() {
    if (!window.confirm("Reset all checkboxes?")) return;
    setChecked({});
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Chart Checklist</h1>
            <p className="text-gray-400 text-sm">
              Walk the chart before every session
            </p>
          </div>
          <Link
            href="/mindset"
            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-600 text-xs"
          >
            Mindset →
          </Link>
        </div>

        {/* Pair + progress */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div>
            <label className="block text-xs mb-1 text-gray-400">
              Pair
            </label>
            <select
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
            >
              {PAIRS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {completedItems}/{totalItems} items · {completedPhases}/
              {CHART_PHASES.length} phases
            </span>
            <span
              className={`text-sm font-bold ${
                pct === 100
                  ? "text-green-400"
                  : pct >= 50
                  ? "text-yellow-400"
                  : "text-gray-400"
              }`}
            >
              {pct}%
            </span>
          </div>

          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                pct === 100
                  ? "bg-green-500"
                  : pct >= 50
                  ? "bg-yellow-500"
                  : "bg-blue-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Phases */}
        <div className="space-y-3">
          {CHART_PHASES.map((phase) => {
            const phaseComplete = isPhaseComplete(phase);
            const completedCount = phase.items.filter(
              (_, idx) => checked[`${phase.key}-${idx}`]
            ).length;

            return (
              <div
                key={phase.key}
                className={`p-4 rounded-lg border transition ${
                  phaseComplete
                    ? "bg-green-950/30 border-green-800"
                    : "bg-gray-900 border-gray-800"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        phaseComplete
                          ? "bg-green-500 text-black"
                          : `${phase.color}`
                      }`}
                    >
                      {phaseComplete ? "✓" : phase.number}
                    </span>
                    <h2 className="font-semibold text-sm">{phase.title}</h2>
                  </div>
                  <span className="text-xs text-gray-500">
                    {completedCount}/{phase.items.length}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {phase.items.map((item, idx) => {
                    const itemKey = `${phase.key}-${idx}`;
                    const isOn = checked[itemKey];
                    return (
                      <button
                        key={itemKey}
                        type="button"
                        onClick={() => toggleItem(itemKey)}
                        className={`w-full text-left flex items-start gap-2 p-2 rounded-lg transition ${
                          isOn
                            ? "bg-green-900/30 border border-green-700"
                            : "bg-black border border-gray-800 hover:border-gray-600"
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center mt-0.5 text-xs ${
                            isOn
                              ? "bg-green-500 border-green-500 text-black"
                              : "border-gray-600"
                          }`}
                        >
                          {isOn && "✓"}
                        </span>
                        <span
                          className={`text-xs ${
                            isOn ? "text-green-200" : "text-gray-300"
                          }`}
                        >
                          {item}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Notes */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <label className="block text-xs mb-2 text-gray-400">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any observations from this session..."
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
            ✅ Saved. Review complete for today.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : existing
              ? "Update Checklist"
              : "Save Checklist"}
          </button>

          <button
            type="button"
            onClick={resetAll}
            className="py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-medium"
          >
            Reset All
          </button>
        </div>

        {pct === 100 && (
          <div className="p-4 rounded-lg bg-green-950/40 border border-green-700 text-center">
            <p className="text-green-300 font-bold text-sm">
              ✅ Chart fully read — you may proceed to the Setup Planner
            </p>
            <Link
              href="/setups/new"
              className="inline-block mt-3 px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-sm font-medium"
            >
              Create a Setup →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}