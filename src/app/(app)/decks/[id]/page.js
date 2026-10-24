"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import {
  getCategoryInfo,
  getSetupTableInfo,
  setupHref,
  relativeTime,
  shortDateTime,
} from "@/lib/decksEngine";
import { renderMarkdown, extractHeadings } from "@/lib/markdown";
import ScreenshotGallery from "@/components/ScreenshotGallery";

export default function DeckReaderPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params?.id;

  const [deck, setDeck] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [linkedSetup, setLinkedSetup] = useState(null);
  const [linkedDecks, setLinkedDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);

      const { data: deckData, error: deckErr } = await supabase
        .from("decks")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (deckErr || !deckData) {
        setError(deckErr?.message || "Deck not found.");
        setLoading(false);
        return;
      }

      setDeck(deckData);

      // Load screenshots
      const { data: shots } = await supabase
        .from("deck_screenshots")
        .select("*")
        .eq("deck_id", id)
        .order("display_order", { ascending: true });
      setScreenshots(shots || []);

      // Load linked setup
      if (deckData.linked_setup_table && deckData.linked_setup_id) {
        const { data: setup } = await supabase
          .from(deckData.linked_setup_table)
          .select("id, pair, created_at, entry_price, active_entry, stop_loss, active_sl, tp2_price, active_tp2")
          .eq("id", deckData.linked_setup_id)
          .maybeSingle();
        setLinkedSetup(setup || null);
      }

      // Load other decks linked to the same setup
      if (deckData.linked_setup_table && deckData.linked_setup_id) {
        const { data: siblings } = await supabase
          .from("decks")
          .select("id, title, created_at")
          .eq("linked_setup_table", deckData.linked_setup_table)
          .eq("linked_setup_id", deckData.linked_setup_id)
          .neq("id", id)
          .order("created_at", { ascending: false })
          .limit(5);
        setLinkedDecks(siblings || []);
      }

      setLoading(false);
    }
    load();
  }, [id, supabase]);

  async function loadVersions() {
    if (versions.length > 0) {
      setShowVersions(true);
      return;
    }
    setLoadingVersions(true);
    const { data } = await supabase
      .from("deck_versions")
      .select("*")
      .eq("deck_id", id)
      .order("created_at", { ascending: false })
      .limit(10);
    setVersions(data || []);
    setShowVersions(true);
    setLoadingVersions(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this deck? This cannot be undone.")) return;
    setDeleting(true);
    const { error: delErr } = await supabase.from("decks").delete().eq("id", id);
    if (delErr) { setError(delErr.message); setDeleting(false); return; }
    router.push("/decks");
  }

  async function togglePin() {
    if (!deck) return;
    const newVal = !deck.is_pinned;
    const { error: updErr } = await supabase
      .from("decks")
      .update({ is_pinned: newVal, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updErr) { setError(updErr.message); return; }
    setDeck(d => ({ ...d, is_pinned: newVal }));
  }

  async function toggleFavorite() {
    if (!deck) return;
    const newVal = !deck.is_favorite;
    const { error: updErr } = await supabase
      .from("decks")
      .update({ is_favorite: newVal, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updErr) { setError(updErr.message); return; }
    setDeck(d => ({ ...d, is_favorite: newVal }));
  }

  const htmlContent = useMemo(() => deck ? renderMarkdown(deck.content) : "", [deck]);
  const headings = useMemo(() => deck ? extractHeadings(deck.content) : [], [deck]);

  if (loading) {
    return <main className="min-h-screen p-6 bg-black text-white"><div className="max-w-4xl mx-auto text-gray-400">Loading deck...</div></main>;
  }

  if (error && !deck) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>
          <button type="button" onClick={() => router.push("/decks")} className="w-full py-3 rounded-lg bg-gray-800 font-bold">← Back to Decks</button>
        </div>
      </main>
    );
  }

  const catInfo = getCategoryInfo(deck.category);
  const tableInfo = getSetupTableInfo(deck.linked_setup_table);
  const setupUrl = setupHref(deck.linked_setup_table, deck.linked_setup_id);

  const displayEntry = linkedSetup?.entry_price || linkedSetup?.active_entry;
  const displaySl = linkedSetup?.stop_loss || linkedSetup?.active_sl;
  const displayTp2 = linkedSetup?.tp2_price || linkedSetup?.active_tp2;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Back link */}
        <button
          type="button"
          onClick={() => router.push("/decks")}
          className="text-xs text-indigo-300 hover:text-indigo-200"
        >
          ← All Decks
        </button>

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-bold bg-${catInfo.accent}-900/30 border-${catInfo.accent}-800 text-${catInfo.accent}-200`}>
                {catInfo.emoji} {catInfo.label}
              </span>
              {deck.is_daily && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 border border-blue-700 text-blue-200 font-bold">📅 DAILY</span>
              )}
              {deck.status === "draft" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 border border-yellow-700 text-yellow-200 font-bold">DRAFT</span>
              )}
              {deck.is_pinned && (
                <span className="text-xs text-indigo-300 font-bold">📌 Pinned</span>
              )}
              {deck.is_favorite && (
                <span className="text-xs text-amber-300 font-bold">★ Favorite</span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-white leading-tight">{deck.title || "Untitled Deck"}</h1>
            <p className="text-xs text-gray-500 mt-2">
              Created {shortDateTime(deck.created_at)} · Updated {relativeTime(deck.updated_at)}
            </p>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={togglePin}
              className={`text-xs px-2 py-2 rounded-lg border font-semibold ${deck.is_pinned ? "bg-indigo-900/40 border-indigo-700 text-indigo-200" : "bg-gray-900 border-gray-800 text-gray-400"}`}
              title={deck.is_pinned ? "Unpin" : "Pin"}
            >
              📌
            </button>
            <button
              type="button"
              onClick={toggleFavorite}
              className={`text-xs px-2 py-2 rounded-lg border font-semibold ${deck.is_favorite ? "bg-amber-900/40 border-amber-700 text-amber-200" : "bg-gray-900 border-gray-800 text-gray-400"}`}
              title={deck.is_favorite ? "Unfavorite" : "Favorite"}
            >
              ★
            </button>
            <button
              type="button"
              onClick={() => router.push(`/decks/new?edit=${deck.id}`)}
              className="text-xs px-3 py-2 rounded-lg bg-blue-900/40 text-blue-300 font-semibold"
            >
              ✏️ Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs px-3 py-2 rounded-lg bg-red-900/40 text-red-300 font-semibold disabled:opacity-50"
            >
              {deleting ? "..." : "🗑"}
            </button>
          </div>
        </div>

        {/* Tags */}
        {deck.tags && deck.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {deck.tags.map(t => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 border border-purple-800 text-purple-200 font-mono">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Linked setup card */}
        {linkedSetup && tableInfo && setupUrl && (
          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/60 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs font-bold text-amber-200">
                🔗 Linked {tableInfo.emoji} {tableInfo.label} Setup
              </p>
              <a
                href={setupUrl}
                className="text-xs text-amber-300 hover:text-amber-200 font-semibold"
              >
                Open Setup →
              </a>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-xs">
              <span className="font-bold text-white">{linkedSetup.pair || "Untitled"}</span>
              {displayEntry && <span className="text-yellow-400">Entry {displayEntry}</span>}
              {displaySl && <span className="text-red-400">SL {displaySl}</span>}
              {displayTp2 && <span className="text-green-400">TP2 {displayTp2}</span>}
              <span className="text-gray-500">· {new Date(linkedSetup.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        )}

        {/* Two-column layout: content + TOC */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Content */}
          <div className="lg:col-span-3 p-5 rounded-lg bg-gray-900 border border-gray-800">
            {deck.content ? (
              <div
                className="prose-custom"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            ) : (
              <p className="text-gray-500 italic text-sm">This deck has no content yet.</p>
            )}
          </div>

          {/* Sidebar — TOC + other decks */}
          <div className="lg:col-span-1 space-y-3">
            {headings.length > 0 && (
              <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Contents</p>
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {headings.map((h, i) => (
                    <a
                      key={i}
                      href={`#${h.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById(h.id);
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="block text-xs text-gray-400 hover:text-indigo-300 truncate"
                      style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
                    >
                      {h.text}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {linkedDecks.length > 0 && (
              <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Other decks on this setup</p>
                {linkedDecks.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => router.push(`/decks/${d.id}`)}
                    className="w-full text-left text-xs text-indigo-300 hover:text-indigo-200 truncate"
                  >
                    📓 {d.title}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={loadVersions}
              className="w-full p-2 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 text-xs text-gray-400 hover:text-white"
            >
              🕐 View Version History
            </button>
          </div>
        </div>

        {/* Screenshots gallery */}
        {screenshots.length > 0 && (
          <div className="p-4 rounded-lg bg-gray-900 border-2 border-emerald-800 space-y-3">
            <div>
              <h2 className="text-sm font-bold text-emerald-300">📸 Screenshots</h2>
              <p className="text-xs text-gray-500 mt-0.5">{screenshots.length} attached</p>
            </div>
            <ScreenshotGallery
              screenshots={screenshots}
              onDelete={(deletedId) => setScreenshots(prev => prev.filter(s => s.id !== deletedId))}
            />
          </div>
        )}

        {/* Version history modal */}
        {showVersions && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowVersions(false)}>
            <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-3 border-b border-gray-800 flex items-center justify-between">
                <p className="text-sm font-bold">🕐 Version History (last {versions.length})</p>
                <button type="button" onClick={() => setShowVersions(false)} className="text-gray-400 hover:text-white text-sm">✕</button>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-2">
                {loadingVersions && <p className="text-center text-xs text-gray-500 py-4">Loading...</p>}
                {!loadingVersions && versions.length === 0 && (
                  <p className="text-center text-xs text-gray-500 py-4">No versions yet. Versions are created each time you save.</p>
                )}
                {versions.map((v, i) => (
                  <div key={v.id} className="p-2 rounded border border-gray-800 text-xs">
                    <p className="font-bold text-gray-200">Version {versions.length - i} · {shortDateTime(v.created_at)}</p>
                    {v.title && <p className="text-gray-400 mt-0.5 truncate">Title: {v.title}</p>}
                    {v.content && (
                      <p className="text-gray-500 mt-1 line-clamp-2">{v.content.slice(0, 120)}…</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}

        {/* Footer back link */}
        <button
          type="button"
          onClick={() => router.push("/decks")}
          className="w-full py-3 rounded-lg bg-gray-800 font-bold"
        >
          ← Back to Decks
        </button>
      </div>
    </main>
  );
}