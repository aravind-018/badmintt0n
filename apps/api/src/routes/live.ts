import { Router } from 'express';
import { getActiveLiveData } from '../socket';

export const liveRouter = Router();

// GET /api/v1/live — All currently active matches with computed state
liveRouter.get('/', async (_req, res) => {
  try {
    const data = await getActiveLiveData();
    res.json({ matches: data });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch live data', details: err.message });
  }
});
