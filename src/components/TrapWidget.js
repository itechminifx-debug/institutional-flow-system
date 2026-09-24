"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { isSessionOpen } from "@/lib/trapHelpers";

export default function TrapWidget() {
  const supabase = createClient();
  const [watching, setWatching] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sessionAlert, setSessionAlert] = useState({ active: false });

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
        .from("retail_traps")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "watching");

      setWatching(count || 0);
      setLoading(false);
    }
    load();
    const sessionCheck = setInterval(() => {
      setSessionAlert(isSessionOpen());
    }, 60000);
    setSessionAlert(isSessionOpen());
    return () => clearInterval(sessionCheck);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return null;

  return (
    <Link
      href="/traps"
      className={`block p-4 rounded-lg border transition ${
        sessionAlert.active
          ? "bg-yellow-950/40 border-yellow-700"
          : "bg-gray-900 border-gray-800 hover:border-purple-600"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">Retail Traps</span>
        <span className="text-xs text-blue-400">Open →</span>
      </div>
      {sessionAlert.active ? (
        <>
          <p className="text-lg font-bold text-yellow-300">
            🌅 {sessionAlert.session} open
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Judas Swing risk — wait 30 min
          </p>
        </>
      ) : watching > 0 ? (
        <>
          <p className="text-lg font-bold text-purple-300">
            {watching} watching
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Trap{ watching > 1 ? "s" : ""} forming
          </p>
        </>
      ) : (
        <>
          <p className="text-lg font-bold text-gray-400">No traps</p>
          <p className="text-xs text-gray-500 mt-1">
            Watch for reversals
          </p>
        </>
      )}
    </Link>
  );
}