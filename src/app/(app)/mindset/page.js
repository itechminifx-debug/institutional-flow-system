"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { MINDSET_SECTIONS, totalItems } from "@/lib/mindsetContent";

export default function MindsetPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checked, setChecked] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showWarning, setShowWarning] = useState(false);

  function toggle(key) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const total = totalItems(MINDSET_SECTIONS);
  const completed = Object.values(checked).filter(Boolean).length;

  // Check if emotional section is fully covered
  const emotionalSection = MINDSET_SECTIONS.find((s) => s.key === "emotional");
  const emotionalPass = emotionalSection.items.every(
    (item) => checked[item.key]
  );

  async function handleComplete() {
    setError("");

    // Soft warning if emotional section incomplete
    if (!emotionalPass && !showWarning) {
      setShowWarning(true);
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }

    const payload = {
      user_id: user.id,
      check_date: new Date().toISOString().split("T")[0],
      emotional_pass: emotionalPass,
    };

    // Add all checkbox values
    MINDSET_SECTIONS.forEach((section) => {
      section.items.forEach((item) => {
        payload[item.key] = !!checked[item.key];
      });
    });

    const { error: upsertError } = await supabase
      .from("mindset_checks")
      .upsert(payload, { onConflict: "user_id,check_date" });

    setLoading(false);

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Pre-Trade Mindset</h1>
          <p className="text-gray-400 text-sm">
            Prepare the mind, heart, and spirit before every session
          </p>
        </div>

        {/* Progress */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">
              {completed}/{total} completed
            </span>
            <span className="text-sm font-bold text-blue-400">
              {Math.round((completed / total) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                completed === total
                  ? "bg-green-500"
                  : completed > total / 2
                  ? "bg-blue-500"
                  : "bg-yellow-500"
              }`}
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4 mb-6">
          {MINDSET_SECTIONS.map((section) => {
            const sectionChecked = section.items.every(
              (item) => checked[item.key]
            );

            return (
              <div
                key={section.key}
                className={`p-4 rounded-lg border transition ${
                  section.isCritical && sectionChecked
                    ? "bg-green-950/40 border-green-800"
                    : section.isCritical && !sectionChecked
                    ? "bg-red-950/30 border-red-900/50"
                    : "bg-gray-900 border-gray-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold text-blue-400">
                    {section.number} · {section.title}
                  </h2>
                  {section.isCritical && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-300">
                      Critical
                    </span>
                  )}
                </div>

                {section.verse && (
                  <p className="text-xs text-gray-500 italic mb-3">
                    "{section.verse}"
                  </p>
                )}

                <div className="space-y-2">
                  {section.items.map((item) => {
                    const isOn = checked[item.key];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => toggle(item.key)}
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
                              <span className="text-black text-xs font-bold">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p
                              className={`text-sm font-medium ${
                                isOn ? "text-green-200" : "text-white"
                              }`}
                            >
                              {item.label}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {item.why}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Emotional warning */}
        {!emotionalPass && showWarning && (
          <div className="p-4 rounded-lg bg-red-950/60 border border-red-700 mb-4 space-y-3">
            <p className="text-red-200 font-semibold text-sm">
              ⚠️ Your emotional state is not clear.
            </p>
            <p className="text-red-300 text-xs">
              Your blueprint says: if you're anxious, rushed, greedy, fearful, or
              revenge-driven — do NOT trade today. Your capital will still be
              there tomorrow.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleComplete}
                disabled={loading}
                className="py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs"
              >
                I understand — sit out today anyway
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWarning(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="py-2 rounded-lg bg-red-700 hover:bg-red-600 text-xs"
              >
                Go back and fix it
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm mb-4">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleComplete}
          disabled={loading || completed < total}
          className={`w-full py-4 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${
            emotionalPass
              ? "bg-green-700 hover:bg-green-600"
              : "bg-yellow-700 hover:bg-yellow-600"
          }`}
        >
          {loading
            ? "Saving..."
            : completed < total
            ? `Complete all ${total} items (${completed}/${total})`
            : emotionalPass
            ? "✅ Complete Ritual — Begin Trading"
            : "⚠️ Proceed with Warning"}
        </button>

        {emotionalPass && completed === total && (
          <p className="text-xs text-center text-green-400 mt-3">
            Mind and heart prepared. Go trade with discipline.
          </p>
        )}
      </div>
    </main>
  );
}