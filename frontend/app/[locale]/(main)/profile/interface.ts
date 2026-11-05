export type SpectatorRole = "student" | "teacher" | "parent";

/** Present only in spectator mode: whose view this is, and the roles the visitor can switch to. */
export interface SpectatorInfo {
    viewing_as: SpectatorRole;
    roles: SpectatorRole[];
}

export interface UserMeData {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: "student" | "teacher" | "admin" | "parent";
    profilePic: string | null;
    spectator?: SpectatorInfo;
}


export type FormState = {
  first_name: string;
  last_name: string;
  email: string;
};