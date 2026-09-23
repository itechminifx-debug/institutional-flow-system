"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { phaseInfo } from "@/lib/planEngine";

export default function PlanWidget() {
  const supabase = createClient();
  const [plan, setPlan] = useState(null);
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
        .from("trading_plans")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      setPlan(data);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return null;

  if (!plan) {
    return (
      <Link
        href="/plan"
        className="block p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-500 transition"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Trading Plan</span>
          <span className="text-xs text-blue-400">Set up →</span>
        </div>
        <p className="text-lg font-bold text-gray-300">Not configured</p>
        <p className="text-xs text-gray-500 mt-1">
          Create your scaling plan
        </p>
      </Link>
    );
  }

  const phase = phaseInfo(plan.phase);

  return (
    <Link
      href="/plan"
      className={`block p-4 rounded-lg border transition hover:opacity-90 ${phase.color}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm opacity-70">Trading Plan</span>
        <span className="text-xs text-blue-400">Open →</span>
      </div>
      <p className="text-2xl mb-1">{phase.emoji}</p>
      <p className="text-lg font-bold">{phase.label}</p>
      <p className="text-xs opacity-70 mt-1">{phase.focus}</p>
    </Link>
  );
}