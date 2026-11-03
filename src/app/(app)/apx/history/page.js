// app/apx/history/page.jsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { evaluateApx, APX_SETUP_TYPES } from "@/lib/apxEngine";
import ApxCard from "@/components/ApxCard";

export default function ApxHistoryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [setupType, setSetupType] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data, error: err } = await supabase
        .from("apx_setups")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (err) setError(err.message);
      else setRows(data || []);
      setLoading(false);
    })();
  }, [router, supabase]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (setupType !== "all" && r.setup_type !== setupType) return false;
      if (status !== "all" && r.status !== status) return false;
      if (needle) {
        const hay = [r.pair, r.timeframe_stack, r.notes, r.bias, r.direction].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, q, setupType, status]);

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-amber-400">🗂 APX History</h1>
            <p className="text-gray-400 text-xs">Full log of every setup.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/apx" className="text-xs px-3 py-2 rounded-lg bg-gray-800 font-semibold">← Dashboard</Link>
            <Link href="/apx/journal" className="text-xs px-3 py-2 rounded-lg bg-gray-800 font-semibold">Journal</Link>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 grid grid-cols-2 md:grid-cols-4 gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pair / notes…" className="px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm" />
          <select value={setupType} onChange={(e) => setSetupType(e.target.value)} className="px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
            <option value="all">All setups</option>
            {APX_SETUP_TYPES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm">
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="complete">Complete</option>
          </select>
          <p className="text-xs text-gray-500 self-center">Showing {filtered.length} of {rows.length}</p>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}

        {loading ? <p className="text-gray-400 text-sm">Loading…</p> :
          filtered.length === 0 ? <p className="text-gray-500 text-sm">No setups match.</p> : (
            <div className="space-y-3">
              {filtered.map((row) => {
                const data = evaluateApx(row);
                return (
                  <div key={row.id} className="cursor-pointer" onClick={() => router.push(`/apx/${row.id}`)}>
                    <ApxCard data={data} />
                  </div>
                );
              })}
            </div>
          )
        }
      </div>
    </main>
  );
}