"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { relativeTime } from "@/lib/decksEngine";

/**
 * LinkedDecksPanel
 * Drop-in component for any setup detail page.
 * 
 * Props:
 *   setupTable — 'sld_setups' | 'smc_setups' | 'lqe_setups' | 'fwt_setups' | 'ads_setups' | 'ams_setups'
 *   setupId    — uuid of the setup
 *   setupLabel — optional display label (e.g. 'Volatility 80')
 */
export default function LinkedDecksPanel({ setupTable, setupId, setupLabel }) {
  const router = useRouter();
  const supabase = createClient();

  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!setupTable || !setupId) return;
    async function load() {
      setLoading(true);
      const { data, error: loadErr } = await supabase
        .from("decks")
        .select("id, title, category, created_at, updated_at")
        .eq("linked_setup_table", setupTable)
        .eq("linked_setup_id", setupId)
        .order("updated_at", { ascending: false });
      if (loadErr) { setError(loadErr.message); setLoading(false); return; }
      setDecks(data || []);
      setLoading(false);
    }
    load();
  }, [setupTable, setupId, supabase]);

  function handleWriteDeck() {
    const label = encodeURIComponent(setupLabel || "Setup");
    router.push(`/decks/new?link_table=${setupTable}&link_id=${setupId}&link_label=${label}`);
  }

  return (
    <div className="p-4 rounded-lg bg-gray-900 border-2 border-indigo-800 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-indigo-300">📓 Research Decks</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {decks.length === 0 ? "No decks linked to this setup yet." : `${decks.length} linked deck${decks.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleWriteDeck}
          className="text-xs px-3 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white font-bold"
        >
          + Write a Deck
        </button>
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}
      {loading && <p className="text-xs text-gray-500">Loading linked decks...</p>}

      {!loading && decks.length > 0 && (
        <div className="space-y-1">
          {decks.map(d => (
            <button
              key={d.id}
              type="button"
              onClick={() => router.push(`/decks/${d.id}`)}
              className="w-full text-left p-2 rounded border border-gray-800 hover:border-indigo-700 transition text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-white truncate">{d.title || "Untitled Deck"}</span>
                <span className="text-[10px] text-gray-500 shrink-0">{relativeTime(d.updated_at)}</span>
              </div>
              <p className="text-[10px] text-indigo-300 mt-0.5">{d.category.toUpperCase()}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}