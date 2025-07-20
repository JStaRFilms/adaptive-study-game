





import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Quiz, Question, QuestionType, PromptPart, QuizConfig, KnowledgeSource, WebSource, StudyMode, OpenEndedAnswer, OpenEndedQuestion, AnswerLog, PredictedQuestion } from '../types';

const questionSchema = {
    type: Type.OBJECT,
    properties: {
        questionType: {
            type: Type.STRING,
            description: "The type of the question. Must be one of 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_IN_THE_BLANK', or 'OPEN_ENDED'.",
            enum: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_IN_THE_BLANK', 'OPEN_ENDED'],
        },
        questionText: {
            type: Type.STRING,
            description: "The text of the question. For FILL_IN_THE_BLANK questions, this text must include '___' to indicate where the answer goes."
        },
        explanation: {
            type: Type.STRING,
            description: "A brief explanation for why the correct answer is correct. For OPEN_ENDED questions, this must be a detailed grading rubric outlining the key points for a complete answer. This is required for all question types."
        },
        options: {
            type: Type.ARRAY,
            description: "For MULTIPLE_CHOICE questions, an array of exactly 4 string options. For other question types, this should be null.",
            items: { type: Type.STRING },
            nullable: true,
        },
        correctAnswerIndex: {
            type: Type.INTEGER,
            description: "For MULTIPLE_CHOICE questions, the 0-based index of the correct option in the 'options' array. For other question types, this should be null.",
            nullable: true,
        },
        correctAnswerBoolean: {
            type: Type.BOOLEAN,
            description: "For TRUE_FALSE questions, the correct boolean answer. For other question types, this should be null.",
            nullable: true,
        },
        correctAnswerString: {
            type: Type.STRING,
            description: "For FILL_IN_THE_BLANK questions, the correct string answer. For other question types, this should be null.",
            nullable: true,
        },
        acceptableAnswers: {
            type: Type.ARRAY,
            description: "For FILL_IN_THE_BLANK questions, an optional array of acceptable alternative answers (e.g., common synonyms, misspellings, or typos).",
            items: { type: Type.STRING },
            nullable: true,
        }
    },
    required: ["questionType", "questionText", "explanation"]
};

const getInstructionText = (numberOfQuestions: number, knowledgeSource: KnowledgeSource, mode: StudyMode, topics?: string[]): string => {
    let baseInstruction = '';
    
    if (mode === StudyMode.EXAM) {
        baseInstruction = `You are an expert educator. Create a high-quality, open-ended exam with exactly ${numberOfQuestions} questions. The questions should be thought-provoking and require detailed, paragraph-length answers. They should test a deep understanding of the key concepts, not just simple facts. Follow the provided JSON schema precisely. Use markdown for formatting, like **bold** for emphasis.

- For EVERY question, the 'questionType' must be 'OPEN_ENDED'.
- For EVERY question, provide a detailed 'explanation' that acts as a grading rubric. This rubric should list the key points, concepts, and details a comprehensive answer must include to be considered correct and complete. This is crucial for the AI that will grade the user's answers later.`;
    } else {
        baseInstruction = `You are an expert educator. Create a high-quality, mixed-type quiz with exactly ${numberOfQuestions} questions. The quiz should include a mix of MULTIPLE_CHOICE, TRUE_FALSE, and FILL_IN_THE_BLANK questions. The questions should test key concepts, definitions, and important facts. Follow the provided JSON schema precisely. Use markdown for formatting, like **bold** for emphasis.

- For EVERY question, provide a brief 'explanation' for why the correct answer is correct.
- For MULTIPLE_CHOICE questions, provide 4 options and the index of the correct one.
- For TRUE_FALSE questions, provide a statement and whether it is true or false.
- For FILL_IN_THE_BLANK questions, formulate a sentence with a key term replaced by '___' and provide the missing term. Crucially, provide a comprehensive list of 'acceptableAnswers'. This list MUST include common misspellings, plural/singular variations (e.g., if the answer is 'cat', include 'cats'), and different formats (e.g., if the answer is '5', include 'five'). Be generous with acceptable answers to avoid penalizing users for minor errors.`;
    }
    
    if (topics && topics.length > 0) {
        baseInstruction += `\n\nThe quiz should specifically focus on the following topics: ${topics.join(', ')}.`;
    }

    switch (knowledgeSource) {
        case KnowledgeSource.GENERAL:
            return `${baseInstruction}\n\nThe user has provided study materials to define a topic. Use these materials as the primary source, but also leverage your own general knowledge to create a comprehensive quiz that expands on the topic.\n\nHere are the study materials:\n---`;
        case KnowledgeSource.WEB_SEARCH:
             return `${baseInstruction}\n\nThe user has provided study materials as a topic. Use Google Search to find the most relevant and up-to-date information on this topic and generate the quiz based on your findings. The user's notes may be brief, so rely on search results to build the quiz.\n\nHere is the topic from the user's notes:\n---`;
        case KnowledgeSource.NOTES_ONLY:
        default:
            return `${baseInstruction}\n\nBase the quiz STRICTLY on the following study materials, which may include text, images, and transcribed audio from files.\n\nHere are the study materials:\n---`;
    }
};

const topicsSchema = {
    type: Type.OBJECT,
    properties: {
        topics: {
            type: Type.ARRAY,
            description: "A list of main topics, concepts, or subjects found in the text. Each topic should be a concise string, no more than 5 words.",
            items: { type: Type.STRING }
        }
    },
    required: ["topics"]
};

export const generateTopics = async (userContentParts: PromptPart[]): Promise<string[]> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const instruction = "You are an expert at analyzing text and identifying key themes. Based on the provided study materials (which can include text and images), identify the main topics or subjects discussed. Your response must be a JSON object containing a single key 'topics' which is an array of strings. Each string should be a concise topic name (e.g., 'Cellular Respiration', 'The Krebs Cycle', 'World War II Causes').";

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
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { numberOfQuestions, knowledgeSource, topics, mode } = config;
  
  const quizSchema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        description: `An array of exactly ${numberOfQuestions} quiz questions.`,
        items: questionSchema
      }
    },
    required: ["questions"]
  };

  const instructionText = getInstructionText(numberOfQuestions, knowledgeSource, mode, topics);
  const finalParts: PromptPart[] = [{ text: instructionText }, ...userContentParts];

  const apiConfig: any = {
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
            contents: { parts: finalParts },
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
            const questionText = q.questionText || q.question;

            if (!q.questionType || !questionText || !q.explanation) {
                console.warn(`Skipping invalid question from AI (missing type, text, or explanation):`, q);
                return null;
            }
            switch (q.questionType) {
                case QuestionType.MULTIPLE_CHOICE:
                    if (!q.options || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correctAnswerIndex !== 'number' || q.correctAnswerIndex >= q.options.length ) return null;
                    return { questionType: q.questionType, questionText, options: q.options, correctAnswerIndex: q.correctAnswerIndex, explanation: q.explanation };
                case QuestionType.TRUE_FALSE:
                    const correctAnswerBoolean = q.correctAnswerBoolean ?? q.answer;
                    if (typeof correctAnswerBoolean !== 'boolean') return null;
                    return { questionType: q.questionType, questionText, correctAnswer: correctAnswerBoolean, explanation: q.explanation };
                case QuestionType.FILL_IN_THE_BLANK:
                    const correctAnswerString = q.correctAnswerString || q.missingTerm;
                    if (typeof correctAnswerString !== 'string' || !questionText.includes('___')) return null;
                    return { questionType: q.questionType, questionText, correctAnswer: correctAnswerString, explanation: q.explanation, acceptableAnswers: q.acceptableAnswers || [] };
                case QuestionType.OPEN_ENDED:
                     return { questionType: q.questionType, questionText, explanation: q.explanation };
                default:
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

const batchGradingSchema = {
    type: Type.OBJECT,
    properties: {
        grades: {
            type: Type.ARRAY,
            description: "An array of grading results, one for each question provided in the prompt.",
            items: {
                type: Type.OBJECT,
                properties: {
                    questionIndex: {
                        type: Type.INTEGER,
                        description: "The 0-based index of the question being graded, corresponding to the original list of questions."
                    },
                    isCorrect: {
                        type: Type.BOOLEAN,
                        description: "Whether the user's answer is substantially correct based on the rubric."
                    },
                    score: {
                        type: Type.INTEGER,
                        description: "An integer score from 0 to 10, where 10 is a perfect answer."
                    },
                    feedback: {
                        type: Type.STRING,
                        description: "Constructive, specific feedback for the user. Explain what they got right, what they missed, and how they could improve, referencing the rubric."
                    },
                },
                required: ["questionIndex", "isCorrect", "score", "feedback"],
            }
        }
    },
    required: ["grades"],
};

const extractAnswerForQuestion = (fullText: string, questionNumber: number, numberOfQuestions: number): string | null => {
    const regex = /^(?:\s*(?:##?)\s*)?(?:question|q)?\s*(\d+)\s*[.:)]?/gim;
    let match;
    const markers = [];
    while ((match = regex.exec(fullText)) !== null) {
        markers.push({
            number: parseInt(match[1], 10),
            index: match.index,
            headerText: match[0],
        });
    }

    if (markers.length === 0 && numberOfQuestions === 1) {
        return fullText.trim().length > 0 ? fullText.trim() : null;
    }
    
    if (markers.length === 0) return null;

    const currentMarker = markers.find(m => m.number === questionNumber);
    if (!currentMarker) return null;

    const nextMarker = markers
        .filter(m => m.index > currentMarker.index)
        .sort((a,b) => a.index - b.index)[0];

    const startIndex = currentMarker.index + currentMarker.headerText.length;
    const endIndex = nextMarker ? nextMarker.index : fullText.length;
    
    const extracted = fullText.substring(startIndex, endIndex).trim();
    return extracted.length > 0 ? extracted : null;
};


export const gradeExam = async (questions: Question[], submission: OpenEndedAnswer): Promise<AnswerLog[]> => {
    if (!process.env.API_KEY) throw new Error("API_KEY environment variable not set.");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // 1. Pre-parse the submission to find the text for each question.
    const parsedAnswers = questions.map((_, index) => {
        return extractAnswerForQuestion(submission.text, index + 1, questions.length);
    });

    // 2. Build a structured prompt with one grading task per question.
    const gradingTasksText = questions.map((q, i) => {
        const userAnswerText = parsedAnswers[i];
        return `
### Grading Task for Question ${i + 1} (index: ${i})
**Question Text:**
${(q as OpenEndedQuestion).questionText}

**Grading Rubric:**
${(q as OpenEndedQuestion).explanation}

**User's Answer for this Question:**
${userAnswerText || "(No specific answer was found for this question number. Grade accordingly.)"}
---
`;
    }).join('\n');

    const instruction = `You are an impartial and expert grader. A user has completed an exam. Below are the questions, each paired with its specific grading rubric and the portion of the user's submission that corresponds to it.

Your task is to evaluate each answer independently based ONLY on the text provided for it. Do not look at answers for other questions. If an answer is listed as "(No specific answer was found...)", you must assign a score of 0.

The user also submitted images of handwritten work which should be considered as part of their answers. These images are attached to this prompt.

Your response MUST be a single JSON object matching the required schema. It must contain a 'grades' array with an entry for EVERY question, from index 0 to ${questions.length - 1}.

<hr>
## Questions & Individual Answers to Grade
${gradingTasksText}
<hr>

## User's Submitted Images (Handwritten Work)
${submission.images.length > 0 ? "(Images are attached as subsequent parts of this prompt and apply to the answers above)" : "(No images provided)"}
`;

    const parts: PromptPart[] = [{ text: instruction }];
    submission.images.forEach(img => {
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
    });
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts },
            config: {
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
        return questions.map(q => ({
            question: q,
            userAnswer: submission,
            isCorrect: false,
            feedback: "Sorry, a system error occurred during the grading process. This answer has been marked as incorrect.",
            questionScore: 0,
        }));
    }
};


const predictionSchema = {
    type: Type.OBJECT,
    properties: {
        predictions: {
            type: Type.ARRAY,
            description: "An array of predicted exam questions.",
            items: {
                type: Type.OBJECT,
                properties: {
                    questionText: { type: Type.STRING, description: "The text of the predicted, open-ended exam question." },
                    topic: { type: Type.STRING, description: "The main topic this question relates to." },
                    reasoning: { type: Type.STRING, description: "A detailed explanation for why this question was predicted, citing specific examples from the provided materials (e.g., 'This is a variation of a question from Past Exam 1...' or 'The teacher's persona suggests they value synthesis, and this question combines Topic A and Topic B...')." }
                },
                required: ["questionText", "topic", "reasoning"]
            }
        }
    },
    required: ["predictions"]
};

export const generateExamPrediction = async (data: any): Promise<PredictedQuestion[]> => {
    if (!process.env.API_KEY) throw new Error("API_KEY environment variable not set.");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { teacherName, persona, hints, coreNotesParts, pastQuestionsParts, pastTestsParts, otherMaterialsParts, numPredictions } = data;

    const systemInstruction = `You are an expert educational analyst and predictor. Your task is to embody a specific teacher and predict likely exam questions based on a comprehensive set of materials. Analyze the teacher's persona, past questions, and other provided documents to make the most accurate predictions possible. The predictions should be insightful and challenging, suitable for a final exam.`;

    const promptParts: PromptPart[] = [{text: systemInstruction}];

    let userPrompt = `# Task: Predict Exam Questions

You must generate a list of ${numPredictions} likely open-ended exam questions. For each question, provide your reasoning, citing which materials led to your prediction. Follow the JSON schema precisely.

---
## Teacher Profile
**Name:** ${teacherName || "Not provided"}
**Persona & Tendencies:**
${persona || "Not provided"}

---
## Known Hints & Focus Areas
${hints || "Not provided"}

---
`;
    promptParts.push({text: userPrompt});
    
    if (coreNotesParts.length > 0) {
        promptParts.push({ text: "\n## Core Study Materials (Lecture Notes, etc.)\n[Content below is from the main study set]\n" });
        promptParts.push(...coreNotesParts);
    }
    if (pastQuestionsParts.length > 0) {
        promptParts.push({ text: "\n## Past Exam Questions for Analysis\n[Content below is from past exams]\n" });
        promptParts.push(...pastQuestionsParts);
    }
    if (pastTestsParts.length > 0) {
        promptParts.push({ text: "\n## Past Quizzes/Tests for Analysis\n[Content below is from past quizzes]\n" });
        promptParts.push(...pastTestsParts);
    }
    if (otherMaterialsParts.length > 0) {
        promptParts.push({ text: "\n## Other Relevant Materials for Analysis\n[Content below is from other materials]\n" });
        promptParts.push(...otherMaterialsParts);
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: promptParts },
            config: {
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