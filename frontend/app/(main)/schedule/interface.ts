export interface TimetableItem {
    id: number;
    weekday: number;
    start_time: string;
    end_time: string;
    room: string | null;
    grade: {
        id: number;
        name: string
    };
    subject: {
        id: number;
        name: string
    };
    teacher: {
        id: number | null;
        name: string | null
    };
};



export type Student = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profilePic: string | null;
};

export type ApiResponse = {
  grade: { id: number; name: string };
  weekday: number;
  lessons: Lesson[];
  students: Student[];
};



export type Lesson = {
  id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  room: string | null;
  grade: { id: number; name: string };
  subject: { id: number; name: string };
  teacher: { id: number | null; name: string | null };
};
