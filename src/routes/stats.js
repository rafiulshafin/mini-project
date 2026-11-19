import { Router } from 'express';
import { taskStorage } from '../storage.js';

export const statsRouter = Router();

// GET /api/stats - Productivity metrics & task summaries
statsRouter.get('/', async (req, res, next) => {
  try {
    const stats = await taskStorage.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
});
