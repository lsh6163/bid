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

const distDir = path.resolve(__dirname, '../dist');
const indexHtml = path.join(distDir, 'index.html');
if (fs.existsSync(indexHtml)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(indexHtml);
  });
}

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
  if (!fs.existsSync(indexHtml)) {
    console.warn('dist/index.html이 없습니다. Render Build Command에 npm run build가 있는지 확인하세요.');
  }
  app.listen(port, '0.0.0.0', () => {
    console.log(`API server listening on port ${port}`);
  });
}

main().catch((err) => {
  console.error('서버 기동 실패:', err instanceof Error ? err.message : err);
  process.exit(1);
});
