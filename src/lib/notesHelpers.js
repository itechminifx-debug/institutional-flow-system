export const NOTE_TAGS = [
  { key: "rule", label: "Rule", color: "bg-blue-900/40 text-blue-300" },
  { key: "insight", label: "Insight", color: "bg-purple-900/40 text-purple-300" },
  { key: "reminder", label: "Reminder", color: "bg-yellow-900/40 text-yellow-300" },
  { key: "lesson", label: "Lesson", color: "bg-green-900/40 text-green-300" },
];

export function tagColor(tag) {
  return (
    NOTE_TAGS.find((t) => t.key === tag)?.color ||
    "bg-gray-800 text-gray-300"
  );
}

export function tagLabel(tag) {
  return NOTE_TAGS.find((t) => t.key === tag)?.label || tag || "";
}

export function formatNoteDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}