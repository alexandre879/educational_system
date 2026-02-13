export interface BackendSubject {
  pk: number;
  name: string;
  grade__pk: number;
  grade__name: string;
  grade__category__pk: number;
  grade__category__name: string;
};