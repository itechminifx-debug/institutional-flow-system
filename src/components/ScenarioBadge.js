"use client";

import { classifyScenario } from "@/lib/rbScenarios";

export default function ScenarioBadge({ setup, size = "sm" }) {
  if (!setup) return null;

  const scenario = classifyScenario(setup);

  if (scenario.key === "incomplete") return null;

  const sizeClasses =
    size === "lg"
      ? "text-sm px-3 py-1"
      : "text-xs px-2 py-0.5";

  return (
    <span
      className={`rounded-full ${sizeClasses} ${scenario.badge} font-medium whitespace-nowrap`}
    >
      {scenario.emoji} {scenario.label}
    </span>
  );
}