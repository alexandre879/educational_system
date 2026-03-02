export interface Exercise {
  id: number;
  date: string;
  due_date: string | null;
  title: string;
  description: string | null;
  grade: { id: number; name: string };
  subject: { id: number; name: string } | null;
  teacher?: { id: number; name: string };
};