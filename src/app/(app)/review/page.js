"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import {
  getCurrentWeek,
  formatWeekLabel,
  toDateString,
} from "@/lib/weekHelpers";

export default function ReviewPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [weekData, setWeekData] = useState(null);
  const [savedReview, setSavedReview] = useState(null);
  const [didWell, setDidWell] = useState("");
  const [willChange, setWillChange] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentWeek = getCurrentWeek();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const startISO = currentWeek.start.toISOString();
      const endISO = currentWeek.end.toISOString();

      const [tradesRes, reviewRes] = await Promise.all([
        supabase
          .from("trades")
          .select("*")
          .gte("opened_at", startISO)
          .lte("opened_at", endISO),
        supabase
          .from("weekly_reviews")
          .select("*")
          .eq("user_id", user.id)
          .eq("week_start", toDateString(currentWeek.start))
          .maybeSingle(),
      ]);

      const weekTrades = tradesRes.data || [];
      const closed = weekTrades.filter((t) => t.status !== "open");

      const wins = closed.filter((t) => t.status === "won").length;
      const losses = closed.filter((t) => t.status === "lost").length;
      const breakeven = closed.filter((t) => t.status === "be").length;

      const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;

      const totalPips = closed.reduce(
        (sum, t) => sum + (parseFloat(t.result_pips) || 0),
        0
      );
      const totalPercent = closed.reduce(
        (sum, t) => sum + (parseFloat(t.result_percent) || 0),
        0
      );

      const scored = closed.filter((t) => (t.rb_quality_score || 0) > 0);
      const avgQuality =
        scored.length > 0
          ? scored.reduce((sum, t) => sum + (t.rb_quality_score || 0), 0) /
            scored.length
          : 0;

      const partialCount = closed.filter((t) => t.partial_taken).length;
      const beCount = closed.filter((t) => t.sl_moved_to_be).length;
      const adherence =
        closed.length > 0
          ? ((partialCount + beCount) / (closed.length * 2)) * 100
          : 0;

      setWeekData({
        total: weekTrades.length,
        closed: closed.length,
        wins,
        losses,
        breakeven,
        winRate,
        totalPips,
        totalPercent,
        avgQuality,
        adherence,
      });

      if (reviewRes.data) {
        setSavedReview(reviewRes.data);
        setDidWell(reviewRes.data.did_well || "");
        setWillChange(reviewRes.data.will_change || "");
      }

      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setError("");
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated.");
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      week_start: toDateString(currentWeek.start),
      week_end: toDateString(currentWeek.end),
      total_trades: weekData.total,
      wins: weekData.wins,
      losses: weekData.losses,
      breakeven: weekData.breakeven,
      win_rate: weekData.winRate,
      total_pips: weekData.totalPips,
      total_percent: weekData.totalPercent,
      avg_quality_score: weekData.avgQuality,
      rule_adherence: weekData.adherence,
      did_well: didWell,
      will_change: willChange,
    };

    const { error: upsertError } = await supabase
      .from("weekly_reviews")
      .upsert(payload, { onConflict: "user_id,week_start" });

    setSaving(false);

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    window.location.reload();
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Weekly Review</h1>
            <p className="text-gray-400 text-sm">
              {formatWeekLabel(currentWeek.start)} —{" "}
              {formatWeekLabel(currentWeek.end)}
            </p>
          </div>
          <Link
            href="/review/history"
            className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-600 text-xs"
          >
            History →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI
            label="Trades"
            value={weekData.total}
            sub={`${weekData.closed} closed`}
          />
          <KPI
            label="Win Rate"
            value={`${weekData.winRate.toFixed(0)}%`}
            accent={
              weekData.winRate >= 50 ? "text-green-400" : "text-yellow-400"
            }
            sub={`${weekData.wins}W · ${weekData.losses}L`}
          />
          <KPI
            label="Pips"
            value={
              weekData.totalPips >= 0
                ? `+${weekData.totalPips.toFixed(0)}`
                : `${weekData.totalPips.toFixed(0)}`
            }
            accent={
              weekData.totalPips >= 0 ? "text-green-400" : "text-red-400"
            }
          />
          <KPI
            label="Quality"
            value={
              weekData.avgQuality > 0
                ? `${weekData.avgQuality.toFixed(1)}/10`
                : "—"
            }
            accent={
              weekData.avgQuality >= 8
                ? "text-green-400"
                : weekData.avgQuality >= 6
                ? "text-yellow-400"
                : "text-red-400"
            }
          />
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h2 className="text-sm font-semibold text-blue-400 mb-3">
            Rule Adherence This Week
          </h2>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">
              Partial @ 1:1 + SL to BE
            </span>
            <span className="text-sm font-bold">
              {weekData.adherence.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                weekData.adherence >= 80
                  ? "bg-green-500"
                  : weekData.adherence >= 50
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${weekData.adherence}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-blue-400 mb-3">
              Reflection
            </h2>
            <label className="block text-xs mb-2 text-gray-400">
              What did I do well this week?
            </label>
            <textarea
              value={didWell}
              onChange={(e) => setDidWell(e.target.value)}
              rows={4}
              placeholder="Example: I waited for the checklist every time. I took partials at 1:1 without emotion."
              className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none resize-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs mb-2 text-gray-400">
              What will I change next week?
            </label>
            <textarea
              value={willChange}
              onChange={(e) => setWillChange(e.target.value)}
              rows={4}
              placeholder="Example: I will skip setups with quality score below 8. I will not trade 30 minutes before news."
              className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none resize-none text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        {savedReview && (
          <div className="p-3 rounded-lg bg-green-950/40 border border-green-800 text-green-300 text-xs">
            ✅ Review saved. You can update it anytime this week.
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : savedReview
            ? "Update Review"
            : "Save Weekly Review"}
        </button>
      </div>
    </main>
  );
}

function KPI({ label, value, sub, accent }) {
  return (
    <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p
        className={`text-xl font-bold tabular-nums ${
          accent || "text-white"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}