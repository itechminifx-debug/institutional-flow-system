"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";

export default function LiquidityWidget() {
  const supabase = createClient();
  const [count, setCount] = useState(0);
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

      const { count } = await supabase
        .from("liquidity_maps")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("swept", false);

      setCount(count || 0);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return null;

  return (
    <Link
      href="/liquidity"
      className="block p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-600 transition"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">Liquidity Map</span>
        <span className="text-xs text-blue-400">Open →</span>
      </div>
      {count > 0 ? (
        <>
          <p className="text-lg font-bold text-blue-300">
            {count} unswept
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Levels waiting to be swept
          </p>
        </>
      ) : (
        <>
          <p className="text-lg font-bold text-gray-400">
            No levels marked
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Mark liquidity before your next setup
          </p>
        </>
      )}
    </Link>
  );
}