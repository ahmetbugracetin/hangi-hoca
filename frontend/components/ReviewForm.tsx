'use client';

import { useState } from 'react';
import { Send, Eye, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import RatingStars from '@/components/RatingStars';
import type { Course } from '@/types';

interface ReviewFormProps {
  instructorId: number;
  courses: Course[];
  onSuccess?: () => void;
  className?: string;
}

type SemesterTerm = 'Bahar' | 'Güz';

function getCurrentSemester(date = new Date()): { year: number; term: SemesterTerm } {
  const month = date.getMonth();
  const year = date.getFullYear();

  // January and late summer are closer to the previous/last active major term.
  if (month === 0) {
    return { year: year - 1, term: 'Güz' };
  }
  if (month >= 1 && month <= 6) {
    return { year, term: 'Bahar' };
  }
  if (month >= 7 && month <= 8) {
    return { year, term: 'Bahar' };
  }

  return { year, term: 'Güz' };
}

function buildSemesterOptions(count = 8): string[] {
  const semesters: string[] = [];
  let { year, term } = getCurrentSemester();

  for (let i = 0; i < count; i += 1) {
    semesters.push(`${year} ${term}`);

    if (term === 'Bahar') {
      term = 'Güz';
      year -= 1;
    } else {
      term = 'Bahar';
    }
  }

  return semesters;
}

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

export default function ReviewForm({
  instructorId,
  courses,
  onSuccess,
  className,
}: ReviewFormProps) {
  const semesterOptions = buildSemesterOptions();
  const [courseId, setCourseId] = useState<number | null>(null);
  const [semester, setSemester] = useState('');
  const [clarity, setClarity] = useState(0);
  const [fairness, setFairness] = useState(0);
  const [workload, setWorkload] = useState(0);
  const [attendance, setAttendance] = useState(false);
  const [wouldRetake, setWouldRetake] = useState(false);
  const [comment, setComment] = useState('');
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const commentLength = comment.trim().length;
  const isValid =
    courseId !== null &&
    semester !== '' &&
    clarity > 0 &&
    fairness > 0 &&
    workload > 0 &&
    commentLength >= 50 &&
    commentLength <= 1000;

  const selectedCourse = courses.find((c) => c.id === courseId);

  const handleSubmit = async () => {
    if (!isValid || !courseId) return;

    const token = getToken();
    if (!token) {
      setStatus('error');
      setErrorMsg('Değerlendirme yapmak için giriş yapmanız gerekiyor.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      await api.reviews.create(token, {
        instructorId,
        courseId,
        semester,
        clarity,
        fairness,
        workload,
        attendance,
        wouldRetake,
        comment: comment.trim(),
      });
      setStatus('success');
      onSuccess?.();
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Bir hata olustu.');
    }
  };

  if (status === 'success') {
    return (
      <div className={cn('rounded-xl bg-bg-secondary border border-white/10 p-8 text-center', className)}>
        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Değerlendirme Gönderildi!
        </h3>
        <p className="text-sm text-text-secondary">
          Katkılarınız için teşekkürler.
        </p>
      </div>
    );
  }

  if (preview) {
    return (
      <div className={cn('rounded-xl bg-bg-secondary border border-white/10 p-6 space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">Onizleme</h3>
          <button
            onClick={() => setPreview(false)}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Duzenle
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <span className="text-text-secondary">Ders: </span>
            <span className="text-text-primary">
              {selectedCourse ? `${selectedCourse.code} - ${selectedCourse.name}` : ''}
            </span>
          </div>
          <div>
            <span className="text-text-secondary">Donem: </span>
            <span className="text-text-primary">{semester}</span>
          </div>
          <div className="flex gap-6">
            <div>
              <span className="text-text-secondary">Anlatim: </span>
              <RatingStars rating={clarity} size="sm" />
            </div>
            <div>
              <span className="text-text-secondary">Adalet: </span>
              <RatingStars rating={fairness} size="sm" />
            </div>
            <div>
              <span className="text-text-secondary">İş Yükü: </span>
              <RatingStars rating={workload} size="sm" />
            </div>
          </div>
          <div className="flex gap-4">
            <span className={attendance ? 'text-emerald-400' : 'text-red-400'}>
              {attendance ? 'Devam Zorunlu' : 'Devam Zorunlu Değil'}
            </span>
            <span className={wouldRetake ? 'text-accent-primary' : 'text-red-400'}>
              {wouldRetake ? 'Tekrar Alırdım' : 'Tekrar Almazdım'}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-bg-tertiary text-text-primary">
            {comment}
          </div>
        </div>

        {status === 'error' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={status === 'loading'}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
            status === 'loading'
              ? 'bg-accent-primary/50 text-bg-primary cursor-wait'
              : 'bg-accent-primary text-bg-primary hover:bg-accent-primary/90'
          )}
        >
          {status === 'loading' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {status === 'loading' ? 'Gönderiliyor...' : 'Gönder'}
        </button>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl bg-bg-secondary border border-white/10 p-6 space-y-5', className)}>
      <h3 className="text-lg font-semibold text-text-primary">
        Değerlendirme Yaz
      </h3>

      {/* Course selection */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-text-secondary">Ders</label>
        <select
          value={courseId ?? ''}
          onChange={(e) => setCourseId(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-3 py-2.5 rounded-lg bg-bg-tertiary border border-white/10 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/50 appearance-none"
        >
          <option value="">Ders secin...</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.code} - {course.name}
            </option>
          ))}
        </select>
      </div>

      {/* Semester */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-text-secondary">Donem</label>
        <select
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-bg-tertiary border border-white/10 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/50 appearance-none"
        >
          <option value="">Donem secin...</option>
          {semesterOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Ratings */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-text-secondary">Puanlama</label>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary w-24">Anlatım</span>
            <RatingStars rating={clarity} interactive onChange={setClarity} size="md" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary w-24">Adalet</span>
            <RatingStars rating={fairness} interactive onChange={setFairness} size="md" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary w-24">İş Yükü</span>
            <RatingStars rating={workload} interactive onChange={setWorkload} size="md" />
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-4">
        {/* Attendance toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={attendance}
              onChange={(e) => setAttendance(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-6 rounded-full bg-bg-tertiary peer-checked:bg-accent-primary transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-sm text-text-secondary">Devam Zorunlu</span>
        </label>

        {/* Would retake toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={wouldRetake}
              onChange={(e) => setWouldRetake(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-6 rounded-full bg-bg-tertiary peer-checked:bg-accent-primary transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-sm text-text-secondary">Tekrar Alırdım</span>
        </label>
      </div>

      {/* Comment */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">Yorum</label>
          <span
            className={cn(
              'text-xs',
              commentLength < 50
                ? 'text-red-400'
                : commentLength > 1000
                  ? 'text-red-400'
                  : 'text-text-secondary'
            )}
          >
            {commentLength}/1000
          </span>
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={5}
          placeholder="Deneyimlerinizi paylasin (en az 50 karakter)..."
          className="w-full px-3 py-2.5 rounded-lg bg-bg-tertiary border border-white/10 text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 resize-none"
        />
        {commentLength > 0 && commentLength < 50 && (
          <p className="text-xs text-red-400">
            En az 50 karakter gerekli ({50 - commentLength} karakter daha).
          </p>
        )}
      </div>

      {/* Error message */}
      {status === 'error' && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setPreview(true)}
          disabled={!isValid}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border border-white/10 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Eye className="w-4 h-4" />
          Onizle
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid || status === 'loading'}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            status === 'loading'
              ? 'bg-accent-primary/50 text-bg-primary cursor-wait'
              : 'bg-accent-primary text-bg-primary hover:bg-accent-primary/90'
          )}
        >
          {status === 'loading' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {status === 'loading' ? 'Gönderiliyor...' : 'Gönder'}
        </button>
      </div>
    </div>
  );
}
