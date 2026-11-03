// scripts/apxSmokeTest.mjs
// Run: node scripts/apxSmokeTest.mjs

import {
  evaluateApx,
  computeApxZones,
  computeApxTrade,
  evaluateApxContext,
  evaluateApxLiquidity,
  evaluateApxStructure,
  evaluateApxEntry,
} from "../lib/apxEngine.js";

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; failures.push(`${name}${detail ? " — " + detail : ""}`); console.log(`  ✗ ${name}${detail ? " — " + detail : ""}`); }
}
function section(t) { console.log(`\n── ${t} ──`); }

// 1. Zones
section("computeApxZones");
{
  const z = computeApxZones({ rangeHigh: 1.2, rangeLow: 1.0, impulseHigh: 1.18, impulseLow: 1.05, direction: "long" });
  check("CE = 1.1", z.ce === 1.1, `got ${z.ce}`);
  check("premiumHigh = rangeHigh", z.premiumHigh === 1.2);
  check("discountLow = rangeLow", z.discountLow === 1.0);
  check("OTE low < high (long)", z.oteLow < z.oteHigh, `${z.oteLow} vs ${z.oteHigh}`);
}
{
  const z = computeApxZones({ rangeHigh: 1.2, rangeLow: 1.0, impulseHigh: 1.18, impulseLow: 1.02, direction: "short" });
  check("OTE low < high (short)", z.oteLow < z.oteHigh);
}

// 2. Valid standard long
section("Standard long — VALID");
const validStandard = {
  setupType: "standard", bias: "bullish", direction: "long",
  pair: "EURUSD", timeframeStack: "Daily → 4H → 15M",
  rangeHigh: 1.2, rangeLow: 1.0,
  impulseHigh: 1.18, impulseLow: 1.05,
  entryPrice: 1.089, stopLoss: 1.04, targetPrice: 1.19,
  inducementLevel: 1.09, inducementBroken: true,
  mssLevel: 1.11, mssConfirmed: true,
  fvgHigh: 1.13, fvgLow: 1.12,
};
{
  const r = evaluateApx(validStandard);
  check("preEntryReady", r.preEntryReady === true, r.reasons.join(" | "));
  check("trade.rr >= 2", r.trade?.rr >= 2, `rr=${r.trade?.rr}`);
  check("context ready", r.context.ready);
  check("liquidity ready", r.liquidity.ready, r.liquidity.gates.filter(g => !g.pass && !g.warning && !g.bonus).map(g => g.label).join(" | "));
  check("structure ready", r.structure.ready);
  check("entry ready", r.entry.ready);
  check("reasons empty", r.reasons.length === 0);
}

// 3. Invalid shallow (pullback > 50%)
section("Shallow long — INVALID (pullback > 50%)");
{
  const r = evaluateApx({ ...validStandard, setupType: "shallow", ema50Tapped: true });
  check("preEntryReady false", r.preEntryReady === false);
  check("liquidity not ready", !r.liquidity.ready);
}

// 4. Valid turtle soup short
section("Turtle soup short — VALID");
const validTs = {
  setupType: "turtle_soup", bias: "bearish", direction: "short",
  pair: "GBPUSD", timeframeStack: "4H → 15M → 1M",
  rangeHigh: 1.3, rangeLow: 1.2,
  sweepLevel: 1.305, sweepClosedBackInside: true,
  displacementRange: 0.025, atrValue: 0.02,
  impulseHigh: 1.305, impulseLow: 1.2,
  entryPrice: 1.29, stopLoss: 1.31, targetPrice: 1.24,
  inducementLevel: 1.285, inducementBroken: true,
  mssLevel: 1.27, mssConfirmed: true,
  fvgHigh: 1.28, fvgLow: 1.275,
};
{
  const r = evaluateApx(validTs);
  check("preEntryReady", r.preEntryReady === true, r.reasons.join(" | "));
  check("trade.rr >= 2", r.trade?.rr >= 2, `rr=${r.trade?.rr}`);
}

// 5. Invalid turtle soup (no close-back)
section("Turtle soup — INVALID (no close-back)");
{
  const r = evaluateApx({ ...validTs, sweepClosedBackInside: false });
  check("preEntryReady false", r.preEntryReady === false);
  check("liquidity not ready", !r.liquidity.ready);
}

// 6. Invalid SL
section("Standard — INVALID (SL above entry)");
{
  const r = evaluateApx({ ...validStandard, stopLoss: 1.15 });
  check("preEntryReady false", r.preEntryReady === false);
  check("entry not ready", !r.entry.ready);
}

// 7. RR < 2
section("Standard — INVALID (RR < 2)");
{
  const r = evaluateApx({ ...validStandard, targetPrice: 1.12 });
  check("preEntryReady false", r.preEntryReady === false);
}

// 8. Trade math
section("computeApxTrade");
{
  const t = computeApxTrade({ direction: "long", entryPrice: 1.1, stopLoss: 1.05, targetPrice: 1.2 });
  check("rr = 2", Math.abs(t.rr - 2) < 1e-6, `got ${t.rr}`);
  check("BUY direction", t.direction === "BUY");
  const bad = computeApxTrade({ direction: "long", entryPrice: 1.1, stopLoss: 1.15, targetPrice: 1.2 });
  check("invalid when SL wrong side", bad.invalid === true);
}

console.log(`\n────────────────────`);
console.log(`  PASS: ${pass}`);
console.log(`  FAIL: ${fail}`);
if (fail > 0) {
  console.log("\nFailures:");
  failures.forEach((f) => console.log(`  • ${f}`));
  process.exit(1);
} else {
  console.log("\nAll checks passed. ✅");
  process.exit(0);
}