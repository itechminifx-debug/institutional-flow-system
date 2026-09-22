"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { NOTE_TAGS } from "@/lib/notesHelpers";

export default function NewNotePage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setError("");
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("notes").insert({
      user_id: user.id,
      title: title.trim(),
      body: body.trim(),
      tag: tag || null,
      pinned,
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push("/notes");
  }

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/notes" className="text-blue-400 text-sm hover:underline">
            ← Back to Notes
          </Link>
          <h1 className="text-2xl font-bold mt-2">New Note</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm mb-2 text-gray-300">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Rule: Wait for H4 rejection"
              className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-800 focus:border-blue-500 outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-300">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Write your thoughts..."
              className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-800 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-300">Tag</label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setTag("")}
                className={`py-2 rounded-lg text-sm transition ${
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
                  className={`py-2 rounded-lg text-sm transition ${
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
            <span className="text-sm">
              📌 Pin this note to my dashboard
            </span>
          </label>

          {error && (
            <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Note"}
          </button>
        </form>
      </div>
    </main>
  );
}