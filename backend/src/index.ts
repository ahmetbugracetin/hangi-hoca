import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// @ts-ignore — xss-clean has no type declarations
import xssClean from 'xss-clean';

import authRoutes from './routes/auth';
import instructorRoutes from './routes/instructors';
import courseRoutes from './routes/courses';
import reviewRoutes from './routes/reviews';
import departmentRoutes from './routes/departments';
import statsRoutes from './routes/stats';

const app = express();
const PORT = process.env.PORT || 4000;

// ---------- Global Middleware ----------

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(helmet());
app.use(express.json());
app.use(xssClean());

// ---------- Rate Limiting for Auth Routes ----------

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Çok fazla istek gönderdiniz. Lütfen bir dakika bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------- Health Check ----------

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------- Routes ----------

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/instructors', instructorRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/stats', statsRoutes);

// ---------- 404 Handler ----------

app.use((_req, res) => {
  res.status(404).json({ error: 'İstenen kaynak bulunamadı' });
});

// ---------- Global Error Handler ----------

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Sunucu hatası:', err);
  res.status(500).json({ error: 'Sunucu hatası oluştu' });
});

// ---------- Start Server ----------

app.listen(PORT, () => {
  console.log(`Hangi Hoca API sunucusu ${PORT} portunda çalışıyor`);
});

export default app;
