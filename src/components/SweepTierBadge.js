"use client";

import {
  computeTierFromSetup,
  EFFECTIVENESS_TIERS,
} from "@/lib/sweepConfluence";

export default function SweepTierBadge({ setup, size = "sm" }) {
  if (!setup) return null;

  const tier = computeTierFromSetup(setup);

  if (tier.key === "none" || tier.key === "moderate") {
    // Only show badge for high/very_high/extreme
    if (tier.key === "moderate" && size === "sm") return null;
  }

  const sizeClasses =
    size === "lg"
      ? "text-sm px-3 py-1"
      : "text-xs px-2 py-0.5";

  return (
    <span
      className={`rounded-full ${sizeClasses} ${tier.badge} font-medium whitespace-nowrap`}
      title={tier.description}
    >
      {tier.emoji} {tier.label}
    </span>
  );
}