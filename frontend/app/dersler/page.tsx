'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, Search, GraduationCap } from 'lucide-react';
import { api } from '@/lib/api';
import { Course, Department } from '@/types';

export default function DerslerPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.departments.list()
      .then((data) => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: { search?: string; department?: string } = {};
    if (search) params.search = search;
    if (selectedDept) params.department = selectedDept;

    api.courses.list(params)
      .then((data) => setCourses(data.data || []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, [search, selectedDept]);

  useEffect(() => {
    const timer = setTimeout(() => {}, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-semibold text-text-primary mb-2">
            Dersler
          </h1>
          <p className="text-text-secondary">
            Tüm dersleri keşfet, hangi hocanın hangi dersi verdiğini öğren.
          </p>
        </motion.div>

        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-8"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
            <input
              type="text"
              placeholder="Ders kodu veya adı ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-primary/50 transition-colors"
            />
          </div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-text-primary focus:outline-none focus:border-accent-primary/50 transition-colors"
          >
            <option value="">Tüm Bölümler</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.code}>
                {dept.code} - {dept.name}
              </option>
            ))}
          </select>
        </motion.div>

        {/* Course List */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="bg-bg-secondary rounded-xl border border-white/10 p-5 animate-pulse"
              >
                <div className="h-5 bg-bg-tertiary rounded w-24 mb-3" />
                <div className="h-4 bg-bg-tertiary rounded w-full mb-2" />
                <div className="h-4 bg-bg-tertiary rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <GraduationCap className="w-16 h-16 text-text-secondary/30 mx-auto mb-4" />
            <p className="text-text-secondary text-lg">
              {search || selectedDept
                ? 'Aramanızla eşleşen ders bulunamadı.'
                : 'Henüz ders verisi yok.'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {courses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link href={`/ders/${course.code}`}>
                  <div className="bg-bg-secondary rounded-xl border border-white/10 p-5 hover:border-accent-primary/30 transition-all duration-200 hover:scale-[1.02] group">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-accent-primary font-semibold text-lg">
                        {course.code}
                      </span>
                      {course.credits && (
                        <span className="text-xs text-text-secondary bg-bg-tertiary px-2 py-1 rounded-full">
                          {course.credits} kredi
                        </span>
                      )}
                    </div>
                    <h3 className="text-text-primary group-hover:text-accent-primary transition-colors mb-2">
                      {course.name}
                    </h3>
                    {course.department && (
                      <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{course.department.name}</span>
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Count */}
        {!loading && courses.length > 0 && (
          <p className="text-center text-text-secondary text-sm mt-8">
            Toplam {courses.length} ders gösteriliyor
          </p>
        )}
      </div>
    </div>
  );
}
