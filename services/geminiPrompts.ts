import { KnowledgeSource, StudyMode, PromptPart, OpenEndedQuestion, Question } from '../types';

export const getQuizSystemInstruction = (numberOfQuestions: number, knowledgeSource: KnowledgeSource, mode: StudyMode, topics?: string[]): string => {
    let baseInstruction = '';
    
    if (mode === StudyMode.EXAM) {
        baseInstruction = `You are an expert educator. Your task is to create a high-quality, open-ended exam based on the user's materials.
- Create exactly ${numberOfQuestions} questions.
- Questions must be thought-provoking, requiring detailed, paragraph-length answers.
- Test deep understanding of key concepts from the provided materials.
- Adhere strictly to the provided JSON schema.
- For EVERY question, the 'questionType' must be 'OPEN_ENDED'.
- For EVERY question, provide a detailed 'explanation' that acts as a grading rubric. This rubric must list key points and concepts needed for a complete answer.
- Use markdown for formatting, like **bold** for emphasis.`;
    } else {
        baseInstruction = `You are an expert educator. Your task is to create a high-quality, mixed-type quiz based on the user's materials.
- Create exactly ${numberOfQuestions} questions.
- Include a mix of MULTIPLE_CHOICE, TRUE_FALSE, and FILL_IN_THE_BLANK questions.
- Test key concepts, definitions, and facts from the provided materials.
- Adhere strictly to the provided JSON schema.
- For EVERY question, provide a brief 'explanation' for the correct answer.
- For MULTIPLE_CHOICE questions: Provide exactly 4 options and the 0-based index of the correct one.
- For TRUE_FALSE questions: Provide a statement and its boolean truth value.
- For FILL_IN_THE_BLANK questions: Provide a sentence with '___' for the missing term. Also, provide a generous list of 'acceptableAnswers' including common synonyms, misspellings, and plural/singular variations to avoid penalizing minor errors.
- Use markdown for formatting, like **bold** for emphasis.`;
    }
    
    if (topics && topics.length > 0) {
        baseInstruction += `\n- The quiz must specifically focus on the following topics: ${topics.join(', ')}.`;
    }

    switch (knowledgeSource) {
        case KnowledgeSource.GENERAL:
            baseInstruction += `\n- The user's provided materials define the topic. Use them as the primary source, but also leverage your general knowledge to expand on the topic.`;
            break;
        case KnowledgeSource.WEB_SEARCH:
            {
                const schemaDescription = mode === StudyMode.EXAM 
                    ? `- 'questionType': Must be 'OPEN_ENDED'.
- 'questionText': (string) The open-ended question.
- 'explanation': (string) A detailed grading rubric.`
                    : `- 'questionType': (string) One of 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_IN_THE_BLANK'.
- 'questionText': (string) The question. For FILL_IN_THE_BLANK, it must contain '___'.
- 'explanation': (string) A brief explanation of the correct answer.
- For MULTIPLE_CHOICE: 'options' (array of 4 strings) and 'correctAnswerIndex' (integer).
- For TRUE_FALSE: 'correctAnswerBoolean' (boolean).
- For FILL_IN_THE_BLANK: 'correctAnswerString' (string) and optional 'acceptableAnswers' (array of strings).`;

                baseInstruction += `\n\nYour response MUST be a single markdown JSON code block. Do not include any text outside of this block. The JSON object must have a 'questions' key, which is an array of question objects. Each question object must have these keys:
${schemaDescription}
- Use markdown for formatting within string values, like **bold** for emphasis.`;
            }
            break;
        case KnowledgeSource.NOTES_ONLY:
        default:
            baseInstruction += `\n- Base the quiz STRICTLY on the provided study materials.`;
            break;
    }
    
    baseInstruction += `\n\nThe user's study materials (text, images, audio transcriptions) are provided in the user prompt.`;
    return baseInstruction;
};


export const getTopicsInstruction = (): string => {
    return "You are an expert at analyzing text and identifying key themes. Based on the provided study materials (which can include text and images), identify the main topics or subjects discussed. Your response must be a JSON object containing a single key 'topics' which is an array of strings. Each string should be a concise topic name (e.g., 'Cellular Respiration', 'The Krebs Cycle', 'World War II Causes').";
};


export const getGradingSystemInstruction = (questions: Question[]): string => {
    const questionsAndRubrics = questions.map((q, i) => {
        return `
### Question ${i + 1} (index ${i})
**Question Text:**
${(q as OpenEndedQuestion).questionText}

**Grading Rubric:**
${(q as OpenEndedQuestion).explanation}
---
`;
    }).join('\n');

    return `You are an impartial and expert grader. A user has completed an exam. The user's full submission is provided, containing both typed text and images of handwritten work.

Your task is to grade EACH question listed below. Your response must be a JSON object matching the required schema.

**GRADING PROCEDURE:**
For each question from index 0 to ${questions.length - 1}, you must perform the following steps:
1.  **Locate Answer:** Carefully analyze the ENTIRE user submission (all text and all images) to find the specific answer corresponding to the current question number.
2.  **Validate Answer:**
    - If you cannot find any answer for the question, assign a score of 0.
    - If the located answer is merely a copy or slight rephrasing of the question text itself, assign a score of 0.
    - If the answer is nonsensical or irrelevant, assign a score of 0.
3.  **Grade Valid Answer:** If a valid answer is found, grade it against the provided rubric on a scale from 0 to 10.
4.  **Provide Feedback:** For every question, provide constructive feedback explaining your score. If the score is 0 due to an invalid answer, state that clearly.

**CRITICAL:** You MUST provide a grade entry for EVERY question.

<hr>
## Questions and Rubrics to Grade
${questionsAndRubrics}
`;
};

export const getPredictionSystemInstruction = (): string => {
    return `You are an expert educational analyst and predictor. Your task is to embody a specific teacher and predict likely exam questions based on a comprehensive set of materials. Analyze the teacher's persona, past questions, and other provided documents to make the most accurate predictions possible. The predictions should be insightful and challenging, suitable for a final exam.`;
};

export const getPredictionUserPromptParts = (data: any): PromptPart[] => {
    const { teacherName, persona, hints, coreNotesParts, pastQuestionsParts, pastTestsParts, otherMaterialsParts, numPredictions } = data;
    
    const promptParts: PromptPart[] = [];

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

    return promptParts;
};