export interface Student {
  id: number;
  name: string;
  is_present: boolean;
};

export interface Lesson {
  lesson_id: number;
  subject_name: string;
  grade_name: string;
  grade_category_name: string;
  room?: string | null;
  time: { start: string; end: string };
  students: Student[];
};

export interface TodayAttendanceResponse {
  // role: "teacher" | "student" | "admin";
  date: string;
  weekday: number;
  lessons: Lesson[];
};