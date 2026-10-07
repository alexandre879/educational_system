import type { LocalizedValue } from "@/lib/localized";

export interface OptionData {
  id: number;
  title: LocalizedValue;
}

export interface QuestionData {
  id: number;
  text: LocalizedValue;
  points: number;
  options: OptionData[];
}

export interface ExamSessionData {
  subject: LocalizedValue;
  title?: LocalizedValue;
  session_id: number;
  current_index: number;
  current_question: QuestionData;
  exam_id: number;
  score_so_far?: number;
  len_questions: number;
  ends_at: string | null;
  exam_language?: string;
}

export interface ExamSessionEndResponse {
  message: string;
  session_id?: number;
  final_score: number;
  max_score?: number;
  total_questions: number;
  subject_points?: number;
  global_points?: number;
  ends_at?: string | null;
  timed_out?: boolean;
}

export interface ExamListData {
  id: number;
  title: string;
  subject: string;
  duration: number;
  questions_count: number;
  exam_language?: string;
}
