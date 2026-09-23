import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    const env = loadEnv(mode, '.', '');
    process.env.OPENROUTER_API_KEY ||= env.OPENROUTER_API_KEY;
    process.env.GEMINI_API_KEY ||= env.GEMINI_API_KEY;
  }
  return {
    plugins: command === 'serve' ? [{
      name: 'local-api',
      configureServer(server) {
        for (const route of ['ai', 'chat']) {
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
