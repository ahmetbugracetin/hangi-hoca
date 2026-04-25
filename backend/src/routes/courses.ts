import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// ---------- GET / ----------

router.get('/', async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || '') || undefined;
    const department = String(req.query.department || '') || undefined;
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department) {
      where.department = { code: department };
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        include: { department: true },
        orderBy: { code: 'asc' },
      }),
      prisma.course.count({ where }),
    ]);

    return res.json({
      data: courses,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Dersler listeleme hatası:', error);
    return res.status(500).json({ error: 'Dersler listelenirken bir hata oluştu' });
  }
});

// ---------- GET /:code ----------

router.get('/:code', async (req: Request, res: Response) => {
  try {
    const code = String(req.params.code);

    const course = await prisma.course.findUnique({
      where: { code },
      include: {
        department: true,
        sections: {
          include: {
            instructor: {
              include: { department: true },
            },
          },
        },
        reviews: {
          include: { instructor: true },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'Ders bulunamadı' });
    }

    // Compute per-instructor average ratings for this course
    const instructorRatingsMap = new Map<
      number,
      { clarity: number[]; fairness: number[]; workload: number[]; name: string; slug: string }
    >();

    for (const review of course.reviews) {
      const iId = review.instructorId;
      if (!instructorRatingsMap.has(iId)) {
        instructorRatingsMap.set(iId, {
          clarity: [],
          fairness: [],
          workload: [],
          name: review.instructor.name,
          slug: review.instructor.slug,
        });
      }
      const entry = instructorRatingsMap.get(iId)!;
      entry.clarity.push(review.clarity);
      entry.fairness.push(review.fairness);
      entry.workload.push(review.workload);
    }

    const instructorRatings = Array.from(instructorRatingsMap.entries()).map(
      ([instructorId, data]) => {
        const count = data.clarity.length;
        const avgClarity = data.clarity.reduce((a, b) => a + b, 0) / count;
        const avgFairness = data.fairness.reduce((a, b) => a + b, 0) / count;
        const avgWorkload = data.workload.reduce((a, b) => a + b, 0) / count;
        const avgOverall = (avgClarity + avgFairness + avgWorkload) / 3;

        return {
          instructorId,
          instructorName: data.name,
          instructorSlug: data.slug,
          reviewCount: count,
          avgClarity: Math.round(avgClarity * 100) / 100,
          avgFairness: Math.round(avgFairness * 100) / 100,
          avgWorkload: Math.round(avgWorkload * 100) / 100,
          avgOverall: Math.round(avgOverall * 100) / 100,
        };
      }
    );

    const formattedSections = course.sections.map((section) => ({
      id: section.id,
      semester: section.semester,
      instructor: {
        id: section.instructor.id,
        name: section.instructor.name,
        slug: section.instructor.slug,
        title: section.instructor.title,
        department: section.instructor.department,
      },
    }));

    return res.json({
      id: course.id,
      code: course.code,
      name: course.name,
      credits: course.credits,
      departmentId: course.departmentId,
      department: course.department,
      sections: formattedSections,
      instructorRatings,
    });
  } catch (error) {
    console.error('Ders detay hatası:', error);
    return res.status(500).json({ error: 'Ders bilgisi alınırken bir hata oluştu' });
  }
});

export default router;
