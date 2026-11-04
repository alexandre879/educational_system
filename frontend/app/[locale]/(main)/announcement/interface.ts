import type { LocalizedValue } from "@/lib/localized";
import type { UserMeData } from "../profile/interface";

export interface User {
    first_name: string;
    last_name: string
}


export interface Announcement {
    id: number;
    title: string;
    content: string;
    subject: { id: number; name: LocalizedValue } | null;
    grade: { id: number; name: string; category_name: LocalizedValue };
    created_at: string;
    created_by: {id: number, email: string, name: string};
    len_comments: number;
}



export interface CreateAnnouncementData {
  title: string;
  content: string;
  subject_id: number;
  grade_id: number;
  category_id: number;
}


export interface Grade {
    grade_id: number;
    grade_name: string;
    grade_category_id: number;
    grade_category_name: string;
}


export interface Subject {
    id: number;
    name: string;
    grade: Grade;
}


export interface Grades {
    id: number;
    name: string
    category_id: number;
    category_name: string
}


export interface Categories {
    id: number;
    name: string
}


/** The emoji people can react with, in the order the server lists them. */
export const REACTIONS = ["👍", "❤️", "😂", "😮", "🎉", "🙏"] as const;

export interface CommentReaction {
    emoji: string;
    count: number;
    mine: boolean;
}

export interface Comment {
    id: number;
    /** The author's email. */
    user: string;
    author: { id: number; name: string; role: UserMeData["role"] | null; photo: string | null };
    /** Empty once deleted. */
    comment: string;
    created_at: string;
    edited_at: string | null;
    deleted: boolean;
    reply_to: { id: number; author: string; comment: string; deleted: boolean } | null;
    reactions: CommentReaction[];
    can_edit: boolean;
    can_delete: boolean;
}
