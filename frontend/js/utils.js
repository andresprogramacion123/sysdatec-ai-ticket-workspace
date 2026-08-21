export const STATUS_LABELS = {
  open: "Abierto",
  in_progress: "En progreso",
  resolved: "Resuelto",
  closed: "Cerrado",
};

export function translateStatus(status) {
  return STATUS_LABELS[status] ?? status;
}

export const CATEGORY_LABELS = {
  Finance: "Finanzas",
  Legal: "Legal",
  Procurement: "Compras",
  Operations: "Operaciones",
};

export function translateCategory(category) {
  return CATEGORY_LABELS[category] ?? category;
}

export const PRIORITY_LABELS = {
  High: "Alta",
  Medium: "Media",
  Low: "Baja",
};

export function translatePriority(priority) {
  return PRIORITY_LABELS[priority] ?? priority;
}

export function getInitials(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function avatarColor(name) {
  const hue = hashString(name || "") % 360;
  return `hsl(${hue}, 48%, 38%)`;
}
