import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    const env = loadEnv(mode, '.', '');
    for (const name of ['OPENROUTER_API_KEY', 'GEMINI_API_KEY', 'DATABASE_URL', 'DATABASE_URL_POOLED', 'BETTER_AUTH_URL', 'BETTER_AUTH_SECRET', 'AUTH_DEV_PASSWORD_ENABLED', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'AI_DAILY_USER_UNITS', 'AI_DAILY_GLOBAL_UNITS', 'AI_MAX_OUTPUT_TOKENS']) {
      if (env[name] && !process.env[name]) process.env[name] = env[name];
    }
  }
  return {
    plugins: command === 'serve' ? [{
      name: 'local-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/api/auth/')) return next();
          try {
            const { default: handler } = await server.ssrLoadModule('/api/auth/[...path].ts');
            await handler(req, res);
          } catch (error) {
            next(error);
          }
        });
        for (const route of ['ai', 'chat', 'auth-options']) {
          server.middlewares.use(`/api/${route}`, async (req, res, next) => {
            try {
              const { default: handler } = await server.ssrLoadModule(`/api/${route}.ts`);
              await handler(req, res);
            } catch (error) {
              next(error);
            }
          });
        }
      },
    }] : [],
    resolve: {
      alias: { '@': path.resolve(__dirname, '.') },
    },
  };
});
