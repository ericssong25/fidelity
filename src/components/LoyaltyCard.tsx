interface Props {
  businessName: string;
  currentPoints: number;
  totalPointsEarned?: number;
  level: string;
  levelColor?: string;
  visits: number;
  compact?: boolean;
}

const levelGradients: Record<string, string> = {
  Gold: 'linear-gradient(135deg, #7546ED, #DC89FF)',
  Silver: 'linear-gradient(135deg, #032C7D, #7546ED)',
  Bronze: 'linear-gradient(135deg, #12173B, #032C7D)',
};

const levelOrbs: Record<string, string> = {
  Gold: 'rgba(220, 137, 255, 0.3)',
  Silver: 'rgba(117, 70, 237, 0.3)',
  Bronze: 'rgba(3, 44, 125, 0.3)',
};

function getGradient(level: string, levelColor?: string): string {
  return levelGradients[level] || `linear-gradient(135deg, ${levelColor || '#7546ED'}, #DC89FF)`;
}

function getOrbColor(level: string, levelColor?: string): string {
  return levelOrbs[level] || `rgba(${levelColor ? parseInt(levelColor.slice(1, 3), 16) : 117}, ${levelColor ? parseInt(levelColor.slice(3, 5), 16) : 70}, ${levelColor ? parseInt(levelColor.slice(5, 7), 16) : 237}, 0.3)`;
}

export default function LoyaltyCard({ businessName, currentPoints, totalPointsEarned, level, levelColor, visits, compact = false }: Props) {
  const gradient = getGradient(level, levelColor);
  const orb = getOrbColor(level, levelColor);

  return (
    <div
      className={`relative overflow-hidden flex-shrink-0 ${compact ? 'w-44 h-28 rounded-2xl' : 'w-72 h-44 rounded-2xl'}`}
      style={{ background: gradient }}
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
          background: orb,
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
              {currentPoints.toLocaleString()}
            </p>
            <p className={`text-white/60 mt-0.5 ${compact ? 'text-[9px]' : 'text-xs'}`}>pts disponibles</p>
            {totalPointsEarned !== undefined && (
              <p className={`text-white/50 ${compact ? 'text-[8px]' : 'text-[10px]'} mt-0.5`}>
                {totalPointsEarned.toLocaleString()} acumulados
              </p>
            )}
          </div>
          <p className={`text-white/60 ${compact ? 'text-[9px]' : 'text-xs'}`}>
            {visits} visitas
          </p>
        </div>
      </div>
    </div>
  );
}
