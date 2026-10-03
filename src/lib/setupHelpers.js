// ============================================================
// SETUP HELPERS — Institutional Flow System
// ============================================================

import { ALL_PAIRS } from "./pairCatalog";

export const PAIRS = ALL_PAIRS;

export function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}