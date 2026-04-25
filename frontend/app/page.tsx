'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, ArrowRight, Search } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import InstructorCard from '@/components/InstructorCard';
import StatsBar from '@/components/StatsBar';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { api } from '@/lib/api';
import type { Stats, Department, Instructor } from '@/types';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const slideUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchResults, setSearchResults] = useState<Instructor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, deptRes] = await Promise.allSettled([
          api.stats.get(),
          api.departments.list(),
        ]);

        if (statsRes.status === 'fulfilled') setStats(statsRes.value);
        if (deptRes.status === 'fulfilled')
          setDepartments(Array.isArray(deptRes.value) ? deptRes.value : []);
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.instructors.list({
          search: searchQuery,
          limit: 8,
        });
        setSearchResults(res.data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleSearchResults = useCallback(async (query: string) => {
    const res = await api.instructors.list({ search: query, limit: 8 });
    return (res.data || []).map((inst) => ({
      id: inst.id,
      label: inst.name,
      sublabel: inst.department?.name || inst.title,
      href: `/hoca/${inst.slug}`,
    }));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-accent-primary/5 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 md:pt-24 md:pb-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ duration: 0.6 }}
            className="text-center space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-primary/10 text-accent-primary text-sm font-medium">
              <GraduationCap className="w-4 h-4" />
              ODTÜ Hoca Değerlendirme Platformu
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-text-primary leading-tight">
              ODTÜ&apos;de hangi hocadan{' '}
              <span className="bg-gradient-to-r from-accent-primary to-amber-400 bg-clip-text text-transparent">
                ders almalısın?
              </span>
            </h1>

            <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Hocalarını değerlendir, en iyi dersi seç.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-10 max-w-2xl mx-auto"
          >
            <SearchBar
              placeholder="Hoca veya ders ara..."
              onResults={handleSearchResults}
              onChange={(q: string) => setSearchQuery(q)}
              className="text-lg"
            />
          </motion.div>

          {/* Search Results Grid */}
          <AnimatePresence mode="wait">
            {searchQuery.trim() && (
              <motion.div
                key="search-results"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="mt-8 max-w-5xl mx-auto"
              >
                {searchLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }, (_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                ) : searchResults.length > 0 ? (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                  >
                    {searchResults.map((instructor) => (
                      <motion.div key={instructor.id} variants={staggerItem}>
                        <InstructorCard instructor={instructor} />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <div className="text-center py-8">
                    <Search className="w-8 h-8 text-text-secondary mx-auto mb-3" />
                    <p className="text-text-secondary">
                      &quot;{searchQuery}&quot; için sonuç bulunamadı.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats */}
          <AnimatePresence>
            {stats && !searchQuery.trim() && (
              <motion.div
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0 }}
                variants={slideUp}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-10 max-w-xl mx-auto"
              >
                <StatsBar stats={stats} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Department Cards */}
      {!searchQuery.trim() && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeIn}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between mb-8"
          >
            <h2 className="text-2xl md:text-3xl font-semibold text-text-primary">
              Bölümler
            </h2>
            <span className="text-sm text-text-secondary">
              {departments.length} bölüm
            </span>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl bg-bg-secondary border border-white/10 p-4 h-24"
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={staggerContainer}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
            >
              {departments.map((dept) => (
                <motion.div key={dept.id} variants={staggerItem}>
                  <Link
                    href={`/bolum/${dept.code.toLowerCase()}`}
                    className="block rounded-xl bg-bg-secondary border border-white/10 p-4 hover:border-accent-primary/30 hover:bg-bg-tertiary/50 transition-all duration-200 group"
                  >
                    <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors truncate">
                      {dept.name}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-text-secondary">
                        {dept.code}
                      </span>
                      {dept._count && (
                        <span className="text-xs text-text-secondary">
                          {dept._count.instructors} hoca
                        </span>
                      )}
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-text-secondary group-hover:text-accent-primary mt-2 transition-colors" />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-sm text-text-secondary">
            Hangi Hoca &mdash; ODTÜ öğrencileri tarafından öğrenciler için.
          </p>
        </div>
      </footer>
    </div>
  );
}
