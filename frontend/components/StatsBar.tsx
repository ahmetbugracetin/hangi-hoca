'use client';

import { useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { Users, MessageSquare, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Stats } from '@/types';

interface StatsBarProps {
  stats: Stats;
  className?: string;
}

function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => {
    if (latest >= 1000) {
      return `${(latest / 1000).toFixed(1)}K`;
    }
    return Math.round(latest).toLocaleString('tr-TR');
  });

  useEffect(() => {
    if (isInView) {
      const controls = animate(motionValue, value, { duration, ease: 'easeOut' });
      return () => controls.stop();
    }
  }, [isInView, value, duration, motionValue]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

const statItems = [
  { key: 'totalInstructors' as const, label: 'Hoca', icon: Users },
  { key: 'totalReviews' as const, label: 'Değerlendirme', icon: MessageSquare },
  { key: 'totalDepartments' as const, label: 'Bölüm', icon: Building2 },
];

export default function StatsBar({ stats, className }: StatsBarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-8 md:gap-12 py-4 px-6',
        'rounded-xl bg-bg-secondary/50 border border-white/5',
        className
      )}
    >
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.key} className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent-primary/10">
              <Icon className="w-4 h-4 text-accent-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-text-primary leading-tight">
                <AnimatedCounter value={stats[item.key]} />
              </span>
              <span className="text-xs text-text-secondary">{item.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
