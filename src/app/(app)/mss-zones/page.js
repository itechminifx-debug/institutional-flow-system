"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";
import {
  mssInfo,
  zoneStatusInfo,
  compressionInfo,
  computeCompressionLevel,
  distanceToMSSZone,
  priceInMSSZone,
  computeNestedRBCE,
  detectNestedRRB,
} from "@/lib/mssHelpers";
import PairPicker from "@/components/PairPicker";

export default function MSSZonesPage() {
  const supabase = createClient();

  const [pair, setPair] = useState("Volatility 80");
  const [zones, setZones] = useState([]);
  const [nestedRRBs, setNestedRRBs] = useState([]);
  const [livePrice, setLivePrice] = useState(null);
  const [loading, setLoading] = useState(true);

  const [expandedZone, setExpandedZone] = useState(null);
  const [showNestedForm, setShowNestedForm] = useState(false);
  const [nestedForm, setNestedForm] = useState({
    rb_zone_low: "",
    rb_zone_high: "",
    rb_notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: zonesData } = await supabase
        .from("mss_events")
        .select("*")
        .eq("user_id", user.id)
        .eq("pair", pair)
        .in("zone_status", ["active", "mitigated"])
        .order("created_at", { ascending: false });

      const zoneIds = (zonesData || []).map((z) => z.id);

      let nestedData = [];
      if (zoneIds.length > 0) {
        const { data } = await supabase
          .from("mss_nested_rrbs")
          .select("*")
          .eq("user_id", user.id)
          .in("mss_id", zoneIds)
          .order("detected_at", { ascending: false });
        nestedData = data || [];
      }

      setZones(zonesData || []);
      setNestedRRBs(nestedData);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair]);

  useEffect(() => {
    async function fetchPrice() {
      try {
        if (pair.toLowerCase().includes("volatility 80")) {
          const bridgeUrl = process.env.NEXT_PUBLIC_MT5_BRIDGE_URL;
          const url = bridgeUrl
            ? `${bridgeUrl}/api/price/mt5`
            : "/api/price/mt5";
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();
          if (typeof data.bid === "number") setLivePrice(data.bid);
        }
      } catch {}
    }
    fetchPrice();
    const interval = setInterval(fetchPrice, 2000);
    return () => clearInterval(interval);
  }, [pair]);

  function nestedCountForZone(zoneId) {
    return nestedRRBs.filter((n) => n.mss_id === zoneId).length;
  }

  function nestedListForZone(zoneId) {
    return nestedRRBs.filter((n) => n.mss_id === zoneId);
  }

  async function handleAddNested(zone) {
    setError("");

    const low = parseFloat(nestedForm.rb_zone_low);
    const high = parseFloat(nestedForm.rb_zone_high);

    if (!low || !high || low >= high) {
      setError("Enter a valid RB zone (low < high)");
      return;
    }

    const detection = detectNestedRRB({
      rbZoneHigh: high,
      rbZoneLow: low,
      mssZone: { zoneHigh: zone.zone_high, zoneLow: zone.zone_low },
      existingRRBs: nestedListForZone(zone.id),
    });

    if (!detection.shouldLog) {
      setError(detection.reason);
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const ce = computeNestedRBCE(high, low);

    const { data: inserted, error: insertError } = await supabase
      .from("mss_nested_rrbs")
      .insert({
        user_id: user.id,
        mss_id: zone.id,
        rb_zone_high: high,
        rb_zone_low: low,
        rb_ce: ce,
        rb_direction: zone.direction,
        rb_notes: nestedForm.rb_notes || null,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    const newCount = nestedCountForZone(zone.id) + 1;
    const newLevel = computeCompressionLevel(newCount);

    await supabase
      .from("mss_events")
      .update({
        nested_rrb_count: newCount,
        compression_level: newLevel,
        compression_updated_at: new Date().toISOString(),
      })
      .eq("id", zone.id);

    setNestedRRBs((prev) => [inserted, ...prev]);
    setZones((prev) =>
      prev.map((z) =>
        z.id === zone.id
          ? {
              ...z,
              nested_rrb_count: newCount,
              compression_level: newLevel,
            }
          : z
      )
    );

    setNestedForm({ rb_zone_low: "", rb_zone_high: "", rb_notes: "" });
    setShowNestedForm(false);
    setSaving(false);
  }

  async function handleDeleteNested(nestedId, zoneId) {
    if (!window.confirm("Delete this nested RRB?")) return;

    const { error: delError } = await supabase
      .from("mss_nested_rrbs")
      .delete()
      .eq("id", nestedId);

    if (delError) return;

    const newCount = nestedCountForZone(zoneId) - 1;
    const newLevel = computeCompressionLevel(Math.max(0, newCount));

    await supabase
      .from("mss_events")
      .update({
        nested_rrb_count: Math.max(0, newCount),
        compression_level: newLevel,
      })
      .eq("id", zoneId);

    setNestedRRBs((prev) => prev.filter((n) => n.id !== nestedId));
    setZones((prev) =>
      prev.map((z) =>
        z.id === zoneId
          ? {
              ...z,
              nested_rrb_count: Math.max(0, newCount),
              compression_level: newLevel,
            }
          : z
      )
    );
  }

  const sortedZones = [...zones].sort((a, b) => {
    if (livePrice == null) return 0;
    const dA = distanceToMSSZone(livePrice, a) ?? Infinity;
    const dB = distanceToMSSZone(livePrice, b) ?? Infinity;
    return dA - dB;
  });

  const activeCount = zones.filter((z) => z.zone_status === "active").length;
  const inZoneCount = zones.filter(
    (z) => livePrice != null && priceInMSSZone(livePrice, z)
  ).length;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">MSS Zones</h1>
          <p className="text-gray-400 text-sm">
            Structure zones — with CE entries and nested RRB defense
          </p>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <PairPicker
            value={pair}
            onChange={setPair}
            label="Pair"
          />

          {livePrice !== null && (
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-800">
              <div>
                <p className="text-xs text-gray-500">Live Price</p>
                <p className="font-bold tabular-nums text-white text-sm">
                  {formatPrice(livePrice)}
                </p>
              </div>
              <div>
                <p className="text-xs text-green-500">Active Zones</p>
                <p className="font-bold text-green-400 text-sm">
                  {activeCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-yellow-500">In Zone</p>
                <p className="font-bold text-yellow-400 text-sm">
                  {inZoneCount}
                </p>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading...</p>
        ) : sortedZones.length === 0 ? (
          <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-gray-400 mb-3">
              No active MSS zones for {pair}.
            </p>
            <Link
              href="/mss"
              className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
            >
              Log an MSS →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedZones.map((zone) => {
              const info = mssInfo(zone.direction);
              const zoneStatus = zoneStatusInfo(zone.zone_status);
              const compression = compressionInfo(
                zone.compression_level ||
                  computeCompressionLevel(zone.nested_rrb_count || 0)
              );
              const ce =
                Math.round(
                  ((zone.zone_high + zone.zone_low) / 2) * 100
                ) / 100;
              const distance =
                livePrice != null ? distanceToMSSZone(livePrice, zone) : null;
              const isInside =
                livePrice != null && priceInMSSZone(livePrice, zone);
              const nestedCount = nestedCountForZone(zone.id);
              const nestedList = nestedListForZone(zone.id);
              const isExpanded = expandedZone === zone.id;

              return (
                <div
                  key={zone.id}
                  className={`rounded-lg border-2 overflow-hidden ${info.color}`}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${info.badge} font-semibold`}
                        >
                          {info.emoji} {info.label}
                        </span>
                        <span className="text-xs opacity-70">
                          {zone.timeframe}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${zoneStatus.badge}`}
                        >
                          {zoneStatus.emoji} {zoneStatus.label}
                        </span>
                        {nestedCount > 0 && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${compression.badge} font-semibold`}
                          >
                            {compression.emoji} {nestedCount}×
                          </span>
                        )}
                      </div>
                      {isInside && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-300 font-semibold animate-pulse">
                          ● IN ZONE
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs opacity-70">Zone High</p>
                        <p className="font-bold tabular-nums">
                          {formatPrice(zone.zone_high)}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-black/40 border border-yellow-700/50">
                        <p className="text-xs text-yellow-300 mb-0.5">
                          ⭐ CE Entry
                        </p>
                        <p className="font-bold tabular-nums text-yellow-300">
                          {formatPrice(ce)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs opacity-70">Zone Low</p>
                        <p className="font-bold tabular-nums">
                          {formatPrice(zone.zone_low)}
                        </p>
                      </div>
                    </div>

                    {distance != null && (
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-current/20">
                        <span className="opacity-70">Distance</span>
                        <span className="font-bold tabular-nums">
                          {isInside ? "INSIDE" : distance.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedZone(
                            expandedZone === zone.id ? null : zone.id
                          );
                          setShowNestedForm(false);
                          setError("");
                        }}
                        className="py-2 rounded-lg bg-black/40 hover:bg-black/60 text-xs font-medium"
                      >
                        {isExpanded ? "▼ Hide" : "▶ Nested RRBs ("}
                        {nestedCount}
                        {")"}
                      </button>
                      <Link
                        href={`/setups/new`}
                        className="py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-xs font-medium text-center"
                      >
                        📋 Create Setup →
                      </Link>
                    </div>

                    {isExpanded && (
                      <div className="pt-3 border-t border-current/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold">
                            Nested RRBs ({nestedCount})
                          </p>
                          {!showNestedForm && (
                            <button
                              type="button"
                              onClick={() => setShowNestedForm(true)}
                              className="text-xs px-2 py-1 rounded bg-blue-700 hover:bg-blue-600"
                            >
                              + Add
                            </button>
                          )}
                        </div>

                        {nestedList.length === 0 && !showNestedForm && (
                          <p className="text-xs opacity-70 py-2">
                            No nested RRBs yet.
                          </p>
                        )}

                        {nestedList.map((nested) => (
                          <div
                            key={nested.id}
                            className="p-2 rounded-lg bg-black/40 border border-current/20 text-xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold">
                                {formatPrice(nested.rb_zone_low)} –{" "}
                                {formatPrice(nested.rb_zone_high)}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteNested(nested.id, zone.id)
                                }
                                className="text-red-400 hover:text-red-300"
                              >
                                ×
                              </button>
                            </div>
                            {nested.rb_ce && (
                              <p className="text-yellow-300">
                                ⭐ CE: {formatPrice(nested.rb_ce)}
                              </p>
                            )}
                            {nested.rb_notes && (
                              <p className="opacity-70 mt-1">
                                {nested.rb_notes}
                              </p>
                            )}
                          </div>
                        ))}

                        {showNestedForm && (
                          <div className="p-3 rounded-lg bg-black/60 border border-blue-700 space-y-2">
                            <p className="text-xs font-semibold text-blue-300">
                              Add Nested RRB
                            </p>
                            <p className="text-xs opacity-70">
                              Must be inside:{" "}
                              {formatPrice(zone.zone_low)} –{" "}
                              {formatPrice(zone.zone_high)}
                            </p>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs mb-1 opacity-70">
                                  RB Low
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  value={nestedForm.rb_zone_low}
                                  onChange={(e) =>
                                    setNestedForm((f) => ({
                                      ...f,
                                      rb_zone_low: e.target.value,
                                    }))
                                  }
                                  className="w-full px-2 py-1.5 rounded bg-black border border-gray-700 focus:border-blue-500 outline-none text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-xs mb-1 opacity-70">
                                  RB High
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  value={nestedForm.rb_zone_high}
                                  onChange={(e) =>
                                    setNestedForm((f) => ({
                                      ...f,
                                      rb_zone_high: e.target.value,
                                    }))
                                  }
                                  className="w-full px-2 py-1.5 rounded bg-black border border-gray-700 focus:border-blue-500 outline-none text-xs"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs mb-1 opacity-70">
                                Notes (optional)
                              </label>
                              <input
                                type="text"
                                value={nestedForm.rb_notes}
                                onChange={(e) =>
                                  setNestedForm((f) => ({
                                    ...f,
                                    rb_notes: e.target.value,
                                  }))
                                }
                                placeholder="e.g. Second defense"
                                className="w-full px-2 py-1.5 rounded bg-black border border-gray-700 focus:border-blue-500 outline-none text-xs"
                              />
                            </div>

                            {error && expandedZone === zone.id && (
                              <p className="text-xs text-red-400">{error}</p>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowNestedForm(false);
                                  setNestedForm({
                                    rb_zone_low: "",
                                    rb_zone_high: "",
                                    rb_notes: "",
                                  });
                                  setError("");
                                }}
                                className="py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-xs"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddNested(zone)}
                                disabled={saving}
                                className="py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-xs font-medium disabled:opacity-50"
                              >
                                {saving ? "Adding..." : "Add Nested RRB"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-900/50">
          <h3 className="text-xs font-semibold text-blue-300 mb-2">
            💡 How to Use MSS Zones
          </h3>
          <ul className="text-xs text-gray-300 space-y-1 ml-4 list-disc">
            <li>
              <strong>Zone High/Low</strong> — from the broken swing to the
              close
            </li>
            <li>
              <strong>⭐ CE Entry</strong> — 50% midpoint. Your entry on return
            </li>
            <li>
              <strong>Nested RRBs</strong> — add every RB that forms inside
            </li>
            <li>
              <strong>Compression</strong> — 1× Low · 2× Medium · 3× High · 4+
              Extreme
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}