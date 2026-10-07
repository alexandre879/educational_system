import type { LocalizedValue } from "@/lib/localized";

export interface ExerciseGrade {
  id: number;
  name: LocalizedValue;
  category_name?: LocalizedValue | null;
}

export interface Exercise {
  id: number;
  date: string;
  title: LocalizedValue;
  description?: LocalizedValue | null;
  due_date?: string | null;
  grade: ExerciseGrade;
  subject?: {
    id: number;
    name: LocalizedValue;
  } | null;
  teacher?: { id: number | null; name: string | null };
  /** Students: ticked off. Parents: every child in that class ticked it off. */
  completed?: boolean | null;
  /** Teachers: how many students of the class are done. */
  completion?: { done: number; total: number } | null;
}

/** A subject the teacher can assign exercises for. */
export interface TeacherSubject {
  id: number;
  name: LocalizedValue;
  grade: ExerciseGrade;
}

export interface ExerciseResponse {
  date: string;
  role: string | null;
  items: Exercise[];
  subjects?: TeacherSubject[];
}
