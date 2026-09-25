"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { MANUAL_PARTS, getAllChapters } from "@/lib/manualContent";

export default function ManualPage() {
  const [search, setSearch] = useState("");

  const allChapters = getAllChapters();

  const filtered = useMemo(() => {
    if (!search.trim()) return MANUAL_PARTS;
    const q = search.toLowerCase();
    return MANUAL_PARTS.map((part) => ({
      ...part,
      chapters: part.chapters.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          String(c.number).includes(q)
      ),
    })).filter((part) => part.chapters.length > 0);
  }, [search]);

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            The Institutional Flow System
          </h1>
          <p className="text-gray-400 text-sm">
            Complete Operating Manual
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {allChapters.length} chapters · personal reference
          </p>
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chapters..."
            className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-800 focus:border-blue-500 outline-none text-sm"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-gray-400">
              No chapters match "{search}"
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filtered.map((part) => (
              <div key={part.key}>
                <h2 className="text-xs uppercase tracking-wider text-blue-400 font-bold mb-2">
                  Part {part.number} — {part.title}
                </h2>
                <div className="space-y-1.5">
                  {part.chapters.map((chapter) => (
                    <Link
                      key={chapter.key}
                      href={`/manual/${chapter.key}`}
                      className="block p-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-blue-600 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          <span className="text-gray-500 mr-2">
                            Ch {chapter.number}.
                          </span>
                          {chapter.title}
                        </span>
                        <span className="text-xs text-gray-600">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}