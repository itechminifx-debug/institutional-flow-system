"use client";

import { useState } from "react";
import {
  QUALITY_FIELDS,
  qualityLabel,
} from "@/lib/rejectionBlockScorer";

export default function QualityScoreCard({ scores, onChange }) {
  const [expanded, setExpanded] = useState(false);

  const total = QUALITY_FIELDS.reduce(
    (sum, f) => sum + (parseInt(scores[f.key]) || 0),
    0
  );
  const label = qualityLabel(total);

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-blue-400">
            Rejection Block Quality
          </h2>
          <p className="text-gray-500 text-xs mt-1">
            Score 8+ to trade (IFS filter rule)
          </p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold tabular-nums ${label.color}`}>
            {total}/10
          </p>
          <p className={`text-xs ${label.color}`}>
            {label.emoji} {label.label}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            total >= 8
              ? "bg-green-500"
              : total >= 6
              ? "bg-yellow-500"
              : "bg-red-500"
          }`}
          style={{ width: `${(total / 10) * 100}%` }}
        />
      </div>

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs"
      >
        {expanded ? "Hide details ▲" : "Score each factor ▼"}
      </button>

      {expanded && (
        <div className="space-y-3 pt-2">
          {QUALITY_FIELDS.map((field) => (
            <div key={field.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-200">
                  {field.label}
                </label>
                <span className="text-xs text-gray-500">
                  {scores[field.key] || 0}/{field.max}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{field.why}</p>
              <div className="space-y-1">
                {field.options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      onChange({ ...scores, [field.key]: opt.value })
                    }
                    className={`w-full text-left p-2 rounded-lg text-xs transition ${
                      parseInt(scores[field.key]) === opt.value
                        ? "bg-blue-900/40 border border-blue-600 text-blue-200"
                        : "bg-black border border-gray-800 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 0 && total < 8 && (
        <div className="p-3 rounded-lg bg-yellow-900/30 border border-yellow-800 text-yellow-200 text-xs">
          ⚠️ Score below 8. IFS rule: wait for a higher-quality rejection
          block, or skip this setup.
        </div>
      )}

      {total >= 8 && (
        <div className="p-3 rounded-lg bg-green-900/30 border border-green-800 text-green-200 text-xs">
          ✅ Score passes the IFS filter — proceed to checklist.
        </div>
      )}
    </div>
  );
}