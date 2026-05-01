import type { Level, LevelThreshold } from '../data/mockData';

interface Props {
  points: number;
  level: Level;
  levels: LevelThreshold[];
}

export default function LevelProgressBar({ points, levels }: Props) {
  const maxLevel = levels[levels.length - 1];
  const currentThreshold = [...levels].reverse().find(l => points >= l.minPoints) ?? levels[0];
  const nextThreshold = levels.find(l => l.minPoints > points);

  const segmentStart = currentThreshold.minPoints;
  const segmentEnd = nextThreshold ? nextThreshold.minPoints : maxLevel.minPoints;
  const progress = nextThreshold
    ? Math.min(((points - segmentStart) / (segmentEnd - segmentStart)) * 100, 100)
    : 100;

  return (
    <div className="w-full">
      <div className="relative h-2.5 bg-[#B1A9E5]/20 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #7546ED, #DC89FF)',
          }}
        />
      </div>
      <div className="flex justify-between mt-2">
        {levels.map((l) => (
          <div key={l.level} className="flex flex-col items-center gap-0.5">
            <div
              className={`w-2 h-2 rounded-full ${points >= l.minPoints ? 'bg-[#7546ED]' : 'bg-[#B1A9E5]/40'}`}
            />
            <span className="text-[9px] text-[#B1A9E5] font-medium">{l.level}</span>
          </div>
        ))}
      </div>
      {nextThreshold && (
        <p className="text-xs text-[#B1A9E5] mt-1">
          {nextThreshold.minPoints - points} pts to{' '}
          <span className="text-[#7546ED] font-semibold">{nextThreshold.level}</span>
        </p>
      )}
      {!nextThreshold && (
        <p className="text-xs text-[#7546ED] font-semibold mt-1">Max level reached!</p>
      )}
    </div>
  );
}
