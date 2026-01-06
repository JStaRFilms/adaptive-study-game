import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

export const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
});

export const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
});

export const gemini = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GEMINI_API_KEY,
});

// Model assignments by task
export const models = {
    // Groq - Primary provider (fast + free tier)
    chat: groq('llama-3.3-70b-versatile'),
    quizGeneration: groq('llama-3.3-70b-versatile'),
    feedbackAnalysis: groq('llama-3.3-70b-versatile'),

    // OpenRouter - Fallback for complex tasks
    examGrading: openrouter('anthropic/claude-3.5-sonnet'),

    // Gemini - Native features only
    webSearch: gemini('gemini-2.0-flash', { useSearchGrounding: true }),
    fileSearch: gemini('gemini-2.0-flash'), // with File Search tool
    urlContext: gemini('gemini-2.0-flash'), // with URL Context tool
};
