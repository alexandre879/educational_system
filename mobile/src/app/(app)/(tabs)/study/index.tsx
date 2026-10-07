import { useCurrentUser } from "@/auth/AuthProvider";
import { AttendanceView } from "@/features/attendance/AttendanceView";
import { ExamsList } from "@/features/exams/ExamsList";
import { ScheduleView } from "@/features/schedule/ScheduleView";

/** The role's main tool: exams for students, attendance for teachers, schedule for parents. */
export default function StudyScreen() {
  const user = useCurrentUser();

  if (user.role === "teacher") return <AttendanceView />;
  if (user.role === "parent") return <ScheduleView />;
  return <ExamsList />;
}
