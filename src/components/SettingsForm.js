"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function SettingsForm({ profile, userId }) {
  const supabase = createClient();

  const [form, setForm] = useState({
    account_size: profile?.account_size ?? "",
    risk_percent: profile?.risk_percent ?? 1,
    max_daily_loss_percent: profile?.max_daily_loss_percent ?? 3,
    max_trades_per_day: profile?.max_trades_per_day ?? 3,
    default_lot_size: profile?.default_lot_size ?? 0.01,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const payload = {
      account_size: parseFloat(form.account_size) || 0,
      risk_percent: parseFloat(form.risk_percent) || 1,
      max_daily_loss_percent: parseFloat(form.max_daily_loss_percent) || 3,
      max_trades_per_day: parseInt(form.max_trades_per_day) || 3,
      default_lot_size: parseFloat(form.default_lot_size) || 0.01,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({ id: userId, ...payload });

    setLoading(false);

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    setSuccess("Settings saved.");
    setTimeout(() => setSuccess(""), 2000);
  }

  // Compute the dollar risk for preview
  const accountSize = parseFloat(form.account_size) || 0;
  const riskPercent = parseFloat(form.risk_percent) || 1;
  const dollarRisk = (accountSize * riskPercent) / 100;
  const dailyLossLimit =
    (accountSize * (parseFloat(form.max_daily_loss_percent) || 3)) / 100;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-4">
        <h2 className="text-lg font-semibold text-blue-400">
          Account
        </h2>

        <div>
          <label className="block text-sm mb-2 text-gray-300">
            Account Size (USD)
          </label>
          <input
            type="number"
            step="any"
            value={form.account_size}
            onChange={(e) => update("account_size", e.target.value)}
            placeholder="e.g. 1000"
            required
            className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
          />
          <p className="text-gray-500 text-xs mt-1">
            Total capital in your trading account.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-4">
        <h2 className="text-lg font-semibold text-blue-400">
          Risk Management
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-2 text-gray-300">
              Risk per Trade (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.risk_percent}
              onChange={(e) => update("risk_percent", e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-300">
              Max Daily Loss (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.max_daily_loss_percent}
              onChange={(e) =>
                update("max_daily_loss_percent", e.target.value)
              }
              className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-2 text-gray-300">
              Max Trades per Day
            </label>
            <input
              type="number"
              value={form.max_trades_per_day}
              onChange={(e) => update("max_trades_per_day", e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-300">
              Default Lot Size
            </label>
            <input
              type="number"
              step="0.01"
              value={form.default_lot_size}
              onChange={(e) => update("default_lot_size", e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black border border-gray-700 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 rounded-lg bg-blue-950/40 border border-blue-800 space-y-2">
        <h3 className="text-sm font-semibold text-blue-300">
          Risk Preview
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Risk per Trade</p>
            <p className="font-bold text-white tabular-nums">
              ${dollarRisk.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Max Daily Loss</p>
            <p className="font-bold text-white tabular-nums">
              ${dailyLossLimit.toFixed(2)}
            </p>
          </div>
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

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}