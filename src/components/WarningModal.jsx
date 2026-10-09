"use client";

// ============================================================
// SHARED WARNING MODAL
// ============================================================
// Shows a red modal with all warning reasons before save.
//
// Props:
//   open: boolean
//   warningReasons: array of { key, label, detail }
//   onCancel: () => void
//   onConfirm: () => void   // "Save Anyway"
//   saving: boolean
// ============================================================

export default function WarningModal({
  open,
  warningReasons = [],
  onCancel,
  onConfirm,
  saving = false,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="max-w-lg w-full p-6 rounded-2xl bg-gray-900 border-2 border-red-600 space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl">🚨</span>
          <div>
            <p className="text-lg font-bold text-red-200">
              The system advises against this trade
            </p>
            <p className="text-xs text-red-300 mt-1">
              {warningReasons.length} danger signal
              {warningReasons.length === 1 ? "" : "s"} detected:
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {warningReasons.map((r) => (
            <div
              key={r.key}
              className="p-3 rounded-lg bg-red-950/40 border border-red-800"
            >
              <p className="text-sm font-bold text-red-200">{r.label}</p>
              <p className="text-xs text-red-300 mt-1">{r.detail}</p>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-lg bg-yellow-950/40 border border-yellow-800">
          <p className="text-xs text-yellow-200">
            💡 Your own recent trades with this combination have
            historically lost. Consider skipping or reducing size.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold"
          >
            ❌ Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="py-3 rounded-lg bg-red-800 hover:bg-red-700 font-bold disabled:opacity-50"
          >
            {saving ? "Saving..." : "⚠️ Save Anyway"}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Save Anyway is a deliberate action — the trade will be logged
          with a warning flag.
        </p>
      </div>
    </div>
  );
}