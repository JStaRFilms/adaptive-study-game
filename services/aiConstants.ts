export const maxVideoSources = 3;

// Normal study requests use Luna. Gemini is selected server-side for audio,
// YouTube ingestion and grounded Google Search quizzes.
export const modelFor = {
  chat: 'openai/gpt-6-luna',
  topicAnalysis: 'openai/gpt-6-luna',
  readingLayoutGeneration: 'openai/gpt-6-luna',
  quizGeneration: 'openai/gpt-6-luna',
  examGrading: 'openai/gpt-6-luna',
  examPrediction: 'openai/gpt-6-luna',
  studyGuideGeneration: 'openai/gpt-6-luna',
  feedbackGeneration: 'openai/gpt-6-luna',
  fibValidation: 'openai/gpt-6-luna',
} as const;

export type ModelIdentifier = keyof typeof modelFor;
