import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// ---------- Zod Schemas ----------

const createReviewSchema = z.object({
  instructorId: z.number().int().positive('Geçerli bir eğitmen seçiniz'),
  courseId: z.number().int().positive('Geçerli bir ders seçiniz'),
  semester: z.string().min(1, 'Dönem bilgisi gereklidir'),
  clarity: z.number().int().min(1, 'En az 1 olmalıdır').max(5, 'En fazla 5 olabilir'),
  fairness: z.number().int().min(1, 'En az 1 olmalıdır').max(5, 'En fazla 5 olabilir'),
  workload: z.number().int().min(1, 'En az 1 olmalıdır').max(5, 'En fazla 5 olabilir'),
  attendance: z.boolean(),
  wouldRetake: z.boolean(),
  comment: z
    .string()
    .min(50, 'Yorum en az 50 karakter olmalıdır')
    .max(1000, 'Yorum en fazla 1000 karakter olabilir'),
  isAnonymous: z.boolean().optional().default(true),
});

const voteSchema = z.object({
  type: z.enum(['up', 'down'], {
    errorMap: () => ({ message: 'Oy türü "up" veya "down" olmalıdır' }),
  }),
});

// ---------- POST / ----------

router.post(
  '/',
  authMiddleware,
  validate(createReviewSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).userId!;

      // Check if user is verified
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isVerified: true },
      });

      if (!user || !user.isVerified) {
        return res.status(403).json({
          error: 'Değerlendirme yapabilmek için email adresinizi doğrulamanız gerekiyor',
        });
      }

      const {
        instructorId,
        courseId,
        semester,
        clarity,
        fairness,
        workload,
        attendance,
        wouldRetake,
        comment,
        isAnonymous,
      } = req.body;

      // Check if instructor exists
      const instructor = await prisma.instructor.findUnique({
        where: { id: instructorId },
      });
      if (!instructor) {
        return res.status(404).json({ error: 'Eğitmen bulunamadı' });
      }

      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });
      if (!course) {
        return res.status(404).json({ error: 'Ders bulunamadı' });
      }

      // Check unique constraint: userId + instructorId + courseId + semester
      const existingReview = await prisma.review.findUnique({
        where: {
          userId_instructorId_courseId_semester: {
            userId,
            instructorId,
            courseId,
            semester,
          },
        },
      });

      if (existingReview) {
        return res.status(409).json({
          error: 'Bu ders ve dönem için zaten bir değerlendirme yapmışsınız',
        });
      }

      const review = await prisma.review.create({
        data: {
          instructorId,
          courseId,
          userId,
          semester,
          clarity,
          fairness,
          workload,
          attendance,
          wouldRetake,
          comment,
          isAnonymous,
        },
        include: {
          course: true,
          instructor: {
            select: { id: true, name: true, slug: true },
          },
        },
      });

      return res.status(201).json(review);
    } catch (error) {
      console.error('Değerlendirme oluşturma hatası:', error);
      return res.status(500).json({ error: 'Değerlendirme oluşturulurken bir hata oluştu' });
    }
  }
);

// ---------- POST /:id/vote ----------

router.post(
  '/:id/vote',
  authMiddleware,
  validate(voteSchema),
  async (req: Request, res: Response) => {
    try {
      const reviewId = parseInt(String(req.params.id), 10);
      if (isNaN(reviewId)) {
        return res.status(400).json({ error: 'Geçersiz değerlendirme kimliği' });
      }

      const review = await prisma.review.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        return res.status(404).json({ error: 'Değerlendirme bulunamadı' });
      }

      const { type } = req.body;

      const updatedReview = await prisma.review.update({
        where: { id: reviewId },
        data: {
          upvotes: type === 'up' ? { increment: 1 } : undefined,
          downvotes: type === 'down' ? { increment: 1 } : undefined,
        },
      });

      return res.json({
        upvotes: updatedReview.upvotes,
        downvotes: updatedReview.downvotes,
      });
    } catch (error) {
      console.error('Oylama hatası:', error);
      return res.status(500).json({ error: 'Oylama sırasında bir hata oluştu' });
    }
  }
);

// ---------- DELETE /:id ----------

router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const reviewId = parseInt(String(req.params.id), 10);
    if (isNaN(reviewId)) {
      return res.status(400).json({ error: 'Geçersiz değerlendirme kimliği' });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({ error: 'Değerlendirme bulunamadı' });
    }

    if (review.userId !== userId) {
      return res.status(403).json({ error: 'Sadece kendi değerlendirmenizi silebilirsiniz' });
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    return res.json({ message: 'Değerlendirme başarıyla silindi' });
  } catch (error) {
    console.error('Değerlendirme silme hatası:', error);
    return res.status(500).json({ error: 'Değerlendirme silinirken bir hata oluştu' });
  }
});

export default router;
