import { Router } from 'express';
import { requireAdmin } from '../auth.ts';
import {
  buildIndicatorSummary,
  calculateBidCost,
  dashboardPayload,
  loadDefaultScenario,
  refreshAll,
  saveScenario,
} from '../services/economic.ts';
import { INDICATOR_CATALOG } from '../catalog.ts';

export const economicRouter = Router();

economicRouter.get('/summary', async (_req, res) => {
  try {
    const payload = await dashboardPayload();
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '대시보드 집계 실패' });
  }
});

economicRouter.get('/indicators', async (req, res) => {
  try {
    await refreshAll(false);
    const category = typeof req.query.category === 'string' ? req.query.category : null;
    const items = [];
    for (const c of INDICATOR_CATALOG) {
      if (category && c.category !== category) continue;
      items.push(await buildIndicatorSummary(c.indicatorKey));
    }
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '지표 조회 실패' });
  }
});

economicRouter.get('/indicators/:key', async (req, res) => {
  const summary = await buildIndicatorSummary(req.params.key);
  if (!summary) {
    res.status(404).json({ error: '지표를 찾을 수 없습니다.' });
    return;
  }
  res.json(summary);
});

economicRouter.get('/series', async (req, res) => {
  const keys = String(req.query.keys ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    out[key] = await buildIndicatorSummary(key);
  }
  res.json(out);
});

economicRouter.post('/refresh', requireAdmin, async (_req, res) => {
  const result = await refreshAll(true);
  res.json(result);
});

economicRouter.get('/bid-cost', async (_req, res) => {
  res.json(await loadDefaultScenario());
});

economicRouter.put('/bid-cost', async (req, res) => {
  const saved = await saveScenario(req.body ?? {});
  res.json(saved);
});

economicRouter.post('/bid-cost/calculate', async (req, res) => {
  const payload = await dashboardPayload();
  const scenario = req.body?.weights
    ? {
        ...(await loadDefaultScenario()),
        ...req.body,
        weights: req.body.weights,
      }
    : payload.bidCost.scenario;
  const byKey = Object.fromEntries((payload.indicators || []).filter(Boolean).map((s: { indicatorKey: string }) => [s.indicatorKey, s]));
  const result = calculateBidCost(scenario, byKey, payload.krwEffects);
  res.json(result);
});
