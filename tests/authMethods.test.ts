import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAuthMethods } from '../server/auth';

test('local password login is offered without Google credentials; production never offers it', () => {
  const previous = Object.fromEntries(['VERCEL', 'NODE_ENV', 'AUTH_DEV_PASSWORD_ENABLED', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']
    .map(key => [key, process.env[key]]));
  try {
    process.env.VERCEL = '';
    process.env.NODE_ENV = 'development';
    process.env.AUTH_DEV_PASSWORD_ENABLED = 'true';
    process.env.GOOGLE_CLIENT_ID = '';
    process.env.GOOGLE_CLIENT_SECRET = '';
    assert.deepEqual(getAuthMethods(), { password: true, google: false });
    delete process.env.NODE_ENV;
    assert.deepEqual(getAuthMethods(), { password: false, google: false });
    process.env.NODE_ENV = 'development';
    process.env.AUTH_DEV_PASSWORD_ENABLED = '';
    assert.deepEqual(getAuthMethods(), { password: false, google: false });
    process.env.AUTH_DEV_PASSWORD_ENABLED = 'true';

    process.env.NODE_ENV = 'production';
    assert.deepEqual(getAuthMethods(), { password: false, google: false });
    process.env.NODE_ENV = 'development';
    process.env.VERCEL = '1';
    assert.deepEqual(getAuthMethods(), { password: false, google: false });
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    assert.deepEqual(getAuthMethods(), { password: false, google: false });
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    assert.deepEqual(getAuthMethods(), { password: false, google: true });
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
