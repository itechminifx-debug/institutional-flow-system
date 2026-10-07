"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/formatNumbers";

const SYSTEM_LABELS = {
  negotiation: "Negotiation (Reversal)",
  bos_rb: "BOS + RB (Continuation)",
  premium_discount: "Premium / Discount",
  liquidity_zone: "Liquidity Zone",
  rejection_block: "Rejection Block",
  manual: "Manual",
};

const SYSTEM_PATHS = {
  negotiation: "/negotiation",
  bos_rb: "/bos-rb",
  premium_discount: "/premium-discount",
  liquidity_zone: "/liquidity-zone",
  rejection_block: "/rejection-block",
};

export default function SetupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params?.id;

  const [setup, setSetup] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [tradeNotes, setTradeNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesDirty, setNotesDirty] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("setups")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setSetup(data);
      setTradeNotes(data.trade_notes || "");

      // Fetch the matching detail record for rejection_block
      if (data.setup_type === "rejection_block") {
        const { data: det } = await supabase
          .from("rejection_block_setups")
          .select("*")
          .eq("setup_id", id)
          .single();
        setDetail(det);
      }

      setLoading(false);
    }
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateField(patch) {
    setBusy(true);
    setError("");
    const { data, error } = await supabase
      .from("setups")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) setError(error.message);
    else setSetup(data);
    setBusy(false);
  }

  async function toggleTaken() {
    const next = !setup.taken;
    await updateField({
      taken: next,
      taken_at: next ? new Date().toISOString() : null,
    });
  }

  async function toggleClosed() {
    const next = !setup.closed;
    await updateField({
      closed: next,
      closed_at: next ? new Date().toISOString() : null,
      outcome: next ? setup.outcome || "win" : null,
    });
  }

  async function setOutcome(value) {
    await updateField({ outcome: value });
  }

  async function handleSaveNotes() {
    setBusy(true);
    setError("");
    setNotesSaved(false);
    const { data, error } = await supabase
      .from("setups")
      .update({ trade_notes: tradeNotes })
      .eq("id", id)
      .select()
      .single();

    if (error) setError(error.message);
    else {
      setSetup(data);
      setNotesSaved(true);
      setNotesDirty(false);
      setTimeout(() => setNotesSaved(false), 2000);
    }
    setBusy(false);
  }

  async function handleDelete() {
    if (!setup.closed) {
      setError("Cannot delete — setup must be closed first.");
      return;
    }
    const ok = window.confirm(
      "Delete this setup? It will be hidden from all views."
    );
    if (!ok) return;

    setBusy(true);
    setError("");
    const { error } = await supabase
      .from("setups")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.push("/setups");
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-gray-400">Loading...</div>
      </main>
    );
  }

  if (!setup) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto space-y-3">
          <p className="text-red-400">{error || "Setup not found."}</p>
          <Link href="/setups" className="text-blue-400 underline text-sm">
            ← Back to My Setups
          </Link>
        </div>
      </main>
    );
  }

  const systemLabel = SYSTEM_LABELS[setup.setup_type] || setup.setup_type;
  const editPath = SYSTEM_PATHS[setup.setup_type]
    ? `${SYSTEM_PATHS[setup.setup_type]}?edit=${setup.id}`
    : null;

  const statusBadge = setup.closed
    ? { label: "Closed", color: "bg-gray-800 text-gray-300 border-gray-700" }
    : setup.taken
    ? { label: "Taken", color: "bg-blue-900/40 text-blue-300 border-blue-700" }
    : { label: "Open", color: "bg-yellow-900/40 text-yellow-300 border-yellow-700" };

  const outcomeBadge =
    setup.outcome === "win"
      ? { label: "WIN", color: "bg-green-900/40 text-green-300" }
      : setup.outcome === "loss"
      ? { label: "LOSS", color: "bg-red-900/40 text-red-300" }
      : setup.outcome === "breakeven"
      ? { label: "BE", color: "bg-gray-800 text-gray-300" }
      : null;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/setups" className="text-blue-400 text-sm underline">
            ← My Setups
          </Link>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-1 rounded-full border font-semibold ${statusBadge.color}`}
            >
              {statusBadge.label}
            </span>
            {outcomeBadge && (
              <span
                className={`text-xs px-2 py-1 rounded-full font-bold ${outcomeBadge.color}`}
              >
                {outcomeBadge.label}
              </span>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
          <h1 className="text-2xl font-bold">{setup.pair}</h1>
          <p className="text-gray-400 text-sm">{systemLabel}</p>
          <p className="text-xs text-gray-500">
            Created {new Date(setup.created_at).toLocaleString()}
          </p>
        </div>

        {/* Key values */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h2 className="text-sm font-semibold text-blue-400 mb-3">
            Setup Details
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {setup.htf_bias && (
              <div>
                <p className="text-xs text-gray-500">HTF Bias</p>
                <p className="font-bold capitalize">{setup.htf_bias}</p>
              </div>
            )}
            {setup.ce_price && (
              <div>
                <p className="text-xs text-gray-500">CE Price</p>
                <p className="font-bold tabular-nums text-blue-300">
                  {formatPrice(setup.ce_price)}
                </p>
              </div>
            )}
            {setup.rejection_block_zone && (
              <div>
                <p className="text-xs text-gray-500">RB Zone</p>
                <p className="font-bold tabular-nums">
                  {setup.rejection_block_zone}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* All RBs flipped banner */}
        {detail?.all_rbs_flipped && detail?.all_rbs_flipped_direction && (
          <div
            className={`p-4 rounded-lg border-2 ${
              detail.all_rbs_flipped_direction === "up"
                ? "bg-green-950/40 border-green-600"
                : "bg-red-950/40 border-red-600"
            }`}
          >
            <p className="font-bold text-lg">
              🔥 All RBs flipped{" "}
              {detail.all_rbs_flipped_direction === "up" ? "↑" : "↓"}
            </p>
            <p className="text-sm opacity-90 mt-1">
              Every listed RB was flipped at the time of this setup — maximum
              continuation in that direction.
            </p>
          </div>
        )}

        {/* Reversal detected banner */}
        {detail?.reversal_detected && detail?.reversal_direction && (
          <div className="p-4 rounded-lg bg-purple-950/30 border-2 border-purple-700 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="font-bold text-purple-300">
                🔄 Reversal Detected
              </p>
              <span
                className={`text-xs px-2 py-1 rounded-full font-bold ${
                  detail.reversal_direction === "BUY"
                    ? "bg-green-900/40 text-green-300"
                    : "bg-red-900/40 text-red-300"
                }`}
              >
                {detail.reversal_direction}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {detail.reversal_rb_low && detail.reversal_rb_high && (
                <div>
                  <p className="text-xs text-gray-500">New RB</p>
                  <p className="font-bold tabular-nums">
                    {detail.reversal_rb_low} – {detail.reversal_rb_high}
                  </p>
                </div>
              )}
              {detail.reversal_rb_ce && (
                <div>
                  <p className="text-xs text-gray-500">New CE</p>
                  <p className="font-bold tabular-nums text-yellow-400">
                    {formatPrice(detail.reversal_rb_ce)}
                  </p>
                </div>
              )}
              {detail.reversal_sweep_level && (
                <div>
                  <p className="text-xs text-gray-500">Sweep Level</p>
                  <p className="font-bold tabular-nums text-red-300">
                    {formatPrice(detail.reversal_sweep_level)}
                  </p>
                </div>
              )}
              {detail.reversal_entry && (
                <div>
                  <p className="text-xs text-gray-500">Suggested Entry</p>
                  <p className="font-bold tabular-nums text-yellow-400">
                    {formatPrice(detail.reversal_entry)}
                  </p>
                </div>
              )}
              {detail.reversal_sl && (
                <div>
                  <p className="text-xs text-gray-500">Suggested SL</p>
                  <p className="font-bold tabular-nums text-red-400">
                    {formatPrice(detail.reversal_sl)}
                  </p>
                </div>
              )}
              {detail.reversal_tp && (
                <div>
                  <p className="text-xs text-gray-500">Suggested TP</p>
                  <p className="font-bold tabular-nums text-green-400">
                    {formatPrice(detail.reversal_tp)}
                  </p>
                </div>
              )}
            </div>

            <Link
              href={`/rejection-block`}
              className="block w-full text-center py-3 rounded-lg bg-purple-800 hover:bg-purple-700 font-bold"
            >
              Open Rejection Block page to take this setup
            </Link>
          </div>
        )}

        {/* Setup Notes */}
        {setup.notes && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h2 className="text-sm font-semibold text-blue-400 mb-2">
              Setup Notes
            </h2>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">
              {setup.notes}
            </p>
          </div>
        )}

        {/* Status controls */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
          <h2 className="text-sm font-semibold text-blue-400">
            Trade Status
          </h2>

          <button
            type="button"
            onClick={toggleTaken}
            disabled={busy || setup.closed}
            className={`w-full py-3 rounded-lg font-semibold transition disabled:opacity-50 ${
              setup.taken
                ? "bg-blue-700 hover:bg-blue-600"
                : "bg-gray-800 hover:bg-gray-700"
            }`}
          >
            {setup.taken ? "✅ Taken" : "Mark as Taken"}
          </button>

          <button
            type="button"
            onClick={toggleClosed}
            disabled={busy}
            className={`w-full py-3 rounded-lg font-semibold transition disabled:opacity-50 ${
              setup.closed
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-green-800 hover:bg-green-700"
            }`}
          >
            {setup.closed ? "↩ Reopen" : "Mark as Closed"}
          </button>

          {setup.closed && (
            <div>
              <label className="block text-xs mb-2 text-gray-400">
                Outcome
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["win", "loss", "breakeven"].map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOutcome(o)}
                    disabled={busy}
                    className={`py-2 rounded-lg text-sm font-semibold capitalize transition ${
                      setup.outcome === o
                        ? o === "win"
                          ? "bg-green-700 text-white"
                          : o === "loss"
                          ? "bg-red-700 text-white"
                          : "bg-gray-700 text-white"
                        : "bg-black border border-gray-700 text-gray-400"
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Trade Notes */}
        <div className="p-4 rounded-lg bg-gray-900 border border-blue-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-blue-300">
                📝 Trade Notes
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Per-setup journal — observations, lessons, follow-ups
              </p>
            </div>
            {notesDirty && !notesSaved && (
              <span className="text-xs px-2 py-0.5 rounded bg-yellow-900/40 text-yellow-300">
                unsaved
              </span>
            )}
            {notesSaved && (
              <span className="text-xs px-2 py-0.5 rounded bg-green-900/40 text-green-300">
                ✓ saved
              </span>
            )}
          </div>

          <textarea
            value={tradeNotes}
            onChange={(e) => {
              setTradeNotes(e.target.value);
              setNotesDirty(true);
              setNotesSaved(false);
            }}
            rows={6}
            placeholder="Write whatever you observed on this trade..."
            className="w-full px-3 py-2 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none resize-none text-sm"
          />

          <button
            type="button"
            onClick={handleSaveNotes}
            disabled={busy || !notesDirty}
            className="w-full py-3 rounded-lg bg-blue-700 hover:bg-blue-600 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? "Saving..." : notesDirty ? "💾 Save Trade Notes" : "✓ Notes Saved"}
          </button>
        </div>

        {/* Actions */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
          <h2 className="text-sm font-semibold text-blue-400 mb-2">
            Actions
          </h2>

          {editPath && (
            <Link
              href={editPath}
              className="block w-full text-center py-3 rounded-lg bg-blue-800 hover:bg-blue-700 font-semibold"
            >
              ✏️ Edit Setup
            </Link>
          )}

          <button
            type="button"
            onClick={handleDelete}
            disabled={busy || !setup.closed}
            className="w-full py-3 rounded-lg bg-red-900/60 hover:bg-red-800 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🗑 Delete Setup
            {!setup.closed && (
              <span className="block text-xs opacity-70 mt-1">
                Close the setup first to enable delete
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}