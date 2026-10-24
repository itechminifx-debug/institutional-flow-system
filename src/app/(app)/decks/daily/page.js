"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import {
  SETUP_TABLES,
  todayDateString,
  dailyDeckTitle,
  dailyDeckTemplate,
  shortDateTime,
} from "@/lib/decksEngine";
import { renderMarkdown } from "@/lib/markdown";

export default function DailyDeckPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deckId, setDeckId] = useState(null);
  const [deck, setDeck] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [todaySetups, setTodaySetups] = useState([]);
  const [linkedSetupId, setLinkedSetupId] = useState(null);
  const [isNew, setIsNew] = useState(false);

  const today = todayDateString();

  // Load or create today's daily deck
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated.");
        setLoading(false);
        return;
      }

      // Try to find today's daily deck
      const { data: existing, error: fetchErr } = await supabase
        .from("decks")
        .select("*")
        .eq("is_daily", true)
        .eq("daily_date", today)
        .maybeSingle();

      if (fetchErr) {
        setError(fetchErr.message);
        setLoading(false);
        return;
      }

      if (existing) {
        setDeck(existing);
        setDeckId(existing.id);
        setDraftContent(existing.content || "");
        setLinkedSetupId(existing.linked_setup_id);
        setIsNew(false);
      } else {
        // Deck doesn't exist yet — mark as new (we'll create on first save)
        setIsNew(true);
        setDraftContent(dailyDeckTemplate(today));
      }

      // Load today's activity from all systems
      await loadTodayActivity();

      setLoading(false);
    }
    load();
  }, [today, supabase]);

  async function loadTodayActivity() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startISO = startOfDay.toISOString();

    const results = [];

    for (const table of SETUP_TABLES) {
      const { data, error } = await supabase
        .from(table.key)
        .select("id, pair, created_at, status")
        .gte("created_at", startISO)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data && data.length > 0) {
        data.forEach(s => {
          results.push({
            ...s,
            tableKey: table.key,
            tableLabel: table.label,
            tableEmoji: table.emoji,
            systemHref: table.systemHref,
          });
        });
      }
    }

    results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setTodaySetups(results);
  }

  async function createDailyDeck() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); return null; }

    const payload = {
      user_id: user.id,
      title: `${dailyDeckTitle(today)} — Daily Deck`,
      content: draftContent,
      content_format: "markdown",
      category: "general",
      tags: ["daily"],
      template_used: "blank",
      status: "published",
      is_daily: true,
      daily_date: today,
      daily_setups_count: todaySetups.length,
    };

    const { data, error: insErr } = await supabase
      .from("decks")
      .insert(payload)
      .select()
      .single();

    if (insErr) { setError(insErr.message); return null; }
    return data;
  }

  async function updateDailyDeck() {
    if (!deckId) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); return null; }

    // Save version before updating
    if (deck) {
      await supabase.from("deck_versions").insert({
        deck_id: deckId,
        user_id: user.id,
        title: deck.title,
        content: deck.content,
        tags: deck.tags,
      });
    }

    const { data, error: updErr } = await supabase
      .from("decks")
      .update({
        content: draftContent,
        updated_at: new Date().toISOString(),
        daily_setups_count: todaySetups.length,
      })
      .eq("id", deckId)
      .select()
      .single();

    if (updErr) { setError(updErr.message); return null; }
    return data;
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    let row;
    if (isNew) {
      row = await createDailyDeck();
    } else {
      row = await updateDailyDeck();
    }

    setSaving(false);
    if (!row) return;

    setDeck(row);
    setDeckId(row.id);
    setIsNew(false);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleEditToggle() {
    if (editing) {
      // Cancel editing — reset content
      setDraftContent(deck?.content || dailyDeckTemplate(today));
      setEditing(false);
    } else {
      setEditing(true);
    }
  }

  const previewHtml = useMemo(() => renderMarkdown(draftContent), [draftContent]);
  const displayContent = editing ? null : (deck ? deck.content : draftContent);
  const displayHtml = useMemo(
    () => renderMarkdown(displayContent || ""),
    [displayContent]
  );

  // Group today's setups by system
  const setupsBySystem = useMemo(() => {
    const groups = {};
    todaySetups.forEach(s => {
      if (!groups[s.tableKey]) groups[s.tableKey] = [];
      groups[s.tableKey].push(s);
    });
    return groups;
  }, [todaySetups]);

  if (loading) {
    return <main className="min-h-screen p-6 bg-black text-white"><div className="max-w-4xl mx-auto text-gray-400">Loading your daily deck...</div></main>;
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">📅 Daily Deck</h1>
            <p className="text-gray-400 text-sm">{dailyDeckTitle(today)}</p>
            {deck && (
              <p className="text-xs text-gray-500 mt-1">
                Last saved {shortDateTime(deck.updated_at)}
              </p>
            )}
            {isNew && (
              <p className="text-xs text-indigo-300 mt-1">
                ✨ Your first save will create today's deck
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => router.push("/decks")}
              className="text-xs px-3 py-2 rounded-lg bg-gray-800 text-gray-300 font-semibold"
            >
              ← All Decks
            </button>
            {deck && (
              <button
                type="button"
                onClick={() => router.push(`/decks/${deck.id}`)}
                className="text-xs px-3 py-2 rounded-lg bg-indigo-900/40 text-indigo-300 font-semibold"
              >
                Full View →
              </button>
            )}
          </div>
        </div>

        {/* Today's Activity Summary */}
        {todaySetups.length > 0 && (
          <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-800/60 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-bold text-blue-200">
                📊 Today's Activity — {todaySetups.length} setup{todaySetups.length === 1 ? "" : "s"} saved
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-1">
              {SETUP_TABLES.map(t => {
                const count = (setupsBySystem[t.key] || []).length;
                return (
                  <div
                    key={t.key}
                    className={`p-2 rounded text-center ${
                      count > 0
                        ? "bg-blue-900/30 border border-blue-700"
                        : "bg-black/40 border border-gray-800 opacity-50"
                    }`}
                  >
                    <p className="text-[10px] text-gray-400">{t.emoji} {t.label}</p>
                    <p className={`text-sm font-bold ${count > 0 ? "text-blue-200" : "text-gray-600"}`}>{count}</p>
                  </div>
                );
              })}
            </div>
            <div className="max-h-40 overflow-y-auto pt-2 border-t border-blue-800/40 space-y-1">
              {todaySetups.map(s => (
                <button
                  key={`${s.tableKey}-${s.id}`}
                  type="button"
                  onClick={() => router.push(`${s.systemHref}/${s.id}`)}
                  className="w-full text-left flex items-center justify-between gap-2 p-1.5 rounded hover:bg-blue-900/30 text-xs transition"
                >
                  <span className="flex items-center gap-1.5">
                    <span>{s.tableEmoji}</span>
                    <span className="font-mono text-gray-500">{new Date(s.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="text-gray-200 font-bold">{s.pair}</span>
                  </span>
                  <span className="text-gray-500">{s.status === "draft" ? "📝" : "✅"}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {todaySetups.length === 0 && (
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-xs text-gray-500 text-center">
            No setups saved today yet. Check back later — they'll auto-appear here.
          </div>
        )}

        {/* The deck content */}
        <div className="rounded-lg bg-gray-900 border border-gray-800 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2 p-2 border-b border-gray-800 bg-black/40">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-gray-300">
                {editing ? "✏️ Editing" : "📖 Reading"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleEditToggle}
              className={`text-xs px-3 py-1.5 rounded font-semibold transition ${
                editing
                  ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  : "bg-indigo-700 text-white hover:bg-indigo-600"
              }`}
            >
              {editing ? "Cancel" : "✏️ Edit"}
            </button>
          </div>

          {/* Content area */}
          {editing ? (
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="What's on your mind today?..."
              className="w-full p-4 bg-black text-gray-200 font-mono text-sm resize-none focus:outline-none"
              rows={24}
              spellCheck="false"
            />
          ) : (
            <div className="p-5">
              {displayContent ? (
                <div
                  className="prose-custom"
                  dangerouslySetInnerHTML={{ __html: displayHtml }}
                />
              ) : (
                <p className="text-gray-500 italic text-sm">Click "✏️ Edit" to start writing...</p>
              )}
            </div>
          )}

          {/* Footer info */}
          {editing && (
            <div className="p-2 border-t border-gray-800 text-[10px] text-gray-500 flex items-center justify-between">
              <span>{draftContent.split(/\s+/).filter(Boolean).length} words</span>
              <span>Markdown supported · Auto-saved on save button</span>
            </div>
          )}
        </div>

        {/* Save button (only in edit mode) */}
        {editing && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !draftContent.trim()}
            className="w-full py-4 rounded-lg font-bold disabled:opacity-50 bg-indigo-700 hover:bg-indigo-600 text-white"
          >
            {saving ? "Saving..." : isNew ? "✅ Create Today's Deck" : "💾 Save Daily Deck"}
          </button>
        )}

        {/* Saved confirmation */}
        {saved && (
          <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">
            ✅ Saved — today's deck is up to date
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Daily Doctrine Reminder */}
        <div className="p-3 rounded-lg bg-red-950/20 border border-red-800/60 space-y-2">
          <p className="text-xs font-bold text-red-200">📜 Today's Doctrine Reminder</p>
          <div className="space-y-1 text-[11px] text-red-100/80">
            <p>• <strong>Commandment #1:</strong> Never trade a BOS breakout — it's the trap.</p>
            <p>• <strong>Commandment #2:</strong> Never trade a CHoCH without displacement.</p>
            <p>• <strong>Commandment #6:</strong> In the middle of an Accumulation Range, do nothing.</p>
            <p>• <strong>Commandment #10:</strong> No DOL, no trade.</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => router.push("/decks/new")}
            className="p-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-indigo-700 text-xs font-bold text-gray-300"
          >
            + New Deck
          </button>
          <button
            type="button"
            onClick={() => router.push("/ams/journal")}
            className="p-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-red-700 text-xs font-bold text-gray-300"
          >
            👑 AMS Journal
          </button>
          <button
            type="button"
            onClick={() => router.push("/ams/history")}
            className="p-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-red-700 text-xs font-bold text-gray-300"
          >
            📜 AMS History
          </button>
          <button
            type="button"
            onClick={() => router.push("/ams/manual")}
            className="p-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-red-700 text-xs font-bold text-gray-300"
          >
            📖 AMS Manual
          </button>
        </div>
      </div>
    </main>
  );
}