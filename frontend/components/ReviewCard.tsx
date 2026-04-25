'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, Calendar, BookOpen, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import RatingStars from '@/components/RatingStars';
import type { Review } from '@/types';

interface ReviewCardProps {
  review: Review;
  className?: string;
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMin < 1) return 'az once';
  if (diffMin < 60) return `${diffMin} dk once`;
  if (diffHours < 24) return `${diffHours} saat once`;
  if (diffDays < 7) return `${diffDays} gun once`;
  if (diffWeeks < 5) return `${diffWeeks} hafta once`;
  if (diffMonths < 12) return `${diffMonths} ay once`;
  return `${diffYears} yil once`;
}

export default function ReviewCard({ review, className }: ReviewCardProps) {
  const [upvotes, setUpvotes] = useState(review.upvotes);
  const [downvotes, setDownvotes] = useState(review.downvotes);
  const [voting, setVoting] = useState(false);

  const handleVote = async (type: 'up' | 'down') => {
    const token = getToken();
    if (!token || voting) return;

    setVoting(true);
    try {
      await api.reviews.vote(token, review.id, type);
      if (type === 'up') {
        setUpvotes((prev) => prev + 1);
      } else {
        setDownvotes((prev) => prev + 1);
      }
    } catch {
      // silently fail
    } finally {
      setVoting(false);
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl bg-bg-secondary border border-white/10 p-5 space-y-4',
        className
      )}
    >
      {/* Header: course + semester + time */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {review.course && (
            <div className="flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4 text-accent-secondary flex-shrink-0" />
              <span className="font-medium text-text-primary truncate">
                {review.course.code} - {review.course.name}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
            <Calendar className="w-3.5 h-3.5" />
            <span>{review.semester}</span>
          </div>
        </div>
        <span className="text-xs text-text-secondary whitespace-nowrap flex-shrink-0">
          {getRelativeTime(review.createdAt)}
        </span>
      </div>

      {/* Rating bars */}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary w-16">Anlatım</span>
          <RatingStars rating={review.clarity} size="sm" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary w-16">Adalet</span>
          <RatingStars rating={review.fairness} size="sm" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary w-16">İş Yükü</span>
          <RatingStars rating={review.workload} size="sm" />
        </div>
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-sm text-text-primary leading-relaxed">
          {review.comment}
        </p>
      )}

      {/* Badges + Vote */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <div className="flex items-center gap-2">
          {/* Attendance badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
              review.attendance
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            )}
          >
            {review.attendance ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            Devam
          </span>

          {/* Would retake badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
              review.wouldRetake
                ? 'bg-accent-primary/10 text-accent-primary'
                : 'bg-red-500/10 text-red-400'
            )}
          >
            {review.wouldRetake ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            Tekrar Alırdım
          </span>
        </div>

        {/* Vote buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleVote('up')}
            disabled={voting}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-text-secondary hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-50"
          >
            <ChevronUp className="w-4 h-4" />
            <span className="text-xs">{upvotes}</span>
          </button>
          <button
            onClick={() => handleVote('down')}
            disabled={voting}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
          >
            <ChevronDown className="w-4 h-4" />
            <span className="text-xs">{downvotes}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
