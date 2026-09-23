// Return { start, end } for the current week (Monday - Sunday)
export function getCurrentWeek() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

export function getLastWeek() {
  const { start } = getCurrentWeek();
  const lastMonday = new Date(start);
  lastMonday.setDate(start.getDate() - 7);

  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  return { start: lastMonday, end: lastSunday };
}

export function formatWeekLabel(startDate) {
  if (!startDate) return "";
  const d = new Date(startDate);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function toDateString(date) {
  return date.toISOString().split("T")[0];
}