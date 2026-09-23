// ============================================================
// PLAN ENGINE — Institutional Flow System
// Scaling & Withdrawal logic
// ============================================================

export const PHASES = {
  learning: {
    key: "learning",
    label: "Phase 1 — Learning",
    emoji: "📚",
    color: "bg-blue-900/40 text-blue-300 border-blue-700",
    description:
      "Trade 0.01 lots. Goal is consistency, not profit. Follow every rule for 30 days straight.",
    focus: "Rule adherence",
    lotRule: "Fixed 0.01 lots",
  },
  scaling: {
    key: "scaling",
    label: "Phase 2 — Scaling",
    emoji: "📈",
    color: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
    description:
      "Increase lot size by 0.01 every time your account grows by 20%. Never double up after a win.",
    focus: "Consistent growth",
    lotRule: "+0.01 per +20% account growth",
  },
  withdrawal: {
    key: "withdrawal",
    label: "Phase 3 — Withdrawal",
    emoji: "💰",
    color: "bg-green-900/40 text-green-300 border-green-700",
    description:
      "Withdraw 50% of profits monthly. Pay yourself. This builds belief and turns trading into real income.",
    focus: "Building real income",
    lotRule: "Custom based on remaining equity",
  },
};

export function phaseInfo(key) {
  return PHASES[key] || PHASES.learning;
}

// ============================================================
// Suggest next lot size
// ============================================================
export function suggestLotSize({
  phase,
  startingBalance,
  currentBalance,
  initialLot,
  growthPercent,
  lotIncrement,
}) {
  if (phase === "learning") return 0.01;

  if (phase === "scaling") {
    const growth = (currentBalance - startingBalance) / startingBalance;
    const milestones = Math.floor(growth / (growthPercent / 100));
    const suggested =
      (initialLot || 0.01) + Math.max(0, milestones) * (lotIncrement || 0.01);
    return Math.round(suggested * 100) / 100;
  }

  // withdrawal phase
  return initialLot || 0.01;
}

// ============================================================
// Compute milestone progress
// ============================================================
export function milestoneProgress({
  startingBalance,
  currentBalance,
  growthPercent,
}) {
  if (!startingBalance || startingBalance <= 0) {
    return { pct: 0, nextMilestone: null, milestonesHit: 0 };
  }

  const growth = (currentBalance - startingBalance) / startingBalance;
  const milestonesHit = Math.max(0, Math.floor(growth / (growthPercent / 100)));
  const nextMilestoneBalance =
    startingBalance * (1 + ((milestonesHit + 1) * growthPercent) / 100);
  const prevMilestoneBalance =
    startingBalance * (1 + (milestonesHit * growthPercent) / 100);

  const rangeSize = nextMilestoneBalance - prevMilestoneBalance;
  const progress = currentBalance - prevMilestoneBalance;
  const pct = rangeSize > 0 ? (progress / rangeSize) * 100 : 0;

  return {
    pct: Math.max(0, Math.min(100, pct)),
    nextMilestone: nextMilestoneBalance,
    milestonesHit,
  };
}

// ============================================================
// Suggested withdrawal
// ============================================================
export function suggestWithdrawal({
  startingBalance,
  currentBalance,
  withdrawalPercent,
}) {
  if (currentBalance <= startingBalance) return 0;
  const profit = currentBalance - startingBalance;
  return Math.round(((profit * withdrawalPercent) / 100) * 100) / 100;
}

// ============================================================
// Promotion rules
// ============================================================
export function checkPromotion({
  phase,
  startingBalance,
  currentBalance,
  closedTrades,
  ruleAdherence,
}) {
  if (phase === "learning") {
    // Promote when: 30+ closed trades AND rule adherence >= 80%
    if (closedTrades >= 30 && ruleAdherence >= 80) {
      return {
        canPromote: true,
        next: "scaling",
        reason: `You have ${closedTrades} trades with ${ruleAdherence.toFixed(
          0
        )}% rule adherence. Ready to scale.`,
      };
    }
    return {
      canPromote: false,
      next: null,
      reason: `Need 30 trades + 80% adherence. You have ${closedTrades} trades at ${ruleAdherence.toFixed(
        0
      )}%.`,
    };
  }

  if (phase === "scaling") {
    // Promote when: account is 2x starting balance
    if (currentBalance >= startingBalance * 2) {
      return {
        canPromote: true,
        next: "withdrawal",
        reason: `Account has doubled from $${startingBalance.toFixed(
          0
        )} to $${currentBalance.toFixed(0)}. Ready to withdraw.`,
      };
    }
    return {
      canPromote: false,
      next: null,
      reason: `Need to double the account. Currently at ${(
        (currentBalance / startingBalance) *
        100
      ).toFixed(0)}% of starting balance.`,
    };
  }

  return { canPromote: false, next: null, reason: "Already in withdrawal phase." };
}

// ============================================================
// Demotion (safety)
// ============================================================
export function checkDemotion({ phase, startingBalance, currentBalance }) {
  if (phase === "scaling" || phase === "withdrawal") {
    const drawdown = (startingBalance - currentBalance) / startingBalance;
    if (drawdown >= 0.3) {
      return {
        shouldDemote: true,
        reason: `30% drawdown detected. Return to Learning phase to rebuild discipline.`,
      };
    }
  }
  return { shouldDemote: false, reason: "" };
}