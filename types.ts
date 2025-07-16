
export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  FILL_IN_THE_BLANK = 'FILL_IN_THE_BLANK',
}

export enum StudyMode {
  PRACTICE = 'PRACTICE',
  REVIEW = 'REVIEW',
}

export enum KnowledgeSource {
  NOTES_ONLY = 'NOTES_ONLY',
  GENERAL = 'GENERAL',
  WEB_SEARCH = 'WEB_SEARCH',
}

export interface StudySet {
  id: string;
  name: string;
  content: string;
  createdAt: string;
}

export interface QuizConfig {
    numberOfQuestions: number;
    mode: StudyMode;
    knowledgeSource: KnowledgeSource;
}

export interface MultipleChoiceQuestion {
  questionType: QuestionType.MULTIPLE_CHOICE;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface TrueFalseQuestion {
  questionType: QuestionType.TRUE_FALSE;
  questionText: string;
  correctAnswer: boolean;
  explanation: string;
}

export interface FillInTheBlankQuestion {
  questionType: QuestionType.FILL_IN_THE_BLANK;
  questionText: string; // Should contain a blank like '___'
  correctAnswer: string;
  explanation: string;
  acceptableAnswers?: string[];
}

export type Question = MultipleChoiceQuestion | TrueFalseQuestion | FillInTheBlankQuestion;

export interface WebSource {
    uri: string;
    title: string;
}

export interface Quiz {
  questions: Question[];
  webSources?: WebSource[];
}

export enum AppState {
  SETUP,
  PROCESSING,
  STUDYING,
  RESULTS,
  REVIEWING,
}

export type UserAnswer = string | number | boolean | null;

export interface AnswerLog {
  question: Question;
  userAnswer: UserAnswer;
  isCorrect: boolean;
}

export type PromptPart = { text: string } | { inlineData: { mimeType: string; data: string } };
