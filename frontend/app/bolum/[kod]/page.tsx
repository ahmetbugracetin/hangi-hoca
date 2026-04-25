'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  ArrowUpDown,
  Star,
  MessageSquare,
  AArrowDown,
  ChevronLeft,
} from 'lucide-react';
import InstructorCard from '@/components/InstructorCard';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Department, Instructor } from '@/types';

type SortMode = 'rating' | 'reviews' | 'name';

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function DepartmentPage() {
  const params = useParams();
  const code = (params.kod as string).toUpperCase();

  const [department, setDepartment] = useState<Department | null>(null);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('rating');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const [deptRes, instRes] = await Promise.all([
          api.departments.list(),
          api.instructors.list({ department: code, limit: 50 }),
        ]);

        const deptList = Array.isArray(deptRes) ? deptRes : [];
        const dept = deptList.find(
          (d) => d.code.toUpperCase() === code
        );
        if (dept) {
          setDepartment(dept);
        }

        setInstructors(instRes.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bölüm bulunamadı.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [code]);

  const sortedInstructors = useMemo(() => {
    const sorted = [...instructors];
    switch (sortMode) {
      case 'rating':
        sorted.sort((a, b) => (b.avgOverall ?? 0) - (a.avgOverall ?? 0));
        break;
      case 'reviews':
        sorted.sort((a, b) => (b.totalReviews ?? 0) - (a.totalReviews ?? 0));
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        break;
    }
    return sorted;
  }, [instructors, sortMode]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-1/3 rounded-md bg-bg-tertiary" />
          <div className="h-4 w-1/5 rounded-md bg-bg-tertiary" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="rounded-2xl bg-bg-secondary border border-white/10 p-12">
          <Building2 className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-text-primary mb-3">
            {error}
          </h1>
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back link */}
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

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-accent-primary/10 flex-shrink-0">
            <Building2 className="w-6 h-6 text-accent-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-text-primary">
              {department?.name ?? code}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-text-secondary">
              {department && (
                <span className="px-2.5 py-0.5 rounded-lg bg-accent-primary/10 text-accent-primary text-xs font-semibold">
                  {department.code}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {instructors.length} hoca
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Sort Controls */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center gap-2"
      >
        <ArrowUpDown className="w-4 h-4 text-text-secondary" />
        <span className="text-sm text-text-secondary mr-1">Sirala:</span>
        <button
          onClick={() => setSortMode('rating')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            sortMode === 'rating'
              ? 'bg-accent-primary/10 text-accent-primary border-accent-primary/30'
              : 'bg-bg-secondary text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
          )}
        >
          <Star className="w-3.5 h-3.5" />
          En Yuksek Puan
        </button>
        <button
          onClick={() => setSortMode('reviews')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            sortMode === 'reviews'
              ? 'bg-accent-primary/10 text-accent-primary border-accent-primary/30'
              : 'bg-bg-secondary text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          En Cok Yorum
        </button>
        <button
          onClick={() => setSortMode('name')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            sortMode === 'name'
              ? 'bg-accent-primary/10 text-accent-primary border-accent-primary/30'
              : 'bg-bg-secondary text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
          )}
        >
          <AArrowDown className="w-3.5 h-3.5" />
          Isme Gore
        </button>
      </motion.div>

      {/* Instructor Grid */}
      {sortedInstructors.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 rounded-xl bg-bg-secondary border border-white/10"
        >
          <Users className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <p className="text-text-secondary text-lg">
            Bu bölümde henüz kayıtlı hoca yok.
          </p>
        </motion.div>
      ) : (
        <motion.div
          key={sortMode}
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {sortedInstructors.map((instructor) => (
            <motion.div key={instructor.id} variants={staggerItem}>
              <InstructorCard instructor={instructor} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
