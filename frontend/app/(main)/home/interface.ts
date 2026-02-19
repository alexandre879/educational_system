
// export interface DashboardResponse {
//   me: {
//     id: number;
//     email: string;
//     first_name: string;
//     last_name: string;
//     role: "student" | "teacher" | "admin" | "parent" | null;
//     points: number | null;
//     grade_in?: {
//       id: number;
//       name: string;
//       category?: { id: number; name: string };
//     } | null;
//     profilePic?: string | null;
//   };

//   subjects?: { id: number; name: string }[];
//   subjectPoints?: {
//     subject: {
//       id: number;
//       name: string
//     };
//     points: number | null;
//   }[];
//   announcements?: any[];

//   sessions?: {
//     id: number;
//     exam: { id: number; title: string; duration: number };
//     subject: { id: number; name: string };
//     grade: { id: number; name: string };
//     score_so_far: number;
//     started: boolean;
//     finished: boolean;
//     started_at: string;
//     ends_at: string | null;
//     submitted_at: string | null;
//     is_active: boolean;
//   }[];

//   leaderboard?: {
//     scope: "school";
//     me_rank: number;
//     items: {
//       rank: number;
//       id: number;
//       name: string;
//       email: string;
//       points: number;
//       profilePic: string | null;
//       grade: string | null;
//       isMe: boolean;
//     }[];
//   };
// }




export interface DashboardResponse {
  me: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: "student" | "teacher" | "admin" | "parent" | null;
    points: number | null;
    grade_in?: {
      id: number;
      name: string;
      category?: { id: number; name: string };
    } | null;
    profilePic?: string | null;
  };

  subjects?: { id: number; name: string }[];

  subjectPoints?: {
    subject: {
      id: number;
      name: string;
    };
    points: number | null;
  }[];

  announcements?: {
    id: number;
    title: string;
    content: string;
    created_at: string;
    len_comments?: number;
  }[]

  sessions?: {
    id: number;
    exam: { id: number; title: string; duration: number };
    subject: { id: number; name: string };
    grade: { id: number; name: string };
    score_so_far: number;
    started: boolean;
    finished: boolean;
    started_at: string;
    ends_at: string | null;
    submitted_at: string | null;
    is_active: boolean;
  }[];

  leaderboard?: {
    scope: "school";
    me_rank: number;
    items: {
      rank: number;
      id: number;
      name: string;
      email: string;
      points: number;
      profilePic: string | null;
      grade: string | null;
      isMe: boolean;
    }[];
  };
}