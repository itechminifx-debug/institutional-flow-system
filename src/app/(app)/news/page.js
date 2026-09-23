"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
  isWithinNewsWindow,
  formatEventTime,
  timeUntilEvent,
  impactColor,
} from "@/lib/newsHelpers";

export default function NewsPage() {
  const supabase = createClient();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("high");
  const [blackoutUntil, setBlackoutUntil] = useState(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [eventsRes, blackoutRes] = await Promise.all([
        supabase
          .from("news_events")
          .select("*")
          .gte("scheduled_at", new Date(Date.now() - 3600 * 1000).toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(30),
        user
          ? supabase
              .from("news_blackouts")
              .select("*")
              .eq("user_id", user.id)
              .gte("lock_until", new Date().toISOString())
              .order("lock_until", { ascending: false })
              .limit(1)
              .single()
          : Promise.resolve({ data: null }),
      ]);

      setEvents(eventsRes.data || []);
      setBlackoutUntil(blackoutRes.data?.lock_until || null);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function activateBlackout(minutes) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const lockUntil = new Date(Date.now() + minutes * 60000).toISOString();

    await supabase.from("news_blackouts").insert({
      user_id: user.id,
      reason: "Manual news lock",
      lock_until: lockUntil,
    });

    setBlackoutUntil(lockUntil);
  }

  const filtered = events.filter(
    (e) => filter === "all" || e.impact === filter
  );

  const activeEvent = events.find((e) => isWithinNewsWindow(e));

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">News Protocol</h1>
          <p className="text-gray-400 text-sm">
            Avoid trading 30 min before / 60 min after high-impact news
          </p>
        </div>

        {/* Active blackout */}
        {blackoutUntil && (
          <div className="p-4 rounded-lg bg-red-950/60 border border-red-700 mb-4">
            <p className="text-red-200 font-semibold">
              🚫 News Lock Active
            </p>
            <p className="text-red-300 text-xs mt-1">
              Locked until {formatEventTime(blackoutUntil)}
            </p>
          </div>
        )}

        {/* Active news event warning */}
        {activeEvent && !blackoutUntil && (
          <div className="p-4 rounded-lg bg-yellow-950/60 border border-yellow-700 mb-4">
            <p className="text-yellow-200 font-semibold">
              ⚠️ HIGH-IMPACT NEWS WINDOW
            </p>
            <p className="text-yellow-300 text-xs mt-1">
              {activeEvent.event_name} ({activeEvent.currency}) is within 30/60
              min window. Do not trade.
            </p>
          </div>
        )}

        {/* Manual blackout buttons */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 mb-4">
          <h2 className="text-sm font-semibold text-blue-400 mb-3">
            Manual News Lock
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Activate a temporary trading blackout before a news event.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[30, 60, 120].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => activateBlackout(m)}
                className="py-2 rounded-lg bg-red-900 hover:bg-red-800 text-xs font-medium"
              >
                Lock {m} min
              </button>
            ))}
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {["high", "medium", "all"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-xs transition ${
                filter === f
                  ? "bg-blue-600 text-white font-medium"
                  : "bg-gray-900 text-gray-400"
              }`}
            >
              {f === "high" ? "High Only" : f === "medium" ? "High + Med" : "All"}
            </button>
          ))}
        </div>

        {/* Events list */}
        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-gray-400">No upcoming events.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((event) => (
              <div
                key={event.id}
                className={`p-3 rounded-lg border ${impactColor(event.impact)}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-semibold text-sm">
                      {event.event_name}
                    </p>
                    <p className="text-xs opacity-80">
                      {event.currency} · {formatEventTime(event.scheduled_at)}
                    </p>
                  </div>
                  <span className="text-xs font-medium whitespace-nowrap ml-2">
                    {timeUntilEvent(event.scheduled_at)}
                  </span>
                </div>
                {(event.forecast || event.previous) && (
                  <div className="flex gap-3 text-xs opacity-70 mt-1">
                    {event.forecast && <span>F: {event.forecast}</span>}
                    {event.previous && <span>P: {event.previous}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}