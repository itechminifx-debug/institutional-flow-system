"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { verdictColor } from "@/lib/confluenceEngine";

export default function ConfluenceWidget() {
  const supabase = createClient();
  const [latest, setLatest] = useState(null);
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
        .from("confluence_analyses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setLatest(data);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const colors = latest ? verdictColor(latest.verdict) : "";

  return (
    <Link
      href="/confluence"
      className={`block p-4 rounded-lg border transition ${
        latest ? colors : "bg-gray-900 border-gray-800"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">Confluence Analyzer</span>
        <span className="text-xs text-blue-400">New →</span>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : latest ? (
        <>
          <p className="text-xs text-gray-500 mb-1">
            {latest.pair} · {latest.bias}
          </p>
          <p className="text-lg font-bold">
            {latest.verdict} · {latest.confluence_score}/100
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-400">No analysis yet.</p>
          <p className="text-xs text-gray-500 mt-1">
            Run your first confluence check →
          </p>
        </>
      )}
    </Link>
  );
}