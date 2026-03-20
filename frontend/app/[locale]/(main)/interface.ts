// export interface ReturnedSubjectData {
//     pk: number;
//     name: string
// }

// export interface ReturnedExamData {
//     pk: number;
//     title: string
// }

// export interface ReturnedAnnouncementData {
//     pk: number;
//     title: string;
//     content: string;
// }


// export type SearchKind = "subject" | "exam" | "announcement";



// export type SearchOption = {
//   value: string;
//   label: React.ReactNode;
//   kind: SearchKind;
//   id: number;
// };



type LocalizedValue = string | Record<string, string> | null | undefined;

export interface ReturnedSubjectData {
  pk: number;
  name: LocalizedValue;
  grade__pk?: number;
  grade__name?: LocalizedValue;
  grade__category__name?: LocalizedValue;
}

export interface ReturnedExamData {
  pk: number;
  title: LocalizedValue;
  subject__pk?: number;
  subject__name?: LocalizedValue;
  grade__pk?: number;
  grade__name?: LocalizedValue;
  grade__category__name?: LocalizedValue;
  subject__grade__pk?: number;
  subject__grade__name?: LocalizedValue;
  subject__grade__category__name?: LocalizedValue;
}

export interface ReturnedAnnouncementData {
  pk: number;
  title: LocalizedValue;
  content: LocalizedValue;
  subject__pk?: number;
  subject__name?: LocalizedValue;
  grade__pk?: number;
  grade__name?: LocalizedValue;
  grade__category__name?: LocalizedValue;
  subject__grade__pk?: number;
  subject__grade__name?: LocalizedValue;
  subject__grade__category__name?: LocalizedValue;
}

export interface ReturnedExerciseData {
  id: number;
  title: LocalizedValue;
  description?: LocalizedValue | null;
  due_date?: string | null;
  subject__id?: number | null;
  subject__name?: LocalizedValue | null;
  grade__id?: number;
  grade__name?: LocalizedValue;
  grade__category__name?: LocalizedValue;
}

export type SearchKind = "subject" | "exam" | "announcement" | "exercise";

export type SearchOption = {
  value: string;
  label: React.ReactNode;
  kind: SearchKind;
  id: number;
};