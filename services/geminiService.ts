
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Quiz, Question, QuestionType, PromptPart, QuizConfig, KnowledgeSource, WebSource, OpenEndedAnswer, AnswerLog, PredictedQuestion, PersonalizedFeedback } from '../types';
import { getQuizSchema, topicsSchema, batchGradingSchema, predictionSchema, personalizedFeedbackSchema } from './geminiSchemas';
import { getQuizSystemInstruction, getTopicsInstruction, getGradingSystemInstruction, getPredictionSystemInstruction, getPredictionUserPromptParts, getFeedbackSystemInstruction } from './geminiPrompts';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateTopics = async (userContentParts: PromptPart[]): Promise<string[]> => {
    const instruction = getTopicsInstruction();
    const contents = { parts: [{ text: instruction }, ...userContentParts] };
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: topicsSchema,
                temperature: 0.2,
            },
        });

        const jsonText = response.text;
        if (!jsonText) {
            console.error("Error generating topics: API returned no text.");
            return ["General Knowledge"];
        }
        const result = JSON.parse(jsonText.trim());

        if (result.topics && Array.isArray(result.topics) && result.topics.length > 0) {
            return result.topics as string[];
        }
        
        return ["General Knowledge"];

    } catch (error) {
        console.error("Error generating topics:", error);
        return ["General Knowledge"];
    }
};

export const generateQuiz = async (userContentParts: PromptPart[], config: QuizConfig): Promise<Quiz | null> => {
  const { numberOfQuestions, knowledgeSource, topics, mode } = config;
  
  const quizSchema = getQuizSchema(numberOfQuestions);
  const systemInstruction = getQuizSystemInstruction(numberOfQuestions, knowledgeSource, mode, topics);
  
  const apiConfig: any = {
      systemInstruction,
      temperature: 0.7,
  };

  if (knowledgeSource === KnowledgeSource.WEB_SEARCH) {
    apiConfig.tools = [{googleSearch: {}}];
  } else {
    apiConfig.responseMimeType = "application/json";
    apiConfig.responseSchema = quizSchema;
  }

  const MAX_ATTEMPTS = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: userContentParts },
            config: apiConfig,
        });

        const text = response.text;
        if (!text) {
          throw new Error("API returned an empty response. The content might be too short or unsupported.");
        }
        
        let jsonText = text.trim();
        if (knowledgeSource === KnowledgeSource.WEB_SEARCH) {
            const match = jsonText.match(/```json\n([\s\S]*)\n```/);
            if (match) {
                jsonText = match[1];
            }
        }

        if (!jsonText) {
            throw new Error("API returned an empty response. The content might be too short or unsupported.");
        }
        
        const rawQuizData = JSON.parse(jsonText);

        if (!rawQuizData.questions || rawQuizData.questions.length === 0) {
          throw new Error("The AI successfully responded but couldn't generate any questions from the provided text.");
        }

        const webSources: WebSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map((chunk: any) => chunk.web)
            .filter((web): web is WebSource => web && web.uri) || [];
        
        const validatedQuestions: Question[] = rawQuizData.questions.map((q: any): Question | null => {
            const questionType = q.questionType || q.type;
            const questionText = q.questionText || q.question;
            const topic = q.topic;

            if (!questionType || !questionText || !q.explanation || !topic) {
                console.warn(`Skipping invalid question from AI (missing type, text, explanation, or topic):`, q);
                return null;
            }
            switch (questionType) {
                case QuestionType.MULTIPLE_CHOICE:
                    if (!q.options || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correctAnswerIndex !== 'number' || q.correctAnswerIndex >= q.options.length ) return null;
                    return { questionType, questionText, options: q.options, correctAnswerIndex: q.correctAnswerIndex, explanation: q.explanation, topic };
                case QuestionType.TRUE_FALSE:
                    const correctAnswerBoolean = q.correctAnswerBoolean ?? q.correctAnswer ?? q.answer;
                    if (typeof correctAnswerBoolean !== 'boolean') return null;
                    return { questionType, questionText, correctAnswer: correctAnswerBoolean, explanation: q.explanation, topic };
                case QuestionType.FILL_IN_THE_BLANK:
                    const correctAnswerString = q.correctAnswerString || q.correctAnswer || q.missingTerm || q.blank;
                    if (typeof correctAnswerString !== 'string' || !questionText.includes('___')) return null;
                    return { questionType, questionText, correctAnswer: correctAnswerString, explanation: q.explanation, acceptableAnswers: q.acceptableAnswers || [], topic };
                case QuestionType.OPEN_ENDED:
                     return { questionType, questionText, explanation: q.explanation, topic };
                default:
                    console.warn(`Skipping invalid question from AI (unknown type: ${questionType}):`, q);
                    return null;
            }
        }).filter((q: any): q is Question => q !== null);

        if (validatedQuestions.length > 0) {
            return { questions: validatedQuestions, webSources }; // Success!
        }
        
        lastError = new Error("The AI responded, but none of the generated questions were valid.");
    } catch (error) {
        lastError = error instanceof Error ? error : new Error("An unknown error occurred");
    }
    if (attempt < MAX_ATTEMPTS) await new Promise(res => setTimeout(res, 1000 * attempt));
  }

  console.error("All attempts to generate quiz failed.");
  if (lastError) {
      if (lastError.message.includes('json') || lastError.message.includes('JSON')) {
          throw new Error("The AI returned an invalid format. Please try modifying your notes slightly and resubmitting.");
      }
      throw new Error(`An API error occurred after multiple attempts: ${lastError.message}`);
  }
  throw new Error("An unknown error occurred while generating the quiz after multiple attempts.");
};

export const gradeExam = async (questions: Question[], submission: OpenEndedAnswer): Promise<AnswerLog[]> => {
    const systemInstruction = getGradingSystemInstruction(questions);
    
    const userContentParts: PromptPart[] = [];
    if (submission.text.trim()) {
        userContentParts.push({ text: `## START OF TYPED ANSWERS ##\n\n${submission.text}\n\n## END OF TYPED ANSWERS ##` });
    }
    submission.images.forEach((img, index) => {
        userContentParts.push({ text: `\n[The following is image ${index + 1} of the user's handwritten work]` });
        userContentParts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
    });

    if (userContentParts.length === 0) {
        return questions.map(q => ({
            question: q,
            userAnswer: submission,
            isCorrect: false,
            feedback: "No answer was submitted for this question.",
            questionScore: 0,
        }));
    }
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: userContentParts },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: batchGradingSchema,
                temperature: 0.3,
            },
        });

        const jsonText = response.text;
        if (!jsonText) {
            throw new Error("API returned no text while grading exam.");
        }
        const result = JSON.parse(jsonText.trim());
        const grades = result.grades as { questionIndex: number; isCorrect: boolean; score: number; feedback: string }[];

        const gradedLogs: AnswerLog[] = questions.map((question, index) => {
            const grade = grades.find(g => g.questionIndex === index);
            if (grade) {
                return {
                    question: question,
                    userAnswer: submission, // The entire original submission is saved for review
                    isCorrect: grade.isCorrect,
                    feedback: grade.feedback,
                    questionScore: grade.score,
                };
            }
            return {
                question: question,
                userAnswer: submission,
                isCorrect: false,
                feedback: "The AI did not return a grade for this question.",
                questionScore: 0,
            };
        });

        return gradedLogs;

    } catch (error) {
        console.error(`Batch grading error:`, error);
        // Fallback in case of a systemic API or parsing error
        return questions.map(q => ({
            question: q,
            userAnswer: submission,
            isCorrect: false,
            feedback: "Sorry, a system error occurred during the grading process. This answer has been marked as incorrect.",
            questionScore: 0,
        }));
    }
};

export const generateExamPrediction = async (data: any): Promise<PredictedQuestion[]> => {
    const systemInstruction = getPredictionSystemInstruction();
    const userPromptParts = getPredictionUserPromptParts(data);
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: userPromptParts },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: predictionSchema,
                temperature: 0.8,
            },
        });

        const jsonText = response.text;
        if (!jsonText) {
            throw new Error("Prediction API returned an empty response.");
        }
        const result = JSON.parse(jsonText.trim());
        
        if (result.predictions && Array.isArray(result.predictions)) {
            return result.predictions;
        }
        throw new Error("Prediction API returned an invalid format.");

    } catch(error) {
        console.error("Error generating exam prediction:", error);
        throw error;
    }
};

export const generatePersonalizedFeedback = async (answerLog: AnswerLog[]): Promise<PersonalizedFeedback | null> => {
    // Don't generate feedback for exams yet, as topics are less defined.
    if (answerLog.some(l => l.question.questionType === QuestionType.OPEN_ENDED)) {
        return null;
    }

    const relevantLogData = answerLog.map(log => ({
        topic: log.question.topic,
        question: log.question.questionText,
        isCorrect: log.isCorrect
    }));

    if (relevantLogData.length === 0 || !relevantLogData.some(l => l.topic)) {
        console.log("Skipping feedback generation: No answer log or topics found.");
        return null;
    }

    const systemInstruction = getFeedbackSystemInstruction(JSON.stringify(relevantLogData, null, 2));

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: "Please generate the feedback based on the data in the system instruction." }] },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: personalizedFeedbackSchema,
                temperature: 0.5,
            },
        });

        const jsonText = response.text;
        if (!jsonText) {
            throw new Error("Feedback generation API returned no text.");
        }
        return JSON.parse(jsonText.trim()) as PersonalizedFeedback;
    } catch (error) {
        console.error("Error generating personalized feedback:", error);
        return null; // Return null on error so the UI can handle it gracefully
    }
}