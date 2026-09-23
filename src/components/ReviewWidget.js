"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { getCurrentWeek, toDateString } from "@/lib/weekHelpers";

export default function ReviewWidget() {
  const supabase = createClient();
  const [hasReview, setHasReview] = useState(false);
  const [loading, setLoading] = useState(true);

  const isSunday = new Date().getDay() === 0;

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const week = getCurrentWeek();
      const { data } = await supabase
        .from("weekly_reviews")
        .select("id")
        .eq("user_id", user.id)
        .eq("week_start", toDateString(week.start))
        .maybeSingle();

      setHasReview(!!data);
      setLoading(false);
    }
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return null;

  return (
    <Link
      href="/review"
      className={`block p-4 rounded-lg border transition ${
        isSunday && !hasReview
          ? "bg-yellow-950/40 border-yellow-700"
          : hasReview
          ? "bg-green-950/30 border-green-800"
          : "bg-gray-900 border-gray-800"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">Weekly Review</span>
        <span className="text-xs text-blue-400">Open →</span>
      </div>

      {hasReview ? (
        <>
          <p className="text-lg font-bold text-green-400">✅ Submitted</p>
          <p className="text-xs text-gray-500 mt-1">
            Update anytime this week
          </p>
        </>
      ) : isSunday ? (
        <>
          <p className="text-lg font-bold text-yellow-400">
            🔔 Sunday — Time to review
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Reflect on your week
          </p>
        </>
      ) : (
        <>
          <p className="text-lg font-bold text-gray-300">
            This week's review
          </p>
          <p className="text-xs text-gray-500 mt-1">Complete by Sunday</p>
        </>
      )}
    </Link>
  );
}