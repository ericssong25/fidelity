import { useNavigate } from 'react-router-dom';
import { sofiaLoyalty, businesses } from '../../data/mockData';
import LevelProgressBar from '../../components/LevelProgressBar';
import type { Level } from '../../data/mockData';

const levelGradient: Record<Level, string> = {
  Gold: 'linear-gradient(135deg, #7546ED, #DC89FF)',
  Silver: 'linear-gradient(135deg, #032C7D, #7546ED)',
  Bronze: 'linear-gradient(135deg, #12173B, #032C7D)',
};

export default function CardsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F4F3FB] pb-24">
      <div className="sticky top-0 z-30 bg-[#F4F3FB]/95 backdrop-blur-md px-5 py-4 border-b border-[#B1A9E5]/10">
        <h1 className="font-extrabold text-[#12173B] text-xl">My Loyalty Cards</h1>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {sofiaLoyalty.map(record => {
          const biz = businesses.find(b => b.id === record.businessId)!;
          return (
            <div
              key={record.businessId}
              onClick={() => navigate(`/cards/${record.businessId}`)}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#B1A9E5]/10 cursor-pointer hover:shadow-md transition-all duration-200"
            >
              {/* Card top with gradient */}
              <div
                className="px-5 py-4 flex items-start justify-between"
                style={{ background: levelGradient[record.level] }}
              >
                <div>
                  <p className="text-white/70 text-xs font-medium">{biz.category}</p>
                  <p className="text-white font-extrabold text-lg leading-tight">{biz.name}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white`}>
                    {record.level}
                  </span>
                  <p className="text-white/60 text-xs mt-1">{record.visits} visits</p>
                </div>
              </div>

              {/* Points & progress */}
              <div className="px-5 py-4">
                <div className="flex items-end gap-1 mb-4">
                  <span className="text-[#7546ED] font-extrabold text-4xl leading-none">
                    {record.points.toLocaleString()}
                  </span>
                  <span className="text-[#B1A9E5] text-sm mb-1">points</span>
                </div>
                <LevelProgressBar
                  points={record.points}
                  level={record.level}
                  levels={biz.levels}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
