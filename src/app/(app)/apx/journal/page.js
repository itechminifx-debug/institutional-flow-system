// app/apx/journal/page.jsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { evaluateApx } from "@/lib/apxEngine";
import { formatPrice } from "@/lib/formatNumbers";

export default function ApxJournalPage() {
  const router = useRouter();
  const supabase = createClient();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [prompt, setPrompt] = useState(null); // { id, outcome }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data, error: err } = await supabase
        .from("apx_setups")
        .select("*")
        .eq("user_id", user.id)
        .not("trade_result", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (err) setError(err.message);
      else setRows(data || []);
      setLoading(false);
    })();
  }, [router, supabase]);

  const open = useMemo(() => rows.filter((r) => r.trade_result === "active"), [rows]);
  const closed = useMemo(() => rows.filter((r) => r.trade_result === "won" || r.trade_result === "lost"), [rows]);

  const summary = useMemo(() => {
    const won = closed.filter((r) => r.trade_result === "won").length;
    const lost = closed.filter((r) => r.trade_result === "lost").length;
    const total = won + lost;
    const winRate = total ? Math.round((won / total) * 100) : null;
    const rVals = closed.map((r) => r.r_result).filter((v) => typeof v === "number");
    const totalR = rVals.reduce((a, b) => a + b, 0);
    const avgR = rVals.length ? totalR / rVals.length : null;
    return { won, lost, total, winRate, totalR, avgR };
  }, [closed]);

  const confirmResult = useCallback(async () => {
    if (!prompt) return;
    const { id, outcome } = prompt;
    setBusyId(id);
    const { error: err } = await supabase
      .from("apx_setups")
      .update({ trade_result: outcome, updated_at: new Date().toISOString() })
      .eq("id", id);
    setBusyId(null);
    if (err) { setError(err.message); return; }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, trade_result: outcome } : r)));
    setPrompt(null);
  }, [prompt, supabase]);

  const reopen = useCallback(async (id) => {
    setBusyId(id);
    const { error: err } = await supabase
      .from("apx_setups")
      .update({ trade_result: "active", r_result: null, updated_at: new Date().toISOString() })
      .eq("id", id);
    setBusyId(null);
    if (err) { setError(err.message); return; }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, trade_result: "active", r_result: null } : r)));
  }, [supabase]);

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-amber-400">📓 APX Journal</h1>
            <p className="text-gray-400 text-xs">Track open trades and close them.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/apx" className="text-xs px-3 py-2 rounded-lg bg-gray-800 font-semibold">← Dashboard</Link>
            <Link href="/apx/manual" className="text-xs px-3 py-2 rounded-lg bg-amber-600 text-black font-bold">+ New Setup</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Stat label="Open" value={open.length} tone="blue" />
          <Stat label="Closed" value={summary.total} />
          <Stat label="Won" value={summary.won} tone="green" />
          <Stat label="Lost" value={summary.lost} tone="red" />
          <Stat label="Win rate" value={summary.winRate == null ? "—" : `${summary.winRate}%`} tone="amber" />
          <Stat label="Total R" value={summary.totalR ? summary.totalR.toFixed(2) : "—"} tone={summary.totalR >= 0 ? "green" : "red"} />
        </div>

        {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}

        {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
          <>
            <h2 className="text-sm font-bold text-gray-200 pt-2">Open ({open.length})</h2>
            {open.length === 0 ? <p className="text-xs text-gray-500">No open trades.</p> : (
              <div className="space-y-2">{open.map((r) => <Row key={r.id} row={r} onOpen={() => router.push(`/apx/${r.id}`)} onWin={() => setPrompt({ id: r.id, outcome: "won" })} onLoss={() => setPrompt({ id: r.id, outcome: "lost" })} busy={busyId === r.id} />)}</div>
            )}

            <h2 className="text-sm font-bold text-gray-200 pt-4">Closed ({closed.length})</h2>
            {closed.length === 0 ? <p className="text-xs text-gray-500">No closed trades yet.</p> : (
              <div className="space-y-2">{closed.map((r) => <Row key={r.id} row={r} onOpen={() => router.push(`/apx/${r.id}`)} onReopen={() => reopen(r.id)} busy={busyId === r.id} />)}</div>
            )}
          </>
        )}
      </div>

      {prompt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setPrompt(null)}>
          <div className="w-full max-w-sm p-5 rounded-xl bg-gray-900 border border-gray-800 space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold">Mark {prompt.outcome === "won" ? "won" : "lost"}?</p>
            <p className="text-xs text-gray-400">You can enter the R multiple on the detail page later.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPrompt(null)} className="px-3 py-2 rounded-lg bg-gray-800 text-xs font-semibold">Cancel</button>
              <button onClick={confirmResult} className={`px-3 py-2 rounded-lg text-xs font-bold ${prompt.outcome === "won" ? "bg-green-600 text-black" : "bg-red-600 text-white"}`}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Row({ row, onOpen, onWin, onLoss, onReopen, busy }) {
  const data = useMemo(() => evaluateApx(row), [row]);
  const closed = row.trade_result === "won" || row.trade_result === "lost";
  const tone = row.trade_result === "won" ? "green" : row.trade_result === "lost" ? "red" : "blue";
  const borderCls = tone === "green" ? "border-green-700" : tone === "red" ? "border-red-700" : "border-blue-700";

  return (
    <div className={`p-3 rounded-lg bg-gray-900 border ${borderCls} flex items-center justify-between gap-3 flex-wrap`}>
      <div className="cursor-pointer flex-1 min-w-0" onClick={onOpen}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm">{row.pair || "—"}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-700 text-gray-300">{(row.setup_type || "").replace("_", " ")}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-700 text-gray-300">{row.direction || "—"}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-700 text-gray-300">RR {data.trade?.rr?.toFixed(2) ?? "—"}</span>
          {typeof row.r_result === "number" && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${row.r_result >= 0 ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>{row.r_result > 0 ? "+" : ""}{row.r_result}R</span>
          )}
        </div>
        <div className="text-[11px] text-gray-500 mt-1 flex gap-3 flex-wrap">
          <span>Entry {formatPrice(row.entry_price)}</span>
          <span>SL {formatPrice(row.stop_loss)}</span>
          <span>TP {formatPrice(row.target_price)}</span>
        </div>
      </div>
      <div className="flex gap-1.5">
        {closed ? (
          <button onClick={onReopen} disabled={busy} className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-800 font-semibold disabled:opacity-50">Reopen</button>
        ) : (
          <>
            <button onClick={onWin} disabled={busy} className="text-xs px-2.5 py-1.5 rounded-lg bg-green-900/40 text-green-300 font-semibold border border-green-700 disabled:opacity-50">Won</button>
            <button onClick={onLoss} disabled={busy} className="text-xs px-2.5 py-1.5 rounded-lg bg-red-900/40 text-red-300 font-semibold border border-red-700 disabled:opacity-50">Lost</button>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "gray" }) {
  const c = tone === "green" ? "text-green-300" : tone === "red" ? "text-red-300" : tone === "blue" ? "text-blue-300" : tone === "amber" ? "text-amber-300" : "text-white";
  return (
    <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${c}`}>{value}</p>
    </div>
  );
}