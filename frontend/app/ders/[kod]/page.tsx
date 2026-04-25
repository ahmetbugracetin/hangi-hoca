'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Star,
  Users,
  Building2,
  CreditCard,
} from 'lucide-react';
import RatingStars from '@/components/RatingStars';
import { SkeletonPage } from '@/components/SkeletonLoader';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Course, Instructor } from '@/types';

interface InstructorWithCourseStats extends Instructor {
  courseAvgClarity?: number;
  courseAvgFairness?: number;
  courseAvgWorkload?: number;
  courseAvgOverall?: number;
  courseTotalReviews?: number;
}

export default function CoursePage() {
  const params = useParams();
  const code = (params.kod as string).toUpperCase();

  const [course, setCourse] = useState<Course | null>(null);
  const [instructors, setInstructors] = useState<InstructorWithCourseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchCourse() {
      setLoading(true);
      setError('');
      try {
        const data = await api.courses.getByCode(code);
        setCourse(data);

        // Extract unique instructors from sections
        if (data.sections && data.sections.length > 0) {
          const uniqueInstructors = new Map<number, InstructorWithCourseStats>();
          for (const section of data.sections) {
            if (section.instructor && !uniqueInstructors.has(section.instructor.id)) {
              uniqueInstructors.set(section.instructor.id, {
                ...section.instructor,
                courseAvgClarity: section.instructor.avgClarity,
                courseAvgFairness: section.instructor.avgFairness,
                courseAvgWorkload: section.instructor.avgWorkload,
                courseAvgOverall: section.instructor.avgOverall,
                courseTotalReviews: section.instructor.totalReviews,
              });
            }
          }
          setInstructors(Array.from(uniqueInstructors.values()));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ders bulunamadı.');
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [code]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SkeletonPage />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-semibold text-text-primary mb-4">
          {error || 'Ders bulunamadı'}
        </h1>
        <Link
          href="/"
          className="text-accent-primary hover:underline text-sm"
        >
          Ana sayfaya dön
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Course Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl bg-bg-secondary border border-white/10 p-6 md:p-8"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-accent-primary/10 flex-shrink-0">
            <BookOpen className="w-6 h-6 text-accent-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-1 rounded-lg bg-accent-primary/10 text-accent-primary text-sm font-semibold">
                {course.code}
              </span>
              {course.credits != null && (
                <span className="flex items-center gap-1 text-xs text-text-secondary">
                  <CreditCard className="w-3.5 h-3.5" />
                  {course.credits} Kredi
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-text-primary mt-3">
              {course.name}
            </h1>
            {course.department && (
              <Link
                href={`/bolum/${course.department.code.toLowerCase()}`}
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-accent-primary hover:underline"
              >
                <Building2 className="w-4 h-4" />
                {course.department.name}
              </Link>
            )}
          </div>
        </div>
      </motion.div>

      {/* Instructors */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-5 h-5 text-accent-primary" />
          <h2 className="text-xl font-semibold text-text-primary">
            Bu Dersi Veren Hocalar
          </h2>
          <span className="text-sm text-text-secondary">
            ({instructors.length})
          </span>
        </div>

        {instructors.length === 0 ? (
          <div className="text-center py-12 rounded-xl bg-bg-secondary border border-white/10">
            <Users className="w-10 h-10 text-text-secondary mx-auto mb-3" />
            <p className="text-text-secondary">
              Bu ders için henüz kayıtlı hoca yok.
            </p>
          </div>
        ) : instructors.length === 1 ? (
          /* Single instructor card */
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <InstructorCourseCard instructor={instructors[0]} />
          </motion.div>
        ) : (
          /* Comparison table for multiple instructors */
          <div className="space-y-4">
            {/* Cards for mobile */}
            <div className="block lg:hidden space-y-4">
              {instructors.map((inst, idx) => (
                <motion.div
                  key={inst.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <InstructorCourseCard instructor={inst} />
                </motion.div>
              ))}
            </div>

            {/* Table for desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <motion.table
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full rounded-xl overflow-hidden"
              >
                <thead>
                  <tr className="bg-bg-secondary border border-white/10">
                    <th className="text-left px-5 py-4 text-sm font-medium text-text-secondary">
                      Hoca
                    </th>
                    <th className="text-center px-4 py-4 text-sm font-medium text-text-secondary">
                      Genel
                    </th>
                    <th className="text-center px-4 py-4 text-sm font-medium text-text-secondary">
                      Anlatim
                    </th>
                    <th className="text-center px-4 py-4 text-sm font-medium text-text-secondary">
                      Adalet
                    </th>
                    <th className="text-center px-4 py-4 text-sm font-medium text-text-secondary">
                      Ders Yükü
                    </th>
                    <th className="text-center px-4 py-4 text-sm font-medium text-text-secondary">
                      Yorum
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {instructors.map((inst, idx) => {
                    const overall = inst.courseAvgOverall ?? inst.avgOverall ?? 0;
                    const clarity = inst.courseAvgClarity ?? inst.avgClarity ?? 0;
                    const fairness = inst.courseAvgFairness ?? inst.avgFairness ?? 0;
                    const workload = inst.courseAvgWorkload ?? inst.avgWorkload ?? 0;
                    const reviewCount = inst.courseTotalReviews ?? inst.totalReviews ?? 0;

                    // Determine best overall
                    const bestOverall = Math.max(
                      ...instructors.map((i) => i.courseAvgOverall ?? i.avgOverall ?? 0)
                    );
                    const isBest = overall === bestOverall && overall > 0;

                    return (
                      <tr
                        key={inst.id}
                        className={cn(
                          'border-b border-white/5 last:border-b-0 transition-colors hover:bg-white/[0.02]',
                          idx % 2 === 0 ? 'bg-bg-secondary/50' : 'bg-bg-secondary/30'
                        )}
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/hoca/${inst.slug}`}
                            className="group flex items-center gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                                {inst.name}
                              </span>
                              <p className="text-xs text-text-secondary truncate">
                                {inst.title}
                              </p>
                            </div>
                            {isBest && (
                              <span className="px-2 py-0.5 rounded-full bg-accent-primary/10 text-accent-primary text-xs font-medium">
                                En iyi
                              </span>
                            )}
                          </Link>
                        </td>
                        <td className="text-center px-4 py-4">
                          <span className="text-sm font-bold text-accent-primary">
                            {overall > 0 ? overall.toFixed(1) : '-'}
                          </span>
                        </td>
                        <td className="text-center px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <RatingStars rating={clarity} size="sm" />
                            <span className="text-xs text-text-secondary ml-1">
                              {clarity > 0 ? clarity.toFixed(1) : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="text-center px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <RatingStars rating={fairness} size="sm" />
                            <span className="text-xs text-text-secondary ml-1">
                              {fairness > 0 ? fairness.toFixed(1) : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="text-center px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <RatingStars rating={workload} size="sm" />
                            <span className="text-xs text-text-secondary ml-1">
                              {workload > 0 ? workload.toFixed(1) : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="text-center px-4 py-4">
                          <span className="text-xs text-text-secondary">
                            {reviewCount}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </motion.table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function InstructorCourseCard({ instructor }: { instructor: InstructorWithCourseStats }) {
  const overall = instructor.courseAvgOverall ?? instructor.avgOverall ?? 0;
  const clarity = instructor.courseAvgClarity ?? instructor.avgClarity ?? 0;
  const fairness = instructor.courseAvgFairness ?? instructor.avgFairness ?? 0;
  const workload = instructor.courseAvgWorkload ?? instructor.avgWorkload ?? 0;
  const reviewCount = instructor.courseTotalReviews ?? instructor.totalReviews ?? 0;

  return (
    <Link
      href={`/hoca/${instructor.slug}`}
      className="block rounded-xl bg-bg-secondary border border-white/10 p-5 hover:border-accent-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-text-primary">
            {instructor.name}
          </h3>
          <p className="text-sm text-text-secondary">{instructor.title}</p>
        </div>
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <span className="text-2xl font-bold text-accent-primary">
            {overall > 0 ? overall.toFixed(1) : '-'}
          </span>
          <RatingStars rating={overall} size="sm" />
          <span className="text-xs text-text-secondary">{reviewCount} yorum</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5">
        <div className="text-center">
          <span className="text-xs text-text-secondary block mb-1">Anlatım</span>
          <RatingStars rating={clarity} size="sm" />
          <span className="text-xs text-text-primary block mt-0.5">
            {clarity > 0 ? clarity.toFixed(1) : '-'}
          </span>
        </div>
        <div className="text-center">
          <span className="text-xs text-text-secondary block mb-1">Adalet</span>
          <RatingStars rating={fairness} size="sm" />
          <span className="text-xs text-text-primary block mt-0.5">
            {fairness > 0 ? fairness.toFixed(1) : '-'}
          </span>
        </div>
        <div className="text-center">
          <span className="text-xs text-text-secondary block mb-1">Ders Yükü</span>
          <RatingStars rating={workload} size="sm" />
          <span className="text-xs text-text-primary block mt-0.5">
            {workload > 0 ? workload.toFixed(1) : '-'}
          </span>
        </div>
      </div>
    </Link>
  );
}
