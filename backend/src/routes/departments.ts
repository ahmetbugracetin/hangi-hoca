import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// ---------- GET / ----------

router.get('/', async (_req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            instructors: true,
            courses: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      university: dept.university,
      instructorCount: dept._count.instructors,
      courseCount: dept._count.courses,
    }));

    return res.json(result);
  } catch (error) {
    console.error('Bölümler listeleme hatası:', error);
    return res.status(500).json({ error: 'Bölümler listelenirken bir hata oluştu' });
  }
});

export default router;
