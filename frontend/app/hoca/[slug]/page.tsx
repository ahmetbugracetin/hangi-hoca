'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  BookOpen,
  Users,
  Clock,
  ChevronLeft,
  MessageSquare,
  Award,
  CheckCircle,
} from 'lucide-react';
import RatingStars from '@/components/RatingStars';
import ReviewCard from '@/components/ReviewCard';
import ReviewForm from '@/components/ReviewForm';
import { SkeletonPage } from '@/components/SkeletonLoader';
import { api } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import { cn } from '@/lib/utils';
import type { Instructor, Review, Course } from '@/types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-amber-600',
    'bg-blue-600',
    'bg-emerald-600',
    'bg-purple-600',
    'bg-rose-600',
    'bg-cyan-600',
    'bg-orange-600',
    'bg-indigo-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const sectionFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function InstructorPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);

  // Fetch instructor data
  useEffect(() => {
    async function fetchInstructor() {
      setLoading(true);
      setError('');
      try {
        const data = await api.instructors.getBySlug(slug);
        setInstructor(data);

        // Extract unique courses from sections
        if ((data as any).sections && (data as any).sections.length > 0) {
          const sectionCourses = (data as any).sections as {
            course: { code: string; name: string; id: number };
          }[];
          const uniqueMap = new Map<number, Course>();
          sectionCourses.forEach((s) => {
            if (s.course && !uniqueMap.has(s.course.id)) {
              uniqueMap.set(s.course.id, {
                id: s.course.id,
                code: s.course.code,
                name: s.course.name,
                departmentId: data.departmentId,
              });
            }
          });
          setCourses(Array.from(uniqueMap.values()));
        } else if (data.department) {
          // Fallback: fetch courses for the department
          const courseRes = await api.courses.list({
            department: data.department.code,
          });
          setCourses(courseRes.data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Hoca bulunamadı.');
      } finally {
        setLoading(false);
      }
    }
    fetchInstructor();
  }, [slug]);

  // Fetch reviews (initial load)
  const fetchReviews = useCallback(
    async (page: number, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setReviewsLoading(true);
      }
      try {
        const data = await api.instructors.getReviews(slug, page);
        const reviewList = data.data || [];
        if (append) {
          setReviews((prev) => [...prev, ...reviewList]);
        } else {
          setReviews(reviewList);
        }
        setTotalReviews(data.total);
      } catch {
        // fail silently
      } finally {
        setReviewsLoading(false);
        setLoadingMore(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    fetchReviews(1);
  }, [fetchReviews]);

  const handleLoadMore = () => {
    const nextPage = reviewPage + 1;
    setReviewPage(nextPage);
    fetchReviews(nextPage, true);
  };

  const handleWriteReview = () => {
    if (!isLoggedIn()) {
      router.push('/giris');
      return;
    }
    setShowReviewForm((prev) => !prev);
  };

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    setReviewPage(1);
    fetchReviews(1);
  };

  const hasMore = reviews.length < totalReviews;

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SkeletonPage />
      </div>
    );
  }

  // Error state
  if (error || !instructor) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="rounded-2xl bg-bg-secondary border border-white/10 p-12">
          <MessageSquare className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-text-primary mb-3">
            {error || 'Hoca bulunamadı'}
          </h1>
          <p className="text-text-secondary text-sm mb-6">
            Aradığınız hoca bilgisine ulaşılamadı.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-accent-primary hover:underline text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    );
  }

  const avgOverall = instructor.avgOverall ?? 0;
  const avgClarity = instructor.avgClarity ?? 0;
  const avgFairness = instructor.avgFairness ?? 0;
  const avgWorkload = instructor.avgWorkload ?? 0;
  const wouldRetake = (instructor as any).wouldRetakePercentage ?? instructor.wouldRetakePercent ?? 0;
  const attendance = (instructor as any).attendancePercentage ?? instructor.attendancePercent ?? 0;
  const reviewCount = (instructor as any).reviewCount ?? instructor.totalReviews ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Geri Dön
        </Link>
      </motion.div>

      {/* Header Section */}
      <motion.div
        variants={sectionFade}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4 }}
        className="rounded-2xl bg-bg-secondary border border-white/10 p-6 md:p-8"
      >
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          {instructor.photoUrl ? (
            <img
              src={instructor.photoUrl}
              alt={instructor.name}
              className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover flex-shrink-0 border-2 border-white/10"
            />
          ) : (
            <div
              className={cn(
                'w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center flex-shrink-0 text-2xl font-bold text-white',
                getAvatarColor(instructor.name)
              )}
            >
              {getInitials(instructor.name)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-semibold text-text-primary">
              {instructor.name}
            </h1>
            <p className="text-text-secondary mt-1">{instructor.title}</p>
            {instructor.department && (
              <Link
                href={`/bolum/${instructor.department.code.toLowerCase()}`}
                className="inline-flex items-center gap-1.5 mt-2 text-sm text-accent-primary hover:underline"
              >
                <BookOpen className="w-4 h-4" />
                {instructor.department.name}
              </Link>
            )}
          </div>
        </div>
      </motion.div>

      {/* Rating Overview Cards */}
      <motion.div
        variants={sectionFade}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {/* Clarity */}
        <div className="rounded-xl bg-bg-secondary border border-white/10 p-5 flex flex-col items-center gap-2">
          <span className="text-sm text-text-secondary">Anlatım</span>
          <RatingStars rating={avgClarity} size="md" />
          <span className="text-lg font-semibold text-text-primary">
            {avgClarity > 0 ? avgClarity.toFixed(1) : '-'}
          </span>
        </div>

        {/* Fairness */}
        <div className="rounded-xl bg-bg-secondary border border-white/10 p-5 flex flex-col items-center gap-2">
          <span className="text-sm text-text-secondary">Adalet</span>
          <RatingStars rating={avgFairness} size="md" />
          <span className="text-lg font-semibold text-text-primary">
            {avgFairness > 0 ? avgFairness.toFixed(1) : '-'}
          </span>
        </div>

        {/* Workload */}
        <div className="rounded-xl bg-bg-secondary border border-white/10 p-5 flex flex-col items-center gap-2">
          <span className="text-sm text-text-secondary">Ders Yükü</span>
          <RatingStars rating={avgWorkload} size="md" />
          <span className="text-lg font-semibold text-text-primary">
            {avgWorkload > 0 ? avgWorkload.toFixed(1) : '-'}
          </span>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        variants={sectionFade}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {/* Overall Average */}
        <div className="rounded-xl bg-bg-secondary border border-white/10 p-5 flex flex-col items-center gap-1">
          <Award className="w-5 h-5 text-accent-primary mb-1" />
          <span className="text-3xl font-bold text-accent-primary">
            {avgOverall > 0 ? avgOverall.toFixed(1) : '-'}
          </span>
          <span className="text-xs text-text-secondary">Genel Ortalama</span>
        </div>

        {/* Would Retake */}
        <div className="rounded-xl bg-bg-secondary border border-white/10 p-5 flex flex-col items-center gap-2">
          <CheckCircle className="w-5 h-5 text-accent-primary" />
          <span className="text-xs text-text-secondary text-center">
            Tekrar Alır mısın?
          </span>
          <span className="text-lg font-semibold text-text-primary">
            %{Math.round(wouldRetake)}
          </span>
          <div className="w-full h-2 rounded-full bg-bg-tertiary overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-primary transition-all duration-500"
              style={{ width: `${wouldRetake}%` }}
            />
          </div>
        </div>

        {/* Attendance */}
        <div className="rounded-xl bg-bg-secondary border border-white/10 p-5 flex flex-col items-center gap-2">
          <Clock className="w-5 h-5 text-accent-secondary" />
          <span className="text-xs text-text-secondary text-center">
            Devam Zorunlu
          </span>
          <span className="text-lg font-semibold text-text-primary">
            %{Math.round(attendance)}
          </span>
        </div>

        {/* Total Reviews */}
        <div className="rounded-xl bg-bg-secondary border border-white/10 p-5 flex flex-col items-center gap-1">
          <Users className="w-5 h-5 text-accent-secondary" />
          <span className="text-3xl font-bold text-text-primary">
            {reviewCount}
          </span>
          <span className="text-xs text-text-secondary">Değerlendirme</span>
        </div>
      </motion.div>

      {/* Courses Section */}
      {courses.length > 0 && (
        <motion.div
          variants={sectionFade}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-2xl bg-bg-secondary border border-white/10 p-6"
        >
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent-primary" />
            Verdiği Dersler
          </h3>
          <div className="flex flex-wrap gap-2">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/ders/${course.code.toLowerCase()}`}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-tertiary text-text-secondary hover:text-accent-primary hover:bg-accent-primary/10 border border-white/5 transition-colors"
              >
                {course.code}
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Write Review Button */}
      <motion.div
        variants={sectionFade}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <button
          onClick={handleWriteReview}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-accent-primary text-bg-primary font-medium hover:bg-accent-primary/90 transition-colors"
        >
          <MessageSquare className="w-5 h-5" />
          Yorum Yaz
        </button>
      </motion.div>

      {/* Review Form */}
      <AnimatePresence>
        {showReviewForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <ReviewForm
              instructorId={instructor.id}
              courses={courses}
              onSuccess={handleReviewSuccess}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews Section */}
      <motion.section
        variants={sectionFade}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Star className="w-5 h-5 text-accent-primary" />
            Değerlendirmeler ({totalReviews})
          </h2>
        </div>

        {reviewsLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl bg-bg-secondary border border-white/10 p-5 h-40"
              />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 rounded-xl bg-bg-secondary border border-white/10">
            <MessageSquare className="w-10 h-10 text-text-secondary mx-auto mb-3" />
            <p className="text-text-secondary">
              Henüz değerlendirme yok. İlk değerlendirmeyi sen yap!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <ReviewCard review={review} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && !reviewsLoading && (
          <div className="flex justify-center mt-8">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium border border-white/10 transition-colors',
                loadingMore
                  ? 'bg-bg-tertiary text-text-secondary cursor-wait'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              )}
            >
              {loadingMore ? (
                <>
                  <div className="w-4 h-4 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
                  Yükleniyor...
                </>
              ) : (
                <>
                  <Star className="w-4 h-4" />
                  Daha Fazla Göster
                </>
              )}
            </button>
          </div>
        )}
      </motion.section>
    </div>
  );
}
