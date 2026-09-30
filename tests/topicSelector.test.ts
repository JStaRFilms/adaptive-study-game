import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TopicSelector from '../components/setup/TopicSelector';

const props = {
  activeSet: { id: 'set-1', name: 'Literacy', content: 'Notes', createdAt: '2026-01-01' },
  topics: Array.from({ length: 10 }, (_, index) => `Topic ${index + 1}`),
  isAnalyzingTopics: false,
  isProcessing: false,
  processingError: null,
  progressPercent: 0,
  onBack: () => {},
  onRegenerateTopics: () => {},
  onReanalyzeWithFiles: () => {},
};

test('canvas topic selection starts at eight and disables extra choices', () => {
  const html = renderToStaticMarkup(createElement(TopicSelector, { ...props, flow: 'canvas' }));
  assert.match(html, /8 of 8 topics selected/);
  assert.match(html, /A canvas uses 10 AI units/);
  assert.equal((html.match(/disabled=""/g) ?? []).length, 2);
});

test('quiz topic selection is not limited to eight', () => {
  const html = renderToStaticMarkup(createElement(TopicSelector, { ...props, flow: 'quiz' }));
  assert.match(html, /A quiz uses 1 AI unit total, not 1 per question/);
  assert.doesNotMatch(html, /disabled=""/);
});
