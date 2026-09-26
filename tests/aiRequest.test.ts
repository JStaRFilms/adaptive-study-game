import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildReadingLayoutInParallel, identifyCoreConcepts } from '../services/geminiService';

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
