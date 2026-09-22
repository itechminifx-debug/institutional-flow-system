"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { tagColor, tagLabel, formatNoteDate } from "@/lib/notesHelpers";

export default function NotesPage() {
  const supabase = createClient();
  const [tab, setTab] = useState("notes"); // "notes" | "trades"
  const [notes, setNotes] = useState([]);
  const [tradeNotes, setTradeNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [notesRes, tradesRes] = await Promise.all([
        supabase
          .from("notes")
          .select("*")
          .order("pinned", { ascending: false })
          .order("updated_at", { ascending: false }),
        supabase
          .from("trades")
          .select("id, pair, notes, status, opened_at, emotion")
          .not("notes", "is", null)
          .neq("notes", "")
          .order("opened_at", { ascending: false }),
      ]);

      setNotes(notesRes.data || []);
      setTradeNotes(tradesRes.data || []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = search.toLowerCase();
  const filteredNotes = notes.filter(
    (n) =>
      !q ||
      (n.title || "").toLowerCase().includes(q) ||
      (n.body || "").toLowerCase().includes(q) ||
      (n.tag || "").toLowerCase().includes(q)
  );

  const filteredTradeNotes = tradeNotes.filter(
    (t) =>
      !q ||
      (t.pair || "").toLowerCase().includes(q) ||
      (t.notes || "").toLowerCase().includes(q) ||
      (t.emotion || "").toLowerCase().includes(q)
  );

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Notes</h1>
            <p className="text-gray-400 text-sm">
              Your personal notes, insights, and lessons
            </p>
          </div>
          {tab === "notes" && (
            <Link
              href="/notes/new"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium"
            >
              + New Note
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setTab("notes")}
            className={`flex-1 py-2 rounded-lg text-sm transition ${
              tab === "notes"
                ? "bg-blue-600 text-white font-medium"
                : "bg-gray-900 text-gray-400 hover:bg-gray-800"
            }`}
          >
            My Notes ({notes.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("trades")}
            className={`flex-1 py-2 rounded-lg text-sm transition ${
              tab === "trades"
                ? "bg-blue-600 text-white font-medium"
                : "bg-gray-900 text-gray-400 hover:bg-gray-800"
            }`}
          >
            Trade Notes ({tradeNotes.length})
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mb-4 px-4 py-3 rounded-lg bg-gray-900 border border-gray-800 focus:border-blue-500 outline-none text-sm"
        />

        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading...</p>
        ) : tab === "notes" ? (
          filteredNotes.length === 0 ? (
            <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
              <p className="text-gray-400 mb-4">
                {search ? "No notes match your search." : "No notes yet."}
              </p>
              {!search && (
                <Link
                  href="/notes/new"
                  className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
                >
                  Create your first note
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotes.map((n) => (
                <Link
                  key={n.id}
                  href={`/notes/${n.id}`}
                  className={`block p-4 rounded-lg border transition hover:border-blue-600 ${
                    n.pinned
                      ? "bg-yellow-950/30 border-yellow-800"
                      : "bg-gray-900 border-gray-800"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {n.pinned && <span className="text-yellow-500">📌</span>}
                      <h3 className="font-semibold">{n.title}</h3>
                      {n.tag && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${tagColor(
                            n.tag
                          )}`}
                        >
                          {tagLabel(n.tag)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {formatNoteDate(n.updated_at)}
                    </span>
                  </div>
                  {n.body && (
                    <p className="text-gray-400 text-sm line-clamp-2">
                      {n.body}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )
        ) : (
          /* Trade notes tab */
          filteredTradeNotes.length === 0 ? (
            <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
              <p className="text-gray-400">
                No trade journal notes yet. Add notes to your trades in the
                Journal.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTradeNotes.map((t) => (
                <Link
                  key={t.id}
                  href={`/journal/${t.id}`}
                  className="block p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-600 transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{t.pair}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          t.status === "won"
                            ? "bg-green-900/40 text-green-300"
                            : t.status === "lost"
                            ? "bg-red-900/40 text-red-300"
                            : "bg-gray-800 text-gray-300"
                        }`}
                      >
                        {t.status}
                      </span>
                      {t.emotion && (
                        <span className="text-xs text-gray-500">
                          · {t.emotion}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatNoteDate(t.opened_at)}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">{t.notes}</p>
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </main>
  );
}