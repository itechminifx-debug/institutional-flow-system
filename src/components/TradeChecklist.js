"use client";

import { useState } from "react";
import { CHECKLIST_STEPS } from "@/lib/checklistSteps";

export default function TradeChecklist({ onComplete }) {
  const [checked, setChecked] = useState([]);

  function toggleStep(stepNumber) {
    // Only allow checking the next uncheck step in order
    const nextStep = CHECKLIST_STEPS.find(
      (s) => !checked.includes(s.number)
    );

    if (!nextStep) return;

    if (stepNumber !== nextStep.number) {
      // Not the next step — ignore
      return;
    }

    setChecked((prev) => [...prev, stepNumber]);

    // If this was the last step, notify parent
    if (checked.length + 1 === CHECKLIST_STEPS.length) {
      onComplete?.(true);
    }
  }

  function uncheckLast() {
    if (checked.length === 0) return;
    const newChecked = checked.slice(0, -1);
    setChecked(newChecked);
    if (newChecked.length < CHECKLIST_STEPS.length) {
      onComplete?.(false);
    }
  }

  const allDone = checked.length === CHECKLIST_STEPS.length;
  const progressPct = (checked.length / CHECKLIST_STEPS.length) * 100;

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-blue-400">
          Steps 5 - 11 · Discipline Checklist
        </h2>
        <span className="text-xs text-gray-400">
          {checked.length}/{CHECKLIST_STEPS.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-800 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="space-y-2">
        {CHECKLIST_STEPS.map((step) => {
          const isChecked = checked.includes(step.number);
          const nextStep = CHECKLIST_STEPS.find(
            (s) => !checked.includes(s.number)
          );
          const isNext = nextStep?.number === step.number;
          const isLocked = !isChecked && !isNext;

          return (
            <button
              key={step.number}
              type="button"
              onClick={() => !isChecked && !isLocked && toggleStep(step.number)}
              disabled={isLocked}
              className={`w-full text-left p-3 rounded-lg border transition ${
                isChecked
                  ? "bg-green-900/40 border-green-700"
                  : isNext
                  ? "bg-gray-800 border-blue-700 hover:bg-gray-750 cursor-pointer"
                  : "bg-gray-900/50 border-gray-800 opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                    isChecked
                      ? "bg-green-500 text-black"
                      : isNext
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {isChecked ? "✓" : step.number}
                </div>
                <div className="flex-1">
                  <p
                    className={`font-medium text-sm ${
                      isChecked ? "text-green-300" : "text-white"
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {checked.length > 0 && !allDone && (
        <button
          type="button"
          onClick={uncheckLast}
          className="mt-3 w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300"
        >
          Undo last step
        </button>
      )}

      {allDone && (
        <div className="mt-4 p-3 rounded-lg bg-green-900/40 border border-green-700 text-center">
          <p className="text-green-200 text-sm font-bold">
            ✅ All steps confirmed — Entry unlocked below
          </p>
        </div>
      )}
    </div>
  );
}