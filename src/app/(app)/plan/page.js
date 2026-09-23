"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import {
  phaseInfo,
  suggestLotSize,
  milestoneProgress,
  suggestWithdrawal,
  checkPromotion,
  checkDemotion,
  PHASES,
} from "@/lib/planEngine";

export default function PlanPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [stats, setStats] = useState({
    closedTrades: 0,
    ruleAdherence: 0,
  });
  const [withdrawals, setWithdrawals] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [planRes, tradesRes, wdRes, depRes, profileRes] = await Promise.all([
        supabase
          .from("trading_plans")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("trades")
          .select("status, partial_taken, sl_moved_to_be")
          .neq("status", "open"),
        supabase
          .from("withdrawal_log")
          .select("*")
          .eq("user_id", user.id)
          .order("withdrawn_at", { ascending: false }),
        supabase
          .from("deposit_log")
          .select("*")
          .eq("user_id", user.id)
          .order("deposited_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("account_size")
          .eq("id", user.id)
          .single(),
      ]);

      const closed = tradesRes.data || [];
      const partialCount = closed.filter((t) => t.partial_taken).length;
      const beCount = closed.filter((t) => t.sl_moved_to_be).length;
      const adherence =
        closed.length > 0
          ? ((partialCount + beCount) / (closed.length * 2)) * 100
          : 0;

      setStats({
        closedTrades: closed.length,
        ruleAdherence: adherence,
      });

      setPlan(planRes.data);
      setWithdrawals(wdRes.data || []);
      setDeposits(depRes.data || []);
      setCurrentBalance(profileRes.data?.account_size || 0);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createPlan(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: insertError } = await supabase
      .from("trading_plans")
      .insert({
        user_id: user.id,
        starting_balance: currentBalance,
        initial_lot_size: 0.01,
      });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSuccess("Plan created. Reloading...");
    setTimeout(() => window.location.reload(), 800);
  }

  async function updatePhase(newPhase) {
    const { error: updateError } = await supabase
      .from("trading_plans")
      .update({ phase: newPhase, updated_at: new Date().toISOString() })
      .eq("id", plan.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPlan({ ...plan, phase: newPhase });
    setSuccess(`Moved to ${phaseInfo(newPhase).label}`);
    setTimeout(() => setSuccess(""), 2000);
  }

  async function logWithdrawal(e) {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: insertError } = await supabase
      .from("withdrawal_log")
      .insert({ user_id: user.id, amount });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setShowWithdrawForm(false);
    setWithdrawAmount("");
    setSuccess("Withdrawal logged.");
    setTimeout(() => window.location.reload(), 800);
  }

  async function logDeposit(e) {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: insertError } = await supabase
      .from("deposit_log")
      .insert({ user_id: user.id, amount });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setShowDepositForm(false);
    setDepositAmount("");
    setSuccess("Deposit logged.");
    setTimeout(() => window.location.reload(), 800);
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  // No plan yet
  if (!plan) {
    return (
      <main className="min-h-screen p-4 md:p-6 bg-black text-white">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Trading Plan</h1>
            <p className="text-gray-400 text-sm">
              Scaling & Withdrawal — the business layer
            </p>
          </div>

          <form onSubmit={createPlan} className="space-y-4">
            <div className="p-5 rounded-lg bg-gray-900 border border-gray-800 space-y-3">
              <h2 className="text-lg font-semibold text-blue-400">
                Create your plan
              </h2>
              <p className="text-sm text-gray-400">
                Starting balance:{" "}
                <strong className="text-white">
                  ${currentBalance.toFixed(2)}
                </strong>{" "}
                (from Settings)
              </p>
              <p className="text-xs text-gray-500">
                You'll start in <strong>Phase 1 — Learning</strong> at 0.01
                lots. Promotion rules apply as you grow.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium"
            >
              Create Trading Plan
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Plan exists
  const phase = phaseInfo(plan.phase);
  const suggestedLot = suggestLotSize({
    phase: plan.phase,
    startingBalance: plan.starting_balance,
    currentBalance,
    initialLot: plan.initial_lot_size,
    growthPercent: plan.scaling_growth_percent,
    lotIncrement: plan.scaling_lot_increment,
  });
  const progress = milestoneProgress({
    startingBalance: plan.starting_balance,
    currentBalance,
    growthPercent: plan.scaling_growth_percent,
  });
  const withdrawal = suggestWithdrawal({
    startingBalance: plan.starting_balance,
    currentBalance,
    withdrawalPercent: plan.withdrawal_percent,
  });
  const promotion = checkPromotion({
    phase: plan.phase,
    startingBalance: plan.starting_balance,
    currentBalance,
    closedTrades: stats.closedTrades,
    ruleAdherence: stats.ruleAdherence,
  });
  const demotion = checkDemotion({
    phase: plan.phase,
    startingBalance: plan.starting_balance,
    currentBalance,
  });

  const totalWithdrawn = withdrawals.reduce(
    (sum, w) => sum + (w.amount || 0),
    0
  );
  const totalDeposited = deposits.reduce(
    (sum, d) => sum + (d.amount || 0),
    0
  );
  const netProfit = currentBalance + totalWithdrawn - plan.starting_balance;

  return (
    <main className="min-h-screen p-4 md:p-6 bg-black text-white">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Trading Plan</h1>
          <p className="text-gray-400 text-sm">
            Scaling & Withdrawal — the business layer
          </p>
        </div>

        {/* Current Phase */}
        <div className={`p-5 rounded-lg border-2 ${phase.color}`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-3xl mb-1">{phase.emoji}</p>
              <h2 className="text-xl font-bold">{phase.label}</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                const next =
                  plan.phase === "learning"
                    ? "scaling"
                    : plan.phase === "scaling"
                    ? "withdrawal"
                    : "learning";
                if (
                  window.confirm(
                    `Move to ${phaseInfo(next).label}? This is a manual override.`
                  )
                ) {
                  updatePhase(next);
                }
              }}
              className="text-xs px-3 py-1 rounded-lg bg-black/40 hover:bg-black/60"
            >
              Switch →
            </button>
          </div>
          <p className="text-sm opacity-90">{phase.description}</p>
          <div className="mt-3 pt-3 border-t border-current/20 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs opacity-70">Focus</p>
              <p className="text-sm font-semibold">{phase.focus}</p>
            </div>
            <div>
              <p className="text-xs opacity-70">Lot Rule</p>
              <p className="text-sm font-semibold">{phase.lotRule}</p>
            </div>
          </div>
        </div>

        {/* Current State */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI
            label="Starting"
            value={`$${plan.starting_balance.toFixed(0)}`}
          />
          <KPI
            label="Current"
            value={`$${currentBalance.toFixed(0)}`}
            accent={
              currentBalance >= plan.starting_balance
                ? "text-green-400"
                : "text-red-400"
            }
          />
          <KPI
            label="Suggested Lot"
            value={suggestedLot.toFixed(2)}
            accent="text-blue-400"
          />
          <KPI
            label="Next Withdrawal"
            value={withdrawal > 0 ? `$${withdrawal.toFixed(0)}` : "—"}
            accent={withdrawal > 0 ? "text-green-400" : "text-gray-500"}
          />
        </div>

        {/* Milestone Progress */}
        {plan.phase === "scaling" && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">
                Progress to next milestone
              </span>
              <span className="text-xs text-gray-500">
                {progress.milestonesHit} hit · next at $
                {progress.nextMilestone?.toFixed(0)}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 transition-all"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              +0.01 lot at the next milestone.
            </p>
          </div>
        )}

        {/* Promotion */}
        <div
          className={`p-4 rounded-lg border ${
            promotion.canPromote
              ? "bg-green-950/40 border-green-800"
              : "bg-gray-900 border-gray-800"
          }`}
        >
          <h3 className="text-sm font-semibold mb-2">
            {promotion.canPromote ? "✅ Promotion Available" : "Next Promotion"}
          </h3>
          <p className="text-xs text-gray-400">{promotion.reason}</p>
          {promotion.canPromote && promotion.next && (
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Promote to ${phaseInfo(promotion.next).label}?`
                  )
                ) {
                  updatePhase(promotion.next);
                }
              }}
              className="mt-3 w-full py-2 rounded-lg bg-green-700 hover:bg-green-600 text-sm font-medium"
            >
              Promote to {phaseInfo(promotion.next).label}
            </button>
          )}
        </div>

        {/* Demotion Warning */}
        {demotion.shouldDemote && (
          <div className="p-4 rounded-lg bg-red-950/60 border border-red-700">
            <h3 className="text-sm font-semibold text-red-200 mb-1">
              ⚠️ Demotion Warning
            </h3>
            <p className="text-xs text-red-300">{demotion.reason}</p>
          </div>
        )}

        {/* Withdrawals & Deposits */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setShowWithdrawForm(true)}
            className="py-3 rounded-lg bg-green-800 hover:bg-green-700 font-medium"
          >
            Log Withdrawal
          </button>
          <button
            type="button"
            onClick={() => setShowDepositForm(true)}
            className="py-3 rounded-lg bg-blue-800 hover:bg-blue-700 font-medium"
          >
            Log Deposit
          </button>
        </div>

        {/* Withdrawal form */}
        {showWithdrawForm && (
          <form
            onSubmit={logWithdrawal}
            className="p-4 rounded-lg bg-green-950/40 border border-green-800 space-y-3"
          >
            <h3 className="text-sm font-semibold text-green-200">
              Log Withdrawal
            </h3>
            {withdrawal > 0 && (
              <p className="text-xs text-green-300">
                Suggested: ${withdrawal.toFixed(2)} (
                {plan.withdrawal_percent}% of profit)
              </p>
            )}
            <input
              type="number"
              step="any"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Amount withdrawn"
              className="w-full px-4 py-3 rounded-lg bg-black border border-green-800 focus:border-green-600 outline-none text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowWithdrawForm(false)}
                className="py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 rounded-lg bg-green-700 hover:bg-green-600 text-sm font-medium"
              >
                Log
              </button>
            </div>
          </form>
        )}

        {/* Deposit form */}
        {showDepositForm && (
          <form
            onSubmit={logDeposit}
            className="p-4 rounded-lg bg-blue-950/40 border border-blue-800 space-y-3"
          >
            <h3 className="text-sm font-semibold text-blue-200">
              Log Deposit
            </h3>
            <input
              type="number"
              step="any"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Amount deposited"
              className="w-full px-4 py-3 rounded-lg bg-black border border-blue-800 focus:border-blue-600 outline-none text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowDepositForm(false)}
                className="py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-sm font-medium"
              >
                Log
              </button>
            </div>
          </form>
        )}

        {/* Business Summary */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h3 className="text-sm font-semibold text-blue-400 mb-3">
            Business Summary
          </h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Total Deposited</p>
              <p className="tabular-nums font-bold text-blue-300">
                ${totalDeposited.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Total Withdrawn</p>
              <p className="tabular-nums font-bold text-green-300">
                ${totalWithdrawn.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Net P&L</p>
              <p
                className={`tabular-nums font-bold ${
                  netProfit >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {netProfit >= 0 ? "+" : ""}${netProfit.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Withdrawal history */}
        {withdrawals.length > 0 && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h3 className="text-sm font-semibold text-blue-400 mb-3">
              Recent Withdrawals
            </h3>
            <div className="space-y-2">
              {withdrawals.slice(0, 5).map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between text-xs p-2 rounded bg-black border border-gray-800"
                >
                  <span className="text-gray-400">
                    {new Date(w.withdrawn_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="font-bold text-green-300 tabular-nums">
                    ${w.amount.toFixed(2)}
                  </span>
                </div>
              ))}
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
      </div>
    </main>
  );
}

function KPI({ label, value, accent }) {
  return (
    <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p
        className={`text-lg font-bold tabular-nums ${
          accent || "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}