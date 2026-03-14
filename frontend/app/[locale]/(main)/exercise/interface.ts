// type LocalizedValue = string | Record<string, string>;

// export interface Exercise {
//   id: number;
//   title: LocalizedValue;
//   description?: LocalizedValue | null;
//   due_date?: string | null;
//   grade: {
//     id: number;
//     name: LocalizedValue;
//   };
//   subject?: {
//     id: number;
//     name: LocalizedValue;
//   } | null;
// }






export type LocalizedValue = string | Record<string, string>;

export interface CategoryName {
  en: string;
  ka: string;
  ru: string;
}

export interface Grade {
  id: number;
  name: LocalizedValue;
  category_name?: LocalizedValue;
}

export interface Subject {
  id: number;
  name: LocalizedValue;
  grade: {
    grade_id: number;
    grade_name: LocalizedValue;
    grade_category_id: number;
    grade_category_name: LocalizedValue;
  };
}

export interface User {
  id: number;
  email: string;
  name: LocalizedValue;
}

export interface Comment {
  id: number;
  comment: string;
  created_at: string;
  user: User;
}

export interface Announcement {
  id: number;
  title: LocalizedValue;
  content: LocalizedValue;

  grade: {
    id: number;
    name: LocalizedValue;
    category_name?: LocalizedValue;
  };

  subject: {
    id: number;
    name: LocalizedValue;
  };

  created_by: User;

  created_at: string;

  comments: number[];

  len_comments: number;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;

  subject_id: number;
  grade_id: number;
  category_id: number;
}

export interface Grades {
  id: number;
  name: LocalizedValue;
  category_name?: LocalizedValue;
}

export interface Categories {
  id: number;
  name: LocalizedValue;
}