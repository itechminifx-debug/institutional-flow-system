"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import {
  isWithinNewsWindow,
  timeUntilEvent,
  impactColor,
} from "@/lib/newsHelpers";

export default function NewsWidget() {
  const supabase = createClient();
  const [nextEvent, setNextEvent] = useState(null);
  const [inWindow, setInWindow] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("news_events")
        .select("*")
        .gte("scheduled_at", new Date(Date.now() - 3600 * 1000).toISOString())
        .eq("impact", "high")
        .order("scheduled_at", { ascending: true })
        .limit(1)
        .single();

      if (data) {
        setNextEvent(data);
        setInWindow(isWithinNewsWindow(data));
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Link
        href="/news"
        className="block p-4 rounded-lg bg-gray-900 border border-gray-800"
      >
        <p className="text-sm text-gray-400">News</p>
        <p className="text-gray-500 text-xs mt-1">Loading...</p>
      </Link>
    );
  }

  if (!nextEvent) {
    return (
      <Link
        href="/news"
        className="block p-4 rounded-lg bg-gray-900 border border-gray-800"
      >
        <p className="text-sm text-gray-400">News Protocol</p>
        <p className="text-gray-500 text-xs mt-1">No upcoming events</p>
      </Link>
    );
  }

  const colors = impactColor(nextEvent.impact);

  return (
    <Link
      href="/news"
      className={`block p-4 rounded-lg border transition ${
        inWindow ? colors : "bg-gray-900 border-gray-800"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">News Protocol</span>
        <span className="text-xs text-blue-400">View →</span>
      </div>
      <p className="text-xs text-gray-500 mb-1">
        {inWindow ? "⚠️ DO NOT TRADE" : "Next high-impact"}
      </p>
      <p className="font-semibold text-sm">{nextEvent.event_name}</p>
      <p className="text-xs text-gray-400 mt-1">
        {nextEvent.currency} · {timeUntilEvent(nextEvent.scheduled_at)}
      </p>
    </Link>
  );
}