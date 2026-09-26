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

test('chat keeps the latest 29 exchanges so later requests stay within the 60-message limit', async () => {
  const originalFetch = globalThis.fetch;
  const requests: { role: string; content: string }[][] = [];
  globalThis.fetch = async (_input, init) => {
    const body: unknown = JSON.parse(String(init?.body));
    assert.ok(body && typeof body === 'object' && 'messages' in body && Array.isArray(body.messages));
    requests.push(body.messages);
    return new Response('data: {"text":"ok"}\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  };
  try {
    const chat = new ChatSession('Study coach');
    for (let turn = 1; turn <= 31; turn++) {
      for await (const _chunk of chat.sendMessageStream({ message: `turn ${turn}` })) { /* consume reply */ }
    }
    assert.equal(requests.length, 31);
    assert.ok(requests.every(messages => messages.length <= 60));
    assert.equal(requests[30].length, 59);
    assert.equal(requests[30][0].content, 'turn 2');
    assert.equal(requests[30].at(-1)?.content, 'turn 31');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('resumed chat sends previously visible turns to the model', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), {
      systemInstruction: 'Study coach',
      messages: [
        { role: 'assistant', content: 'Hello' },
        { role: 'user', content: 'Earlier question' },
        { role: 'assistant', content: 'Earlier answer' },
        { role: 'user', content: 'Follow-up' },
      ],
    });
    return new Response('data: {"text":"New answer"}\n\n');
  };
  try {
    const chat = new ChatSession('Study coach', [
      { role: 'model', text: 'Hello' },
      { role: 'user', text: 'Earlier question' },
      { role: 'model', text: 'Earlier answer' },
    ]);
    for await (const _chunk of chat.sendMessageStream({ message: 'Follow-up' })) { /* consume reply */ }
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
