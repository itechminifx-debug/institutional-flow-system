"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";

const BUCKET = "amd-screenshots";

export default function ScreenshotGallery({
  screenshots,
  onDelete,
  readonly = false,
  table = "amd_screenshots", // <-- Add this prop
}) {
  const supabase = createClient();
  const [urls, setUrls] = useState({});
  const [loadingUrls, setLoadingUrls] = useState(true);
  const [lightbox, setLightbox] = useState(null); // url string
  const [deletingId, setDeletingId] = useState(null);

  // Generate signed URLs for all screenshots
  useEffect(() => {
    let cancelled = false;

    async function loadUrls() {
      if (!screenshots || screenshots.length === 0) {
        setUrls({});
        setLoadingUrls(false);
        return;
      }

      setLoadingUrls(true);
      const paths = screenshots.map((s) => s.storage_path);

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, 3600); // 1 hour

      if (cancelled) return;

      if (error || !data) {
        setLoadingUrls(false);
        return;
      }

      const map = {};
      data.forEach((entry) => {
        if (entry.signedUrl) map[entry.path] = entry.signedUrl;
      });
      setUrls(map);
      setLoadingUrls(false);
    }

    loadUrls();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenshots]);

  async function handleDelete(shot) {
    if (readonly) return;
    if (!confirm(`Delete this screenshot?`)) return;

    setDeletingId(shot.id);

    // Delete file from storage
    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .remove([shot.storage_path]);

    if (storageErr) {
      console.error("Storage delete failed:", storageErr.message);
    }

    // Delete metadata row from the correct table
    const { error: metaErr } = await supabase
      .from(table) // <-- Use the dynamic table prop
      .delete()
      .eq("id", shot.id);

    setDeletingId(null);

    if (metaErr) {
      console.error("Metadata delete failed:", metaErr.message);
      return;
    }

    if (onDelete) onDelete(shot.id);
  }

  if (!screenshots || screenshots.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-black border border-gray-800 text-center">
        <p className="text-xs text-gray-500">
          No screenshots attached yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {screenshots.map((shot) => {
          const url = urls[shot.storage_path];
          const isDeleting = deletingId === shot.id;

          return (
            <div
              key={shot.id}
              className="relative rounded-lg overflow-hidden border border-gray-800 bg-black group"
            >
              {/* Image */}
              {url ? (
                <img
                  src={url}
                  alt={shot.caption || shot.file_name || "screenshot"}
                  onClick={() => setLightbox(url)}
                  className="w-full h-40 object-cover cursor-pointer hover:opacity-90 transition"
                />
              ) : (
                <div className="w-full h-40 flex items-center justify-center text-xs text-gray-500">
                  {loadingUrls ? "Loading..." : "Unavailable"}
                </div>
              )}

              {/* Delete button (top-right) */}
              {!readonly && (
                <button
                  type="button"
                  onClick={() => handleDelete(shot)}
                  disabled={isDeleting}
                  className="absolute top-1 right-1 text-xs px-2 py-1 rounded bg-red-900/80 hover:bg-red-800 text-white font-bold opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
                >
                  {isDeleting ? "..." : "✕"}
                </button>
              )}

              {/* Caption / filename footer */}
              <div className="p-2 bg-gray-900/80">
                <p className="text-xs text-gray-300 truncate">
                  {shot.caption || shot.file_name || "Screenshot"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="screenshot full view"
            className="max-w-full max-h-full object-contain"
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-2xl font-bold bg-black/60 rounded-full w-10 h-10 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}