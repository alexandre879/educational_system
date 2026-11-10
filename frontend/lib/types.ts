/** API shapes shared by the website's pages (the same as the mobile app's `src/api/types.ts`). */
import type { LocalizedValue as Localized } from "./localized";

export type Role = "student" | "teacher" | "admin" | "parent";

export interface SubjectRef {
  id: number;
  name: Localized;
}

export interface GradeInfo {
  id: number;
  name: string;
  category_name?: Localized;
}

// ---------------------------------------------------------------------------
// Dashboard (/home/)
// ---------------------------------------------------------------------------

export interface Me {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: Role | null;
  points: number | null;
  grade_in: { id: number; name: string; category: { id: number; name: Localized } | null } | null;
  profilePic: string | null;
}

export interface SessionMini {
  id: number;
  exam: { id: number; title: Localized; duration: number };
  subject: SubjectRef;
  grade: { id: number; name: string };
  score_so_far: number;
  /** The most points the exam can give (0 when it has no questions). */
  max_score?: number;
  started: boolean | null;
  finished: boolean | null;
  started_at: string | null;
  ends_at: string | null;
  submitted_at: string | null;
  is_active: boolean;
}

export interface DashboardAnnouncement {
  id: number;
  title: string;
  content: string;
  grade: GradeInfo;
  subject: SubjectRef | null;
  created_by: { id: number; email: string; name: string };
  created_at: string;
  len_comments: number;
}

export interface ChildOverview {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profilePic: string | null;
  points: number;
  grade: GradeInfo | null;
  attendance_today: {
    lesson_id: number;
    subject_id: number;
    subject: Localized;
    start_time: string;
    end_time: string;
    is_present: boolean;
  }[];
  average_mark: number | null;
  /** Percent present over the last 30 days; null without records. */
  attendance_rate: number | null;
  pending_homework: number;
}

export interface Dashboard {
  me: Me;
  // students
  subjects?: SubjectRef[];
  subjectPoints?: { subject: SubjectRef; points: number | null }[];
  announcements?: DashboardAnnouncement[];
  sessions?: SessionMini[];
  /** Days in a row with homework ticked off. */
  streak?: number;
  pending_homework?: number;
  average_mark?: number | null;
  // teachers
  subjectsTaught?: (SubjectRef & { grade?: GradeInfo })[];
  myAnnouncements?: DashboardAnnouncement[];
  examCounts?: { subject_id: number; subject: SubjectRef; count: number }[];
  // admins
  stats?: { users: number; grades: number; subjects: number; exams: number; questions: number };
  latestAnnouncements?: DashboardAnnouncement[];
  // parents
  children?: ChildOverview[];
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export interface MySubject {
  pk: number;
  name: Localized;
  grade__pk: number;
  grade__name: string;
  grade__category__pk: number | null;
  grade__category__name: Localized;
}

// ---------------------------------------------------------------------------
// Exams: results, review, the teacher's exams
// ---------------------------------------------------------------------------

export interface ExamHistoryItem {
  session_id: number;
  exam_id: number;
  title: string;
  subject_id: number;
  subject: Localized;
  score: number;
  max_score: number;
  correct: number;
  total_questions: number;
  submitted_at: string | null;
  timed_out: boolean;
}

export interface ExamReview {
  session_id: number;
  exam_id: number;
  title: string;
  subject_id: number;
  subject: Localized;
  score: number;
  max_score: number;
  timed_out: boolean;
  submitted_at: string | null;
  questions: {
    id: number;
    text: string;
    points: number;
    chosen_option_id: number | null;
    is_correct: boolean;
    options: { id: number; title: string; is_correct: boolean }[];
  }[];
}

export interface TeacherExam {
  id: number;
  title: Localized;
  subject_id: number;
  subject: Localized;
  grade: GradeInfo;
  duration: number;
  scheduled_for: string | null;
  questions_count: number;
  max_score: number;
  submissions: number;
  average_score: number | null;
  created_at: string | null;
}

// ---------------------------------------------------------------------------
// Gradebook
// ---------------------------------------------------------------------------

export interface MarkEntry {
  id: number;
  value: number;
  date: string;
  comment: string;
  subject_id: number;
  teacher: string | null;
}

export interface StudentMarks {
  student: { id: number; name: string };
  average: number | null;
  max_mark: number;
  subjects: { subject_id: number; subject: Localized; average: number | null; marks: MarkEntry[] }[];
}

export interface Gradebook {
  subject: SubjectRef;
  grade: GradeInfo;
  max_mark: number;
  students: { id: number; name: string; profilePic: string | null; average: number | null; marks: MarkEntry[] }[];
}

// ---------------------------------------------------------------------------
// Attendance history & calendar
// ---------------------------------------------------------------------------

export interface AttendanceHistory {
  student_id: number;
  month: string;
  summary: { present: number; absent: number; rate: number | null };
  records: {
    date: string;
    lesson_id: number;
    subject_id: number;
    subject: Localized;
    start_time: string;
    end_time: string;
    is_present: boolean;
  }[];
}

export interface CalendarLesson {
  id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  room: string | null;
  subject_id: number;
  subject: Localized;
  grade: string;
}

export interface CalendarHomework {
  id: number;
  title: string;
  date: string;
  due_date: string;
  subject_id: number | null;
  subject: Localized;
  completed: boolean | null;
}

export interface CalendarExam {
  id: number;
  title: Localized;
  subject_id: number;
  subject: Localized;
  scheduled_for: string;
  duration: number;
}

export interface CalendarData {
  start: string;
  end: string;
  lessons: CalendarLesson[];
  homework: CalendarHomework[];
  exams: CalendarExam[];
}
