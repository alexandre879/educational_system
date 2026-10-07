import { useQuery } from "@tanstack/react-query";

import { fetchDashboard } from "@/api/endpoints";
import type { ChildOverview } from "@/api/types";
import { useCurrentUser } from "@/auth/AuthProvider";
import { Chip, ChipRow } from "@/components/Controls";
import { fullName } from "@/lib/people";

/** A parent's linked students (from the home dashboard, usually already loaded). */
export function useChildren(): ChildOverview[] {
  const user = useCurrentUser();
  const { data } = useQuery({
    queryKey: ["dashboard", user.id],
    queryFn: fetchDashboard,
    enabled: user.role === "parent",
  });
  return data?.children ?? [];
}

/**
 * Which student a parent is looking at: the chosen one, else the first child.
 * Students (and other roles) get undefined, meaning "myself".
 */
export function useSelectedChild(chosenId: number | undefined): number | undefined {
  const user = useCurrentUser();
  const children = useChildren();
  if (user.role !== "parent") return undefined;
  return children.find((child) => child.id === chosenId)?.id ?? children[0]?.id;
}

/** Switch between children; hidden when there's only one. */
export function ChildPicker({ value, onChange }: { value: number | undefined; onChange: (id: number) => void }) {
  const children = useChildren();
  if (children.length < 2) return null;

  return (
    <ChipRow>
      {children.map((child) => (
        <Chip key={child.id} label={fullName(child)} selected={child.id === value} onPress={() => onChange(child.id)} />
      ))}
    </ChipRow>
  );
}
