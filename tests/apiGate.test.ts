import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import aiHandler from '../api/ai';
import chatHandler from '../api/chat';

test('AI routes reject cross-site POSTs before auth, quotas or providers', async () => {
  process.env.VERCEL = '';
  process.env.DATABASE_URL = 'postgresql://127.0.0.1:9/unreachable';
  process.env.DATABASE_URL_POOLED = 'postgresql://127.0.0.1:9/unreachable';
  process.env.BETTER_AUTH_URL = 'http://127.0.0.1:5198';
  const server = createServer((req, res) => {
    if (req.url === '/api/ai') void aiHandler(req, res);
    else if (req.url === '/api/chat') void chatHandler(req, res);
    else res.writeHead(404).end();
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  try {
    for (const path of ['/api/ai', '/api/chat']) {
      for (const headers of [{ Origin: 'https://attacker.example' }, {}]) {
        const response = await fetch(`http://127.0.0.1:${address.port}${path}`, { method: 'POST', headers });
        assert.equal(response.status, 403);
      }
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
