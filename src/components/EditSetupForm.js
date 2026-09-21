"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { PAIRS } from "@/lib/setupHelpers";

export default function EditSetupForm({ setup }) {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    pair: setup.pair || "Volatility 80",
    d1_bias: setup.d1_bias || "bullish",
    ema50_position: setup.ema50_position || "above",
    block_breaker_level: setup.block_breaker_level ?? "",
    aligned_liquidity: setup.aligned_liquidity ?? "",
    rejection_block_zone: setup.rejection_block_zone || "",
    notes: setup.notes || "",
  });

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { error: updateError } = await supabase
      .from("setups")
      .update({
        pair: form.pair,
        d1_bias: form.d1_bias,
        ema50_position: form.ema50_position,
        block_breaker_level: form.block_breaker_level
          ? parseFloat(form.block_breaker_level)
          : null,
        aligned_liquidity: form.aligned_liquidity
          ? parseFloat(form.aligned_liquidity)
          : null,
        rejection_block_zone: form.rejection_block_zone,
        notes: form.notes,
      })
      .eq("id", setup.id);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Setup updated.");
    setTimeout(() => router.push("/setups"), 800);
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this setup? This cannot be undone."
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("setups")
      .delete()
      .eq("id", setup.id);

    setDeleting(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    router.push("/setups");
  }

  async function handleConvertToTrade() {
  // Option B: No DB write — just navigate to the checklist
  // The trade is created only at the final ENTER step.
  router.push(`/trade?setup=${setup.id}`);
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-4">
        <h2 className="text-lg font-semibold text-blue-400">Step 1 — D1 Direction</h2>

        <div>
          <label className="block text-sm mb-2 text-gray-300">Pair</label>
          <select
            value={form.pair}
            onChange={(e) => update("pair", e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
          >
            {PAIRS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-2 text-gray-300">D1 Bias</label>
            <select
              value={form.d1_bias}
              onChange={(e) => update("d1_bias", e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
            >
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-300">EMA 50 Position</label>
            <select
              value={form.ema50_position}
              onChange={(e) => update("ema50_position", e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-4">
        <h2 className="text-lg font-semibold text-blue-400">Step 2 — Block Breaker</h2>
        <div>
          <label className="block text-sm mb-2 text-gray-300">
            Block Breaker Level (Flip Zone)
          </label>
          <input
            type="number"
            step="any"
            value={form.block_breaker_level}
            onChange={(e) => update("block_breaker_level", e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-4">
        <h2 className="text-lg font-semibold text-blue-400">Step 3 — Aligned Liquidity</h2>
        <div>
          <label className="block text-sm mb-2 text-gray-300">Liquidity Level</label>
          <input
            type="number"
            step="any"
            value={form.aligned_liquidity}
            onChange={(e) => update("aligned_liquidity", e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-4">
        <h2 className="text-lg font-semibold text-blue-400">Step 4 — Rejection Block</h2>
        <div>
          <label className="block text-sm mb-2 text-gray-300">Rejection Block Zone</label>
          <input
            type="text"
            value={form.rejection_block_zone}
            onChange={(e) => update("rejection_block_zone", e.target.value)}
            placeholder="e.g. 208700-208900"
            className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm mb-2 text-gray-300">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none resize-none"
          />
        </div>
      </div>

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

      <div className="space-y-3">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>

        <button
          type="button"
          onClick={handleConvertToTrade}
          disabled={loading}
          className="w-full py-3 rounded-lg bg-green-700 hover:bg-green-600 font-medium disabled:opacity-50"
        >
          Convert to Trade → Open Checklist
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="w-full py-3 rounded-lg bg-red-900 hover:bg-red-800 font-medium disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete Setup"}
        </button>
      </div>
    </form>
  );
}