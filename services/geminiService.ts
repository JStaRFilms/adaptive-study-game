import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Quiz, Question, QuestionType, PromptPart, QuizConfig, KnowledgeSource, WebSource } from '../types';

const questionSchema = {
    type: Type.OBJECT,
    properties: {
        questionType: {
            type: Type.STRING,
            description: "The type of the question. Must be one of 'MULTIPLE_CHOICE', 'TRUE_FALSE', or 'FILL_IN_THE_BLANK'.",
            enum: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_IN_THE_BLANK'],
        },
        questionText: {
            type: Type.STRING,
            description: "The text of the question. For FILL_IN_THE_BLANK questions, this text must include '___' to indicate where the answer goes."
        },
        explanation: {
            type: Type.STRING,
            description: "A brief, one-sentence explanation for why the correct answer is correct. This is required for all question types."
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

const getInstructionText = (numberOfQuestions: number, knowledgeSource: KnowledgeSource): string => {
    let baseInstruction = `You are an expert educator. Create a high-quality, mixed-type quiz with exactly ${numberOfQuestions} questions. The quiz should include a mix of MULTIPLE_CHOICE, TRUE_FALSE, and FILL_IN_THE_BLANK questions. The questions should test key concepts, definitions, and important facts. Follow the provided JSON schema precisely.

- For EVERY question, provide a brief 'explanation' for why the correct answer is correct.
- For MULTIPLE_CHOICE questions, provide 4 options and the index of the correct one.
- For TRUE_FALSE questions, provide a statement and whether it is true or false.
- For FILL_IN_THE_BLANK questions, formulate a sentence with a key term replaced by '___' and provide the missing term. Crucially, provide a comprehensive list of 'acceptableAnswers'. This list MUST include common misspellings, plural/singular variations (e.g., if the answer is 'cat', include 'cats'), and different formats (e.g., if the answer is '5', include 'five'). Be generous with acceptable answers to avoid penalizing users for minor errors.`;

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


export const generateQuiz = async (userContentParts: PromptPart[], config: QuizConfig): Promise<Quiz | null> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { numberOfQuestions, knowledgeSource } = config;
  
  const quizSchema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        description: `An array of exactly ${numberOfQuestions} quiz questions. Generate a mix of MULTIPLE_CHOICE, TRUE_FALSE, and FILL_IN_THE_BLANK questions based on the provided instructions and materials.`,
        items: questionSchema
      }
    },
    required: ["questions"]
  };

  const instructionText = getInstructionText(numberOfQuestions, knowledgeSource);
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

        let jsonText = (response.text ?? '').trim();
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
                    if (!q.options || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correctAnswerIndex !== 'number' || q.correctAnswerIndex >= q.options.length ) {
                        console.warn(`Skipping invalid MULTIPLE_CHOICE question from AI:`, q);
                        return null;
                    }
                    return {
                        questionType: q.questionType,
                        questionText: questionText,
                        options: q.options,
                        correctAnswerIndex: q.correctAnswerIndex,
                        explanation: q.explanation,
                    };
                case QuestionType.TRUE_FALSE:
                    const correctAnswerBoolean = q.correctAnswerBoolean ?? q.answer;
                    if (typeof correctAnswerBoolean !== 'boolean') {
                        console.warn(`Skipping invalid TRUE_FALSE question from AI:`, q);
                        return null;
                    }
                    return {
                        questionType: q.questionType,
                        questionText: questionText,
                        correctAnswer: correctAnswerBoolean,
                        explanation: q.explanation,
                    };
                case QuestionType.FILL_IN_THE_BLANK:
                    const correctAnswerString = q.correctAnswerString || q.missingTerm;
                    if (typeof correctAnswerString !== 'string' || !questionText.includes('___')) {
                        console.warn(`Skipping invalid FILL_IN_THE_BLANK question from AI:`, q);
                        return null;
                    }
                    return {
                        questionType: q.questionType,
                        questionText: questionText,
                        correctAnswer: correctAnswerString,
                        explanation: q.explanation,
                        acceptableAnswers: q.acceptableAnswers || [],
                    };
                default:
                     console.warn(`Skipping unknown question type from AI: ${q.questionType}`);
                    return null;
            }
        }).filter((q: Question | null): q is Question => q !== null);

        if (validatedQuestions.length > 0) {
            return { questions: validatedQuestions, webSources }; // Success!
        }
        
        lastError = new Error("The AI responded, but none of the generated questions were valid.");
        console.warn(`Attempt ${attempt}/${MAX_ATTEMPTS}: ${lastError.message}.`);

    } catch (error) {
        lastError = error instanceof Error ? error : new Error("An unknown error occurred");
        console.error(`Error on attempt ${attempt}/${MAX_ATTEMPTS} generating quiz:`, lastError);
    }
    
    if (attempt < MAX_ATTEMPTS) {
      await new Promise(res => setTimeout(res, 1000 * attempt)); // wait 1, 2 seconds before retrying
    }
  }

  // If all attempts failed, throw the last recorded error.
  console.error("All attempts to generate quiz failed.");
  if (lastError) {
      if (lastError.message.includes('json') || lastError.message.includes('JSON')) {
          throw new Error("The AI returned an invalid format. Please try modifying your notes slightly and resubmitting.");
      }
      throw new Error(`An API error occurred after multiple attempts: ${lastError.message}`);
  }

  throw new Error("An unknown error occurred while generating the quiz after multiple attempts.");
};