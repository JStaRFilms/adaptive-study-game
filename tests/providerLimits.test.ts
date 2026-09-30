import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertYouTubeUrl, createAiClient, resolveYouTube } from '../server/provider';

test('text calls require an output ceiling before contacting a provider', async () => {
  const previousLimit = process.env.AI_MAX_OUTPUT_TOKENS;
  const previousFetch = globalThis.fetch;
  delete process.env.AI_MAX_OUTPUT_TOKENS;
  globalThis.fetch = async () => { throw new Error('A provider must not be contacted.'); };
  try {
    await assert.rejects(
      createAiClient().models.generateContent({ model: 'offline-test', contents: { parts: [{ text: 'hello' }] } }),
      /AI_MAX_OUTPUT_TOKENS must be an integer/,
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousLimit === undefined) delete process.env.AI_MAX_OUTPUT_TOKENS;
    else process.env.AI_MAX_OUTPUT_TOKENS = previousLimit;
  }
});

test('OpenRouter requests include the output ceiling and hidden app attribution', async () => {
  const previousLimit = process.env.AI_MAX_OUTPUT_TOKENS;
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.AI_MAX_OUTPUT_TOKENS = '1024';
  process.env.OPENROUTER_API_KEY = 'offline-test-key';
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    calls++;
    assert.equal(String(input), 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(typeof init?.body, 'string');
    assert.match(init.body, /"max_tokens":1024/);
    const headers = new Headers(init.headers);
    assert.equal(headers.get('HTTP-Referer'), 'https://study.jstarstudios.com/');
    assert.equal(headers.get('X-OpenRouter-Title'), 'JStar Study');
    assert.equal(headers.get('X-OpenRouter-App-Visibility'), 'hidden');
    return Response.json({ choices: [{ message: { content: 'ok' } }] });
  };
  try {
    const response = await createAiClient().models.generateContent({ model: 'offline-test', contents: { parts: [{ text: 'hello' }] } });
    assert.equal(response.text, 'ok');
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousLimit === undefined) delete process.env.AI_MAX_OUTPUT_TOKENS;
    else process.env.AI_MAX_OUTPUT_TOKENS = previousLimit;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test('YouTube summaries are inserted literally and malformed URLs are rejected before provider calls', async () => {
  assert.throws(() => assertYouTubeUrl('https://%'), /Invalid YouTube URL/);
  assert.throws(() => assertYouTubeUrl('https://example.com/video'), /Unsupported YouTube URL/);
  const previousKey = process.env.GEMINI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = 'offline-test-key';
  const url = 'https://www.youtube.com/watch?v=offline-literal';
  globalThis.fetch = async input => {
    assert.equal(String(input), 'https://generativelanguage.googleapis.com/v1beta/interactions');
    return Response.json({ output_text: "Keep $& and $' literal" });
  };
  try {
    const result = await resolveYouTube([{ text: `Review [Content from YouTube video: ${url}] notes` }]);
    assert.deepEqual(result, [{ text: `Review [Verified content from YouTube video: ${url}]\nKeep $& and $' literal notes` }]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});
