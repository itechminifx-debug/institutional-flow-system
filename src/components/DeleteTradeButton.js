"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function DeleteTradeButton({ tradeId, pair }) {
  const router = useRouter();
  const supabase = createClient();

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("trades")
      .delete()
      .eq("id", tradeId);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    router.push("/journal");
    router.refresh();
  }

  if (!confirming) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="w-full py-3 rounded-lg bg-gray-900 border border-red-900 hover:border-red-700 text-red-400 hover:text-red-300 text-sm"
        >
          Delete Trade
        </button>
        <p className="text-gray-600 text-xs text-center mt-2">
          Permanently removes this trade from the journal.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-red-950/40 border border-red-800 space-y-3">
      <p className="text-red-200 text-sm text-center">
        Delete <strong>{pair}</strong> trade? This cannot be undone.
      </p>

      {error && (
        <p className="text-red-300 text-xs text-center">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="py-3 rounded-lg bg-red-700 hover:bg-red-600 text-sm font-medium disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Confirm Delete"}
        </button>
      </div>
    </div>
  );
}