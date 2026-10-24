"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import {
  DECK_CATEGORIES,
  getCategoryInfo,
  getSetupTableInfo,
  setupHref,
  matchDeck,
  relativeTime,
  todayDateString,
} from "@/lib/decksEngine";
import { stripMarkdown } from "@/lib/markdown";

export default function DecksListPage() {
  const router = useRouter();
  const supabase = createClient();

  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTag, setFilterTag] = useState("");
  const [onlyPinned, setOnlyPinned] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  const loadDecks = useCallback(async () => {
    setLoading(true);
    const { data, error: loadErr } = await supabase
      .from("decks")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    if (loadErr) { setError(loadErr.message); setLoading(false); return; }
    setDecks(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadDecks(); }, [loadDecks]);

  useEffect(() => {
    const handleFocus = () => { loadDecks(); };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadDecks]);

  const filtered = useMemo(() => {
    return decks.filter(d => matchDeck(d, {
      search,
      category: filterCategory,
      status: filterStatus,
      tag: filterTag,
      pinned: onlyPinned,
    }));
  }, [decks, search, filterCategory, filterStatus, filterTag, onlyPinned]);

  const pinnedDecks = useMemo(
    () => filtered.filter(d => d.is_pinned).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)),
    [filtered]
  );
  const regularDecks = useMemo(
    () => filtered.filter(d => !d.is_pinned).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)),
    [filtered]
  );

  const stats = useMemo(() => {
    const total = decks.length;
    const pinned = decks.filter(d => d.is_pinned).length;
    const favorites = decks.filter(d => d.is_favorite).length;
    const drafts = decks.filter(d => d.status === "draft").length;
    const withSetup = decks.filter(d => d.linked_setup_id).length;
    return { total, pinned, favorites, drafts, withSetup };
  }, [decks]);

  // All unique tags across all decks, sorted by frequency
  const tagCloud = useMemo(() => {
    const counts = {};
    decks.forEach(d => {
      (d.tags || []).forEach(t => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [decks]);

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this deck? This cannot be undone.")) return;
    setDeletingId(id);
    const { error: delErr } = await supabase.from("decks").delete().eq("id", id);
    if (delErr) { setError(delErr.message); setDeletingId(null); return; }
    setDecks(prev => prev.filter(d => d.id !== id));
    setDeletingId(null);
  }

  async function togglePin(id, e) {
    e.stopPropagation();
    const deck = decks.find(d => d.id === id);
    if (!deck) return;
    const newVal = !deck.is_pinned;
    const { error: updErr } = await supabase
      .from("decks")
      .update({ is_pinned: newVal, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updErr) { setError(updErr.message); return; }
    setDecks(prev => prev.map(d => d.id === id ? { ...d, is_pinned: newVal } : d));
  }

  async function toggleFavorite(id, e) {
    e.stopPropagation();
    const deck = decks.find(d => d.id === id);
    if (!deck) return;
    const newVal = !deck.is_favorite;
    const { error: updErr } = await supabase
      .from("decks")
      .update({ is_favorite: newVal, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updErr) { setError(updErr.message); return; }
    setDecks(prev => prev.map(d => d.id === id ? { ...d, is_favorite: newVal } : d));
  }

  async function goToDaily() {
    const today = todayDateString();
    // Check if today's daily deck exists
    const { data: existing } = await supabase
      .from("decks")
      .select("id")
      .eq("is_daily", true)
      .eq("daily_date", today)
      .maybeSingle();

    if (existing) {
      router.push(`/decks/${existing.id}`);
    } else {
      router.push(`/decks/daily`);
    }
  }

  function DeckCard({ d, isPinned }) {
    const catInfo = getCategoryInfo(d.category);
    const tableInfo = getSetupTableInfo(d.linked_setup_table);
    const setupUrl = setupHref(d.linked_setup_table, d.linked_setup_id);
    const preview = stripMarkdown(d.content, 180);

    return (
      <div
        onClick={() => router.push(`/decks/${d.id}`)}
        className={`group p-3 rounded-lg border cursor-pointer transition-colors ${
          isPinned
            ? "bg-indigo-950/20 border-indigo-800/60 hover:border-indigo-600"
            : d.status === "draft"
            ? "bg-yellow-950/10 border-yellow-900/50 hover:border-yellow-700"
            : "bg-gray-900 border-gray-800 hover:border-indigo-700"
        }`}
      >
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              {d.is_daily && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-900/40 border border-blue-700 text-blue-200 font-bold">📅 DAILY</span>
              )}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold bg-${catInfo.accent}-900/30 border-${catInfo.accent}-800 text-${catInfo.accent}-200`}>
                {catInfo.emoji} {catInfo.label}
              </span>
              {d.status === "draft" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-900/40 border border-yellow-700 text-yellow-200 font-bold">DRAFT</span>
              )}
            </div>
            <p className="text-sm font-bold text-white leading-tight">
              {d.title || "Untitled Deck"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => togglePin(d.id, e)}
              className={`text-xs ${d.is_pinned ? "text-indigo-300" : "text-gray-600 hover:text-gray-400"}`}
              title={d.is_pinned ? "Unpin" : "Pin"}
            >
              📌
            </button>
            <button
              type="button"
              onClick={(e) => toggleFavorite(d.id, e)}
              className={`text-xs ${d.is_favorite ? "text-amber-400" : "text-gray-600 hover:text-gray-400"}`}
              title={d.is_favorite ? "Unfavorite" : "Favorite"}
            >
              ★
            </button>
            <button
              type="button"
              onClick={(e) => handleDelete(d.id, e)}
              disabled={deletingId === d.id}
              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
              title="Delete"
            >
              {deletingId === d.id ? "..." : "✕"}
            </button>
          </div>
        </div>

        {preview && (
          <p className="text-xs text-gray-400 mt-2 leading-relaxed line-clamp-2">
            {preview}
          </p>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2 mt-2 pt-2 border-t border-gray-800/60">
          <div className="flex items-center gap-1 flex-wrap">
            {(d.tags || []).slice(0, 3).map(t => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
                #{t}
              </span>
            ))}
            {(d.tags || []).length > 3 && (
              <span className="text-[10px] text-gray-500">+{(d.tags || []).length - 3}</span>
            )}
          </div>
          <span className="text-[10px] text-gray-500">{relativeTime(d.updated_at)}</span>
        </div>

        {setupUrl && tableInfo && (
          <div className="mt-2 text-[10px]">
            <a
              href={setupUrl}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200"
            >
              🔗 Linked {tableInfo.emoji} {tableInfo.label} setup
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">🎯 Research Decks</h1>
            <p className="text-gray-400 text-sm">Your research notebook. Doctrine, backtests, comparisons, reviews.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={goToDaily}
              className="text-xs px-3 py-2 rounded-lg bg-blue-900/40 text-blue-300 font-semibold"
            >
              📅 Today's Deck
            </button>
            <button
              type="button"
              onClick={() => router.push("/decks/new")}
              className="text-xs px-3 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white font-bold"
            >
              + New Deck
            </button>
          </div>
        </div>

        {/* Stats */}
        {!loading && decks.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold">{stats.total}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-indigo-800/60 text-center">
              <p className="text-xs text-gray-500">📌 Pinned</p>
              <p className="text-lg font-bold text-indigo-300">{stats.pinned}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-amber-800/60 text-center">
              <p className="text-xs text-gray-500">★ Favorites</p>
              <p className="text-lg font-bold text-amber-300">{stats.favorites}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-yellow-800/60 text-center">
              <p className="text-xs text-gray-500">📝 Drafts</p>
              <p className="text-lg font-bold text-yellow-300">{stats.drafts}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-900 border border-teal-800/60 text-center">
              <p className="text-xs text-gray-500">🔗 With Setup</p>
              <p className="text-lg font-bold text-teal-300">{stats.withSetup}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <div>
            <label className="block text-xs mb-1 text-gray-400">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, content, tags, linked setup..."
              className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-gray-400">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm"
              >
                <option value="all">All categories</option>
                {DECK_CATEGORIES.map(c => (
                  <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-400">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 text-sm"
              >
                <option value="all">All</option>
                <option value="published">Published</option>
                <option value="draft">Drafts</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setOnlyPinned(p => !p)}
              className={`text-xs px-2 py-1 rounded-full border font-bold transition ${
                onlyPinned
                  ? "bg-indigo-900/60 border-indigo-700 text-indigo-200"
                  : "bg-black border-gray-700 text-gray-400"
              }`}
            >
              📌 Pinned only
            </button>
            {filterTag && (
              <button
                type="button"
                onClick={() => setFilterTag("")}
                className="text-xs px-2 py-1 rounded-full bg-purple-900/60 border border-purple-700 text-purple-200 font-mono"
              >
                #{filterTag} ✕
              </button>
            )}
            {(filterCategory !== "all" || filterStatus !== "all" || filterTag || onlyPinned || search) && (
              <button
                type="button"
                onClick={() => { setFilterCategory("all"); setFilterStatus("all"); setFilterTag(""); setOnlyPinned(false); setSearch(""); }}
                className="text-xs text-gray-400 hover:text-white"
              >
                Clear all
              </button>
            )}
          </div>

          {tagCloud.length > 0 && (
            <div className="pt-2 border-t border-gray-800">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {tagCloud.map(([tag, count]) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition ${
                      filterTag === tag
                        ? "bg-purple-900/60 border border-purple-700 text-purple-200"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    #{tag} <span className="opacity-60">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500">Showing {filtered.length} of {decks.length}</p>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}
        {loading && <div className="p-6 text-center text-gray-400 text-sm">Loading decks...</div>}

        {!loading && decks.length === 0 && (
          <div className="p-8 rounded-lg bg-indigo-950/30 border border-indigo-900/50 text-center space-y-3">
            <p className="text-4xl">📓</p>
            <p className="text-sm text-indigo-200">No decks yet. Start capturing your research.</p>
            <div className="flex items-center gap-2 justify-center flex-wrap">
              <button
                type="button"
                onClick={() => router.push("/decks/new")}
                className="px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 font-bold text-sm"
              >
                + Create your first deck
              </button>
              <button
                type="button"
                onClick={goToDaily}
                className="px-4 py-2 rounded-lg bg-blue-900/40 text-blue-300 font-bold text-sm"
              >
                📅 Start today's deck
              </button>
            </div>
          </div>
        )}

        {/* Pinned decks */}
        {!loading && pinnedDecks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-indigo-800/60" />
              <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider">📌 Pinned ({pinnedDecks.length})</p>
              <div className="flex-1 h-px bg-indigo-800/60" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {pinnedDecks.map(d => <DeckCard key={d.id} d={d} isPinned={true} />)}
            </div>
          </div>
        )}

        {/* Regular decks */}
        {!loading && regularDecks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-800" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">📚 All Decks ({regularDecks.length})</p>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {regularDecks.map(d => <DeckCard key={d.id} d={d} isPinned={false} />)}
            </div>
          </div>
        )}

        {!loading && decks.length > 0 && filtered.length === 0 && (
          <div className="p-6 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-sm text-gray-400">No decks match your filters.</p>
            <button
              type="button"
              onClick={() => { setFilterCategory("all"); setFilterStatus("all"); setFilterTag(""); setOnlyPinned(false); setSearch(""); }}
              className="mt-2 text-xs text-indigo-300 hover:text-indigo-200"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </main>
  );
}