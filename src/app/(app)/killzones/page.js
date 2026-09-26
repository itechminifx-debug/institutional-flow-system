"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import {
  KILLZONES,
  killzoneInfo,
  getCurrentKillzone,
  minutesUntilNextKillzone,
  formatTimeUntil,
  isJudasWindow,
} from "@/lib/killzoneHelpers";

export default function KillzonesPage() {
  const supabase = createClient();

  const [current, setCurrent] = useState(getCurrentKillzone());
  const [judas, setJudas] = useState(isJudasWindow());
  const [tick, setTick] = useState(0);
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent(getCurrentKillzone());
      setJudas(isJudasWindow());
      setTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load preferences
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
        .from("killzone_prefs")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      setPrefs(
        data || {
          trade_london: true,
          trade_new_york: true,
          trade_overlap: true,
          trade_asian: false,
          trade_outside: false,
        }
      );
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function togglePref(field) {
    if (!prefs) return;
    const updated = { ...prefs, [field]: !prefs[field] };
    setPrefs(updated);

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    await supabase
      .from("killzone_prefs")
      .upsert({ user_id: user.id, ...updated, id: undefined }, { onConflict: "user_id" });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  // Current time display
  const now = new Date();
  const utcTime = now.toISOString().slice(11, 16);

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Killzones</h1>
          <p className="text-gray-400 text-sm">
            Trade when institutions trade — sit out when they sleep
          </p>
        </div>

        {/* Current Killzone */}
        <div className={`p-5 rounded-lg border-2 ${current.color}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider opacity-70">
              Current Window
            </span>
            <span className="text-xs opacity-70">
              UTC {utcTime}
            </span>
          </div>
          <p className="text-3xl mb-1">{current.emoji}</p>
          <h2 className="text-xl font-bold">{current.label}</h2>
          <p className="text-sm opacity-80 mt-1">{current.description}</p>

          {/* Quality indicator */}
          <div className="mt-3 pt-3 border-t border-current/20">
            <span className="text-xs opacity-70">Quality:</span>
            <span className="text-sm font-bold ml-2 uppercase">
              {current.quality}
            </span>
          </div>

          {/* Judas warning */}
          {judas && (
            <div className="mt-3 p-2 rounded bg-red-950/60 border border-red-700">
              <p className="text-xs text-red-200 font-semibold">
                ⚠️ Judas Swing Window — wait 30 minutes
              </p>
            </div>
          )}

          {/* Next killzone countdown */}
          {current.key === "outside" || current.key === "asian" ? (
            <div className="mt-3 text-xs opacity-70">
              Next killzone opens{" "}
              {formatTimeUntil(minutesUntilNextKillzone())}
            </div>
          ) : null}
        </div>

        {/* Killzone Schedule */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h3 className="text-sm font-semibold text-blue-400 mb-3">
            Daily Killzone Schedule (UTC)
          </h3>
          <div className="space-y-2">
            {KILLZONES.map((kz) => {
              const isActive = current.key === kz.key;
              return (
                <div
                  key={kz.key}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isActive
                      ? `${kz.color} border border-current/40 font-semibold`
                      : "bg-black border border-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{kz.emoji}</span>
                    <div>
                      <p className="text-sm font-medium">{kz.label}</p>
                      <p className="text-xs opacity-70">
                        {kz.startUTC !== null
                          ? `${String(kz.startUTC).padStart(2, "0")}:00 - ${String(
                              kz.endUTC
                            ).padStart(2, "0")}:00 UTC`
                          : "All other times"}
                      </p>
                    </div>
                  </div>
                  {isActive && (
                    <span className="text-xs font-bold">● NOW</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Preferences */}
        {!loading && prefs && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-blue-400">
                My Killzone Rules
              </h3>
              {saving && (
                <span className="text-xs text-gray-500">Saving...</span>
              )}
              {saved && (
                <span className="text-xs text-green-400">✓ Saved</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Which killzones will I allow myself to trade in?
            </p>

            <div className="space-y-2">
              {[
                { key: "trade_london", label: "London", emoji: "🇬🇧" },
                { key: "trade_new_york", label: "New York", emoji: "🇺🇸" },
                { key: "trade_overlap", label: "Overlap (L+NY)", emoji: "🔥" },
                { key: "trade_asian", label: "Asian", emoji: "🌏" },
                { key: "trade_outside", label: "Outside Killzone", emoji: "⚫" },
              ].map((p) => (
                <label
                  key={p.key}
                  className="flex items-center gap-3 cursor-pointer p-2 rounded-lg bg-black border border-gray-800 hover:border-gray-600"
                >
                  <input
                    type="checkbox"
                    checked={prefs[p.key]}
                    onChange={() => togglePref(p.key)}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className="text-sm">
                    {p.emoji} {p.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-900/50">
          <h3 className="text-xs font-semibold text-blue-300 mb-2">
            💡 Why Killzones Matter
          </h3>
          <ul className="text-xs text-gray-300 space-y-1 ml-4 list-disc">
            <li>Institutions trade in specific windows — not 24/7</li>
            <li>
              London (07:00-10:00 UTC) and NY (12:00-15:00 UTC) are the
              highest-activity windows
            </li>
            <li>Overlap (12:00-15:00) has the highest liquidity of the day</li>
            <li>Asian session is accumulation — range-bound, not trending</li>
            <li>Outside killzones = noise = avoid new trades</li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/traps"
            className="text-xs text-blue-400 hover:underline"
          >
            See Trap Detection (Judas Swing alerts) →
          </Link>
        </div>
      </div>
    </main>
  );
}