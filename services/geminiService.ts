import type { AnswerLog, BlockContent, CanvasGenerationProgress, FibValidationResult, OpenEndedAnswer, PersonalizedFeedback, PredictedQuestion, PromptPart, Question, Quiz, QuizConfig, QuizResult, ReadingBlock, ReadingLayout, StudyGuide, SubConcept } from '../types';
import { readApiError } from './apiErrors';

function requestBody(action: string, args: unknown[]): string {
  const includedArgs = [...args];
  while (includedArgs.length && includedArgs[includedArgs.length - 1] === undefined) includedArgs.pop();
  return JSON.stringify({ action, args: includedArgs });
}

async function call<T>(action: string, args: unknown[]): Promise<T> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: requestBody(action, args),
  });
  if (!response.ok) throw await readApiError(response, 'AI request failed');
  const result: unknown = await response.json();
  return result as T;
}

export const generateQuiz = (parts: PromptPart[], config: QuizConfig) => call<Quiz | null>('generateQuiz', [parts, config]);
export const identifyCoreConcepts = (parts: PromptPart[], customPrompt?: string) => call<string[]>('identifyCoreConcepts', [parts, customPrompt]);
export const summarizeConcept = (parts: PromptPart[], title: string) => call<BlockContent>('summarizeConcept', [parts, title]);
export const generateSubConcepts = (block: ReadingBlock) => call<SubConcept[]>('generateSubConcepts', [block]);
export const reflowLayoutForExpansion = (layout: ReadingLayout, id: string, color?: string) => call<ReadingBlock[]>('reflowLayoutForExpansion', [layout, id, color]);
export const gradeExam = (questions: Question[], answer: OpenEndedAnswer) => call<AnswerLog[]>('gradeExam', [questions, answer]);
export const generateExamPrediction = (data: unknown) => call<PredictedQuestion[]>('generateExamPrediction', [data]);
export const generateStudyGuideForPrediction = (question: PredictedQuestion) => call<StudyGuide>('generateStudyGuideForPrediction', [question]);
export const validateFillInTheBlankAnswer = (question: string, correct: string, answer: string) => call<FibValidationResult>('validateFillInTheBlankAnswer', [question, correct, answer]);

async function stream(action: string, args: unknown[], onEvent: (event: Record<string, unknown>) => void): Promise<void> {
  const response = await fetch('/api/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody(action, args),
  });
  if (!response.ok) throw await readApiError(response, 'AI request failed');
  if (!response.body) throw new Error('AI request failed (empty stream).');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      for (const event of events) {
        if (!event.startsWith('data: ')) continue;
        const payload: unknown = JSON.parse(event.slice(6));
        if (!payload || typeof payload !== 'object') continue;
        if ('error' in payload && typeof payload.error === 'string') throw new Error(payload.error);
        onEvent(payload as Record<string, unknown>);
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}

export async function buildReadingLayoutInParallel(parts: PromptPart[], onProgress: (progress: CanvasGenerationProgress) => void, focusTopics?: string[]): Promise<ReadingLayout> {
  let layout: ReadingLayout | undefined;
  await stream('buildReadingLayoutInParallel', [parts, focusTopics], event => {
    if (event.progress && typeof event.progress === 'object') onProgress(event.progress as CanvasGenerationProgress);
    if (event.result && typeof event.result === 'object') layout = event.result as ReadingLayout;
  });
  if (!layout) throw new Error('Canvas generation ended without a layout.');
  return layout;
}

export async function generatePersonalizedFeedbackStreamed(history: QuizResult[], onUpdate: (feedback: Partial<PersonalizedFeedback>) => void): Promise<void> {
  await stream('generatePersonalizedFeedbackStreamed', [history], event => {
    if (event.feedback && typeof event.feedback === 'object') onUpdate(event.feedback as Partial<PersonalizedFeedback>);
  });
}
