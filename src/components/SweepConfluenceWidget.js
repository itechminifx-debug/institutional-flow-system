"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { computeTierFromSetup } from "@/lib/sweepConfluence";

export default function SweepConfluenceWidget() {
  const supabase = createClient();
  const [bestSetup, setBestSetup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("setups")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      const safe = data || [];

      // Find the highest tier
      const tierRank = { extreme: 4, very_high: 3, high: 2, moderate: 1, none: 0 };
      let best = null;
      let bestRank = -1;

      safe.forEach((s) => {
        const tier = computeTierFromSetup(s);
        const rank = tierRank[tier.key] || 0;
        if (rank > bestRank) {
          bestRank = rank;
          best = { setup: s, tier };
        }
      });

      setBestSetup(best);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return null;

  if (!bestSetup || bestSetup.tier.key === "none") {
    return (
      <Link
        href="/setups"
        className="block p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-600 transition"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Sweep Confluence</span>
          <span className="text-xs text-blue-400">Open →</span>
        </div>
        <p className="text-lg font-bold text-gray-400">No tiered setups</p>
        <p className="text-xs text-gray-500 mt-1">
          Create a setup with a sweep
        </p>
      </Link>
    );
  }

  return (
    <Link
      href={`/setups/${bestSetup.setup.id}`}
      className={`block p-4 rounded-lg border transition ${bestSetup.tier.color}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm opacity-70">Best Setup Tier</span>
        <span className="text-xs text-blue-400">Open →</span>
      </div>
      <p className="text-2xl mb-1">{bestSetup.tier.emoji}</p>
      <p className="text-lg font-bold">{bestSetup.tier.label}</p>
      <p className="text-xs opacity-70 mt-1 truncate">
        {bestSetup.setup.pair}
      </p>
    </Link>
  );
}