import { useMemo } from "react";

import { useCurrentUser } from "@/auth/AuthProvider";
import { ScreenTitleContext } from "@/components/Screen";
import { AttendanceView } from "@/features/attendance/AttendanceView";
import { ExamsList } from "@/features/exams/ExamsList";
import { ScheduleView } from "@/features/schedule/ScheduleView";
import { useI18n } from "@/i18n";

/** The role's main tool: exams for students, attendance for teachers, schedule for parents. */
export default function StudyScreen() {
  const user = useCurrentUser();
  const { t } = useI18n();

  const title =
    user.role === "teacher" ? t("attendance.title") : user.role === "parent" ? t("schedule.title") : t("exams.title");
  const header = useMemo(() => ({ title }), [title]);

  return (
    <ScreenTitleContext.Provider value={header}>
      {user.role === "teacher" ? <AttendanceView /> : user.role === "parent" ? <ScheduleView /> : <ExamsList />}
    </ScreenTitleContext.Provider>
  );
}
