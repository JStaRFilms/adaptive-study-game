import { betterAuth } from 'better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { IncomingMessage } from 'node:http';
import { getDatabasePool } from './database';

export function getAuthMethods() {
  return {
    password: process.env.AUTH_DEV_PASSWORD_ENABLED === 'true' && process.env.NODE_ENV === 'development' && !process.env.VERCEL,
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  };
}

function createAuth() {
  const connectionString = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  const baseURL = process.env.BETTER_AUTH_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  const methods = getAuthMethods();
  if (!connectionString || !baseURL || !secret || (!methods.password && !methods.google)) {
    throw new Error('Better Auth is not configured.');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const socialProviders = clientId && clientSecret ? { google: { clientId, clientSecret } } : {};
  return betterAuth({
    database: getDatabasePool(),
    baseURL,
    secret,
    emailAndPassword: { enabled: methods.password },
    socialProviders,
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  return instance ??= createAuth();
}

export async function getAuthenticatedUserId(req: IncomingMessage): Promise<string | null> {
  const session = await getAuth().api.getSession({ headers: fromNodeHeaders(req.headers) });
  return session?.user?.id ?? null;
}

export function isSameOrigin(req: IncomingMessage): boolean {
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!baseURL || typeof req.headers.origin !== 'string') return false;
  return req.headers.origin === new URL(baseURL).origin;
}
