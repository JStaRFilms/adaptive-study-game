import type { IncomingMessage, ServerResponse } from 'node:http';
import { getAuthMethods } from '../server/auth';

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.writeHead(405).end(); return; }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(getAuthMethods()));
}
