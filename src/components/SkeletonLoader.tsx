interface Props {
  rows?: number;
  className?: string;
}

export default function SkeletonLoader({ rows = 3, className = '' }: Props) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse flex gap-3 items-center">
          <div className="w-12 h-12 rounded-xl bg-[#B1A9E5]/20 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-[#B1A9E5]/20 rounded-full w-3/4" />
            <div className="h-3 bg-[#B1A9E5]/20 rounded-full w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
