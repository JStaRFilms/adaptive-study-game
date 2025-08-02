import { GoogleGenAI, GenerateContentResponse, Type, Content } from "@google/genai";
import { Quiz, Question, QuestionType, PromptPart, QuizConfig, KnowledgeSource, WebSource, OpenEndedAnswer, AnswerLog, PredictedQuestion, PersonalizedFeedback, FibValidationResult, FibValidationStatus, QuizResult, StudyGuide } from '../types';
import { getQuizSchema, topicsSchema, batchGradingSchema, predictionSchema, personalizedFeedbackSchema, fibValidationSchema, studyGuideSchema } from './geminiSchemas';
import { getQuizSystemInstruction, getTopicsInstruction, getGradingSystemInstruction, getPredictionSystemInstruction, getPredictionUserPromptParts, getFeedbackSystemInstruction, getFibValidationSystemInstruction, getStudyGuideInstruction } from './geminiPrompts';
import { ModelIdentifier, modelFor } from './aiConstants';
import { apiKeyManager } from './apiKeyManager';

if (!process.env.API_KEY_POOL && !process.env.API_KEY && !process.env.GEMINI_API_KEY) {
    throw new Error("API_KEY_POOL, API_KEY, or GEMINI_API_KEY environment variable not set.");
}

const MAX_RETRIES = 5;

async function apiCallWithRetry<T>(
  apiFunction: (client: GoogleGenAI, model: string) => Promise<T>,
  modelIdentifier: ModelIdentifier
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { client, key, model } = await apiKeyManager.getClient(modelIdentifier);

    if (!client || !key || !model) {
      lastError = new Error("No available API keys in the pool. All keys may be rate-limited or have exhausted their quotas.");
      continue;
    }

    try {
      const result = await apiFunction(client, model);
      apiKeyManager.logSuccess(key);
      return result;
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt + 1}/${MAX_RETRIES} failed for model ${model} with key ${key.substring(0,4)}...`, error);
      apiKeyManager.logFailure(key, error);
      if (attempt < MAX_RETRIES - 1) {
          await new Promise(res => setTimeout(res, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("API call failed after multiple retries, but no specific error was recorded.");
}

const parseJsonResponse = (text: string) => {
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.substring(7);
    }
    if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.substring(0, jsonStr.length - 3);
    }
    
    let jsonStartIndex = jsonStr.indexOf('{');
    let jsonEndIndex = jsonStr.lastIndexOf('}');
    
    // Handle array of objects as a valid response
    if (jsonStr.trim().startsWith('[')) {
      jsonStartIndex = jsonStr.indexOf('[');
      jsonEndIndex = jsonStr.lastIndexOf(']');
    }

    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
        throw new Error("No valid JSON object or array found in AI response.");
    }
    jsonStr = jsonStr.substring(jsonStartIndex, jsonEndIndex + 1);
    return JSON.parse(jsonStr);
};


export const generateQuiz = async (parts: PromptPart[], config: QuizConfig): Promise<Quiz | null> => {
  const modelIdentifier = 'quizGeneration';

  const apiFunction = async (client: GoogleGenAI, model: string): Promise<GenerateContentResponse> => {
    const systemInstruction = getQuizSystemInstruction(
      config.numberOfQuestions,
      config.knowledgeSource,
      config.mode,
      config.topics,
      config.customInstructions
    );
    
    const contents: Content = { parts: parts };

    const genConfig: any = {
      model: model,
      contents: contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: getQuizSchema(config.numberOfQuestions)
      }
    };
    
    if (config.knowledgeSource === KnowledgeSource.WEB_SEARCH) {
        delete genConfig.config.responseMimeType;
        delete genConfig.config.responseSchema;
        genConfig.config.tools = [{googleSearch: {}}];
    }
    
    return client.models.generateContent(genConfig);
  };
  
  const response = await apiCallWithRetry(apiFunction, modelIdentifier);
  
  try {
    const jsonResponse = parseJsonResponse(response.text);

    if (!jsonResponse || !Array.isArray(jsonResponse.questions)) {
      console.warn("Invalid JSON structure from AI:", jsonResponse);
      return null;
    }

    const rawQuestions = jsonResponse.questions;
    const validQuestions: Question[] = [];
    const webSources: WebSource[] | undefined = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => chunk.web)
        .filter((web: any) => web?.uri);

    for (const q of rawQuestions) {
      if (!q.questionType || !q.questionText || !q.explanation) {
        console.warn("Skipping invalid question from AI (missing required fields):", q);
        continue;
      }
      
      const topic = q.topic || "General";

      switch(q.questionType) {
        case QuestionType.MULTIPLE_CHOICE:
          if (Array.isArray(q.options) && q.options.length === 4 && typeof q.correctAnswerIndex === 'number' && q.options.every((opt: any) => typeof opt === 'string')) {
            validQuestions.push({
              questionType: QuestionType.MULTIPLE_CHOICE,
              questionText: q.questionText,
              options: q.options,
              correctAnswerIndex: q.correctAnswerIndex,
              explanation: q.explanation,
              topic: topic
            });
          } else { console.warn("Skipping invalid MULTIPLE_CHOICE question:", q); }
          break;

        case QuestionType.TRUE_FALSE:
          if (typeof q.correctAnswerBoolean === 'boolean') {
            validQuestions.push({
              questionType: QuestionType.TRUE_FALSE,
              questionText: q.questionText,
              correctAnswer: q.correctAnswerBoolean,
              explanation: q.explanation,
              topic: topic
            });
          } else { console.warn("Skipping invalid TRUE_FALSE question:", q); }
          break;

        case QuestionType.FILL_IN_THE_BLANK:
          if (Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0 && q.correctAnswers.every((ans: any) => typeof ans === 'string')) {
            validQuestions.push({
              questionType: QuestionType.FILL_IN_THE_BLANK,
              questionText: q.questionText,
              correctAnswers: q.correctAnswers,
              acceptableAnswers: q.acceptableAnswers,
              explanation: q.explanation,
              topic: topic
            });
          } else { console.warn("Skipping invalid FILL_IN_THE_BLANK question:", q); }
          break;

        case QuestionType.OPEN_ENDED:
          validQuestions.push({
            questionType: QuestionType.OPEN_ENDED,
            questionText: q.questionText,
            explanation: q.explanation,
            topic: topic
          });
          break;

        case QuestionType.MATCHING:
            if (Array.isArray(q.prompts) && Array.isArray(q.answers) && q.prompts.length === q.answers.length && q.prompts.length > 1) {
                validQuestions.push({
                    questionType: QuestionType.MATCHING,
                    questionText: q.questionText,
                    prompts: q.prompts,
                    answers: q.answers,
                    promptTitle: q.promptTitle,
                    answerTitle: q.answerTitle,
                    explanation: q.explanation,
                    topic: topic,
                });
            } else { console.warn("Skipping invalid MATCHING question:", q); }
            break;
            
        case QuestionType.SEQUENCE:
            if (Array.isArray(q.items) && q.items.length > 1 && q.items.every((item: any) => typeof item === 'string')) {
                validQuestions.push({
                    questionType: QuestionType.SEQUENCE,
                    questionText: q.questionText,
                    items: q.items,
                    explanation: q.explanation,
                    topic: topic,
                });
            } else { console.warn("Skipping invalid SEQUENCE question:", q); }
            break;

        default:
          console.warn(`Skipping invalid question from AI (unknown type: ${q.questionType}):`, q);
          break;
      }
    }

    if (validQuestions.length === 0 && rawQuestions.length > 0) {
        throw new Error("The AI responded, but none of the generated questions were valid.");
    }

    return { questions: validQuestions, webSources };
  } catch (error) {
    console.error("Generate quiz failed:", error);
    if (error instanceof Error) throw error;
    throw new Error("Failed to parse the quiz from the AI's response.");
  }
};

export const generateTopics = async (parts: PromptPart[]): Promise<string[]> => {
    const modelIdentifier = 'topicAnalysis';
    const apiFunction = (client: GoogleGenAI, model: string) => client.models.generateContent({
        model,
        contents: { parts },
        config: {
            systemInstruction: getTopicsInstruction(),
            responseMimeType: "application/json",
            responseSchema: topicsSchema
        }
    });
    const response = await apiCallWithRetry(apiFunction, modelIdentifier);
    const jsonResponse = parseJsonResponse(response.text);
    return jsonResponse.topics || [];
};

export const gradeExam = async (questions: Question[], submission: OpenEndedAnswer): Promise<AnswerLog[]> => {
    const modelIdentifier = 'examGrading';
    const userPromptParts: PromptPart[] = [{ text: submission.text }];
    if (submission.images) {
        submission.images.forEach(img => userPromptParts.push({ inlineData: { mimeType: img.mimeType, data: img.data }}));
    }
    
    const apiFunction = (client: GoogleGenAI, model: string) => client.models.generateContent({
        model,
        contents: { parts: userPromptParts },
        config: {
            systemInstruction: getGradingSystemInstruction(questions),
            responseMimeType: "application/json",
            responseSchema: batchGradingSchema
        }
    });

    const response = await apiCallWithRetry(apiFunction, modelIdentifier);
    const jsonResponse = parseJsonResponse(response.text);
    const grades: any[] = jsonResponse.grades || [];

    return questions.map((q, i) => {
        const grade = grades.find(g => g.questionIndex === i) || { isCorrect: false, score: 0, feedback: 'AI grader did not return a result for this question.' };
        return {
            question: q,
            userAnswer: submission,
            isCorrect: grade.isCorrect,
            pointsAwarded: grade.score,
            maxPoints: 10,
            examFeedback: grade.feedback,
        };
    });
};

export const generateExamPrediction = async (data: any): Promise<PredictedQuestion[]> => {
    const modelIdentifier = 'examPrediction';
    const parts = getPredictionUserPromptParts(data);

    const apiFunction = (client: GoogleGenAI, model: string) => client.models.generateContent({
        model,
        contents: { parts },
        config: {
            systemInstruction: getPredictionSystemInstruction(),
            responseMimeType: "application/json",
            responseSchema: predictionSchema
        }
    });
    const response = await apiCallWithRetry(apiFunction, modelIdentifier);
    const jsonResponse = parseJsonResponse(response.text);
    return jsonResponse.predictions || [];
};

export const generateStudyGuideForPrediction = async (question: PredictedQuestion): Promise<StudyGuide> => {
    const modelIdentifier = 'studyGuideGeneration';
    const apiFunction = (client: GoogleGenAI, model: string) => client.models.generateContent({
        model,
        contents: { parts: [{ text: "Please generate the study guide." }] },
        config: {
            systemInstruction: getStudyGuideInstruction(question),
            responseMimeType: "application/json",
            responseSchema: studyGuideSchema
        }
    });
    const response = await apiCallWithRetry(apiFunction, modelIdentifier);
    return parseJsonResponse(response.text);
};


export const generatePersonalizedFeedback = async (history: QuizResult[]): Promise<PersonalizedFeedback | null> => {
    if (!history || history.length === 0) return null;
    const modelIdentifier = 'feedbackGeneration';
    const historyForPrompt = JSON.stringify(history.map(r => ({
        quizDate: r.date,
        answerLog: r.answerLog.map(l => ({
            topic: l.question.topic,
            questionText: l.question.questionText,
            isCorrect: l.isCorrect,
            pointsAwarded: l.pointsAwarded,
            maxPoints: l.maxPoints,
            aiFeedback: l.aiFeedback
        }))
    })));

    const apiFunction = (client: GoogleGenAI, model: string) => client.models.generateContent({
        model,
        contents: { parts: [{ text: "Generate feedback based on the history in the system instruction."}] },
        config: {
            systemInstruction: getFeedbackSystemInstruction(historyForPrompt),
            responseMimeType: "application/json",
            responseSchema: personalizedFeedbackSchema
        }
    });

    const response = await apiCallWithRetry(apiFunction, modelIdentifier);
    return parseJsonResponse(response.text);
};

export const validateFillInTheBlankAnswer = async (questionText: string, correctAnswer: string, userAnswer: string): Promise<FibValidationResult> => {
    const modelIdentifier = 'fibValidation';
    const systemInstruction = getFibValidationSystemInstruction(questionText, correctAnswer, userAnswer);

    const apiFunction = (client: GoogleGenAI, model: string) => client.models.generateContent({
        model,
        contents: { parts: [{text: "Validate the user's answer."}] },
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: fibValidationSchema
        }
    });
    try {
        const response = await apiCallWithRetry(apiFunction, modelIdentifier);
        const json = parseJsonResponse(response.text);
        return {
            status: json.status as FibValidationStatus,
            pointsAwarded: json.pointsAwarded,
            comment: json.comment
        };
    } catch(e) {
        console.error("FIB validation failed, defaulting to incorrect", e);
        return { status: FibValidationStatus.INCORRECT, pointsAwarded: 0, comment: 'AI validation failed.' };
    }
};
