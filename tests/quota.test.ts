import assert from 'node:assert/strict';
import { test } from 'node:test';
import { admitAiRequest } from '../server/quota';

test('missing or invalid quota limits fail before any database connection', async () => {
  process.env.AI_DAILY_USER_UNITS = '';
  process.env.AI_DAILY_GLOBAL_UNITS = '';
  await assert.rejects(admitAiRequest('user-1', 1), /AI_DAILY_USER_UNITS must be a positive integer/);
  process.env.AI_DAILY_USER_UNITS = 'not-a-number';
  await assert.rejects(admitAiRequest('user-1', 1), /AI_DAILY_USER_UNITS must be a positive integer/);
});
