import type { IncomingMessage, ServerResponse } from 'node:http';
import * as ai from '../server/aiService';
import { getAuthenticatedUserId, isSameOrigin } from '../server/auth';
import { admitAiRequest } from '../server/quota';
import { assertYouTubeUrl, outputTokenLimit } from '../server/provider';
import { KnowledgeSource, StudyMode, type OpenEndedAnswer, type PredictedQuestion, type PromptPart, type Question, type QuizConfig, type QuizResult, type ReadingBlock, type ReadingLayout } from '../types';
import { maxVideoSources } from '../services/aiConstants';

type VercelRequest = IncomingMessage & { body?: unknown };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isPart = (value: unknown): value is PromptPart => isRecord(value) && (
  typeof value.text === 'string' || (isRecord(value.inlineData) && typeof value.inlineData.mimeType === 'string' && typeof value.inlineData.data === 'string')
);
const parts = (value: unknown): PromptPart[] => {
  if (!Array.isArray(value) || !value.every(isPart)) throw new Error('Invalid study materials.');
  return value;
};
const isQuizConfig = (value: unknown): value is QuizConfig => isRecord(value) &&
  Number.isInteger(value.numberOfQuestions) && Number(value.numberOfQuestions) >= 1 && Number(value.numberOfQuestions) <= 50 &&
  typeof value.mode === 'string' && Object.values(StudyMode).some(mode => mode === value.mode) &&
  typeof value.knowledgeSource === 'string' && Object.values(KnowledgeSource).some(source => source === value.knowledgeSource);
const text = (value: unknown): string => {
  if (typeof value !== 'string') throw new Error('Invalid text input.');
  return value;
};
const optionalText = (value: unknown): string | undefined => value == null ? undefined : text(value);

async function readBody(req: VercelRequest): Promise<unknown> {
  if (req.body !== undefined) return req.body;
  let body = '';
  for await (const chunk of req) {
    body += chunk.toString();
    if (body.length > 4_000_000) throw new Error('Request is too large.');
  }
  return JSON.parse(body);
}

export default async function handler(req: VercelRequest, res: ServerResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.writeHead(405).end();
    return;
  }
  if (process.env.VERCEL && process.env.AI_API_ENABLED !== 'true') {
    res.writeHead(503).end('AI requests are disabled on this deployment.');
    return;
  }
  if (!isSameOrigin(req)) { res.writeHead(403).end('Invalid request origin.'); return; }
  let userId: string | null;
  try {
    userId = await getAuthenticatedUserId(req);
  } catch {
    res.writeHead(503).end('Authentication is unavailable.');
    return;
  }
  if (!userId) { res.writeHead(401).end('Sign in to use AI.'); return; }
  try {
    const body = await readBody(req);
    if (!isRecord(body) || typeof body.action !== 'string' || !Array.isArray(body.args)) throw new Error('Invalid request.');
    const args: unknown[] = body.args;
    const serializedArgs = JSON.stringify(args);
    if (serializedArgs.length > 4_000_000) throw new Error('Request is too large.');
    const videoUrls = [...serializedArgs.matchAll(/\[Content from YouTube video: (https?:\/\/[^\]\s]+)\]/g)].map(match => match[1]);
    if (videoUrls.length > maxVideoSources) throw new Error(`At most ${maxVideoSources} video sources are allowed.`);
    try {
      videoUrls.forEach(assertYouTubeUrl);
      switch (body.action) {
        case 'buildReadingLayoutInParallel':
          parts(args[0]);
          if (args[1] != null && (!Array.isArray(args[1]) || args[1].length > 8 ||
            !args[1].every(topic => typeof topic === 'string' && topic.length <= 200))) {
            throw new Error('Choose up to 8 focus topics, each 200 characters or fewer.');
          }
          break;
        case 'generateQuiz':
          parts(args[0]);
          if (!isQuizConfig(args[1])) throw new Error('Invalid quiz settings.');
          break;
        case 'identifyCoreConcepts':
          parts(args[0]);
          optionalText(args[1]);
          break;
        case 'summarizeConcept':
          parts(args[0]);
          text(args[1]);
          break;
        case 'reflowLayoutForExpansion':
          if (!isRecord(args[0]) || !Array.isArray(args[0].blocks)) throw new Error('Invalid reading layout.');
          text(args[1]);
          optionalText(args[2]);
          break;
        case 'validateFillInTheBlankAnswer':
          text(args[0]);
          text(args[1]);
          text(args[2]);
          break;
        case 'generatePersonalizedFeedbackStreamed':
          if (!Array.isArray(args[0])) throw new Error('Invalid quiz results.');
          break;
        case 'gradeExam':
          if (!Array.isArray(args[0]) || !isRecord(args[1]) || typeof args[1].text !== 'string') throw new Error('Invalid exam answers.');
          break;
        case 'generateExamPrediction':
          if (!isRecord(args[0]) || !['coreNotesParts', 'pastQuestionsParts', 'pastTestsParts', 'otherMaterialsParts']
            .every(key => Array.isArray(args[0][key]) && args[0][key].every(isPart))) throw new Error('Invalid prediction materials.');
          break;
        case 'generateSubConcepts':
        case 'generateStudyGuideForPrediction':
          if (!isRecord(args[0])) throw new Error('Invalid AI request.');
          break;
        default:
          throw new Error('Unknown AI task.');
      }
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid AI request.' }));
      return;
    }
    const units = (body.action === 'buildReadingLayoutInParallel' ? 10 :
      body.action === 'generatePersonalizedFeedbackStreamed' ? 3 : 1) + videoUrls.length;
    try { outputTokenLimit(); }
    catch { res.writeHead(503).end('AI output limit is not configured.'); return; }
    let admitted: boolean;
    try { admitted = await admitAiRequest(userId, units); }
    catch { res.writeHead(503).end('AI quotas are unavailable.'); return; }
    if (!admitted) {
      res.writeHead(429, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Daily AI limit reached. Try again after the UTC reset.' }));
      return;
    }
    if (body.action === 'buildReadingLayoutInParallel' || body.action === 'generatePersonalizedFeedbackStreamed') {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.flushHeaders();
      const send = (data: unknown) => res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (body.action === 'buildReadingLayoutInParallel') {
        const layout = await ai.buildReadingLayoutInParallel(parts(args[0]), progress => send({ progress }), args[1] as string[] | undefined);
        send({ result: layout });
      } else {
        await ai.generatePersonalizedFeedbackStreamed(args[0] as QuizResult[], partial => send({ feedback: partial }));
      }
      res.end();
      return;
    }
    let result: unknown;
    switch (body.action) {
      case 'generateQuiz':
        if (!isQuizConfig(args[1])) throw new Error('Invalid quiz settings.');
        result = await ai.generateQuiz(parts(args[0]), args[1]);
        break;
      case 'identifyCoreConcepts':
        result = await ai.identifyCoreConcepts(parts(args[0]), optionalText(args[1]));
        break;
      case 'summarizeConcept':
        result = await ai.summarizeConcept(parts(args[0]), text(args[1]));
        break;
      case 'generateSubConcepts':
        result = await ai.generateSubConcepts(args[0] as ReadingBlock);
        break;
      case 'reflowLayoutForExpansion':
        result = await ai.reflowLayoutForExpansion(args[0] as ReadingLayout, text(args[1]), optionalText(args[2]));
        break;
      case 'gradeExam':
        result = await ai.gradeExam(args[0] as Question[], args[1] as OpenEndedAnswer);
        break;
      case 'generateExamPrediction':
        result = await ai.generateExamPrediction(args[0]);
        break;
      case 'generateStudyGuideForPrediction':
        result = await ai.generateStudyGuideForPrediction(args[0] as PredictedQuestion);
        break;
      case 'validateFillInTheBlankAnswer':
        result = await ai.validateFillInTheBlankAnswer(text(args[0]), text(args[1]), text(args[2]));
        break;
      default: throw new Error('Unknown AI task.');
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result ?? null));
  } catch (error) {
    console.error('AI request failed:', error);
    const message = error instanceof Error ? error.message : 'AI request failed.';
    if (res.headersSent) {
      res.end(`data: ${JSON.stringify({ error: message })}\n\n`);
    } else {
      res.statusCode = error instanceof SyntaxError ? 400 : 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: message }));
    }
  }
}
