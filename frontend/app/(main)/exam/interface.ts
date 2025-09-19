export interface OptionData {
    id: number;
    title: string;
}

export interface QuestionData {
    id: number;
    text: string;
    points: number;
    options: OptionData[];
}

export interface ExamSessionData {
    session_id: number;
    current_index: number;
    current_question: QuestionData;
    score_so_far: number;
    finished: boolean;
    len_questions: number;
}


export interface ExamListData {
    id: number;
    title: string;
    subject: string;
    duration: string;
    questions_count: string;
}