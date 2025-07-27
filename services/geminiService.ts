

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Quiz, Question, QuestionType, PromptPart, QuizConfig, KnowledgeSource, WebSource, OpenEndedAnswer, AnswerLog, PredictedQuestion, PersonalizedFeedback, FibValidationResult, FibValidationStatus, QuizResult, StudyGuide } from '../types';
import { getQuizSchema, topicsSchema, batchGradingSchema, predictionSchema, personalizedFeedbackSchema, fibValidationSchema, studyGuideSchema } from './geminiSchemas';
import { getQuizSystemInstruction, getTopicsInstruction, getGradingSystemInstruction, getPredictionSystemInstruction, getPredictionUserPromptParts, getFeedbackSystemInstruction, getFibValidationSystemInstruction, getStudyGuideInstruction } from './geminiPrompts';

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
  const { numberOfQuestions, knowledgeSource, topics, mode, customInstructions } = config;
  
  const quizSchema = getQuizSchema(numberOfQuestions);
  const systemInstruction = getQuizSystemInstruction(numberOfQuestions, knowledgeSource, mode, topics, customInstructions);
  
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
                    const numBlanks = (questionText.match(/___/g) || []).length;
                    if (numBlanks === 0) return null;

                    // The AI might return `correctAnswers` (array) or `correctAnswerString` (single string for single blank).
                    let correctAnswersArray = q.correctAnswers;
                    if (!correctAnswersArray && q.correctAnswerString) {
                        correctAnswersArray = [q.correctAnswerString];
                    }
                     if (!correctAnswersArray && Array.isArray(q.correctAnswer)) {
                        correctAnswersArray = q.correctAnswer;
                    }

                    if (!Array.isArray(correctAnswersArray) || correctAnswersArray.some(i => typeof i !== 'string') || numBlanks !== correctAnswersArray.length) {
                         console.warn(`Skipping invalid FIB question (answer/blank mismatch):`, q);
                         return null;
                    }
                    
                    let acceptableAnswersArrays = q.acceptableAnswers || [];
                    // Handle case where it's an array of strings for a single blank question
                    if (numBlanks === 1 && acceptableAnswersArrays.length > 0 && typeof acceptableAnswersArrays[0] === 'string') {
                        acceptableAnswersArrays = [acceptableAnswersArrays];
                    }
                    
                    // Validate structure of acceptableAnswers
                    if (acceptableAnswersArrays.length > 0 && (acceptableAnswersArrays.length !== correctAnswersArray.length || acceptableAnswersArrays.some((sub: any) => !Array.isArray(sub)))) {
                        console.warn(`Skipping invalid FIB question (acceptable answers format wrong):`, q);
                        return null;
                    }

                    return { 
                        questionType, 
                        questionText, 
                        correctAnswers: correctAnswersArray, 
                        explanation: q.explanation, 
                        acceptableAnswers: acceptableAnswersArrays, 
                        topic 
                    };
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
            pointsAwarded: 0,
            maxPoints: 10,
            examFeedback: "No answer was submitted for this question.",
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
                    userAnswer: submission,
                    isCorrect: grade.score >= 7, // Consider >70% as correct
                    pointsAwarded: grade.score,
                    maxPoints: 10,
                    examFeedback: grade.feedback,
                };
            }
            return {
                question: question,
                userAnswer: submission,
                isCorrect: false,
                pointsAwarded: 0,
                maxPoints: 10,
                examFeedback: "The AI did not return a grade for this question.",
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
            pointsAwarded: 0,
            maxPoints: 10,
            examFeedback: "Sorry, a system error occurred during the grading process. This answer has been marked as incorrect.",
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

export const generateStudyGuideForPrediction = async (question: PredictedQuestion): Promise<StudyGuide> => {
    const systemInstruction = getStudyGuideInstruction(question);
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: "Please generate the study guide based on the system instruction." }] },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: studyGuideSchema,
                temperature: 0.6,
            },
        });

        const jsonText = response.text;
        if (!jsonText) {
            throw new Error("Study guide API returned an empty response.");
        }
        const result = JSON.parse(jsonText.trim());
        
        if (result.answerOutline && Array.isArray(result.youtubeSearchQueries)) {
            return result as StudyGuide;
        }
        throw new Error("Study guide API returned an invalid format.");

    } catch(error) {
        console.error("Error generating study guide:", error);
        throw error;
    }
};

export const generatePersonalizedFeedback = async (quizHistory: QuizResult[]): Promise<PersonalizedFeedback | null> => {
    if (quizHistory.length === 0) return null;

    // Don't generate feedback for exams yet, as topics are less defined.
    if (quizHistory.some(r => r.mode === 'EXAM')) {
        return null;
    }
    
    // Sort history ascending by date to ensure the last item is the most recent.
    const sortedHistory = [...quizHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const relevantLogData = sortedHistory.flatMap(result =>
        result.answerLog.map(log => {
            const pointsAwarded = typeof log.pointsAwarded === 'number' ? log.pointsAwarded : (log.isCorrect ? 10 : 0);
            const maxPoints = typeof log.maxPoints === 'number' ? log.maxPoints : 10;
            const topic = log.question.topic || "General Knowledge";
            let userAnswerText: string;
            if (typeof log.userAnswer === 'string') {
                userAnswerText = log.userAnswer;
            } else if (Array.isArray(log.userAnswer)) {
                userAnswerText = log.userAnswer.join(', ');
            } else {
                userAnswerText = '[MC/TF Answer]';
            }

            return {
                quizDate: result.date,
                topic,
                question: log.question.questionText,
                userAnswerText: userAnswerText,
                isCorrect: log.isCorrect,
                pointsAwarded,
                maxPoints,
                aiFeedback: log.aiFeedback,
            };
        })
    );

    if (relevantLogData.length === 0) {
        console.log("Skipping feedback generation: No answer log found.");
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
};


export const validateFillInTheBlankAnswer = async (questionText: string, correctAnswer: string, userAnswer: string): Promise<FibValidationResult> => {
    const systemInstruction = getFibValidationSystemInstruction(questionText, correctAnswer, userAnswer);
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: "Evaluate the user's answer based on the system instruction."}] },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: fibValidationSchema,
                temperature: 0.1, // Low temperature for deterministic grading
                thinkingConfig: { thinkingBudget: 0 } // Make it fast
            },
        });
        
        const jsonText = response.text;
        if (!jsonText) {
            throw new Error("AI validation returned no text.");
        }
        return JSON.parse(jsonText.trim()) as FibValidationResult;

    } catch(error) {
        console.error("Error during fill-in-the-blank validation:", error);
        // Fallback to be strict if AI fails
        return { status: FibValidationStatus.INCORRECT, pointsAwarded: 0, comment: "Could not be validated." };
    }
};

export const generateVisualAid = async (conceptText: string): Promise<{ imageUrl: string; prompt: string }> => {
    // 1. Generate a descriptive prompt for the image model
    const promptGenerationSystemInstruction = `You are an AI assistant that creates vivid, detailed, and creative prompts for an image generation model. The user will provide a concept, and you must translate it into a prompt that will generate a helpful visual aid. The prompt should be conceptual, metaphorical, or diagrammatic. Focus on creating a visually striking and informative image. The prompt should be a single, descriptive paragraph.`;
    
    const promptResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [{ text: `Generate an image prompt for this concept: ${conceptText}` }] },
        config: {
            systemInstruction: promptGenerationSystemInstruction,
            temperature: 0.8,
        },
    });

    const imagePrompt = promptResponse.text;

    if (!imagePrompt) {
        throw new Error("Could not generate a prompt for the visual aid.");
    }
    
    // 2. Generate the image using the new prompt
    const imageResponse = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: imagePrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
    });

    if (!imageResponse.generatedImages || imageResponse.generatedImages.length === 0) {
        throw new Error("The visual aid could not be generated.");
    }

    const base64ImageBytes = imageResponse.generatedImages?.[0]?.image?.imageBytes;
    
    if (!base64ImageBytes) {
        throw new Error("The visual aid was generated, but the image data is missing.");
    }
    
    const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;

    return { imageUrl, prompt: imagePrompt };
};