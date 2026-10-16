"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabaseClient";

const BUCKET = "amd-screenshots";
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_PER_SETUP = 10;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export default function ScreenshotUploader({
  setupId,
  userId,
  screenshots,
  onChange,
  disabled = false,
  table = "amd_screenshots",
}) {
  const supabase = createClient();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function handleFiles(files) {
    setError("");
    if (!files || files.length === 0) return;

    if (!setupId) {
      setError("Save the setup as draft first, then you can attach screenshots.");
      return;
    }
    if (!userId) {
      setError("Not authenticated.");
      return;
    }

    const remaining = MAX_PER_SETUP - (screenshots?.length || 0);
    if (remaining <= 0) {
      setError(`Max ${MAX_PER_SETUP} screenshots per setup.`);
      return;
    }

    const fileList = Array.from(files).slice(0, remaining);
    setUploading(true);
    const newRows = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`Skipped ${file.name} — must be PNG, JPG, or WEBP.`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        setError(`Skipped ${file.name} — over 10 MB.`);
        continue;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
      const path = `${userId}/${setupId}/${Date.now()}-${i}-${safeName}`;

      setProgress(Math.round(((i + 0.5) / fileList.length) * 100));

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (upErr) {
        setError(`Upload failed for ${file.name}: ${upErr.message}`);
        continue;
      }

      const { data: metaRow, error: metaErr } = await supabase
        .from(table)
        .insert({
          user_id: userId,
          setup_id: setupId,
          storage_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          caption: null,
        })
        .select()
        .single();

      if (metaErr) {
        setError(`Saved file but metadata failed: ${metaErr.message}`);
        continue;
      }

      newRows.push(metaRow);
    }

    setProgress(100);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";

    if (newRows.length > 0 && onChange) {
      onChange([...(screenshots || []), ...newRows]);
    }
  }

  function triggerFilePicker() {
    if (inputRef.current) inputRef.current.click();
  }

  const atLimit = (screenshots?.length || 0) >= MAX_PER_SETUP;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      <button
        type="button"
        onClick={triggerFilePicker}
        disabled={uploading || disabled || atLimit || !setupId}
        className={`w-full py-4 rounded-lg border-2 border-dashed transition text-sm font-semibold disabled:opacity-50 ${
          uploading
            ? "bg-blue-950/30 border-blue-700 text-blue-200"
            : atLimit || !setupId
            ? "bg-gray-900 border-gray-800 text-gray-500 cursor-not-allowed"
            : "bg-black border-gray-700 text-gray-300 hover:border-blue-500 hover:text-blue-300"
        }`}
      >
        {uploading
          ? `📤 Uploading... ${progress}%`
          : atLimit
          ? `Max ${MAX_PER_SETUP} screenshots reached`
          : !setupId
          ? "📸 Save draft first to enable uploads"
          : "📸 Click to add chart screenshots"}
      </button>

      {!uploading && setupId && !atLimit && (
        <p className="text-xs text-gray-500 text-center">
          PNG · JPG · WEBP · up to 10 MB each · max {MAX_PER_SETUP} per setup
        </p>
      )}

      {uploading && (
        <div className="w-full h-1.5 bg-gray-800 rounded overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <div className="p-2 rounded bg-red-950/40 border border-red-800 text-red-200 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}