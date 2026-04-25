import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { sendVerificationEmail } from '../lib/mailer';
import { validate } from '../middleware/validate';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// ---------- Zod Schemas ----------

const registerSchema = z.object({
  email: z
    .string()
    .email('Geçerli bir email adresi giriniz')
    .refine((e) => e.endsWith('@metu.edu.tr'), {
      message: 'Sadece @metu.edu.tr uzantılı emailler kabul edilmektedir',
    }),
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .max(128, 'Şifre en fazla 128 karakter olabilir'),
});

const loginSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
  password: z.string().min(1, 'Şifre gereklidir'),
});

// ---------- POST /register ----------

router.post('/register', validate(registerSchema), async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Bu email adresi zaten kayıtlı' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomUUID();

    let autoVerify = false;
    try {
      await sendVerificationEmail(email, verifyToken);
    } catch (mailErr) {
      console.warn('Mail gönderilemedi, kullanıcı otomatik doğrulanacak:', mailErr);
      autoVerify = true;
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        verifyToken: autoVerify ? null : verifyToken,
        isVerified: autoVerify,
      },
    });

    return res.status(201).json({
      message: autoVerify
        ? 'Kayıt başarılı. Hemen giriş yapabilirsiniz.'
        : 'Kayıt başarılı. Lütfen email adresinizi doğrulayın.',
      userId: user.id,
      autoVerified: autoVerify,
    });
  } catch (error) {
    console.error('Kayıt hatası:', error);
    return res.status(500).json({ error: 'Kayıt sırasında bir hata oluştu' });
  }
});

// ---------- POST /verify/:token ----------

router.post('/verify/:token', async (req, res: Response) => {
  try {
    const { token } = req.params;

    const user = await prisma.user.findFirst({
      where: { verifyToken: token },
    });

    if (!user) {
      return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş doğrulama bağlantısı' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Bu hesap zaten doğrulanmış' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verifyToken: null,
      },
    });

    return res.json({ message: 'Email başarıyla doğrulandı. Artık giriş yapabilirsiniz.' });
  } catch (error) {
    console.error('Doğrulama hatası:', error);
    return res.status(500).json({ error: 'Doğrulama sırasında bir hata oluştu' });
  }
});

// ---------- POST /login ----------

router.post('/login', validate(loginSchema), async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Lütfen önce email adresinizi doğrulayın' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Giriş hatası:', error);
    return res.status(500).json({ error: 'Giriş sırasında bir hata oluştu' });
  }
});

// ---------- GET /me ----------

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Kullanıcı bilgisi hatası:', error);
    return res.status(500).json({ error: 'Kullanıcı bilgisi alınırken bir hata oluştu' });
  }
});

export default router;
