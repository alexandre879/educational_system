
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
    len_comments: number;
}


export interface CreateAnnouncementData {
    title: string;
    content: string;
    subject_name: string;
    grade_id: number;
    category_id: number;
}


// export interface GradeCategory {
//     id: number;
//     name: string;
// }


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


export interface Comment {
    picture: string | null
    user: string
    comment: string;
    created_at: string;
}
