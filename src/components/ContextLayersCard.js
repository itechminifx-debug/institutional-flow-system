"use client";

import {
  INSTITUTIONAL_CYCLES,
  cycleInfo,
} from "@/lib/contextLayers";

export default function ContextLayersCard({ values, onChange }) {
  function update(field, value) {
    onChange({ ...values, [field]: value });
  }

  const selectedCycle = cycleInfo(values.institutional_cycle);

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-blue-400">
          Context Layers
        </h2>
        <p className="text-gray-500 text-xs mt-1">
          The context behind the setup — cycle, FVG, OB, twice-blocked level
        </p>
      </div>

      {/* Institutional Cycle */}
      <div>
        <label className="block text-sm mb-2 text-gray-300 font-medium">
          Institutional Cycle
        </label>
        <div className="grid grid-cols-3 gap-2">
          {INSTITUTIONAL_CYCLES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => update("institutional_cycle", c.key)}
              className={`py-3 rounded-lg text-xs transition ${
                values.institutional_cycle === c.key
                  ? `${c.color} font-bold border-2 border-current`
                  : "bg-black border border-gray-700 text-gray-400"
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        {selectedCycle && (
          <p className="text-xs text-gray-500 mt-2 italic">
            {selectedCycle.description}
          </p>
        )}
      </div>

      {/* FVG */}
      <div className="space-y-2 pt-3 border-t border-gray-800">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={values.fvg_present}
            onChange={(e) => update("fvg_present", e.target.checked)}
            className="w-5 h-5 accent-blue-500"
          />
          <span className="text-sm font-medium text-gray-200">
            FVG present
          </span>
        </label>

        {values.fvg_present && (
          <div className="space-y-2 ml-8">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => update("fvg_direction", "bullish")}
                className={`py-2 rounded-lg text-xs transition ${
                  values.fvg_direction === "bullish"
                    ? "bg-green-900/40 border border-green-600 text-green-200 font-bold"
                    : "bg-black border border-gray-700 text-gray-400"
                }`}
              >
                Bullish
              </button>
              <button
                type="button"
                onClick={() => update("fvg_direction", "bearish")}
                className={`py-2 rounded-lg text-xs transition ${
                  values.fvg_direction === "bearish"
                    ? "bg-red-900/40 border border-red-600 text-red-200 font-bold"
                    : "bg-black border border-gray-700 text-gray-400"
                }`}
              >
                Bearish
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs mb-1 text-gray-500">
                  FVG Low
                </label>
                <input
                  type="number"
                  step="any"
                  value={values.fvg_low}
                  onChange={(e) => update("fvg_low", e.target.value)}
                  placeholder="optional"
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-500">
                  FVG High
                </label>
                <input
                  type="number"
                  step="any"
                  value={values.fvg_high}
                  onChange={(e) => update("fvg_high", e.target.value)}
                  placeholder="optional"
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Block */}
      <div className="space-y-2 pt-3 border-t border-gray-800">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={values.ob_present}
            onChange={(e) => update("ob_present", e.target.checked)}
            className="w-5 h-5 accent-blue-500"
          />
          <span className="text-sm font-medium text-gray-200">
            Order Block present{" "}
            <span className="text-xs text-gray-500">
              (context — not the trigger)
            </span>
          </span>
        </label>

        {values.ob_present && (
          <div className="space-y-2 ml-8">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => update("ob_type", "bullish")}
                className={`py-2 rounded-lg text-xs transition ${
                  values.ob_type === "bullish"
                    ? "bg-green-900/40 border border-green-600 text-green-200 font-bold"
                    : "bg-black border border-gray-700 text-gray-400"
                }`}
              >
                Bullish OB
              </button>
              <button
                type="button"
                onClick={() => update("ob_type", "bearish")}
                className={`py-2 rounded-lg text-xs transition ${
                  values.ob_type === "bearish"
                    ? "bg-red-900/40 border border-red-600 text-red-200 font-bold"
                    : "bg-black border border-gray-700 text-gray-400"
                }`}
              >
                Bearish OB
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs mb-1 text-gray-500">
                  OB Low
                </label>
                <input
                  type="number"
                  step="any"
                  value={values.ob_low}
                  onChange={(e) => update("ob_low", e.target.value)}
                  placeholder="optional"
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-500">
                  OB High
                </label>
                <input
                  type="number"
                  step="any"
                  value={values.ob_high}
                  onChange={(e) => update("ob_high", e.target.value)}
                  placeholder="optional"
                  className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Twice-Blocked Level */}
      <div className="space-y-2 pt-3 border-t border-gray-800">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={values.twice_blocked}
            onChange={(e) => update("twice_blocked", e.target.checked)}
            className="w-5 h-5 accent-yellow-500"
          />
          <span className="text-sm font-medium text-gray-200">
            Twice-Blocked Level
          </span>
        </label>

        <p className="text-xs text-gray-500 ml-8">
          Level broken in both directions — battle-hardened. Trade the Flip
          Zone after the second break.
        </p>

        {values.twice_blocked && (
          <div className="ml-8">
            <label className="block text-xs mb-1 text-gray-500">
              What makes it twice-blocked?
            </label>
            <textarea
              value={values.twice_blocked_notes}
              onChange={(e) =>
                update("twice_blocked_notes", e.target.value)
              }
              rows={2}
              placeholder="e.g. Swept highs on D1, then swept lows on H4"
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none resize-none text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}