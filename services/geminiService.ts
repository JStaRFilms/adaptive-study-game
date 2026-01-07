

import { GoogleGenAI, GenerateContentResponse, Type, Content } from "@google/genai";
import { Quiz, Question, QuestionType, PromptPart, QuizConfig, KnowledgeSource, WebSource, OpenEndedAnswer, AnswerLog, PredictedQuestion, PersonalizedFeedback, FibValidationResult, FibValidationStatus, QuizResult, StudyGuide, MultipleChoiceQuestion, MatchingQuestion, SequenceQuestion, ReadingLayout, ReadingBlock, SubConcept, BlockContent, CanvasGenerationProgress } from '../types';
import { getQuizSchema, coreConceptsSchema, batchGradingSchema, predictionSchema, fibValidationSchema, studyGuideSchema, topicAnalysisSchema, narrowPassesSchema, summaryRecommendationSchema, readingLayoutSchema, subConceptsSchema, reflowedLayoutSchema, conceptSummarySchema } from './geminiSchemas';
import { getQuizSystemInstruction, getCoreConceptsInstruction, getGradingSystemInstruction, getPredictionSystemInstruction, getPredictionUserPromptParts, getFibValidationSystemInstruction, getStudyGuideInstruction, getTopicAnalysisInstruction, getNarrowPassesInstruction, getSummaryRecommendationInstruction, getGridLayoutDesignInstruction, getReadingSubConceptGenerationSystemInstruction, getReadingLayoutReflowSystemInstruction, getConceptSummaryInstruction } from './geminiPrompts';
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
            // Only set this error if we don't already have a more specific one from a previous attempt
            if (!lastError) {
                lastError = new Error("No available API keys in the pool. All keys may be rate-limited or have exhausted their quotas.");
            }
            // If we're out of keys, we might want to wait a bit longer before retrying, 
            // but standard backoff is handled at the end of the loop.
            if (attempt < MAX_RETRIES - 1) {
                await new Promise(res => setTimeout(res, 1000 * (attempt + 1)));
            }
            continue;
        }

        try {
            const result = await apiFunction(client, model);
            apiKeyManager.logSuccess(key);
            return result;
        } catch (error: any) {
            lastError = error;
            console.error(`Attempt ${attempt + 1}/${MAX_RETRIES} failed for model ${model} with key ${key.substring(0, 4)}...`, error);
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
            genConfig.config.tools = [{ googleSearch: {} }];
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

        const questionsFromAI = jsonResponse.questions;
        const processedQuestions = [];

        for (let i = 0; i < questionsFromAI.length; i++) {
            const currentQ = questionsFromAI[i];

            // Attempt to merge split MATCHING questions where prompts come first
            if (
                currentQ.questionType === QuestionType.MATCHING &&
                currentQ.prompts && Array.isArray(currentQ.prompts) &&
                !currentQ.answers &&
                i + 1 < questionsFromAI.length
            ) {
                const nextQ = questionsFromAI[i + 1];
                if (
                    nextQ.questionType === QuestionType.MATCHING &&
                    nextQ.answers && Array.isArray(nextQ.answers) &&
                    !nextQ.prompts &&
                    nextQ.conceptId === currentQ.conceptId
                ) {
                    const mergedQ = {
                        ...currentQ,
                        ...nextQ,
                        prompts: currentQ.prompts,
                        answers: nextQ.answers,
                    };
                    processedQuestions.push(mergedQ);
                    i++; // Skip the next item
                    continue;
                }
            }

            // Attempt to merge split MATCHING questions where answers come first
            if (
                currentQ.questionType === QuestionType.MATCHING &&
                currentQ.answers && Array.isArray(currentQ.answers) &&
                !currentQ.prompts &&
                i + 1 < questionsFromAI.length
            ) {
                const nextQ = questionsFromAI[i + 1];
                if (
                    nextQ.questionType === QuestionType.MATCHING &&
                    nextQ.prompts && Array.isArray(nextQ.prompts) &&
                    !nextQ.answers &&
                    nextQ.conceptId === currentQ.conceptId
                ) {
                    const mergedQ = {
                        ...currentQ,
                        ...nextQ,
                        answers: currentQ.answers,
                        prompts: nextQ.prompts,
                    };
                    processedQuestions.push(mergedQ);
                    i++; // Skip the next item
                    continue;
                }
            }

            processedQuestions.push(currentQ);
        }

        const validQuestions: Question[] = [];
        const webSources: WebSource[] | undefined = response.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map((chunk: any) => chunk.web)
            .filter((web: any) => web?.uri);

        for (const q of processedQuestions) {
            if (!q.questionType || !q.questionText || !q.explanation || !q.conceptId) {
                console.warn("Skipping invalid question from AI (missing required fields):", q);
                continue;
            }

            const topic = q.topic || "General";
            const conceptId = q.conceptId;

            switch (q.questionType) {
                case QuestionType.MULTIPLE_CHOICE:
                    if (Array.isArray(q.options) && q.options.length === 4 && typeof q.correctAnswerIndex === 'number' && q.options.every((opt: any) => typeof opt === 'string')) {
                        validQuestions.push({
                            questionType: QuestionType.MULTIPLE_CHOICE,
                            questionText: q.questionText,
                            options: q.options,
                            correctAnswerIndex: q.correctAnswerIndex,
                            explanation: q.explanation,
                            topic: topic,
                            conceptId: conceptId,
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
                            topic: topic,
                            conceptId: conceptId,
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
                            topic: topic,
                            conceptId: conceptId,
                        });
                    } else { console.warn("Skipping invalid FILL_IN_THE_BLANK question:", q); }
                    break;

                case QuestionType.OPEN_ENDED:
                    validQuestions.push({
                        questionType: QuestionType.OPEN_ENDED,
                        questionText: q.questionText,
                        explanation: q.explanation,
                        topic: topic,
                        conceptId: conceptId,
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
                            conceptId: conceptId,
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
                            conceptId: conceptId,
                        });
                    } else { console.warn("Skipping invalid SEQUENCE question:", q); }
                    break;

                default:
                    console.warn(`Skipping invalid question from AI (unknown type: ${q.questionType}):`, q);
                    break;
            }
        }

        if (validQuestions.length === 0 && processedQuestions.length > 0) {
            throw new Error("The AI responded, but none of the generated questions were valid.");
        }

        return { questions: validQuestions, webSources };
    } catch (error) {
        console.error("Generate quiz failed:", error);
        if (error instanceof Error) throw error;
        throw new Error("Failed to parse the quiz from the AI's response.");
    }
};

export const identifyCoreConcepts = async (parts: PromptPart[], customPrompt?: string): Promise<string[]> => {
    const modelIdentifier = 'topicAnalysis';
    const apiFunction = (client: GoogleGenAI, model: string): Promise<GenerateContentResponse> => client.models.generateContent({
        model,
        contents: { parts },
        config: {
            systemInstruction: getCoreConceptsInstruction(customPrompt),
            responseMimeType: "application/json",
            responseSchema: coreConceptsSchema
        }
    });
    const response = await apiCallWithRetry(apiFunction, modelIdentifier);
    const jsonResponse = parseJsonResponse(response.text);
    return jsonResponse.concepts || [];
};

export const summarizeConcept = async (fullContextParts: PromptPart[], conceptTitle: string): Promise<BlockContent> => {
    const modelIdentifier = 'readingLayoutGeneration';
    const apiFunction = (client: GoogleGenAI, model: string): Promise<GenerateContentResponse> => client.models.generateContent({
        model,
        contents: { parts: fullContextParts },
        config: {
            systemInstruction: getConceptSummaryInstruction(conceptTitle),
            responseMimeType: "application/json",
            responseSchema: conceptSummarySchema
        }
    });
    const response = await apiCallWithRetry(apiFunction, modelIdentifier);
    return parseJsonResponse(response.text);
};

const designGridLayout = async (concepts: BlockContent[]): Promise<ReadingLayout> => {
    const modelIdentifier = 'readingLayoutGeneration';
    const apiFunction = (client: GoogleGenAI, model: string): Promise<GenerateContentResponse> => client.models.generateContent({
        model,
        contents: { parts: [{ text: "Design the layout for the following summarized concepts." }] },
        config: {
            systemInstruction: getGridLayoutDesignInstruction(concepts),
            responseMimeType: "application/json",
            responseSchema: readingLayoutSchema
        }
    });
    const response = await apiCallWithRetry(apiFunction, modelIdentifier);
    return parseJsonResponse(response.text);
};

export const buildReadingLayoutInParallel = async (
    parts: PromptPart[],
    onProgress: (progress: CanvasGenerationProgress) => void,
    focusTopics?: string[]
): Promise<ReadingLayout> => {
    // Stage 1: Identify core concepts
    onProgress({ stage: 'Identifying core concepts...', progress: 10 });
    const concepts = (focusTopics && focusTopics.length > 0)
        ? focusTopics
        : await identifyCoreConcepts(parts);

    const totalConcepts = concepts.length;
    if (totalConcepts === 0) {
        throw new Error("No concepts could be identified from the provided materials.");
    }

    // Stage 2: Summarize concepts in parallel
    onProgress({ stage: `Summarizing concepts (0/${totalConcepts})...`, progress: 25 });
    const summarizationPromises = concepts.map((concept, index) =>
        summarizeConcept(parts, concept).then(summary => {
            onProgress({ stage: `Summarizing concepts (${index + 1}/${totalConcepts})...`, progress: 25 + Math.round(((index + 1) / totalConcepts) * 60) });
            return { ...summary, id: `concept-${index}` };
        })
    );
    const summarizedConcepts = await Promise.all(summarizationPromises);

    // Stage 3: Design final grid layout
    onProgress({ stage: 'Designing grid layout...', progress: 90 });
    const layout = await designGridLayout(summarizedConcepts);
    onProgress({ stage: 'Done!', progress: 100 });

    return layout;
};


export const generateSubConcepts = async (parentBlock: ReadingBlock): Promise<SubConcept[]> => {
    const modelIdentifier = 'readingLayoutGeneration'; // Uses a fast model
    const apiFunction = (client: GoogleGenAI, model: string): Promise<GenerateContentResponse> => client.models.generateContent({
        model,
        contents: { parts: [{ text: "Generate sub-concepts for the provided parent concept." }] },
        config: {
            systemInstruction: getReadingSubConceptGenerationSystemInstruction(parentBlock),
            responseMimeType: "application/json",
            responseSchema: subConceptsSchema
        }
    });
    const response = await apiCallWithRetry(apiFunction, modelIdentifier);
    const json = parseJsonResponse(response.text);
    return json.subConcepts;
};

export const reflowLayoutForExpansion = async (currentLayout: ReadingLayout, blockIdToExpand: string, color?: string): Promise<ReadingBlock[]> => {
    const modelIdentifier = 'readingLayoutGeneration'; // Uses a fast model
    const apiFunction = (client: GoogleGenAI, model: string): Promise<GenerateContentResponse> => client.models.generateContent({
        model,
        contents: { parts: [{ text: "Reflow the layout as instructed." }] },
        config: {
            systemInstruction: getReadingLayoutReflowSystemInstruction(currentLayout, blockIdToExpand, color),
            responseMimeType: "application/json",
            responseSchema: reflowedLayoutSchema
        }
    });
    const response = await apiCallWithRetry(apiFunction, modelIdentifier);
    const json = parseJsonResponse(response.text);
    return json.blocks;
};

export const gradeExam = async (questions: Question[], submission: OpenEndedAnswer): Promise<AnswerLog[]> => {
    const modelIdentifier = 'examGrading';
    const userPromptParts: PromptPart[] = [{ text: submission.text }];
    if (submission.images) {
        submission.images.forEach(img => userPromptParts.push({ inlineData: { mimeType: img.mimeType, data: img.data } }));
    }

    const apiFunction = (client: GoogleGenAI, model: string): Promise<GenerateContentResponse> => client.models.generateContent({
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
            confidence: 0, // Not applicable for exams
        };
    });
};

export const generateExamPrediction = async (data: any): Promise<PredictedQuestion[]> => {
    const modelIdentifier = 'examPrediction';
    const parts = getPredictionUserPromptParts(data);

    const apiFunction = (client: GoogleGenAI, model: string): Promise<GenerateContentResponse> => client.models.generateContent({
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
    const apiFunction = (client: GoogleGenAI, model: string): Promise<GenerateContentResponse> => client.models.generateContent({
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

const userAnswerToString = (log: AnswerLog): string => {
    const { question, userAnswer } = log;

    if (userAnswer === 'SKIPPED') return 'Skipped';
    if (userAnswer === null) return 'Not answered';

    switch (question.questionType) {
        case QuestionType.MULTIPLE_CHOICE:
            if (typeof userAnswer === 'number') {
                return (question as MultipleChoiceQuestion).options[userAnswer] || "Invalid Option";
            }
            break;
        case QuestionType.TRUE_FALSE:
            return userAnswer ? 'True' : 'False';
        case QuestionType.FILL_IN_THE_BLANK:
            if (Array.isArray(userAnswer)) {
                return (userAnswer as string[]).map(a => `"${a || '...'}"`).join(', ');
            }
            break;
        case QuestionType.MATCHING:
            if (Array.isArray(userAnswer)) {
                const matchingQ = question as MatchingQuestion;
                const userAnswerArray = userAnswer as (number | null)[];
                return userAnswerArray
                    .map((promptIndex, answerIndex) => {
                        if (promptIndex === null) return null; // Skip unmatched answers
                        const promptText = `"${matchingQ.prompts[promptIndex]}"`;
                        const answerText = `"${matchingQ.answers[answerIndex]}"`;
                        return `${promptText} with ${answerText}`;
                    })
                    .filter(Boolean)
                    .join('; ');
            }
            break;
        case QuestionType.SEQUENCE:
            if (Array.isArray(userAnswer)) {
                const sequenceQ = question as SequenceQuestion;
                const userOrderIndices = userAnswer as number[];
                return userOrderIndices.map((originalIndex, displayIndex) =>
                    `${displayIndex + 1}. ${sequenceQ.items[originalIndex]}`
                ).join('; ');
            }
            break;
        case QuestionType.OPEN_ENDED:
            const openEndedAnswer = userAnswer as OpenEndedAnswer;
            // Provide a snippet to avoid huge prompts
            return openEndedAnswer.text.substring(0, 200) + (openEndedAnswer.text.length > 200 ? '...' : '');
    }

    // Fallback for any other case
    return JSON.stringify(userAnswer);
};

// --- Sub-functions for streaming feedback ---

const generateTopicAnalysis = async (historyForPrompt: string): Promise<Pick<PersonalizedFeedback, 'strengthTopics' | 'weaknessTopics'> | null> => {
    const modelIdentifier = 'feedbackGeneration';
    const apiFunction = (client: GoogleGenAI, model: string): Promise<GenerateContentResponse> => client.models.generateContent({
        model,
        contents: { parts: [{ text: "Analyze the history and provide strength and weakness topics." }] },
        config: {
            systemInstruction: getTopicAnalysisInstruction(historyForPrompt),
            responseMimeType: "application/json",
            responseSchema: topicAnalysisSchema
        }
    });
    const response = await apiCallWithRetry(apiFunction, modelIdentifier);
    return parseJsonResponse(response.text);
}

const generateNarrowPasses = async (latestResultForPrompt: string): Promise<Pick<PersonalizedFeedback, 'narrowPasses'> | null> => {
    const modelIdentifier = 'feedbackGeneration';
    const apiFunction = (client: GoogleGenAI, model: string): Promise<GenerateContentResponse> => client.models.generateContent({
        model,
        contents: { parts: [{ text: "Analyze the latest quiz result for narrow passes." }] },
        config: {
            systemInstruction: getNarrowPassesInstruction(latestResultForPrompt),
            responseMimeType: "application/json",
            responseSchema: narrowPassesSchema
        }
    });
    const response = await apiCallWithRetry(apiFunction, modelIdentifier);
    return parseJsonResponse(response.text);
}

const generateSummaryAndRecommendation = async (topicAnalysisResult: Pick<PersonalizedFeedback, 'strengthTopics' | 'weaknessTopics'>): Promise<Pick<PersonalizedFeedback, 'overallSummary' | 'recommendation'> | null> => {
    const modelIdentifier = 'feedbackGeneration';
    const topicAnalysisString = JSON.stringify(topicAnalysisResult);
    const apiFunction = (client: GoogleGenAI, model: string): Promise<GenerateContentResponse> => client.models.generateContent({
        model,
        contents: { parts: [{ text: "Generate the summary and recommendation based on the provided analysis." }] },
        config: {
            systemInstruction: getSummaryRecommendationInstruction(topicAnalysisString),
            responseMimeType: "application/json",
            responseSchema: summaryRecommendationSchema
        }
    });
    const response = await apiCallWithRetry(apiFunction, modelIdentifier);
    return parseJsonResponse(response.text);
}

export const generatePersonalizedFeedbackStreamed = async (
    history: QuizResult[],
    onUpdate: (partialFeedback: Partial<PersonalizedFeedback>) => void
): Promise<void> => {
    if (!history || history.length === 0) return;

    const historyForPrompt = JSON.stringify(history.map(r => ({
        quizDate: r.date,
        answerLog: r.answerLog.map(l => ({
            topic: l.question.topic,
            questionText: l.question.questionText,
            userAnswerText: userAnswerToString(l),
            isCorrect: l.isCorrect,
            pointsAwarded: l.pointsAwarded,
            maxPoints: l.maxPoints,
            aiFeedback: l.aiFeedback,
            confidence: l.confidence,
        }))
    })));

    const latestResultForPrompt = JSON.stringify(history[0]);

    // Fire off parallel tasks and update UI as they complete
    const topicAnalysisPromise = generateTopicAnalysis(historyForPrompt).then(res => {
        if (res) onUpdate(res);
        return res; // Pass result to the sequential task
    });

    const narrowPassesPromise = generateNarrowPasses(latestResultForPrompt).then(res => {
        if (res) onUpdate(res);
    });

    // When topic analysis is done, fire off the sequential summary task
    const summaryPromise = topicAnalysisPromise.then(topicAnalysisResult => {
        if (topicAnalysisResult) {
            return generateSummaryAndRecommendation(topicAnalysisResult).then(res => {
                if (res) onUpdate(res);
            });
        }
        return Promise.resolve();
    });

    // Wait for all streams to finish
    await Promise.all([narrowPassesPromise, summaryPromise]);
};

export const validateFillInTheBlankAnswer = async (questionText: string, correctAnswer: string, userAnswer: string): Promise<FibValidationResult> => {
    const modelIdentifier = 'fibValidation';
    const systemInstruction = getFibValidationSystemInstruction(questionText, correctAnswer, userAnswer);

    const apiFunction = (client: GoogleGenAI, model: string): Promise<GenerateContentResponse> => client.models.generateContent({
        model,
        contents: { parts: [{ text: "Validate the user's answer." }] },
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
    } catch (e) {
        console.error("FIB validation failed, defaulting to incorrect", e);
        return { status: FibValidationStatus.INCORRECT, pointsAwarded: 0, comment: 'AI validation failed.' };
    }
};