"use client";

import { useApi } from "@/lib/useApi";
import { fullName } from "@/lib/subjects";
import type { ChildOverview, Dashboard } from "@/lib/types";
import { useMe } from "./MeContext";
import { Chips } from "./ui/Parts";

export interface StudentScope {
  /** False until we know whose records to load. */
  ready: boolean;
  /** The parent's selected child; undefined for students ("myself"). */
  studentId: number | undefined;
  children: ChildOverview[];
}

/**
 * Whose records a page shows: students see their own, parents the chosen child
 * (defaulting to the first one).
 */
export function useStudentScope(chosenId?: number): StudentScope {
  const me = useMe();
  const isParent = me?.role === "parent";
  const dashboard = useApi<Dashboard>(isParent ? "/home/" : null);
  const children = dashboard.data?.children ?? [];

  if (!me) return { ready: false, studentId: undefined, children };
  if (!isParent) return { ready: true, studentId: undefined, children };

  const studentId = children.find((child) => child.id === chosenId)?.id ?? children[0]?.id;
  // If the dashboard fails, the API falls back to the first child anyway.
  const answered = dashboard.data !== undefined || Boolean(dashboard.error);
  return { ready: answered, studentId, children };
}

/** Switch between children; hidden when there's only one. */
export function ChildPicker({
  childList,
  value,
  onChange,
}: {
  childList: ChildOverview[];
  value: number | undefined;
  onChange: (id: number) => void;
}) {
  if (childList.length < 2) return null;
  return (
    <Chips
      options={childList.map((child) => ({ value: child.id, label: fullName(child) }))}
      value={value}
      onChange={onChange}
    />
  );
}
