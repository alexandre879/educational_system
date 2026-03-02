

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
  subject: string;
  session_id: number;
  current_index: number;
  current_question: QuestionData;
  exam_id: number;
  score_so_far: number;
  len_questions: number;
  ends_at: string;
}


export interface ExamSessionEndResponse {
  message: string;
  final_score: number;
  total_questions: number;
  ends_at?: string;
}



export interface ExamListData {
    id: number;
    title: string;
    subject: string;
    duration: string;
    questions_count: string;
}