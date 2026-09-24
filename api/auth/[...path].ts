import type { IncomingMessage, ServerResponse } from 'node:http';
import { toNodeHandler } from 'better-auth/node';
import { getAuth } from '../../server/auth';

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  try {
    await toNodeHandler(getAuth())(req, res);
  } catch {
    console.error('Auth request failed.');
    if (!res.headersSent) {
      res.statusCode = 503;
      res.end('Authentication is unavailable.');
    } else {
      res.end();
    }
  }
}
