import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { YoutubeUrlUploader } from '../components/setup/StudySetForm';
import { maxVideoSources } from '../services/aiConstants';

const renderVideos = (urls: string[]) => renderToStaticMarkup(createElement(YoutubeUrlUploader, {
  urls,
  onAddUrl: () => {},
  onRemoveUrl: () => {},
}));

test('YouTube uploader stops adding sources at the gateway limit', () => {
  const belowLimit = renderVideos(['https://youtu.be/one', 'https://youtu.be/two']);
  const atLimit = renderVideos(['https://youtu.be/one', 'https://youtu.be/two', 'https://youtu.be/three']);
  assert.equal(maxVideoSources, 3);
  assert.match(belowLimit, /Add URL<\/button>/);
  assert.doesNotMatch(belowLimit, /disabled=""[^>]*>Add URL<\/button>/);
  assert.match(atLimit, /disabled=""[^>]*>Add URL<\/button>/);
  assert.match(atLimit, /id="youtubeUrl"[^>]*disabled=""/);
});

test('older sets with more than three videos show how to recover', () => {
  const html = renderVideos(['one', 'two', 'three', 'four']);
  assert.match(html, /Remove videos until no more than 3 remain before using AI/);
  assert.match(html, /disabled=""[^>]*>Add URL<\/button>/);
});
