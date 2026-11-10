/** Text the API returns either as-is or as `{ en, ka, ru }` translations. */
export type Localized = string | Record<string, string> | null | undefined;

export type Role = "student" | "teacher" | "admin" | "parent";

export type SpectatorRole = "student" | "teacher" | "parent";

/** Present only in spectator mode: whose view this is, and the roles the visitor can switch to. */
export interface SpectatorInfo {
  viewing_as: SpectatorRole;
  roles: SpectatorRole[];
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profilePic: string | null;
  role: Role | null;
  spectator?: SpectatorInfo;
}

export interface Tokens {
  access: string;
  refresh: string;
}

// ---------------------------------------------------------------------------
// Dashboard (/home/)
// ---------------------------------------------------------------------------

export interface SubjectRef {
  id: number;
  name: Localized;
}

export interface GradeInfo {
  id: number;
  name: string;
  category_name?: Localized;
}

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

export interface ChildAttendance {
  lesson_id: number;
  subject_id: number;
  subject: Localized;
  start_time: string;
  end_time: string;
  is_present: boolean;
}

export interface ChildOverview {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profilePic: string | null;
  points: number;
  grade: GradeInfo | null;
  attendance_today: ChildAttendance[];
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
  announcements?: Announcement[];
  sessions?: SessionMini[];
  /** Days in a row with homework ticked off. */
  streak?: number;
  pending_homework?: number;
  average_mark?: number | null;
  // teachers
  subjectsTaught?: (SubjectRef & { grade?: GradeInfo })[];
  myAnnouncements?: Announcement[];
  examCounts?: { subject_id: number; subject: SubjectRef; count: number }[];
  // admins
  stats?: { users: number; grades: number; subjects: number; exams: number; questions: number };
  latestAnnouncements?: Announcement[];
  // parents
  children?: ChildOverview[];
}

// ---------------------------------------------------------------------------
// Announcements & comments
// ---------------------------------------------------------------------------

export interface Announcement {
  id: number;
  title: string;
  content: string;
  grade: GradeInfo;
  subject: SubjectRef | null;
  created_by: { id: number; email: string; name: string };
  created_at: string;
  len_comments: number;
}

export interface AnnouncementSubject {
  id: number;
  name: Localized;
  grade: {
    grade_id: number;
    grade_name: string;
    grade_category_id: number | null;
    grade_category_name: Localized;
  };
}

export interface AnnouncementList {
  announcements: Announcement[];
  subjects: AnnouncementSubject[];
  role: Role | null;
}

/** The emoji people can react with, in the order the server lists them. */
export const REACTIONS = ["👍", "❤️", "😂", "😮", "🎉", "🙏"] as const;

export interface CommentReaction {
  emoji: string;
  count: number;
  mine: boolean;
}

export interface Comment {
  id: number;
  /** The author's email. */
  user: string;
  author: { id: number; name: string; role: Role | null; photo: string | null };
  /** Empty once deleted. */
  comment: string;
  created_at: string;
  edited_at: string | null;
  deleted: boolean;
  reply_to: { id: number; author: string; comment: string; deleted: boolean } | null;
  reactions: CommentReaction[];
  can_edit: boolean;
  can_delete: boolean;
}

// ---------------------------------------------------------------------------
// Exams
// ---------------------------------------------------------------------------

export interface ExamListItem {
  id: number;
  title: string;
  subject_id: number;
  subject: string;
  duration: number;
  questions_count: number;
  exam_language: string;
}

export interface ExamQuestionState {
  subject: Localized;
  title?: Localized;
  exam_id: number;
  session_id: number;
  current_index: number;
  current_question: {
    id: number;
    text: Localized;
    points: number;
    options: { id: number; title: Localized }[];
  };
  len_questions: number;
  ends_at: string | null;
  exam_language?: string;
}

export interface ExamResult {
  message: string;
  session_id?: number;
  final_score: number;
  max_score?: number;
  total_questions: number;
  subject_points: number;
  global_points: number;
  ends_at: string | null;
  timed_out: boolean;
}

export type ExamState = ExamQuestionState | ExamResult;

export function isExamResult(state: ExamState): state is ExamResult {
  return (state as ExamResult).final_score !== undefined;
}

// ---------------------------------------------------------------------------
// Subjects, books, leaderboard
// ---------------------------------------------------------------------------

export interface MySubject {
  pk: number;
  name: Localized;
  grade__pk: number;
  grade__name: string;
  grade__category__pk: number | null;
  grade__category__name: Localized;
}

export interface SubjectBook {
  id: number;
  pdf_url: string | null;
  uploaded_at: string | null;
}

export interface LeaderboardEntry {
  first_name: string;
  last_name: string;
  email: string;
  points: number;
  profile_pic: string | null;
}

// ---------------------------------------------------------------------------
// Schedule & attendance
// ---------------------------------------------------------------------------

export interface ScheduleLesson {
  id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  room: string | null;
  subject: SubjectRef;
  teacher: { id: number | null; name: string | null };
}

export interface Schedule {
  grade: { id: number; name: string };
  weekday: number;
  lessons: ScheduleLesson[];
}

export interface AttendanceLesson {
  lesson_id: number;
  subject_id: number;
  subject_name: Localized;
  grade_name: string;
  grade_category_name: Localized;
  room: string | null;
  time: { start: string; end: string };
  students: { id: number; name: string; is_present: boolean }[];
}

export interface TodayLessons {
  date: string;
  weekday: number;
  lessons: AttendanceLesson[];
}

// ---------------------------------------------------------------------------
// Daily exercises
// ---------------------------------------------------------------------------

export interface Exercise {
  id: number;
  date: string;
  due_date: string | null;
  title: string;
  description: string | null;
  grade: GradeInfo;
  subject: SubjectRef | null;
  teacher: { id: number | null; name: string | null };
  created_at: string | null;
  /** Students: ticked off. Parents: every child in that class ticked it off. */
  completed: boolean | null;
  /** Teachers: how many students of the class are done. */
  completion: { done: number; total: number } | null;
}

export interface TeacherSubject {
  id: number;
  name: Localized;
  grade: GradeInfo;
}

export interface DailyExercises {
  date: string;
  role: Role | null;
  items: Exercise[];
  subjects?: TeacherSubject[];
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// Exam history, review, teacher exams
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
// Attendance history, calendar, search
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

export interface SearchResults {
  subjects: { pk: number; name: Localized; grade__name: string; grade__category__name: Localized }[];
  exams: { pk: number; title: Localized; subject__pk?: number; subject__name?: Localized }[];
  announcements: { pk: number; title: string; content: string; subject__pk: number | null; subject__name: Localized }[];
  exercises: {
    id: number;
    title: string;
    description: string | null;
    date: string;
    due_date: string | null;
    subject__id: number | null;
    subject__name: Localized;
  }[];
}
