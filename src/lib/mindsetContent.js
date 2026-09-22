export const MINDSET_SECTIONS = [
  {
    key: "spiritual",
    number: 1,
    title: "Spiritual Preparation",
    verse:
      "Commit to the Lord whatever you do, and He will establish your plans. — Proverbs 16:3",
    items: [
      { key: "spiritual_prayed", label: "Have I prayed before this session?", why: "Invite guidance — you are not alone" },
      { key: "spiritual_wisdom", label: "Have I asked for wisdom?", why: "James 1:5 — ask and it will be given" },
      { key: "spiritual_surrendered", label: "Have I surrendered the outcome?", why: "You are not in control — God is" },
      { key: "spiritual_thanks", label: "Have I given thanks?", why: "Gratitude opens the heart" },
    ],
  },
  {
    key: "emotional",
    number: 2,
    title: "Emotional Preparation",
    verse:
      "For God has not given us a spirit of fear, but of power and of love and of a sound mind. — 2 Timothy 1:7",
    isCritical: true, // Unchecked here = hard warning
    items: [
      { key: "emotional_calm", label: "Am I calm?", why: "If I'm anxious — I should not trade" },
      { key: "emotional_patient", label: "Am I patient?", why: "If I'm rushed — I should not trade" },
      { key: "emotional_no_greed", label: "Am I free from greed?", why: "If I want 'more' — I should not trade" },
      { key: "emotional_no_fear", label: "Am I free from fear?", why: "If I'm scared — I should not trade" },
      { key: "emotional_no_revenge", label: "Am I free from revenge?", why: "If I lost yesterday — I must not revenge trade" },
    ],
  },
  {
    key: "mental",
    number: 3,
    title: "Mental Preparation",
    verse: "A prepared mind is a disciplined mind.",
    items: [
      { key: "mental_reviewed_system", label: "Have I reviewed my system?", why: "Know what you're looking for" },
      { key: "mental_zones_marked", label: "Have I marked my zones?", why: "D1, H4, H1 — all marked" },
      { key: "mental_bias_clear", label: "Do I know my bias?", why: "Bullish or bearish — clear" },
      { key: "mental_levels_marked", label: "Do I know my levels?", why: "Key levels — marked" },
      { key: "mental_risk_calculated", label: "Do I know my risk?", why: "1–2% per trade — calculated" },
    ],
  },
  {
    key: "physical",
    number: 4,
    title: "Physical Preparation",
    verse: "The body affects the mind. Prepare both.",
    items: [
      { key: "physical_rested", label: "Am I well-rested?", why: "Tired traders make mistakes" },
      { key: "physical_eaten", label: "Have I eaten?", why: "Hunger affects decision-making" },
      { key: "physical_hydrated", label: "Am I hydrated?", why: "Water clears the mind" },
      { key: "physical_quiet", label: "Is my environment quiet?", why: "Distractions = bad decisions" },
      { key: "physical_clean_chart", label: "Is my chart clean?", why: "Clutter = confusion" },
    ],
  },
  {
    key: "discipline",
    number: 5,
    title: "Discipline Commitment",
    verse: "Discipline is the foundation — without it, the system is useless.",
    items: [
      { key: "discipline_wait", label: "I will wait for my setup.", why: "No chasing" },
      { key: "discipline_follow", label: "I will follow my system.", why: "No improvising" },
      { key: "discipline_accept_loss", label: "I will accept losses.", why: "Part of the process" },
      { key: "discipline_no_move_sl", label: "I will not move my stop loss.", why: "Protect capital" },
      { key: "discipline_no_overtrade", label: "I will not overtrade.", why: "Quality over quantity" },
      { key: "discipline_journal", label: "I will journal every trade.", why: "Learn and improve" },
    ],
  },
  {
    key: "rules",
    number: 6,
    title: "Trading Rules Commitment",
    verse: "Rules are not restrictions — they are protection.",
    items: [
      { key: "rules_risk_1_2", label: "I will risk only 1–2% per trade.", why: "Protect capital" },
      { key: "rules_high_prob", label: "I will trade only high-probability setups.", why: "Structure + confirmation" },
      { key: "rules_wait_confirm", label: "I will wait for confirmation.", why: "No entering early" },
      { key: "rules_partial_1_1", label: "I will take partial profits at 1:1.", why: "Secure gains" },
      { key: "rules_stop_3_losses", label: "I will stop trading after 3 losses.", why: "Protect the account" },
    ],
  },
];

export const PRETRADE_ITEMS = [
  { key: "aligned_timeframes", label: "Is my zone aligned across timeframes?", why: "Confluence" },
  { key: "rejection_block", label: "Is there a Rejection Block?", why: "Your number one key" },
  { key: "ema50_aligned", label: "Is the EMA 50 aligned?", why: "Dynamic confluence" },
  { key: "body_close", label: "Has price confirmed with a body close?", why: "Commitment" },
  { key: "risk_calculated", label: "Is my risk calculated?", why: "1–2%" },
  { key: "stop_loss_placed", label: "Is my stop loss placed?", why: "Protection" },
  { key: "target_clear", label: "Is my target clear?", why: "Plan" },
];

// Count total items across sections
export function totalItems(sections) {
  return sections.reduce((sum, s) => sum + s.items.length, 0);
}