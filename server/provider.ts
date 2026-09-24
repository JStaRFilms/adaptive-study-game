import { GoogleGenAI, type GenerateContentResponse, type Schema } from '@google/genai';
import type { PromptPart } from '../types';

export interface AiResponse {
  text: string;
  candidates?: GenerateContentResponse['candidates'];
}

type Request = {
  model: string;
  contents: { parts: PromptPart[] };
  config?: {
    systemInstruction?: string;
    responseMimeType?: string;
    responseSchema?: Schema;
    tools?: { googleSearch: Record<string, never> }[];
  };
};

export interface AiClient {
  models: { generateContent(request: Request): Promise<AiResponse> };
}

const geminiKey = () => process.env.GEMINI_API_KEY;

export function outputTokenLimit(): number {
  const value = process.env.AI_MAX_OUTPUT_TOKENS;
  const limit = Number(value);
  if (!value || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(limit) || limit > 16_384) {
    throw new Error('AI_MAX_OUTPUT_TOKENS must be an integer from 1 to 16384.');
  }
  return limit;
}

const youtubeMarker = /\[Content from YouTube video: (https?:\/\/[^\]\s]+)\][^\n]*/g;

// The old app sent a URL as text and asked the model to watch it. Extract video content first.
async function readYouTube(url: string): Promise<string> {
  const parsed = new URL(url);
  if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(parsed.hostname)) {
    throw new Error('Unsupported YouTube URL.');
  }
  const key = geminiKey();
  if (!key) throw new Error('GEMINI_API_KEY is needed to read YouTube videos.');
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      model: 'gemini-3.8-flash',
      input: [
        { type: 'text', text: 'Extract the important facts and concepts from this video for a study guide. Do not invent content.' },
        { type: 'video', uri: url },
      ],
    }),
  });
  if (!response.ok) throw new Error(`YouTube analysis failed (${response.status}).`);
  const result: unknown = await response.json();
  if (!isRecord(result) || typeof result.output_text !== 'string' || !result.output_text.trim()) {
    throw new Error('Gemini returned no content for this YouTube video.');
  }
  return result.output_text;
}

const videoSummaries = new Map<string, { until: number; result: Promise<string> }>();

function videoSummary(url: string): Promise<string> {
  const cached = videoSummaries.get(url);
  if (cached && cached.until > Date.now()) return cached.result;
  const result = readYouTube(url).catch(error => {
    videoSummaries.delete(url);
    throw error;
  });
  const oldest = videoSummaries.keys().next().value;
  if (videoSummaries.size >= 32 && oldest) videoSummaries.delete(oldest);
  videoSummaries.set(url, { until: Date.now() + 30 * 60_000, result });
  return result;
}

export async function resolveYouTube(parts: PromptPart[]): Promise<PromptPart[]> {
  return Promise.all(parts.map(async part => {
    if (!('text' in part)) return part;
    const urls = [...part.text.matchAll(youtubeMarker)].map(match => match[1]);
    if (!urls.length) return part;
    let text = part.text;
    for (const url of urls) {
      const summary = await videoSummary(url);
      text = text.replace(`[Content from YouTube video: ${url}]`, `[Verified content from YouTube video: ${url}]\n${summary}`);
    }
    return { text };
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function jsonSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(jsonSchema);
  if (!isRecord(schema)) return schema;
  const { nullable, ...fields } = schema;
  const result = Object.fromEntries(Object.entries(fields).map(([key, value]) => [
    key, key === 'type' && typeof value === 'string' ? value.toLowerCase() : jsonSchema(value),
  ]));
  if (nullable && typeof result.type === 'string') result.type = [result.type, 'null'];
  return result;
}

export function createAiClient(): AiClient {
  return {
    models: {
      async generateContent({ model, contents, config }: Request): Promise<AiResponse> {
        const maxTokens = outputTokenLimit();
        const parts = await resolveYouTube(contents.parts);
        const geminiOnly = Boolean(config?.tools?.length) || parts.some(part =>
          'inlineData' in part && !part.inlineData.mimeType.startsWith('image/'));
        if (geminiOnly) {
          const key = geminiKey();
          if (!key) throw new Error('GEMINI_API_KEY is needed for audio or grounded search.');
          const ai = new GoogleGenAI({ apiKey: key });
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', contents: { parts },
            config: {
              systemInstruction: config?.systemInstruction,
              responseMimeType: config?.responseMimeType,
              responseSchema: config?.responseSchema,
              tools: config?.tools,
              maxOutputTokens: maxTokens,
            },
          });
          return { text: response.text ?? '', candidates: response.candidates };
        }
        if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured.');
        const content = parts.map(part => 'text' in part
          ? { type: 'text', text: part.text }
          : { type: 'image_url', image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` } });
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            messages: [
              ...(config?.systemInstruction ? [{ role: 'system', content: config.systemInstruction }] : []),
              { role: 'user', content },
            ],
            ...(config?.responseSchema ? { response_format: {
              type: 'json_schema', json_schema: { name: 'study_response', strict: false, schema: jsonSchema(config.responseSchema) },
            } } : {}),
          }),
        });
        if (!response.ok) throw new Error(`OpenRouter request failed (${response.status}).`);
        const result: unknown = await response.json();
        if (!isRecord(result) || !Array.isArray(result.choices) || !isRecord(result.choices[0]) ||
            !isRecord(result.choices[0].message) || typeof result.choices[0].message.content !== 'string') {
          throw new Error('OpenRouter returned an empty or invalid response.');
        }
        return { text: result.choices[0].message.content };
      },
    },
  };
}
