// Each subject gets a stable color (the same as in the mobile app) so it's recognisable everywhere.
const SUBJECT_COLORS = ["#1677FF", "#8B5CF6", "#EC4899", "#F97316", "#14B8A6", "#22C55E", "#EAB308", "#06B6D4"];

export function subjectColor(subjectId: number | null | undefined): string {
  if (subjectId == null) return SUBJECT_COLORS[0];
  return SUBJECT_COLORS[Math.abs(subjectId) % SUBJECT_COLORS.length];
}

/** `#RRGGBB` → `#RRGGBBAA` with the given opacity (0–1). */
export function withAlpha(hex: string, opacity: number): string {
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${alpha}`;
}

export function fullName(person: { first_name?: string | null; last_name?: string | null; email?: string }): string {
  return `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() || person.email || "";
}
