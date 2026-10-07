// ============================================================
// JOURNAL ENGINE
// ============================================================
// Bridges the setups systems to the trades journal.
//
// - createTradeFromSetup: auto-creates a trades row after save
// - syncTradeOutcome:     when a trade closes, syncs back to
//                         the linked setup + visit
// - systemLabel / systemColor / systemEmoji: display helpers
// ============================================================

// ============================================================
// SYSTEM LABELS
// ============================================================
export const SYSTEM_LABELS = {
  negotiation: "Negotiation",
  bos_rb: "BOS + RB",
  premium_discount: "Prem/Disc",
  liquidity_zone: "Liquidity Zone",
  rejection_block: "Rejection Block",
  manual: "Manual",
};

export const SYSTEM_COLORS = {
  negotiation: "bg-blue-900/40 text-blue-300",
  bos_rb: "bg-purple-900/40 text-purple-300",
  premium_discount: "bg-yellow-900/40 text-yellow-300",
  liquidity_zone: "bg-orange-900/40 text-orange-300",
  rejection_block: "bg-pink-900/40 text-pink-300",
  manual: "bg-gray-800 text-gray-300",
};

export const SYSTEM_EMOJI = {
  negotiation: "🔄",
  bos_rb: "🟪",
  premium_discount: "🟨",
  liquidity_zone: "🟧",
  rejection_block: "🩷",
  manual: "⚪",
};

export function systemLabel(type) {
  return SYSTEM_LABELS[type] || type || "Manual";
}
export function systemColor(type) {
  return SYSTEM_COLORS[type] || SYSTEM_COLORS.manual;
}
export function systemEmoji(type) {
  return SYSTEM_EMOJI[type] || SYSTEM_EMOJI.manual;
}

// ============================================================
// CREATE TRADE FROM SETUP
// ============================================================
export async function createTradeFromSetup({
  supabase,
  userId,
  setupId,
  pair,
  direction, // 'buy' | 'sell'
  entry,
  sl,
  tp,
  lotSize,
  riskPercent,
  rr = 2,
  extra = {},
}) {
  if (!supabase || !userId || !pair || !direction) {
    return { data: null, error: { message: "Missing required fields" } };
  }

  const payload = {
    user_id: userId,
    setup_id: setupId,
    pair,
    direction,
    entry_price: entry ?? null,
    stop_loss: sl ?? null,
    take_profit: tp ?? null,
    lot_size: lotSize ?? null,
    risk_percent: riskPercent ?? null,
    rr_ratio: rr,
    status: "open",
    opened_at: new Date().toISOString(),
    ...extra,
  };

  const { data, error } = await supabase
    .from("trades")
    .insert(payload)
    .select()
    .single();

  return { data, error };
}

// ============================================================
// SYNC TRADE OUTCOME
// ============================================================
// When a trade is closed (won / lost / be), propagate to:
//   - setups.taken / closed / outcome / closed_at
//   - rejection_block_visits.outcome (if a visit matches)
// ============================================================
export async function syncTradeOutcome({ supabase, tradeId }) {
  if (!supabase || !tradeId) return { ok: false };

  // 1. Load the trade
  const { data: trade, error: tErr } = await supabase
    .from("trades")
    .select("*")
    .eq("id", tradeId)
    .single();

  if (tErr || !trade) return { ok: false, error: tErr };

  // Only sync if the trade has a linked setup
  if (!trade.setup_id) return { ok: true, skipped: "no setup_id" };

  // 2. Map trade outcome to setup outcome
  const outcomeMap = {
    won: "win",
    lost: "loss",
    be: "breakeven",
  };
  const setupOutcome = outcomeMap[trade.status] || null;

  // 3. Update the setup
  const setupPatch = {
    taken: true,
    closed: trade.status !== "open",
    outcome: setupOutcome,
    taken_at: trade.opened_at || new Date().toISOString(),
    closed_at: trade.closed_at || null,
  };

  const { error: sErr } = await supabase
    .from("setups")
    .update(setupPatch)
    .eq("id", trade.setup_id);

  if (sErr) return { ok: false, error: sErr };

  // 4. If the setup is a rejection_block, try to update a visit
  const { data: setupRow } = await supabase
    .from("setups")
    .select("setup_type")
    .eq("id", trade.setup_id)
    .single();

  if (setupRow?.setup_type === "rejection_block" && trade.closed_at) {
    // Find the closest visit to when this trade opened
    await supabase
      .from("rejection_block_visits")
      .update({ outcome: setupOutcome })
      .eq("setup_id", trade.setup_id)
      .order("created_at", { ascending: false })
      .limit(1);
  }

  return { ok: true };
}

// ============================================================
// PIPS HELPER (journal side)
// ============================================================
export function journalPips({ entry, sl, tp, pipSize = 0.01 }) {
  const e = parseFloat(entry);
  const s = parseFloat(sl);
  const t = parseFloat(tp);
  const p = parseFloat(pipSize) || 0.01;
  if (isNaN(e) || isNaN(s) || isNaN(t)) return null;
  return {
    slPips: Math.round((Math.abs(e - s) / p) * 100) / 100,
    tpPips: Math.round((Math.abs(t - e) / p) * 100) / 100,
    pipSize: p,
  };
}