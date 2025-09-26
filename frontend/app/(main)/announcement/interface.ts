
export interface User {
    first_name: string;
    last_name: string
}


export interface Announcement {
    id: number;
    title: string;
    content: string;
    subject: string;
    grade: {name: string, category: {name: string}};
    user: string;
    created_at: string;
}


export interface CreateAnnouncementData {
    title: string;
    content: string;
    grade_name: string;
    subject_id: number;
    category_id: number;
}


export interface GradeCategory {
    id: number;
    name: string;
}


export interface Grade {
    grade_id: number;
    grade_name: string;
    grade_category: GradeCategory;
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


export interface Comment {
    user: string
    comment: string;
    created_at: string;
}
