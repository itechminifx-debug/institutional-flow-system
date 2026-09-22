"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { tagColor, tagLabel } from "@/lib/notesHelpers";

export default function PinnedNotesWidget() {
  const supabase = createClient();
  const [notes, setNotes] = useState([]);
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
        .from("notes")
        .select("*")
        .eq("pinned", true)
        .order("updated_at", { ascending: false })
        .limit(3);

      setNotes(data || []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || notes.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-3 text-yellow-400">
        📌 Pinned Notes
      </h2>
      <div className="space-y-3">
        {notes.map((n) => (
          <Link
            key={n.id}
            href={`/notes/${n.id}`}
            className="block p-4 rounded-lg bg-yellow-950/30 border border-yellow-800 hover:border-yellow-600 transition"
          >
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">{n.title}</h3>
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
            {n.body && (
              <p className="text-gray-400 text-xs line-clamp-2">{n.body}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}