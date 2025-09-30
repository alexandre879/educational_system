
export interface LeaderboardEntry {
  first_name: string;
  last_name: string;
  email: string;
  points: number;
  profile_pic: string | null
}


export interface Subject {
  pk: number;
  name: string;
  grade__pk: number;
  grade__name: string;
  grade__category__pk: string;
  grade__category__name: string;
}