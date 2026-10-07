export function fullName(person: { first_name?: string | null; last_name?: string | null; email?: string }): string {
  return `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() || person.email || "";
}
