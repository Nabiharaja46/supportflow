import { Router } from 'express';
import Ticket from '../models/Ticket.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('agent'));

/**
 * GET /api/stats  (agent only)
 * Live-computed ticket statistics — no caching, computed on every request
 * by querying the Ticket collection directly.
 */
router.get('/', async (req, res, next) => {
  try {
    const [total, byStatus, byPriority, priorityNull] = await Promise.all([
      Ticket.countDocuments({}),
      Ticket.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Ticket.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Ticket.countDocuments({ priority: null }),
    ]);

        const statusCounts = { New: 0, Assigned: 0, 'In Progress': 0, Resolved: 0 };
    for (const s of byStatus) {
      if (s._id && Object.prototype.hasOwnProperty.call(statusCounts, s._id)) {
        statusCounts[s._id] = s.count;
      }
    }

    const priorityCounts = { Low: 0, Medium: 0, High: 0 };
    for (const p of byPriority) {
      if (p._id && Object.prototype.hasOwnProperty.call(priorityCounts, p._id)) {
        priorityCounts[p._id] = p.count;
      }
    }

    res.json({
      total,
      byStatus: statusCounts,
      byPriority: priorityCounts,
      priorityUnset: priorityNull,
    });
  } catch (err) {
    next(err);
  }
});

export default router;