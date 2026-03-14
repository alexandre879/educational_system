type LocalizedValue = string | Record<string, string>;


export interface Student {
  id: number;
  name: string;
  is_present: boolean;
};


export interface Lesson {
  lesson_id: number;
  subject_name: LocalizedValue;
  grade_name: LocalizedValue;
  grade_category_name: LocalizedValue;
  room?: string | null;
  time: {
    start: string;
    end: string;
  };
  students: {
    id: number;
    name: LocalizedValue;
    is_present: boolean;
  }[];
}

export interface TodayAttendanceResponse {
  date: string;
  weekday: number;
  lessons: Lesson[];
};