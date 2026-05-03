interface LevelData {
  name: string;
  min_points: number;
  color?: string;
}

interface Props {
  points: number;
  levels: LevelData[];
}

export default function LevelProgressBar({ points, levels }: Props) {
  const safeLevels: LevelData[] = levels.length > 0 ? levels : [
    { name: 'Bronze', min_points: 0 },
    { name: 'Silver', min_points: 500 },
    { name: 'Gold', min_points: 1000 }
  ];

  const maxLevel = safeLevels[safeLevels.length - 1];
  const currentThreshold = [...safeLevels].reverse().find(l => points >= l.min_points) ?? safeLevels[0];
  const nextThreshold = safeLevels.find(l => l.min_points > points);

  const segmentStart = currentThreshold.min_points;
  const segmentEnd = nextThreshold ? nextThreshold.min_points : maxLevel.min_points;
  const progress = nextThreshold
    ? Math.min(((points - segmentStart) / (segmentEnd - segmentStart)) * 100, 100)
    : 100;

  const currentColor = currentThreshold.color || '#7546ED';
  const nextColor = nextThreshold?.color || '#DC89FF';

  return (
    <div className="w-full">
      <div className="relative h-2.5 bg-[#B1A9E5]/20 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${currentColor}, ${nextColor})`,
          }}
        />
      </div>
      <div className="flex justify-between mt-2">
        {safeLevels.map((l) => (
          <div key={l.name} className="flex flex-col items-center gap-0.5">
            <div
              className={`w-2 h-2 rounded-full ${points >= l.min_points ? '' : 'bg-[#B1A9E5]/40'}`}
              style={points >= l.min_points ? { background: l.color || '#7546ED' } : undefined}
            />
            <span className="text-[9px] text-[#B1A9E5] font-medium">{l.name}</span>
          </div>
        ))}
      </div>
      {nextThreshold && (
        <p className="text-xs text-[#B1A9E5] mt-1">
          {nextThreshold.min_points - points} pts para{' '}
          <span className="font-semibold" style={{ color: nextThreshold.color || '#7546ED' }}>{nextThreshold.name}</span>
        </p>
      )}
      {!nextThreshold && (
        <p className="text-xs text-[#10B981] font-semibold mt-1">¡Nivel máximo alcanzado!</p>
      )}
    </div>
  );
}
