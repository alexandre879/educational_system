
export interface LeaderboardEntry {
  first_name: string;
  last_name: string;
  email: string;
  points: number;
  profile_pic: string | null
}


export interface Subject {
  pk: number;
  grade__pk: number;
  grade__category__pk: string;
  name: string;
}