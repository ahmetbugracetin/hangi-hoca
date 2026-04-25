'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle,
  GraduationCap,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const emailValid = email.endsWith('@metu.edu.tr');
  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Lutfen e-posta adresinizi girin.');
      return;
    }

    if (!emailValid) {
      setError('Sadece @metu.edu.tr uzantili e-postalar kabul edilir.');
      return;
    }

    if (!passwordValid) {
      setError('Şifre en az 8 karakter olmalıdır.');
      return;
    }

    if (!passwordsMatch) {
      setError('Sifreler eslesmiyor.');
      return;
    }

    setLoading(true);
    try {
      await api.auth.register(email.trim(), password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="rounded-2xl bg-bg-secondary border border-white/10 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-semibold text-text-primary mb-3">
              Kayıt Başarılı!
            </h1>
            <p className="text-text-secondary mb-6">
              Dogrulama maili gonderildi, email&apos;ini kontrol et.
            </p>
            <Link
              href="/giris"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-primary text-bg-primary font-medium hover:bg-accent-primary/90 transition-colors"
            >
              Giriş Yap
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl bg-bg-secondary border border-white/10 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent-primary/10 mb-4">
              <GraduationCap className="w-7 h-7 text-accent-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-text-primary">
              Kayıt Ol
            </h1>
            <p className="text-sm text-text-secondary mt-2">
              ODTU e-posta adresinle hesap olustur
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 mb-6 rounded-lg bg-amber-500/10 text-amber-400 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>@metu.edu.tr disindaki e-postalar kabul edilmez.</span>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-red-500/10 text-red-400 text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-text-secondary">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e123456@metu.edu.tr"
                  autoComplete="email"
                  className={cn(
                    'w-full pl-10 pr-4 py-3 rounded-xl bg-bg-tertiary border text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 transition-all',
                    email.length > 0 && !emailValid
                      ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500/50'
                      : 'border-white/10 focus:ring-accent-primary/50 focus:border-accent-primary/50'
                  )}
                />
              </div>
              {email.length > 0 && !emailValid && (
                <p className="text-xs text-red-400">E-posta @metu.edu.tr ile bitmeli.</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-text-secondary">
                Sifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="En az 8 karakter"
                  autoComplete="new-password"
                  className={cn(
                    'w-full pl-10 pr-4 py-3 rounded-xl bg-bg-tertiary border text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 transition-all',
                    password.length > 0 && !passwordValid
                      ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500/50'
                      : 'border-white/10 focus:ring-accent-primary/50 focus:border-accent-primary/50'
                  )}
                />
              </div>
              {password.length > 0 && !passwordValid && (
                <p className="text-xs text-red-400">Şifre en az 8 karakter olmalı.</p>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-text-secondary">
                Şifre Tekrar
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Sifrenizi tekrar girin"
                  autoComplete="new-password"
                  className={cn(
                    'w-full pl-10 pr-4 py-3 rounded-xl bg-bg-tertiary border text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 transition-all',
                    confirmPassword.length > 0 && !passwordsMatch
                      ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500/50'
                      : 'border-white/10 focus:ring-accent-primary/50 focus:border-accent-primary/50'
                  )}
                />
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-400">Sifreler eslesmiyor.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !emailValid || !passwordValid || !passwordsMatch}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                loading
                  ? 'bg-accent-primary/50 text-bg-primary cursor-wait'
                  : 'bg-accent-primary text-bg-primary hover:bg-accent-primary/90'
              )}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              Zaten hesabin var mi?{' '}
              <Link
                href="/giris"
                className="text-accent-primary hover:underline font-medium"
              >
                Giriş Yap
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
