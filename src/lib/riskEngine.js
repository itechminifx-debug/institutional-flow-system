// Calculate lot size based on account, risk %, and stop-loss distance
// Simplified model: assumes 1 lot = $1 per point movement
// For forex/gold/Vol 80, this varies by instrument — this is a starter model
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

// Calculate RR ratio
export function calculateRR(entryPrice, stopLoss, takeProfit) {
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);

  if (!risk || risk <= 0) return 0;
  return Math.round((reward / risk) * 100) / 100;
}

// Suggest SL based on rejection zone
// For a "buy", SL goes below the zone low
// For a "sell", SL goes above the zone high
export function suggestStopLoss(direction, zone, entryPrice) {
  if (!zone) return null;

  const buffer = (zone.high - zone.low) * 0.2; // 20% buffer beyond zone

  if (direction === "buy") {
    return Math.round((zone.low - buffer) * 100) / 100;
  }
  return Math.round((zone.high + buffer) * 100) / 100;
}

// Suggest TP based on 2R
export function suggestTakeProfit(direction, entryPrice, stopLoss, rr = 2) {
  if (!entryPrice || !stopLoss) return null;

  const risk = Math.abs(entryPrice - stopLoss);

  if (direction === "buy") {
    return Math.round((entryPrice + risk * rr) * 100) / 100;
  }
  return Math.round((entryPrice - risk * rr) * 100) / 100;
}