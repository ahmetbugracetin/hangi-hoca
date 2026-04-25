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
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (department) {
      where.department = { code: department };
    }

    const [instructors, total] = await Promise.all([
      prisma.instructor.findMany({
        where,
        skip,
        take: limit,
        include: {
          department: true,
          reviews: {
            select: {
              clarity: true,
              fairness: true,
              workload: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.instructor.count({ where }),
    ]);

    const result = instructors.map((inst) => {
      const rc = inst.reviews.length;

      const avgClarity = rc > 0
        ? inst.reviews.reduce((s, r) => s + r.clarity, 0) / rc
        : null;
      const avgFairness = rc > 0
        ? inst.reviews.reduce((s, r) => s + r.fairness, 0) / rc
        : null;
      const avgWorkload = rc > 0
        ? inst.reviews.reduce((s, r) => s + r.workload, 0) / rc
        : null;
      const avgOverall =
        avgClarity !== null && avgFairness !== null && avgWorkload !== null
          ? (avgClarity + avgFairness + avgWorkload) / 3
          : null;

      return {
        id: inst.id,
        name: inst.name,
        title: inst.title,
        email: inst.email,
        photoUrl: inst.photoUrl,
        avesisUrl: inst.avesisUrl,
        slug: inst.slug,
        departmentId: inst.departmentId,
        department: inst.department,
        createdAt: inst.createdAt,
        updatedAt: inst.updatedAt,
        reviewCount: rc,
        avgClarity: avgClarity !== null ? Math.round(avgClarity * 100) / 100 : null,
        avgFairness: avgFairness !== null ? Math.round(avgFairness * 100) / 100 : null,
        avgWorkload: avgWorkload !== null ? Math.round(avgWorkload * 100) / 100 : null,
        avgOverall: avgOverall !== null ? Math.round(avgOverall * 100) / 100 : null,
      };
    });

    // Sort so names starting with the search term appear first
    if (search) {
      const q = search.toLowerCase();
      result.sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q);
        const bStarts = b.name.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.localeCompare(b.name, 'tr');
      });
    }

    return res.json({
      data: result,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Eğitmenler listeleme hatası:', error);
    return res.status(500).json({ error: 'Eğitmenler listelenirken bir hata oluştu' });
  }
});

// ---------- GET /:slug ----------

router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug);

    const instructor = await prisma.instructor.findUnique({
      where: { slug },
      include: {
        department: true,
        sections: {
          include: { course: true },
        },
        reviews: {
          include: { course: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!instructor) {
      return res.status(404).json({ error: 'Eğitmen bulunamadı' });
    }

    const rc = instructor.reviews.length;

    const avgClarity = rc > 0
      ? instructor.reviews.reduce((s, r) => s + r.clarity, 0) / rc
      : null;
    const avgFairness = rc > 0
      ? instructor.reviews.reduce((s, r) => s + r.fairness, 0) / rc
      : null;
    const avgWorkload = rc > 0
      ? instructor.reviews.reduce((s, r) => s + r.workload, 0) / rc
      : null;
    const avgOverall =
      avgClarity !== null && avgFairness !== null && avgWorkload !== null
        ? (avgClarity + avgFairness + avgWorkload) / 3
        : null;

    const wouldRetakeCount = instructor.reviews.filter((r) => r.wouldRetake).length;
    const wouldRetakePercentage = rc > 0 ? Math.round((wouldRetakeCount / rc) * 100) : null;

    const attendanceCount = instructor.reviews.filter((r) => r.attendance).length;
    const attendancePercentage = rc > 0 ? Math.round((attendanceCount / rc) * 100) : null;

    const recentReviews = instructor.reviews.slice(0, 5).map((review) => ({
      id: review.id,
      course: review.course,
      semester: review.semester,
      clarity: review.clarity,
      fairness: review.fairness,
      workload: review.workload,
      attendance: review.attendance,
      wouldRetake: review.wouldRetake,
      comment: review.comment,
      upvotes: review.upvotes,
      downvotes: review.downvotes,
      isAnonymous: review.isAnonymous,
      createdAt: review.createdAt,
    }));

    return res.json({
      id: instructor.id,
      name: instructor.name,
      title: instructor.title,
      email: instructor.email,
      photoUrl: instructor.photoUrl,
      avesisUrl: instructor.avesisUrl,
      slug: instructor.slug,
      departmentId: instructor.departmentId,
      department: instructor.department,
      sections: instructor.sections,
      createdAt: instructor.createdAt,
      updatedAt: instructor.updatedAt,
      reviewCount: rc,
      avgClarity: avgClarity !== null ? Math.round(avgClarity * 100) / 100 : null,
      avgFairness: avgFairness !== null ? Math.round(avgFairness * 100) / 100 : null,
      avgWorkload: avgWorkload !== null ? Math.round(avgWorkload * 100) / 100 : null,
      avgOverall: avgOverall !== null ? Math.round(avgOverall * 100) / 100 : null,
      wouldRetakePercentage,
      attendancePercentage,
      recentReviews,
    });
  } catch (error) {
    console.error('Eğitmen detay hatası:', error);
    return res.status(500).json({ error: 'Eğitmen bilgisi alınırken bir hata oluştu' });
  }
});

// ---------- GET /:slug/reviews ----------

router.get('/:slug/reviews', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug);
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const skip = (page - 1) * limit;

    const instructor = await prisma.instructor.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!instructor) {
      return res.status(404).json({ error: 'Eğitmen bulunamadı' });
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { instructorId: instructor.id },
        include: { course: true },
        orderBy: { upvotes: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: { instructorId: instructor.id } }),
    ]);

    return res.json({
      data: reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Değerlendirmeler listeleme hatası:', error);
    return res.status(500).json({ error: 'Değerlendirmeler listelenirken bir hata oluştu' });
  }
});

export default router;
