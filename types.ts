

export interface FileInfo {
  name: string;
  type: string;
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  FILL_IN_THE_BLANK = 'FILL_IN_THE_BLANK',
  OPEN_ENDED = 'OPEN_ENDED',
}

export enum StudyMode {
  PRACTICE = 'PRACTICE',
  REVIEW = 'REVIEW',
  EXAM = 'EXAM',
  SRS = 'SRS',
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
  fileInfo?: FileInfo[];
  topics?: string[];
}

export interface QuizConfig {
    numberOfQuestions: number;
    mode: StudyMode;
    knowledgeSource: KnowledgeSource;
    topics?: string[];
}

export interface MultipleChoiceQuestion {
  questionType: QuestionType.MULTIPLE_CHOICE;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  topic?: string;
  studySetId?: string;
}

export interface TrueFalseQuestion {
  questionType: QuestionType.TRUE_FALSE;
  questionText: string;
  correctAnswer: boolean;
  explanation: string;
  topic?: string;
  studySetId?: string;
}

export interface FillInTheBlankQuestion {
  questionType: QuestionType.FILL_IN_THE_BLANK;
  questionText: string; // Should contain a blank like '___'
  correctAnswer: string;
  explanation: string;
  acceptableAnswers?: string[];
  topic?: string;
  studySetId?: string;
}

export interface OpenEndedQuestion {
  questionType: QuestionType.OPEN_ENDED;
  questionText: string;
  explanation: string; // This will serve as the grading rubric for the AI
  topic?: string;
  studySetId?: string;
}

export type Question = MultipleChoiceQuestion | TrueFalseQuestion | FillInTheBlankQuestion | OpenEndedQuestion;

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
  EXAM_IN_PROGRESS,
  GRADING,
  PREDICTION_SETUP,
  PREDICTING,
  PREDICTION_RESULTS,
  STATS,
}

export interface OpenEndedAnswer {
  text: string;
  images: { mimeType: string; data: string }[];
}

export type UserAnswer = string | number | boolean | OpenEndedAnswer | null;

export interface AnswerLog {
  question: Question;
  userAnswer: UserAnswer;
  isCorrect: boolean;
  pointsAwarded: number;
  maxPoints: number;
  aiFeedback?: string; // For fill-in-the-blank AI validation comments
  examFeedback?: string; // For open-ended exam grading feedback
}

export interface QuizResult {
    id: string;
    studySetId: string;
    date: string;
    score: number;
    accuracy: number;
    answerLog: AnswerLog[];
    webSources?: WebSource[];
    mode: StudyMode;
    feedback?: PersonalizedFeedback | null;
}

export interface PredictedQuestion {
  questionText: string;
  reasoning: string;
  topic: string;
}

export interface PredictionResult {
  id: string;
  studySetId: string;
  createdAt: string;
  updatedAt: string;
  results: PredictedQuestion[];
}

export type PromptPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export interface PersonalizedFeedback {
  overallSummary: string;
  strengthTopics: { topic: string; comment:string }[];
  weaknessTopics: { topic: string; comment: string; suggestedQuestionCount: number; youtubeSearchQuery: string; }[];
  narrowPasses: { topic: string; questionText: string; userAnswerText: string; comment: string; }[];
  recommendation: string;
}

export enum FibValidationStatus {
  CORRECT = 'CORRECT',
  PARTIAL = 'PARTIAL',
  INCORRECT = 'INCORRECT',
}
export interface FibValidationResult {
    status: FibValidationStatus;
    pointsAwarded: number;
    comment: string;
}

export interface SRSItem {
  id: string; // Unique ID (e.g., hash of studySetId + questionText)
  studySetId: string;
  question: Question;
  nextReviewDate: string; // ISO String
  srsStage: number; // 0 = learning, 1 = 1d, 2 = 3d, 3 = 7d, etc.
  lastReviewedDate: string; // ISO String
}
