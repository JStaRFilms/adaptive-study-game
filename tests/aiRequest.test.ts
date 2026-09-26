import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildReadingLayoutInParallel, identifyCoreConcepts } from '../services/geminiService';
import { ChatSession } from '../services/chat';

test('optional analysis and streaming arguments are omitted instead of serialized as null', async () => {
  const originalFetch = globalThis.fetch;
  const requests: unknown[] = [];
  globalThis.fetch = async (_input, init) => {
    requests.push(JSON.parse(String(init?.body)));
    return requests.length === 1
      ? Response.json(['Literacy'])
      : new Response('data: {"result":{"blocks":[]}}\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  };
  try {
    assert.deepEqual(await identifyCoreConcepts([{ text: 'Extracted PDF text' }]), ['Literacy']);
    await buildReadingLayoutInParallel([{ text: 'Extracted PDF text' }], () => {});
    assert.deepEqual(requests, [
      { action: 'identifyCoreConcepts', args: [[{ text: 'Extracted PDF text' }]] },
      { action: 'buildReadingLayoutInParallel', args: [[{ text: 'Extracted PDF text' }]] },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AI and chat callers show the quota message from JSON 429 responses', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json(
    { error: 'Daily AI limit reached. Try again after the UTC reset.' },
    { status: 429 },
  );
  try {
    await assert.rejects(identifyCoreConcepts([{ text: 'Notes' }]), /Daily AI limit reached/);
    await assert.rejects(buildReadingLayoutInParallel([{ text: 'Notes' }], () => {}), /Daily AI limit reached/);
    await assert.rejects(new ChatSession('Study coach').sendMessageStream({ message: 'Help' }).next(), /Daily AI limit reached/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AI calls show the message from older plain-text quota responses', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('Daily AI limit reached.', { status: 429 });
  try {
    await assert.rejects(identifyCoreConcepts([{ text: 'Notes' }]), { message: 'Daily AI limit reached.' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
