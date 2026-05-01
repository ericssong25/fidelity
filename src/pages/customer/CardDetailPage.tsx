import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone } from 'lucide-react';
import { sofiaLoyalty, businesses } from '../../data/mockData';
import LevelProgressBar from '../../components/LevelProgressBar';
import Modal from '../../components/Modal';
import { useApp } from '../../context/AppContext';
import type { Level } from '../../data/mockData';

const tabs = ['Activity', 'Rewards', 'About'] as const;
type Tab = typeof tabs[number];

const levelGradient: Record<Level, string> = {
  Gold: 'linear-gradient(135deg, #7546ED, #DC89FF)',
  Silver: 'linear-gradient(135deg, #032C7D, #7546ED)',
  Bronze: 'linear-gradient(135deg, #12173B, #032C7D)',
};

const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

export default function CardDetailPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [tab, setTab] = useState<Tab>('Activity');
  const [redeemModal, setRedeemModal] = useState<{ name: string; cost: number } | null>(null);

  const biz = businesses.find(b => b.id === businessId);
  const loyalty = sofiaLoyalty.find(l => l.businessId === businessId);

  if (!biz || !loyalty) return <div className="p-8 text-center text-[#B1A9E5]">Not found</div>;

  function handleRedeem() {
    setRedeemModal(null);
    showToast(`Reward redeemed: ${redeemModal?.name}`, 'success');
  }

  return (
    <div className="min-h-screen bg-[#F4F3FB] pb-24">
      {/* Header cover */}
      <div
        className="relative px-5 pt-14 pb-6"
        style={{ background: levelGradient[loyalty.level] }}
      >
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-black/20 backdrop-blur-sm flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>

        <p className="text-white/70 text-xs font-medium">{biz.category}</p>
        <h1 className="text-2xl font-extrabold text-white mt-0.5">{biz.name}</h1>

        <div className="flex items-end gap-2 mt-4">
          <span className="text-white font-extrabold text-5xl leading-none">
            {loyalty.points.toLocaleString()}
          </span>
          <span className="text-white/60 text-sm mb-1">points</span>
        </div>

        <div className="mt-3">
          <LevelProgressBar
            points={loyalty.points}
            level={loyalty.level}
            levels={biz.levels}
          />
        </div>

        <span className="absolute top-4 right-4 bg-white/20 text-white font-bold text-xs px-3 py-1 rounded-full">
          {loyalty.level}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-5 pt-4 pb-2 bg-[#F4F3FB] sticky top-0 z-10">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
              tab === t
                ? 'bg-[#7546ED] text-white'
                : 'bg-white text-[#B1A9E5] border border-[#B1A9E5]/20'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-5 pt-2">
        {tab === 'Activity' && (
          <div className="space-y-2">
            {loyalty.transactions.map(tx => (
              <div
                key={tx.id}
                className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-[#B1A9E5]/10 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-[#12173B] text-sm">{tx.description}</p>
                  <p className="text-[#B1A9E5] text-xs mt-0.5">{tx.date}</p>
                </div>
                <span
                  className={`font-extrabold text-sm ${
                    tx.points > 0 ? 'text-[#10B981]' : 'text-[#FF6B6B]'
                  }`}
                >
                  {tx.points > 0 ? '+' : ''}{tx.points} pts
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === 'Rewards' && (
          <div className="space-y-3">
            {biz.rewards.map(r => (
              <div
                key={r.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-[#12173B] text-sm">{r.name}</p>
                  <span className="inline-block bg-[#7546ED]/10 text-[#7546ED] text-xs font-bold px-2 py-0.5 rounded-full mt-1">
                    {r.pointsCost} pts
                  </span>
                </div>
                <button
                  onClick={() => setRedeemModal({ name: r.name, cost: r.pointsCost })}
                  disabled={loyalty.points < r.pointsCost}
                  className="px-4 py-2 rounded-btn bg-[#7546ED] text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Redeem
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'About' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10">
              <p className="text-[#B1A9E5] text-sm mb-3">{biz.description}</p>
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={14} className="text-[#7546ED]" />
                <span className="text-[#12173B] text-sm">{biz.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-[#7546ED]" />
                <span className="text-[#12173B] text-sm">{biz.phone}</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10">
              <h3 className="font-bold text-[#12173B] text-sm mb-3">Hours</h3>
              <div className="space-y-1.5">
                {biz.hours.map((h, i) => (
                  <div
                    key={h.day}
                    className={`flex items-center justify-between text-xs py-1.5 px-2 rounded-lg ${
                      i === todayIndex ? 'bg-[#7546ED]/5 border-l-2 border-[#7546ED]' : ''
                    }`}
                  >
                    <span className={`font-medium ${i === todayIndex ? 'text-[#7546ED]' : 'text-[#B1A9E5]'}`}>
                      {h.day}
                    </span>
                    <span className={`font-semibold ${i === todayIndex ? 'text-[#7546ED]' : 'text-[#12173B]'}`}>
                      {h.hours}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!redeemModal} onClose={() => setRedeemModal(null)} title="Redeem Reward">
        {redeemModal && (
          <div>
            <p className="text-[#12173B] font-semibold mb-1">{redeemModal.name}</p>
            <p className="text-[#B1A9E5] text-sm mb-4">
              This will cost <span className="text-[#7546ED] font-bold">{redeemModal.cost} pts</span>.
              Your balance: <span className="text-[#12173B] font-bold">{loyalty.points} pts</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRedeemModal(null)}
                className="flex-1 py-3 rounded-btn border border-[#B1A9E5]/40 text-[#B1A9E5] font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRedeem}
                className="flex-1 py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
