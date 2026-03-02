export interface BackendSubject {
  pk: number;
  name: string;
  grade__pk: number;
  grade__name: string;
  grade__category__pk: number;
  grade__category__name: string;
};



export interface SubjectBookResponse{
  id?: number;
  pdf_url?: string | null;
  uploaded_at?: string | null;
  grade?: { id: number; name: string } | null;
  subject?: { id: number; name: string } | null;
};