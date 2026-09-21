// Parse a zone string like "208700-208900" or "208700 - 208900"
// Returns { low, high } or null if invalid
export function parseZone(zoneString) {
  if (!zoneString) return null;

  const cleaned = zoneString.replace(/\s/g, "");
  const parts = cleaned.split("-");

  if (parts.length !== 2) return null;

  const a = parseFloat(parts[0]);
  const b = parseFloat(parts[1]);

  if (isNaN(a) || isNaN(b)) return null;

  return {
    low: Math.min(a, b),
    high: Math.max(a, b),
  };
}

// Given live price and a zone, return status info
export function getZoneStatus(price, zone) {
  if (price === null || !zone) {
    return { status: "unknown", distance: null, label: "No data" };
  }

  const { low, high } = zone;

  // Inside the zone
  if (price >= low && price <= high) {
    return {
      status: "in-zone",
      distance: 0,
      label: "In Zone",
    };
  }

  // Distance to nearest edge
  const distance = price < low ? low - price : price - high;

  // Percent proximity: how close relative to zone size
  const zoneSize = high - low;
  const proximityRatio = distance / (zoneSize || 1);

  // Approaching if within 1x zone size
  if (proximityRatio <= 1) {
    return {
      status: "approaching",
      distance,
      label: "Approaching",
    };
  }

  return {
    status: "far",
    distance,
    label: "Far",
  };
}

// Visual colors based on status
export function statusColors(status) {
  switch (status) {
    case "in-zone":
      return {
        bg: "bg-green-900/40",
        border: "border-green-600",
        text: "text-green-300",
        dot: "bg-green-500 animate-pulse",
      };
    case "approaching":
      return {
        bg: "bg-yellow-900/30",
        border: "border-yellow-700",
        text: "text-yellow-300",
        dot: "bg-yellow-500 animate-pulse",
      };
    case "far":
      return {
        bg: "bg-gray-900",
        border: "border-gray-800",
        text: "text-gray-400",
        dot: "bg-gray-600",
      };
    default:
      return {
        bg: "bg-gray-900",
        border: "border-gray-800",
        text: "text-gray-500",
        dot: "bg-gray-700",
      };
  }
}