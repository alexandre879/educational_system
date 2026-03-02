export interface ReturnedSubjectData {
    pk: number;
    name: string
}

export interface ReturnedExamData {
    pk: number;
    title: string
}

export interface ReturnedAnnouncementData {
    pk: number;
    title: string;
    content: string;
}


export type SearchKind = "subject" | "exam" | "announcement";



export type SearchOption = {
  value: string;
  label: React.ReactNode;
  kind: SearchKind;
  id: number;
};