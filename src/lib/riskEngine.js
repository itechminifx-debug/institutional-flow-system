// ============================================================
// RISK ENGINE — Institutional Flow System
// ============================================================
// Convention:
//   BUY  (bullish): SL BELOW entry, TP ABOVE entry
//   SELL (bearish): SL ABOVE entry, TP BELOW entry
// ============================================================

export function calculateLotSize({
  accountSize,
  riskPercent,
  entryPrice,
  stopLoss,
  pipValuePerLot = 1,
}) {
  const riskAmount = (accountSize * riskPercent) / 100;
  const slDistance = Math.abs(entryPrice - stopLoss);

  if (!slDistance || slDistance <= 0) {
    return { lotSize: 0, riskAmount, slDistance: 0 };
  }

  const lotSize = riskAmount / (slDistance * pipValuePerLot);

  return {
    lotSize: Math.max(0.01, Math.round(lotSize * 100) / 100),
    riskAmount,
    slDistance,
  };
}

// RR ratio: always positive (uses absolute distances)
export function calculateRR(entryPrice, stopLoss, takeProfit) {
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);

  if (!risk || risk <= 0) return 0;
  return Math.round((reward / risk) * 100) / 100;
}

// Suggest SL based on zone and direction
//   BUY  → SL below zone low
//   SELL → SL above zone high
export function suggestStopLoss(direction, zone) {
  if (!zone) return null;

  const buffer = Math.max((zone.high - zone.low) * 0.2, 0.01);

  if (direction === "buy") {
    return Math.round((zone.low - buffer) * 100) / 100;
  }
  // sell
  return Math.round((zone.high + buffer) * 100) / 100;
}

// Suggest TP based on 2R (default)
//   BUY  → entry + risk × rr
//   SELL → entry - risk × rr
export function suggestTakeProfit(direction, entryPrice, stopLoss, rr = 2) {
  if (!entryPrice || !stopLoss) return null;

  const risk = Math.abs(entryPrice - stopLoss);
  if (risk <= 0) return null;

  if (direction === "buy") {
    return Math.round((entryPrice + risk * rr) * 100) / 100;
  }
  // sell
  return Math.round((entryPrice - risk * rr) * 100) / 100;
}

// Validation: check if entry/SL/TP are on the correct side for the direction
export function validateTrade({
  direction,
  entryPrice,
  stopLoss,
  takeProfit,
}) {
  const errors = [];

  if (!entryPrice || !stopLoss || !takeProfit) {
    errors.push("All fields (entry, SL, TP) are required.");
    return errors;
  }

  if (direction === "buy") {
    if (stopLoss >= entryPrice) {
      errors.push("BUY: Stop Loss must be BELOW entry price.");
    }
    if (takeProfit <= entryPrice) {
      errors.push("BUY: Take Profit must be ABOVE entry price.");
    }
  } else if (direction === "sell") {
    if (stopLoss <= entryPrice) {
      errors.push("SELL: Stop Loss must be ABOVE entry price.");
    }
    if (takeProfit >= entryPrice) {
      errors.push("SELL: Take Profit must be BELOW entry price.");
    }
  } else {
    errors.push("Direction must be 'buy' or 'sell'.");
  }

  return errors;
}