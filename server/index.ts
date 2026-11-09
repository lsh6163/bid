import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { resolveDatabaseUrl } from './databaseUrl.ts';
import { ensureSchema } from './schema.ts';
import { seedIfEmpty } from './seed.ts';
import { authRouter } from './routes/auth.ts';
import { categoriesRouter } from './routes/categories.ts';
import { promptsRouter } from './routes/prompts.ts';
import { helpRouter } from './routes/helpPosts.ts';
import { economicRouter } from './routes/economic.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: false });
}

try {
  resolveDatabaseUrl();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const uploadDir = path.resolve(__dirname, 'data/help-uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/prompts', promptsRouter);
app.use('/api/help-posts', helpRouter);
app.use('/api/economic', economicRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const anyErr = err as { code?: string; message?: string };
  if (anyErr?.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ error: '파일이 20MB를 초과합니다.' });
    return;
  }
  res.status(500).json({ error: anyErr?.message || '서버 오류' });
});

const port = Number(process.env.PORT || 3001);

async function main() {
  await ensureSchema();
  await seedIfEmpty();
  app.listen(port, () => {
    console.log(`API server listening on http://127.0.0.1:${port}`);
  });
}

main().catch((err) => {
  console.error('서버 기동 실패:', err instanceof Error ? err.message : err);
  process.exit(1);
});
