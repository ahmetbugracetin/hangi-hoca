import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// ---------- GET / ----------

router.get('/', async (_req: Request, res: Response) => {
  try {
    const [totalInstructors, totalReviews, totalDepartments, totalCourses, ratingAgg] =
      await Promise.all([
        prisma.instructor.count(),
        prisma.review.count(),
        prisma.department.count(),
        prisma.course.count(),
        prisma.review.aggregate({
          _avg: {
            clarity: true,
            fairness: true,
            workload: true,
          },
        }),
      ]);

    const avgClarity = ratingAgg._avg.clarity;
    const avgFairness = ratingAgg._avg.fairness;
    const avgWorkload = ratingAgg._avg.workload;

    const avgOverall =
      avgClarity !== null && avgFairness !== null && avgWorkload !== null
        ? Math.round(((avgClarity + avgFairness + avgWorkload) / 3) * 100) / 100
        : null;

    return res.json({
      totalInstructors,
      totalReviews,
      totalDepartments,
      totalCourses,
      avgOverall,
    });
  } catch (error) {
    console.error('İstatistik hatası:', error);
    return res.status(500).json({ error: 'İstatistikler alınırken bir hata oluştu' });
  }
});

export default router;
