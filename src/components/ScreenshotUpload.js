"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 4;

export default function ScreenshotUpload({ tradeId, existingUrls = [], onUpdate }) {
  const supabase = createClient();
  const [urls, setUrls] = useState(existingUrls || []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (urls.length + files.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} screenshots per trade.`);
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

    const newUrls = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" is larger than 5 MB.`);
        continue;
      }

      const ext = file.name.split(".").pop();
      const path = `${user.id}/${tradeId}/${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("trade-screenshots")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setError(uploadError.message);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("trade-screenshots")
        .getPublicUrl(path);

      if (urlData?.publicUrl) {
        newUrls.push(urlData.publicUrl);
      }
    }

    const updated = [...urls, ...newUrls];
    setUrls(updated);

    // Save to trade
    const { error: updateError } = await supabase
      .from("trades")
      .update({ screenshot_urls: updated })
      .eq("id", tradeId);

    if (updateError) {
      setError(updateError.message);
    } else if (onUpdate) {
      onUpdate(updated);
    }

    setUploading(false);
  }

  async function handleDelete(url) {
    const confirmed = window.confirm("Delete this screenshot?");
    if (!confirmed) return;

    // Extract path from URL
    const parts = url.split("/trade-screenshots/");
    if (parts.length !== 2) return;
    const path = parts[1];

    await supabase.storage.from("trade-screenshots").remove([path]);

    const updated = urls.filter((u) => u !== url);
    setUrls(updated);

    await supabase
      .from("trades")
      .update({ screenshot_urls: updated })
      .eq("id", tradeId);

    if (onUpdate) onUpdate(updated);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-blue-400">
          Screenshots ({urls.length}/{MAX_FILES})
        </h3>
      </div>

      {/* Thumbnails */}
      {urls.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {urls.map((url, i) => (
            <div
              key={i}
              className="relative group rounded-lg overflow-hidden border border-gray-800"
            >
              <a href={url} target="_blank" rel="noopener noreferrer">
                <img
                  src={url}
                  alt={`Screenshot ${i + 1}`}
                  className="w-full h-32 object-cover hover:opacity-80 transition"
                />
              </a>
              <button
                type="button"
                onClick={() => handleDelete(url)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-700 hover:bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 transition"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {urls.length < MAX_FILES && (
        <label className="block">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          <div className="w-full py-3 rounded-lg border border-dashed border-gray-700 hover:border-blue-600 text-center text-sm text-gray-400 hover:text-blue-400 transition cursor-pointer disabled:opacity-50">
            {uploading ? "Uploading..." : "+ Add Screenshot"}
          </div>
        </label>
      )}

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}