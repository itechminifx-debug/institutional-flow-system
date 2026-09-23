"use client";

import { classifyScenario } from "@/lib/rbScenarios";

export default function ScenarioBanner({ setup }) {
  if (!setup) return null;

  const scenario = classifyScenario(setup);

  if (scenario.key === "incomplete") return null;

  return (
    <div className={`p-4 rounded-lg border-2 ${scenario.color} space-y-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{scenario.emoji}</span>
          <h2 className="text-lg font-bold">{scenario.label}</h2>
        </div>
        <span className="text-xs uppercase tracking-wider opacity-70">
          {scenario.conviction} conviction
        </span>
      </div>

      <p className="text-sm opacity-90">{scenario.description}</p>

      <div className="flex items-center gap-2 pt-2 border-t border-current/20">
        <span className="text-xs opacity-70">Action:</span>
        <span className="text-sm font-semibold">{scenario.action}</span>
      </div>
    </div>
  );
}