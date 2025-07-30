
import { KnowledgeSource, StudyMode, PromptPart, OpenEndedQuestion, Question, PredictedQuestion, QuizResult, AnswerLog, StudySet, OpenEndedAnswer, Quiz } from '../types';

export const getQuizSystemInstruction = (numberOfQuestions: number, knowledgeSource: KnowledgeSource, mode: StudyMode, topics?: string[], customInstructions?: string): string => {
    let baseInstruction = '';
    
    if (mode === StudyMode.EXAM) {
        baseInstruction = `You are an expert educator. Your task is to create a high-quality, open-ended exam based on the user's materials.
- Create exactly ${numberOfQuestions} questions.
- Questions must be thought-provoking, requiring detailed, paragraph-length answers.
- Test deep understanding of key concepts from the provided materials.
- Adhere strictly to the provided JSON schema.
- For EVERY question, the 'questionType' must be 'OPEN_ENDED'.
- For EVERY question, provide a detailed 'explanation' that acts as a grading rubric. This rubric must list key points and concepts needed for a complete answer.
- For EVERY question, you MUST include a 'topic' string property. If specific topics were requested, it must be one of them. Otherwise, it should be the most relevant topic from the material.
- Use markdown for formatting, like **bold** for emphasis.`;
    } else {
        baseInstruction = `You are an expert educator. Your task is to create a high-quality, mixed-type quiz based on the user's materials.
- Create exactly ${numberOfQuestions} questions.
- Include a mix of MULTIPLE_CHOICE, TRUE_FALSE, and FILL_IN_THE_BLANK questions.
- Test key concepts, definitions, and facts from the provided materials.
- Adhere strictly to the provided JSON schema.
- For EVERY question, provide a brief 'explanation' for the correct answer.
- For EVERY question, you MUST include a 'topic' string property. If specific topics were requested, it must be one of them. Otherwise, it should be the most relevant topic from the material.
- For MULTIPLE_CHOICE questions: Provide exactly 4 options and the 0-based index of the correct one.
- For TRUE_FALSE questions: Provide a statement and its boolean truth value.
- For FILL_IN_THE_BLANK questions: The 'questionText' can contain multiple '___' placeholders. The 'correctAnswers' property MUST be an array of strings with one answer for each '___', in order. The 'acceptableAnswers' property, if provided, MUST be an array of string arrays, corresponding to each correct answer. Provide a generous list of acceptable answers including common synonyms, misspellings, and plural/singular variations to avoid penalizing minor errors.
- CRITICAL: For FILL_IN_THE_BLANK questions, the answers MUST be common, easily typeable words or numbers. AVOID answers that require special symbols, mathematical notations (e.g., Σ, ε, ∗), or anything not found on a standard keyboard. Use MULTIPLE_CHOICE for concepts that involve such symbols.
- Use markdown for formatting, like **bold** for emphasis.`;
    }
    
    if (customInstructions && customInstructions.trim()) {
        baseInstruction += `\n- MOST IMPORTANT: The user has provided the following specific instructions which you MUST prioritize: "${customInstructions}".`;
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
- 'explanation': (string) A detailed grading rubric.
- 'topic': (string) The main topic of the question.`
                    : `- 'questionType': (string) One of 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_IN_THE_BLANK'.
- 'questionText': (string) The question. For FILL_IN_THE_BLANK, it must contain '___'.
- 'explanation': (string) A brief explanation of the correct answer.
- 'topic': (string) The main topic of the question.
- For MULTIPLE_CHOICE: 'options' (array of 4 strings) and 'correctAnswerIndex' (integer).
- For TRUE_FALSE: 'correctAnswerBoolean' (boolean).
- For FILL_IN_THE_BLANK: 'correctAnswers' (array of strings) and optional 'acceptableAnswers' (array of array of strings).`;

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

export const getStudyGuideInstruction = (question: PredictedQuestion): string => {
    return `You are an expert study assistant. A student has a predicted exam question and needs help preparing for it. Your task is to generate a comprehensive study guide for this single question.

**Predicted Exam question:** "${question.questionText}"
**Topic:** ${question.topic}
**Reasoning for Prediction:** ${question.reasoning}

Based on this, you must generate two things:
1.  **Answer Outline:** A detailed, well-structured answer outline of what a complete, high-scoring answer should include. This should not be a full essay, but a clear roadmap for the student.
    **MARKDOWN RULES:**
    - Use a single asterisk followed by a space for bullet points (e.g., "* Item").
    - Use double asterisks for bold text (e.g., "**Important Concept**").
    - Use single asterisks for italicized text (e.g., "*emphasized term*").
    - Ensure your markdown is clean and correctly formatted.
2.  **YouTube Search Queries:** A list of 2-3 distinct, effective search queries that will help the student find high-quality educational videos on YouTube to understand the underlying concepts.

Your response MUST be a JSON object matching the required schema.`;
};

export const getFeedbackSystemInstruction = (historyForPrompt: string): string => {
    return `You are a friendly and insightful study coach. Your goal is to provide personalized, actionable feedback to a student based on their quiz history for a particular subject.

Analyze the provided quiz data, which is a JSON array of answer logs from MULTIPLE quiz sessions. Each log entry includes a \`quizDate\`. The most recent quiz is the one with the latest \`quizDate\`.

**CRITICAL RULE:** If a user struggled with a topic in the past but answered ALL questions on that same topic correctly (i.e., received maximum points) in their MOST RECENT session, do NOT list it as a weakness or a "close call." Acknowledge their improvement instead, perhaps in the \`overallSummary\` or a \`strengthTopics\` comment. A "close call" should only be reported if it happened in the most recent quiz session.

Look for patterns over time.

Based on your analysis, you MUST generate a response in the specified JSON format. Your feedback should:
1.  **Summarize Performance:** Start with a brief, encouraging overall summary of their performance on this subject across all sessions, noting recent improvements.
2.  **Identify Strengths:** Pinpoint topics where the user has consistently done well (high accuracy).
3.  **Identify Weaknesses:** Pinpoint topics where the user has consistently struggled (low accuracy), UNLESS they mastered it in the most recent session. For each weak topic, you must:
    a. Provide a comment explaining why this is a weakness based on their history.
    b. Suggest a reasonable number of questions for a follow-up quiz.
    c. Generate a concise, effective 'youtubeSearchQuery' to help them find educational videos.
4.  **Identify "Narrow Passes":** Scrutinize the answer log for questions FROM THE MOST RECENT QUIZ where the user was awarded partial points or where \`aiFeedback\` exists. These are "close calls."
5.  **Provide Actionable Advice:** Give a clear, concise recommendation for the user's next step.

Here is the user's performance data, which is provided in the system instruction:
${historyForPrompt}

Now, generate the feedback based on this data, adhering strictly to the JSON schema. The user prompt will be a simple trigger to start.
`;
};

export const getChatSystemInstruction = (studySet: StudySet, quiz: Quiz): string => {
    const quizQuestionText = quiz.questions.map((q, i) => `${i + 1}. ${q.questionText}`).join('\n');
    return `You are an expert AI Study Coach. Your goal is to help a student who is currently taking a quiz. Be encouraging, helpful, and guide them towards the answer without simply giving it away.

The user is studying from a set named "${studySet.name}". The core content for this set is as follows:
---
${studySet.content}
---

The questions in their current quiz are:
---
${quizQuestionText}
---

The user will ask you questions. Their message will include the specific question they are currently looking at. Use all the provided context to give the best possible answer. If they ask for a direct answer, try to guide them with a hint or by explaining a related concept instead. Answer concisely.`;
};

export const getFibValidationSystemInstruction = (questionText: string, correctAnswer: string, userAnswer: string): string => {
    return `You are an AI grading assistant. Your task is to evaluate a user's answer to a fill-in-the-blank question with nuance. The user's answer was not an exact match to the expected answer. You must determine if the user's answer is a valid, semantically correct alternative and award points accordingly.

**Context:**
- Question: "${questionText}"
- Expected Answer for the blank: "${correctAnswer}"
- User's Submitted Answer: "${userAnswer}"

**Evaluation & Scoring Criteria:**
- **CORRECT (10 points):** The user's answer is a correct synonym, a correct plural/singular form, or a typo that doesn't change the meaning. Example: Expected 'words', user says 'a word'.
- **PARTIAL (5 points):** The user's answer is partially correct, related to the topic, but not the best or most precise answer. Example: Expected 'mitosis', user says 'cell division'. It's related but not specific enough.
- **INCORRECT (0 points):** The user's answer is factually incorrect, a different concept, or nonsensical. Example: Expected 'mitochondria', user says 'chloroplast'.

**Output:**
Respond ONLY with a JSON object matching the required schema. Be strict in your evaluation but fair. Provide a brief comment explaining your reasoning.
`;
};