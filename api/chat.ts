import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolveYouTube, outputTokenLimit, openRouterAttribution } from '../server/provider';
import { getAuthenticatedUserId, isSameOrigin } from '../server/auth';
import { admitAiRequest } from '../server/quota';
import { modelFor } from '../services/aiConstants';

type VercelRequest = IncomingMessage & { body?: unknown };
type ChatMessage = { role: 'user' | 'assistant'; content: string };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isMessage = (value: unknown): value is ChatMessage => isRecord(value) &&
  (value.role === 'user' || value.role === 'assistant') && typeof value.content === 'string';

export default async function handler(req: VercelRequest, res: ServerResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.writeHead(405).end(); return; }
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
    let body = req.body;
    if (body === undefined) {
      let text = '';
      for await (const chunk of req) {
        text += chunk.toString();
        if (text.length > 500_000) throw new Error('Chat request is too large.');
      }
      body = JSON.parse(text);
    }
    if (!isRecord(body) || typeof body.systemInstruction !== 'string' || body.systemInstruction.length > 250_000 ||
      !Array.isArray(body.messages) || body.messages.length > 60 || !body.messages.every(isMessage) ||
      JSON.stringify(body).length > 500_000) throw new Error('Invalid chat request.');
    if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured.');
    const sourceLines = [...body.systemInstruction.matchAll(/Source YouTube URLs Used:\*\* ([^\n]+)/g)];
    const videoUrls = sourceLines.flatMap(match => match[1].match(/https?:\/\/[^\s,]+/g) ?? []);
    if (videoUrls.length > 3) throw new Error('Chat supports at most three video sources.');
    let maxTokens: number;
    try { maxTokens = outputTokenLimit(); }
    catch { res.writeHead(503).end('AI output limit is not configured.'); return; }
    let admitted: boolean;
    try { admitted = await admitAiRequest(userId, 1 + videoUrls.length); }
    catch { res.writeHead(503).end('AI quotas are unavailable.'); return; }
    if (!admitted) {
      res.writeHead(429, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Daily AI limit reached. Try again after the UTC reset.' }));
      return;
    }
    const verifiedVideos = videoUrls.length ? await resolveYouTube(videoUrls.map(url => ({ text: `[Content from YouTube video: ${url}]` }))) : [];
    const verifiedContext = verifiedVideos.map(part => 'text' in part ? part.text : '').join('\n');
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, ...openRouterAttribution },
      body: JSON.stringify({
        model: modelFor.chat, stream: true, max_tokens: maxTokens,
        messages: [{ role: 'system', content: `${body.systemInstruction}\n${verifiedContext}` }, ...body.messages],
      }),
    });
    if (!upstream.ok || !upstream.body) throw new Error(`OpenRouter chat failed (${upstream.status}).`);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.flushHeaders();
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        const data: unknown = JSON.parse(payload);
        if (isRecord(data) && isRecord(data.error)) throw new Error('OpenRouter interrupted the chat stream.');
        if (!isRecord(data) || !Array.isArray(data.choices) || !isRecord(data.choices[0]) || !isRecord(data.choices[0].delta)) continue;
        const content = data.choices[0].delta.content;
        if (typeof content === 'string') res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
      }
      if (done) break;
    }
    res.end();
  } catch (error) {
    console.error('Chat request failed:', error);
    const message = error instanceof Error ? error.message : 'Chat failed.';
    if (res.headersSent) {
      res.end(`data: ${JSON.stringify({ error: message })}\n\n`);
    } else {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: message }));
    }
  }
}
