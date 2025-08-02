


import { Type } from "@google/genai";

export const questionSchema = {
    type: Type.OBJECT,
    properties: {
        questionType: {
            type: Type.STRING,
            description: "The type of the question. Must be one of 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_IN_THE_BLANK', 'OPEN_ENDED', 'MATCHING', or 'SEQUENCE'.",
            enum: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_IN_THE_BLANK', 'OPEN_ENDED', 'MATCHING', 'SEQUENCE'],
        },
        questionText: {
            type: Type.STRING,
            description: "The text of the question. For FILL_IN_THE_BLANK questions, this text must include '___' to indicate where the answer goes. For MATCHING or SEQUENCE, this is the main instruction."
        },
        explanation: {
            type: Type.STRING,
            description: "A brief explanation for why the correct answer is correct. For OPEN_ENDED questions, this must be a detailed grading rubric outlining the key points for a complete answer. This is required for all question types."
        },
        topic: {
            type: Type.STRING,
            description: "The main topic or category this question belongs to. If a list of topics was provided in the prompt, this MUST be one of those topics.",
        },
        conceptId: {
            type: Type.STRING,
            description: "A unique and stable identifier for the core concept being tested, in snake_case (e.g., 'mitochondria_cellular_respiration', 'french_revolution_causes'). This ID MUST be consistent for questions testing the same fundamental concept, even if they are phrased differently. This is critical for progress tracking."
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
        correctAnswers: {
            type: Type.ARRAY,
            description: "For FILL_IN_THE_BLANK questions, an array of strings representing the correct answers for each blank in order. For other question types, this should be null.",
            items: { type: Type.STRING },
            nullable: true,
        },
        acceptableAnswers: {
            type: Type.ARRAY,
            description: "For FILL_IN_THE_BLANK questions, an optional array of arrays of acceptable alternative answers. Each inner array corresponds to an answer in the 'correctAnswers' array.",
            items: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING,
                },
            },
            nullable: true,
        },
        prompts: {
            type: Type.ARRAY,
            description: "For MATCHING questions, an array of strings for the draggable items. For other question types, this should be null.",
            items: { type: Type.STRING },
            nullable: true,
        },
        answers: {
            type: Type.ARRAY,
            description: "For MATCHING questions, an array of strings for the dropzone items, corresponding to the prompts. For other question types, this should be null.",
            items: { type: Type.STRING },
            nullable: true,
        },
        items: {
            type: Type.ARRAY,
            description: "For SEQUENCE questions, an array of strings to be ordered. The array must be in the correct chronological order. For other question types, this should be null.",
            items: { type: Type.STRING },
            nullable: true,
        },
        promptTitle: {
            type: Type.STRING,
            description: "For MATCHING questions, the optional title for the prompts column (e.g., 'Concepts').",
            nullable: true,
        },
        answerTitle: {
            type: Type.STRING,
            description: "For MATCHING questions, the optional title for the answers column (e.g., 'Definitions').",
            nullable: true,
        },
    },
    required: ["questionType", "questionText", "explanation", "topic", "conceptId"]
};

export const getQuizSchema = (numberOfQuestions: number) => ({
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        description: `An array of exactly ${numberOfQuestions} quiz questions.`,
        items: questionSchema
      }
    },
    required: ["questions"]
});

export const topicsSchema = {
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


export const batchGradingSchema = {
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


export const predictionSchema = {
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

export const studyGuideSchema = {
    type: Type.OBJECT,
    properties: {
        answerOutline: {
            type: Type.STRING,
            description: "A detailed, well-structured answer outline for the provided exam question. Use markdown for lists and emphasis (e.g., * bullet point, **bold text**). This should guide the student on how to form a complete answer."
        },
        youtubeSearchQueries: {
            type: Type.ARRAY,
            description: "An array of 2-3 concise, effective search queries for finding educational YouTube videos about this topic.",
            items: { type: Type.STRING }
        }
    },
    required: ["answerOutline", "youtubeSearchQueries"]
};

export const personalizedFeedbackSchema = {
    type: Type.OBJECT,
    properties: {
        overallSummary: {
            type: Type.STRING,
            description: "A friendly, one-sentence summary of the user's performance based on their entire history for this subject."
        },
        strengthTopics: {
            type: Type.ARRAY,
            description: "A list of topics where the user performed well (e.g., >75% accuracy) across all quizzes for this subject. If none, this can be empty.",
            items: {
                type: Type.OBJECT,
                properties: {
                    topic: { type: Type.STRING, description: "The name of the topic." },
                    comment: { type: Type.STRING, description: "A brief, encouraging comment about their performance on this topic."}
                },
                required: ["topic", "comment"]
            }
        },
        weaknessTopics: {
            type: Type.ARRAY,
            description: "A list of topics where the user struggled (e.g., <=50% accuracy) across all quizzes. If none, this can be empty.",
            items: {
                type: Type.OBJECT,
                properties: {
                    topic: { type: Type.STRING, description: "The name of the topic." },
                    comment: { type: Type.STRING, description: "A brief comment explaining why this is a weakness (e.g., 'You missed several questions about this across multiple sessions')."},
                    suggestedQuestionCount: { type: Type.INTEGER, description: "A suggested number of questions (e.g., 5 or 10) for a focused practice quiz on this topic." },
                    youtubeSearchQuery: { type: Type.STRING, description: "A concise, effective search query for finding educational YouTube videos about this topic (e.g., 'introduction to cellular respiration' or 'photosynthesis explained for beginners')." }
                },
                required: ["topic", "comment", "suggestedQuestionCount", "youtubeSearchQuery"]
            }
        },
        narrowPasses: {
            type: Type.ARRAY,
            description: "A list of specific questions FROM THE MOST RECENT QUIZ where the user was partially correct or their answer was accepted but not ideal (e.g., partial points awarded, or AI feedback provided on a correct answer). Do not include items from past quizzes. This is for reviewing shaky knowledge from the last session.",
            items: {
                type: Type.OBJECT,
                properties: {
                    topic: { type: Type.STRING, description: "The topic of the question." },
                    questionText: { type: Type.STRING, description: "The text of the question they narrowly passed." },
                    userAnswerText: { type: Type.STRING, description: "The answer the user provided." },
                    comment: { type: Type.STRING, description: "The AI's original feedback comment on why it was a narrow pass." }
                },
                required: ["topic", "questionText", "userAnswerText", "comment"]
            }
        },
        recommendation: {
            type: Type.STRING,
            description: "A final, actionable recommendation for the user. If there are weaknesses, suggest they create a new custom quiz focusing on those topics."
        }
    },
    required: ["overallSummary", "strengthTopics", "weaknessTopics", "narrowPasses", "recommendation"]
};

export const fibValidationSchema = {
    type: Type.OBJECT,
    properties: {
        status: {
            type: Type.STRING,
            description: "The status of the user's answer.",
            enum: ['CORRECT', 'PARTIAL', 'INCORRECT']
        },
        pointsAwarded: {
            type: Type.INTEGER,
            description: "The number of points to award. 10 for CORRECT, 5 for PARTIAL, 0 for INCORRECT."
        },
        comment: {
            type: Type.STRING,
            description: "A very brief explanation for the decision. For example, 'Correct, this is the singular form.' or 'Partially correct, this is a related concept but not the primary answer.' or 'Incorrect, this is a different concept.'"
        }
    },
    required: ["status", "pointsAwarded", "comment"]
};