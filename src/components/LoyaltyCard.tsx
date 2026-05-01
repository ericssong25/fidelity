import type { Level } from '../data/mockData';

const gradients: Record<Level, string> = {
  Gold: 'linear-gradient(135deg, #7546ED, #DC89FF)',
  Silver: 'linear-gradient(135deg, #032C7D, #7546ED)',
  Bronze: 'linear-gradient(135deg, #12173B, #032C7D)',
};

const levelColors: Record<Level, string> = {
  Gold: 'rgba(220, 137, 255, 0.3)',
  Silver: 'rgba(117, 70, 237, 0.3)',
  Bronze: 'rgba(3, 44, 125, 0.3)',
};

interface Props {
  businessName: string;
  points: number;
  level: Level;
  visits: number;
  compact?: boolean;
}

export default function LoyaltyCard({ businessName, points, level, visits, compact = false }: Props) {
  return (
    <div
      className={`relative overflow-hidden flex-shrink-0 ${compact ? 'w-44 h-28 rounded-2xl' : 'w-72 h-44 rounded-2xl'}`}
      style={{ background: gradients[level] }}
    >
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-10 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Glassmorphism orb */}
      <div
        className="absolute -right-6 -top-6 rounded-full opacity-30"
        style={{
          width: compact ? 80 : 120,
          height: compact ? 80 : 120,
          background: levelColors[level],
          backdropFilter: 'blur(20px)',
        }}
      />
      <div
        className="absolute -right-2 -bottom-8 rounded-full opacity-20"
        style={{
          width: compact ? 60 : 90,
          height: compact ? 60 : 90,
          background: 'rgba(255,255,255,0.3)',
        }}
      />

      <div className={`relative z-10 flex flex-col h-full ${compact ? 'p-3' : 'p-5'}`}>
        <div className="flex items-start justify-between">
          <p className={`text-white/80 font-semibold truncate ${compact ? 'text-xs' : 'text-sm'}`}>
            {businessName}
          </p>
          <span
            className={`text-white font-bold uppercase rounded-full bg-white/20 backdrop-blur-sm ${
              compact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'
            }`}
          >
            {level}
          </span>
        </div>

        <div className="flex-1 flex items-end justify-between">
          <div>
            <p className={`text-white font-extrabold leading-none ${compact ? 'text-2xl' : 'text-4xl'}`}>
              {points.toLocaleString()}
            </p>
            <p className={`text-white/60 mt-0.5 ${compact ? 'text-[9px]' : 'text-xs'}`}>points</p>
          </div>
          <p className={`text-white/60 ${compact ? 'text-[9px]' : 'text-xs'}`}>
            {visits} visits
          </p>
        </div>
      </div>
    </div>
  );
}
