"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default function ManualScreenshot({ chapterKey }) {
  const supabase = createClient();
  const [shots, setShots] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
        .from("manual_screenshots")
        .select("*")
        .eq("user_id", user.id)
        .eq("chapter_key", chapterKey)
        .order("created_at", { ascending: true });

      setShots(data || []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterKey]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError("Image is larger than 5 MB.");
      return;
    }

    setError("");
    setUploading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated.");
      setUploading(false);
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${chapterKey}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("manual-screenshots")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("manual-screenshots")
      .getPublicUrl(path);

    const { data, error: insertError } = await supabase
      .from("manual_screenshots")
      .insert({
        user_id: user.id,
        chapter_key: chapterKey,
        caption: caption || null,
        storage_path: path,
        public_url: urlData.publicUrl,
      })
      .select()
      .single();

    setUploading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setShots((prev) => [...prev, data]);
    setCaption("");
    e.target.value = "";
  }

  async function handleDelete(shot) {
    if (!window.confirm("Delete this screenshot?")) return;

    await supabase.storage.from("manual-screenshots").remove([shot.storage_path]);
    const { error: delError } = await supabase
      .from("manual_screenshots")
      .delete()
      .eq("id", shot.id);

    if (delError) return;
    setShots((prev) => prev.filter((s) => s.id !== shot.id));
  }

  if (loading) return null;

  return (
    <div className="my-6 p-4 rounded-lg bg-blue-950/20 border border-blue-900/40 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-blue-300">
          📸 Screenshots for this chapter
        </h4>
        <span className="text-xs text-gray-500">
          {shots.length} saved
        </span>
      </div>

      {shots.length > 0 && (
        <div className="space-y-3">
          {shots.map((shot) => (
            <div
              key={shot.id}
              className="rounded-lg overflow-hidden border border-gray-800 bg-black/40"
            >
              <a
                href={shot.public_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={shot.public_url}
                  alt={shot.caption || "Manual screenshot"}
                  className="w-full h-auto"
                />
              </a>
              <div className="p-2 flex items-start justify-between gap-2">
                {shot.caption && (
                  <p className="text-xs text-gray-300 flex-1">
                    {shot.caption}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(shot)}
                  className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-red-900 text-red-400 shrink-0"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {shots.length === 0 && (
        <p className="text-xs text-gray-500">
          No screenshots yet. Upload one below to illustrate this chapter.
        </p>
      )}

      <div className="space-y-2 pt-2 border-t border-blue-900/40">
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Optional caption (e.g. Valid RFZ example)"
          className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none text-xs"
        />

        <label className="block">
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          <div className="w-full py-2.5 rounded-lg border border-dashed border-blue-800 hover:border-blue-600 text-center text-xs text-gray-400 hover:text-blue-400 transition cursor-pointer">
            {uploading ? "Uploading..." : "+ Upload Screenshot"}
          </div>
        </label>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}