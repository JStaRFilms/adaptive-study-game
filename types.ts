

export interface PersistedFile {
  name: string;
  type: string;
  data: string; // base64 encoded data
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  FILL_IN_THE_BLANK = 'FILL_IN_THE_BLANK',
  OPEN_ENDED = 'OPEN_ENDED',
  MATCHING = 'MATCHING',
  SEQUENCE = 'SEQUENCE',
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

export interface ReadingBlock {
  id: string; // e.g., concept-1
  title: string;
  summary: string;
  gridColumnStart: number;
  gridColumnEnd: number;
  gridRowStart: number;
  gridRowEnd: number;
  isPlaceholder?: boolean;
  color?: string; // e.g., '#4ade80' for green-400
  parentId?: string; // e.g., 'concept-1'
}

export interface ReadingLayout {
  blocks: ReadingBlock[];
  columns: number; // e.g., 12
  rows: number; // total rows needed
}

export interface BlockContent {
  id: string; // e.g., concept-1
  title: string;
  summary: string;
}

export type CanvasGenerationProgress = {
  stage: string;
  progress: number; // 0-100
};

export interface SubConcept {
  title: string;
  summary: string;
}

export interface ReadingExpansionCache {
  subConcepts: ReadingBlock[];
  expandedLayout: ReadingLayout;
  layoutBeforeExpansion: ReadingLayout;
}

export interface StudySet {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  persistedFiles?: PersistedFile[];
  topics?: string[];
  youtubeUrls?: string[];
  readingLayout?: ReadingLayout | null;
  subConceptCache?: {
    [parentId: string]: ReadingExpansionCache;
  };
  readingChatHistory?: ChatMessage[];
}

export interface QuizConfig {
    numberOfQuestions: number;
    mode: StudyMode;
    knowledgeSource: KnowledgeSource;
    topics?: string[];
    customInstructions?: string;
}

export interface MultipleChoiceQuestion {
  questionType: QuestionType.MULTIPLE_CHOICE;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  topic?: string;
  studySetId?: string;
  conceptId: string;
}

export interface TrueFalseQuestion {
  questionType: QuestionType.TRUE_FALSE;
  questionText: string;
  correctAnswer: boolean;
  explanation: string;
  topic?: string;
  studySetId?: string;
  conceptId: string;
}

export interface FillInTheBlankQuestion {
  questionType: QuestionType.FILL_IN_THE_BLANK;
  questionText: string; // Should contain one or more blanks like '___'
  correctAnswers: string[]; // An array of correct answers, one for each blank.
  explanation: string;
  acceptableAnswers?: string[][]; // For each correct answer, an array of acceptable alternatives.
  topic?: string;
  studySetId?: string;
  conceptId: string;
}

export interface OpenEndedQuestion {
  questionType: QuestionType.OPEN_ENDED;
  questionText: string;
  explanation: string; // This will serve as the grading rubric for the AI
  topic?: string;
  studySetId?: string;
  conceptId: string;
}

export interface MatchingQuestion {
  questionType: QuestionType.MATCHING;
  questionText: string;
  prompts: string[];
  answers: string[];
  promptTitle?: string;
  answerTitle?: string;
  explanation: string;
  topic?: string;
  studySetId?: string;
  conceptId: string;
}

export interface SequenceQuestion {
  questionType: QuestionType.SEQUENCE;
  questionText: string;
  items: string[]; // Correct order
  explanation: string;
  topic?: string;
  studySetId?: string;
  conceptId: string;
}

export type Question = MultipleChoiceQuestion | TrueFalseQuestion | FillInTheBlankQuestion | OpenEndedQuestion | MatchingQuestion | SequenceQuestion;

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
  READING_SETUP,
  READING_CANVAS,
}

export interface OpenEndedAnswer {
  text: string;
  images: { mimeType: string; data: string }[];
}

export type UserAnswer = string | string[] | number | number[] | boolean | OpenEndedAnswer | null | 'SKIPPED';

export interface AnswerLog {
  question: Question;
  userAnswer: UserAnswer;
  isCorrect: boolean;
  pointsAwarded: number;
  maxPoints: number;
  aiFeedback?: string; // For fill-in-the-blank AI validation comments
  examFeedback?: string; // For open-ended exam grading feedback
  confidence?: number; // e.g., 1 (Guessing), 2 (Unsure), 3 (Confident), 0 (N/A)
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
    chatHistory?: ChatMessage[];
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

export interface StudyGuide {
  answerOutline: string;
  youtubeSearchQueries: string[];
}

export type PromptPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  action?: {
    text: string;
    onClick: () => void;
  };
}

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