"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { NOTE_TAGS, formatNoteDate } from "@/lib/notesHelpers";

export default function NoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  const supabase = createClient();

  const [note, setNote] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setError("Note not found.");
        setLoading(false);
        return;
      }

      setNote(data);
      setTitle(data.title || "");
      setBody(data.body || "");
      setTag(data.tag || "");
      setPinned(data.pinned || false);
      setLoading(false);
    }
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setError("");
    setSuccess("");
    setSaving(true);

    const { error: updateError } = await supabase
      .from("notes")
      .update({
        title: title.trim(),
        body: body.trim(),
        tag: tag || null,
        pinned,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Note saved.");
    setTimeout(() => setSuccess(""), 1500);
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this note? This cannot be undone."
    );
    if (!confirmed) return;

    setDeleting(true);
    const { error: deleteError } = await supabase
      .from("notes")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    router.push("/notes");
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-2xl mx-auto">
          <p className="text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  if (!note) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-2xl mx-auto">
          <Link href="/notes" className="text-blue-400 text-sm">
            ← Back to Notes
          </Link>
          <div className="mt-4 p-6 rounded-lg bg-red-900/40 border border-red-700">
            {error || "Note not found."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/notes" className="text-blue-400 text-sm hover:underline">
            ← Back to Notes
          </Link>
          <p className="text-gray-500 text-xs mt-2">
            Created {formatNoteDate(note.created_at)} · Updated{" "}
            {formatNoteDate(note.updated_at)}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2 text-gray-300">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-800 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-300">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-800 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-300">Tag</label>
            <div className="grid grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setTag("")}
                className={`py-2 rounded-lg text-xs transition ${
                  tag === ""
                    ? "bg-blue-600 text-white font-medium"
                    : "bg-gray-900 border border-gray-800 text-gray-400"
                }`}
              >
                None
              </button>
              {NOTE_TAGS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTag(t.key)}
                  className={`py-2 rounded-lg text-xs transition ${
                    tag === t.key
                      ? "bg-blue-600 text-white font-medium"
                      : "bg-gray-900 border border-gray-800 text-gray-400"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-gray-900 border border-gray-800">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="w-5 h-5 accent-yellow-500"
            />
            <span className="text-sm">📌 Pin to dashboard</span>
          </label>

          {error && (
            <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-200 text-sm">
              {success}
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="w-full py-3 rounded-lg bg-gray-900 border border-red-900 hover:border-red-700 text-red-400 text-sm disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Note"}
          </button>
        </div>
      </div>
    </main>
  );
}