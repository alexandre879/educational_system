import { API_URL } from "@/config";
import { getLanguage } from "@/i18n/language";

import { api, refreshAccessToken } from "./client";
import * as session from "./session";
import type {
  Announcement,
  AnnouncementList,
  AttendanceHistory,
  CalendarData,
  ChatTurn,
  Comment,
  DailyExercises,
  Dashboard,
  ExamHistoryItem,
  ExamListItem,
  ExamReview,
  ExamState,
  Exercise,
  Gradebook,
  LeaderboardEntry,
  MarkEntry,
  MySubject,
  Schedule,
  SearchResults,
  StudentMarks,
  SubjectBook,
  TeacherExam,
  TodayLessons,
  Tokens,
  User,
} from "./types";

/** Parents pass the child they're looking at; students leave it out. */
const forStudent = (studentId?: number) => (studentId ? { student_id: studentId } : undefined);

// --- Auth -------------------------------------------------------------------

export async function requestOtp(email: string): Promise<void> {
  await api.post("/otp/request/", { email });
}

export async function verifyOtp(email: string, otp: string): Promise<Tokens> {
  const { data } = await api.post<Tokens>("/otp/verify/", { email, otp });
  return data;
}

export async function logout(refresh: string): Promise<void> {
  await api.post("/user/logout/", { refresh });
}

export async function registerPushDevice(token: string, platform: string, language: string): Promise<void> {
  await api.post("/push/register/", { token, platform, language });
}

export async function unregisterPushDevice(token: string): Promise<void> {
  await api.post("/push/unregister/", { token });
}

// --- Profile ----------------------------------------------------------------

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>("/user/me/");
  return data;
}

export interface ProfileUpdate {
  first_name: string;
  last_name: string;
  photo?: { uri: string; name: string; type: string };
}

/** Multipart upload via fetch: React Native's FormData file parts are most reliable there. */
export async function updateProfile(update: ProfileUpdate): Promise<User> {
  const send = (token: string | null) => {
    const body = new FormData();
    body.append("first_name", update.first_name);
    body.append("last_name", update.last_name);
    if (update.photo) {
      // React Native accepts { uri, name, type } as a file part.
      body.append("profilePic", update.photo as unknown as Blob);
    }

    return fetch(`${API_URL}/update/profile/`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Accept-Language": getLanguage(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
    });
  };

  let response = await send(session.getAccessToken());
  if (response.status === 401 && session.getRefreshToken()) {
    response = await send(await refreshAccessToken());
  }

  if (!response.ok) {
    throw new Error(`Profile update failed (${response.status})`);
  }
  return (await response.json()) as User;
}

// --- Dashboard ----------------------------------------------------------------

export async function fetchDashboard(): Promise<Dashboard> {
  const { data } = await api.get<Dashboard>("/home/");
  return data;
}

// --- Exams --------------------------------------------------------------------

export async function fetchExams(): Promise<ExamListItem[]> {
  const { data } = await api.get<ExamListItem[]>("/exams/");
  return data;
}

/** Starts or resumes the session; once time is up the server returns the result instead. */
export async function startOrResumeExam(examId: number): Promise<ExamState> {
  const { data } = await api.post<ExamState>(`/exams/${examId}/start_or_resume/`);
  return data;
}

export async function submitAnswer(sessionId: number, questionId: number, optionId: number): Promise<ExamState> {
  const { data } = await api.post<ExamState>(`/sessions/${sessionId}/answer/`, {
    question_id: questionId,
    option_id: optionId,
  });
  return data;
}

// --- Announcements --------------------------------------------------------------

export async function fetchAnnouncements(subjectId?: number): Promise<AnnouncementList> {
  const { data } = await api.get<AnnouncementList>("/announcements/list/", {
    params: subjectId ? { subject: subjectId } : undefined,
  });
  return data;
}

export async function fetchAnnouncement(id: number): Promise<Announcement> {
  const { data } = await api.get<Announcement>(`/announcements/${id}/`);
  return data;
}

export interface NewAnnouncement {
  title: string;
  content: string;
  subject_id: number;
  grade_id: number;
  category_id: number | null;
}

export async function createAnnouncement(input: NewAnnouncement): Promise<Announcement> {
  const { data } = await api.post<Announcement>("/announcements/create/", input);
  return data;
}

export async function fetchComments(announcementId: number): Promise<Comment[]> {
  const { data } = await api.get<Comment[]>("/comments/", { params: { announcement: announcementId } });
  return data;
}

export async function addComment(announcementId: number, comment: string): Promise<Comment> {
  const { data } = await api.post<Comment>("/comments/create/", { announcement: announcementId, comment });
  return data;
}

// --- Subjects, books, leaderboard -------------------------------------------------

export async function fetchMySubjects(): Promise<MySubject[]> {
  const { data } = await api.get<MySubject[]>("/my_subjects/");
  return data;
}

export async function fetchSubjectBook(subjectId: number, gradeId: number): Promise<SubjectBook> {
  const { data } = await api.get<SubjectBook>("/subjects/books/", {
    params: { subject_id: subjectId, grade_id: gradeId },
  });
  return data;
}

export async function fetchLeaderboard(subject: MySubject): Promise<LeaderboardEntry[]> {
  const { data } = await api.get<LeaderboardEntry[]>(
    `/leader-board/list/${subject.pk}/${subject.grade__pk}/${subject.grade__category__pk}/`
  );
  return data;
}

// --- Schedule & attendance ----------------------------------------------------------

export async function fetchSchedule(weekday: number): Promise<Schedule> {
  const { data } = await api.get<Schedule>("/schedule/grade-weekday/", { params: { weekday } });
  return data;
}

export async function fetchTodayLessons(): Promise<TodayLessons> {
  const { data } = await api.get<TodayLessons>("/teacher/attendance/today-lessons/");
  return data;
}

export async function markAttendance(
  lessonId: number,
  date: string,
  attendance: { student_id: number; is_present: boolean }[]
): Promise<{ present_count: number; absent_count: number }> {
  const { data } = await api.post("/teacher/attendance/mark/", { lesson_id: lessonId, date, attendance });
  return data;
}

// --- Exercises ------------------------------------------------------------------------

export async function fetchDailyExercises(date: string): Promise<DailyExercises> {
  const { data } = await api.get<DailyExercises>("/exercises/daily/", { params: { date } });
  return data;
}

export interface NewExercise {
  grade_id: number;
  subject_id: number;
  title: string;
  description: string;
  date: string;
  due_date: string | null;
}

export async function createExercise(input: NewExercise): Promise<Exercise> {
  const { data } = await api.post<Exercise>("/exercises/daily/create/", input);
  return data;
}

// --- AI assistant -----------------------------------------------------------------------

export async function askAssistant(message: string, history: ChatTurn[]): Promise<string> {
  const { data } = await api.post<{ reply: string }>("/aisupport/", { message, history });
  return data.reply;
}

// --- Exam history, review, teacher exams ---------------------------------------------------

export async function fetchExamHistory(studentId?: number): Promise<ExamHistoryItem[]> {
  const { data } = await api.get<{ items: ExamHistoryItem[] }>("/exams/history/", { params: forStudent(studentId) });
  return data.items;
}

export async function fetchExamReview(sessionId: number): Promise<ExamReview> {
  const { data } = await api.get<ExamReview>(`/sessions/${sessionId}/review/`);
  return data;
}

export async function fetchTeacherExams(): Promise<TeacherExam[]> {
  const { data } = await api.get<{ items: TeacherExam[] }>("/teacher/exams/");
  return data.items;
}

export interface NewExam {
  subject_id: number;
  title: string;
  duration: number;
  scheduled_for: string | null;
  questions: { text: string; points: number; options: { title: string; is_correct: boolean }[] }[];
}

export async function createExam(input: NewExam): Promise<{ id: number }> {
  const { data } = await api.post<{ id: number }>("/teacher/exams/", input);
  return data;
}

// --- Homework completion -------------------------------------------------------------------

export async function setExerciseDone(
  exerciseId: number,
  done: boolean
): Promise<{ id: number; completed: boolean; streak: number }> {
  const { data } = await api.post(`/exercises/${exerciseId}/complete/`, { done });
  return data;
}

// --- Gradebook -------------------------------------------------------------------------------

export async function fetchMarks(studentId?: number): Promise<StudentMarks> {
  const { data } = await api.get<StudentMarks>("/marks/", { params: forStudent(studentId) });
  return data;
}

export async function fetchGradebook(subjectId: number): Promise<Gradebook> {
  const { data } = await api.get<Gradebook>("/teacher/marks/", { params: { subject_id: subjectId } });
  return data;
}

export async function giveMark(input: {
  student_id: number;
  subject_id: number;
  value: number;
  comment?: string;
}): Promise<MarkEntry> {
  const { data } = await api.post<MarkEntry>("/teacher/marks/", input);
  return data;
}

export async function deleteMark(markId: number): Promise<void> {
  await api.delete(`/teacher/marks/${markId}/`);
}

// --- Attendance history, calendar, search ------------------------------------------------------

export async function fetchAttendanceHistory(month: string, studentId?: number): Promise<AttendanceHistory> {
  const { data } = await api.get<AttendanceHistory>("/attendance/history/", {
    params: { month, ...forStudent(studentId) },
  });
  return data;
}

export async function fetchCalendar(start: string, end: string, studentId?: number): Promise<CalendarData> {
  const { data } = await api.get<CalendarData>("/calendar/", { params: { start, end, ...forStudent(studentId) } });
  return data;
}

export async function search(query: string): Promise<SearchResults> {
  const { data } = await api.get<SearchResults>("/search/", { params: { q: query } });
  return data;
}
