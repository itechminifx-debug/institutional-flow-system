"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { parseZone, getZoneStatus, statusColors } from "@/lib/zoneHelpers";
import TradeChecklist from "@/components/TradeChecklist";
import EntryCalculator from "@/components/EntryCalculator";

function TradeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setupId = searchParams.get("setup");

  const [setup, setSetup] = useState(null);
  const [profile, setProfile] = useState(null);
  const [livePrice, setLivePrice] = useState(null);
  const [checklistComplete, setChecklistComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  // Load setup + profile
  useEffect(() => {
    async function load() {
      if (!setupId) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const [setupRes, profileRes] = await Promise.all([
        supabase.from("setups").select("*").eq("id", setupId).single(),
        supabase.from("profiles").select("*").eq("id", user.id).single(),
      ]);

      if (setupRes.error) setError(setupRes.error.message);
      else setSetup(setupRes.data);

      setProfile(profileRes.data);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupId]);

  // Poll live MT5 price
  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch("/api/price/mt5", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data && typeof data.bid === "number") {
          setLivePrice(data.bid);
        }
      } catch {}
    }
    fetchPrice();
    const interval = setInterval(fetchPrice, 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleEnter(entryData) {
    setSubmitting(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated.");
      setSubmitting(false);
      return;
    }

    const direction = setup.d1_bias === "bullish" ? "buy" : "sell";

    const { data: trade, error: insertError } = await supabase
      .from("trades")
      .insert({
        user_id: user.id,
        setup_id: setup.id,
        pair: setup.pair,
        direction,
        status: "open",
        ...entryData,
      })
      .select()
      .single();

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push(`/journal?trade=${trade.id}`);
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

  if (!setupId) {
    return (
      <main className="min-h-screen p-4 md:p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Live Trade</h1>
          <p className="text-gray-400 mb-6">Checklist + entry (Steps 5-11)</p>
          <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-gray-400 mb-4">
              No setup selected. Pick a setup to start the checklist.
            </p>
            <Link
              href="/setups"
              className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
            >
              Go to Setups
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!setup) {
    return (
      <main className="min-h-screen p-4 md:p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto">
          <Link href="/setups" className="text-blue-400 text-sm">
            ← Back to Setups
          </Link>
          <div className="mt-4 p-6 rounded-lg bg-red-900/40 border border-red-700">
            {error || "Setup not found."}
          </div>
        </div>
      </main>
    );
  }

  const zone = parseZone(setup.rejection_block_zone);
  const zoneStatus = getZoneStatus(livePrice, zone);
  const colors = statusColors(zoneStatus.status);
  const direction = setup.d1_bias === "bullish" ? "buy" : "sell";

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href={`/setups/${setup.id}`}
            className="text-blue-400 text-sm hover:underline"
          >
            ← Back to Setup
          </Link>
          <h1 className="text-2xl font-bold mt-2">Live Trade</h1>
          <p className="text-gray-400 text-sm">
            Steps 5-11 · Discipline enforcement
          </p>
        </div>

        {/* Setup Context */}
        <div className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg">{setup.pair}</h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    direction === "buy"
                      ? "bg-green-900/40 text-green-300"
                      : "bg-red-900/40 text-red-300"
                  }`}
                >
                  {setup.d1_bias}
                </span>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                Zone: {setup.rejection_block_zone || "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
              <span className={`text-xs font-medium ${colors.text}`}>
                {zoneStatus.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Live Price</p>
              <p className="font-bold tabular-nums">
                {livePrice !== null ? livePrice.toFixed(2) : "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Risk per Trade</p>
              <p className="font-bold tabular-nums text-yellow-400">
                ${((profile?.account_size || 0) * (profile?.risk_percent || 1) / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Account</p>
              <p className="font-bold tabular-nums">
                ${(profile?.account_size || 0).toFixed(2)}
              </p>
            </div>
          </div>

          {zoneStatus.status === "in-zone" && (
            <div className="mt-3 p-2 rounded-md bg-green-900/60 border border-green-500 text-center">
              <p className="text-green-200 text-sm font-bold">
                🎯 ZONE HIT — Walk the checklist
              </p>
            </div>
          )}
        </div>

        {/* Gated Checklist */}
        <TradeChecklist onComplete={setChecklistComplete} />

        {/* Entry Calculator — only when checklist complete */}
        {checklistComplete && (
          <EntryCalculator
            setup={setup}
            profile={profile}
            livePrice={livePrice}
            onEnter={handleEnter}
            submitting={submitting}
          />
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <TradeContent />
    </Suspense>
  );
}