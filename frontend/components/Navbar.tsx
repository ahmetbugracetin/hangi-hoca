'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, User, LogOut, BookOpen } from 'lucide-react';
import { getToken, removeToken } from '@/lib/auth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Department } from '@/types';

export default function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const deptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoggedIn(!!getToken());
  }, []);

  useEffect(() => {
    api.departments.list().then((res) => {
      setDepartments(Array.isArray(res) ? res : []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (deptRef.current && !deptRef.current.contains(e.target as Node)) {
        setDeptOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    removeToken();
    setIsLoggedIn(false);
    setMobileOpen(false);
    router.push('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="text-xl font-semibold text-accent-primary hover:opacity-80 transition-opacity"
          >
            Hangi Hoca
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {/* Departments dropdown */}
            <div ref={deptRef} className="relative">
              <button
                onClick={() => setDeptOpen(!deptOpen)}
                className={cn(
                  'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  deptOpen
                    ? 'text-accent-primary bg-white/5'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                )}
              >
                Bölümler
                <ChevronDown
                  className={cn(
                    'w-4 h-4 transition-transform duration-200',
                    deptOpen && 'rotate-180'
                  )}
                />
              </button>
              <AnimatePresence>
                {deptOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1 w-64 max-h-80 overflow-y-auto rounded-xl bg-bg-secondary border border-white/10 shadow-2xl py-1 scrollbar-thin"
                  >
                    {departments.map((dept) => (
                      <Link
                        key={dept.id}
                        href={`/bolum/${dept.code.toLowerCase()}`}
                        onClick={() => setDeptOpen(false)}
                        className="block px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                      >
                        {dept.name}
                      </Link>
                    ))}
                    {departments.length === 0 && (
                      <span className="block px-4 py-2.5 text-sm text-text-secondary">
                        Yükleniyor...
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              href="/dersler"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Dersler
            </Link>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-text-secondary">
                  <User className="w-4 h-4" />
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cikis Yap
                </button>
              </>
            ) : (
              <Link
                href="/giris"
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-accent-primary text-bg-primary hover:bg-accent-primary/90 transition-colors"
              >
                Giriş Yap
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed inset-y-0 right-0 w-72 bg-bg-secondary border-l border-white/10 shadow-2xl z-50 md:hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <span className="text-lg font-semibold text-accent-primary">
                Hangi Hoca
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg text-text-secondary hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-1">
              <p className="px-3 py-2 text-xs font-medium text-text-secondary uppercase tracking-wider">
                Bölümler
              </p>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {departments.map((dept) => (
                  <Link
                    key={dept.id}
                    href={`/bolum/${dept.code.toLowerCase()}`}
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                  >
                    {dept.name}
                  </Link>
                ))}
              </div>

              <div className="pt-2 border-t border-white/10 mt-3">
                <Link
                  href="/dersler"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  Dersler
                </Link>
              </div>

              <div className="pt-2 border-t border-white/10 mt-3">
                {isLoggedIn ? (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cikis Yap
                  </button>
                ) : (
                  <Link
                    href="/giris"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent-primary text-bg-primary hover:bg-accent-primary/90 transition-colors"
                  >
                    Giriş Yap
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>
    </nav>
  );
}
