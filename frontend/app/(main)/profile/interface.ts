


export interface UserMeData {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: "student" | "teacher" | "admin" | "parent";
    profilePic: string | null;
}