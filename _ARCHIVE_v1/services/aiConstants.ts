
// services/aiConstants.ts

// The user can choose different models for different tasks.
// For now, they are mostly the same, but this structure allows for future flexibility.
export const modelFor = {
  topicAnalysis: 'gemini-2.5-flash',
  readingLayoutGeneration: 'gemini-2.5-flash',
  quizGeneration: 'gemini-2.5-flash',
  examGrading: 'gemini-2.5-pro',
  examPrediction: 'gemini-2.5-pro',
  studyGuideGeneration: 'gemini-2.5-flash',
  feedbackGeneration: 'gemini-2.5-flash',
  fibValidation: 'gemini-2.5-flash-lite',
  visualAid: 'imagen-3.0-generate-002',
};

export type ModelIdentifier = keyof typeof modelFor;

export interface ModelRateLimits {
  rpm: number; // Requests Per Minute
  rpd: number; // Requests Per Day
}

// These are the limits for the free tier of Gemini API.
// Placing them here makes it easy to change. A buffer has been added for safety.
export const modelLimits: Record<string, ModelRateLimits> = {
  'gemini-2.5-flash': {
    rpm: 9,   // Requests Per Minute (Official limit is 10)
    rpd: 240, // Requests Per Day (Official limit is 250)
  },
  'imagen-3.0-generate-002': {
    rpm: 9,
    rpd: 240,
  },
  'gemini-2.5-pro': {
    rpm: 4,   // Requests Per Minute (Official limit is 5)
    rpd: 90, // Requests Per Day (Official limit is 100)
  },
  'gemini-2.5-flash-lite': {
    rpm: 14,  // Requests Per Minute (Official limit is 15)
    rpd: 900, // Requests Per Day (Official limit is 1000)
  },
};