type LocalizedValue = string | Record<string, string>;

export interface BackendSubject {
  pk: number;
  name: LocalizedValue;
  grade__pk: number;
  grade__name: LocalizedValue;
  grade__category__name: LocalizedValue;
}



export interface SubjectBookResponse{
  id?: number;
  pdf_url?: string | null;
  uploaded_at?: string | null;
  grade?: { id: number; name: string } | null;
  subject?: { id: number; name: string } | null;
};