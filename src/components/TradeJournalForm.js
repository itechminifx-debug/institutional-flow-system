"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

const EMOTIONS = [
  "Calm",
  "Confident",
  "Anxious",
  "FOMO",
  "Revenge",
  "Patient",
  "Disciplined",
];

export default function TradeJournalForm({ trade }) {
  const router = useRouter();
  const supabase = createClient();

  const [notes, setNotes] = useState(trade.notes || "");
  const [emotion, setEmotion] = useState(trade.emotion || "Calm");
  const [resultPips, setResultPips] = useState(trade.result_pips ?? "");
  const [resultPercent, setResultPercent] = useState(
    trade.result_percent ?? ""
  );

  const [partialTaken, setPartialTaken] = useState(
    trade.partial_taken || false
  );
  const [slMovedToBe, setSlMovedToBe] = useState(trade.sl_moved_to_be || false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function saveJournal() {
    setError("");
    setSuccess("");
    setLoading(true);

    const { error: updateError } = await supabase
      .from("trades")
      .update({
        notes,
        emotion,
        partial_taken: partialTaken,
        sl_moved_to_be: slMovedToBe,
      })
      .eq("id", trade.id);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Journal saved.");
    setTimeout(() => setSuccess(""), 2000);
  }

  async function closeTrade(status) {
    const confirmed = window.confirm(
      `Mark this trade as ${status.toUpperCase()}?`
    );
    if (!confirmed) return;

    setError("");
    setLoading(true);

    const { error: updateError } = await supabase
      .from("trades")
      .update({
        status,
        result_pips: resultPips ? parseFloat(resultPips) : null,
        result_percent: resultPercent ? parseFloat(resultPercent) : null,
        notes,
        emotion,
        partial_taken: partialTaken,
        sl_moved_to_be: slMovedToBe,
        closed_at: new Date().toISOString(),
      })
      .eq("id", trade.id);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/journal");
    router.refresh();
  }

  const isOpen = trade.status === "open";
  const isClosed = !isOpen;

  return (
    <div className="space-y-6">
      {/* Trade summary */}
      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              trade.direction === "buy"
                ? "bg-green-900/40 text-green-300"
                : "bg-red-900/40 text-red-300"
            }`}
          >
            {trade.direction}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">
            {trade.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Entry</p>
            <p className="font-bold tabular-nums text-white">
              {trade.entry_price ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">SL</p>
            <p className="font-bold tabular-nums text-red-300">
              {trade.stop_loss ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">TP</p>
            <p className="font-bold tabular-nums text-green-300">
              {trade.take_profit ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Lot Size</p>
            <p className="font-bold tabular-nums text-white">
              {trade.lot_size ?? "—"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Risk %</p>
            <p className="text-white">{trade.risk_percent ?? "—"}%</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">RR Ratio</p>
            <p className="text-white">
              {trade.rr_ratio ? `1:${trade.rr_ratio}` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Trade management toggles */}
      {isOpen && (
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-lg font-semibold text-blue-400">
            Trade Management
          </h2>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={partialTaken}
              onChange={(e) => setPartialTaken(e.target.checked)}
              className="w-5 h-5 accent-yellow-500"
            />
            <span className="text-sm">
              Partial taken at 1:1 (Rule 12)
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={slMovedToBe}
              onChange={(e) => setSlMovedToBe(e.target.checked)}
              className="w-5 h-5 accent-blue-500"
            />
            <span className="text-sm">
              Stop loss moved to break-even (Rule 12)
            </span>
          </label>
        </div>
      )}

      {/* Journal entry */}
      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
        <h2 className="text-lg font-semibold text-blue-400">
          Journal Entry (Step 15)
        </h2>

        <div>
          <label className="block text-sm mb-2 text-gray-300">
            How did you feel?
          </label>
          <select
            value={emotion}
            onChange={(e) => setEmotion(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
          >
            {EMOTIONS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-2 text-gray-300">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="What did you do well? What could be improved?"
            className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none resize-none"
          />
        </div>
      </div>

      {/* Close trade section */}
      {isOpen && (
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-lg font-semibold text-blue-400">
            Close Trade
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-2 text-gray-300">
                Result (Pips)
              </label>
              <input
                type="number"
                step="any"
                value={resultPips}
                onChange={(e) => setResultPips(e.target.value)}
                placeholder="e.g. 50"
                className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm mb-2 text-gray-300">
                Result (%)
              </label>
              <input
                type="number"
                step="any"
                value={resultPercent}
                onChange={(e) => setResultPercent(e.target.value)}
                placeholder="e.g. 2"
                className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => closeTrade("won")}
              disabled={loading}
              className="py-3 rounded-lg bg-green-700 hover:bg-green-600 font-medium disabled:opacity-50"
            >
              WON
            </button>
            <button
              type="button"
              onClick={() => closeTrade("lost")}
              disabled={loading}
              className="py-3 rounded-lg bg-red-700 hover:bg-red-600 font-medium disabled:opacity-50"
            >
              LOST
            </button>
            <button
              type="button"
              onClick={() => closeTrade("be")}
              disabled={loading}
              className="py-3 rounded-lg bg-gray-700 hover:bg-gray-600 font-medium disabled:opacity-50"
            >
              B/E
            </button>
          </div>
        </div>
      )}

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

      {/* Save journal button */}
      <button
        type="button"
        onClick={saveJournal}
        disabled={loading}
        className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Journal"}
      </button>
    </div>
  );
}