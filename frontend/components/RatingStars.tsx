'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export default function RatingStars({
  rating,
  max = 5,
  size = 'md',
  interactive = false,
  onChange,
  className,
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState<number>(0);

  const displayRating = interactive && hoverRating > 0 ? hoverRating : rating;

  const handleClick = (value: number) => {
    if (interactive && onChange) {
      onChange(value);
    }
  };

  const handleMouseEnter = (value: number) => {
    if (interactive) {
      setHoverRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0);
    }
  };

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const fillPercent = Math.min(1, Math.max(0, displayRating - i));

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            className={cn(
              'relative transition-transform duration-150',
              interactive && 'cursor-pointer hover:scale-110',
              !interactive && 'cursor-default'
            )}
          >
            {/* Background (empty) star */}
            <Star
              className={cn(sizeMap[size], 'text-gray-600')}
              strokeWidth={1.5}
            />
            {/* Filled overlay */}
            {fillPercent > 0 && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPercent * 100}%` }}
              >
                <Star
                  className={cn(sizeMap[size], 'text-accent-primary fill-accent-primary')}
                  strokeWidth={1.5}
                />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
