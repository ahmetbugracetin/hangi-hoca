'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Star, MessageSquare, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Instructor } from '@/types';

interface InstructorCardProps {
  instructor: Instructor;
  className?: string;
}

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
    'bg-amber-600', 'bg-blue-600', 'bg-emerald-600', 'bg-purple-600',
    'bg-rose-600', 'bg-cyan-600', 'bg-orange-600', 'bg-indigo-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function InstructorCard({ instructor, className }: InstructorCardProps) {
  const initials = getInitials(instructor.name);
  const avatarColor = getAvatarColor(instructor.name);

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
      <Link
        href={`/hoca/${instructor.slug}`}
        className={cn(
          'block rounded-xl bg-bg-secondary border border-white/10 p-5',
          'hover:border-accent-primary/30 transition-colors duration-200',
          className
        )}
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {instructor.photoUrl ? (
            <img
              src={instructor.photoUrl}
              alt={instructor.name}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold text-white',
                avatarColor
              )}
            >
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="text-text-primary font-semibold truncate">
              {instructor.name}
            </h3>
            <p className="text-sm text-text-secondary truncate">
              {instructor.title}
            </p>
            {instructor.department && (
              <p className="text-xs text-text-secondary mt-0.5 truncate">
                {instructor.department.name}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5">
          {/* Rating */}
          {instructor.avgOverall != null && (
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-accent-primary fill-accent-primary" />
              <span className="text-sm font-semibold text-text-primary">
                {instructor.avgOverall.toFixed(1)}
              </span>
            </div>
          )}

          {/* Review count */}
          {instructor.totalReviews != null && (
            <div className="flex items-center gap-1.5 text-text-secondary">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-xs">
                {instructor.totalReviews} değerlendirme
              </span>
            </div>
          )}

          {/* Would retake */}
          {instructor.wouldRetakePercent != null && (
            <div className="flex items-center gap-1.5 text-text-secondary ml-auto">
              <ThumbsUp className="w-3.5 h-3.5" />
              <span className="text-xs">
                %{Math.round(instructor.wouldRetakePercent)}
              </span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
