import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

function SkeletonBase({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-bg-tertiary',
        className
      )}
    />
  );
}

export function SkeletonText({ className }: SkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <SkeletonBase className="h-4 w-3/4" />
      <SkeletonBase className="h-4 w-1/2" />
    </div>
  );
}

export function SkeletonAvatar({ className }: SkeletonProps) {
  return <SkeletonBase className={cn('h-12 w-12 rounded-full', className)} />;
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-bg-secondary border border-white/10 p-5 space-y-4',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <SkeletonAvatar />
        <div className="flex-1 space-y-2">
          <SkeletonBase className="h-4 w-2/3" />
          <SkeletonBase className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonBase className="h-3 w-1/4" />
      <div className="space-y-2">
        <SkeletonBase className="h-3 w-full" />
        <SkeletonBase className="h-3 w-5/6" />
      </div>
    </div>
  );
}

export function SkeletonReviewCard({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-bg-secondary border border-white/10 p-5 space-y-4',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <SkeletonBase className="h-4 w-1/3" />
        <SkeletonBase className="h-3 w-20" />
      </div>
      <div className="flex gap-4">
        <SkeletonBase className="h-3 w-24" />
        <SkeletonBase className="h-3 w-24" />
        <SkeletonBase className="h-3 w-24" />
      </div>
      <div className="space-y-2">
        <SkeletonBase className="h-3 w-full" />
        <SkeletonBase className="h-3 w-full" />
        <SkeletonBase className="h-3 w-3/4" />
      </div>
      <div className="flex items-center gap-3">
        <SkeletonBase className="h-8 w-16 rounded-lg" />
        <SkeletonBase className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6 p-6">
      <SkeletonBase className="h-8 w-1/3" />
      <SkeletonBase className="h-4 w-1/2" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
