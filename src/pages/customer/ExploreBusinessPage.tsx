import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Heart } from 'lucide-react';
import { businesses, sofiaLoyalty } from '../../data/mockData';
import Modal from '../../components/Modal';
import { useApp } from '../../context/AppContext';

const tabs = ['Feed', 'Promotions', 'Products', 'Rewards'] as const;
type Tab = typeof tabs[number];

const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

export default function ExploreBusinessPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [tab, setTab] = useState<Tab>('Feed');
  const [followed, setFollowed] = useState(false);
  const [redeemModal, setRedeemModal] = useState<{ name: string; cost: number } | null>(null);

  const biz = businesses.find(b => b.id === businessId);
  if (!biz) return <div className="p-8 text-center text-[#B1A9E5]">Business not found</div>;

  const loyalty = sofiaLoyalty.find(l => l.businessId === businessId);

  const levelBg = { Gold: 'bg-[#7546ED]', Silver: 'bg-[#032C7D]', Bronze: 'bg-[#12173B]' };

  function handleRedeem() {
    setRedeemModal(null);
    showToast(`Reward redeemed! ${redeemModal?.name}`, 'success');
  }

  return (
    <div className="min-h-screen bg-[#F4F3FB] pb-40">
      {/* Cover */}
      <div
        className="relative h-52"
        style={{ background: 'linear-gradient(135deg, #12173B, #7546ED)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-black/30 backdrop-blur-sm flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <button
          onClick={() => setFollowed(f => !f)}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-black/30 backdrop-blur-sm flex items-center justify-center"
        >
          <Heart size={18} className={followed ? 'text-[#FF6B6B] fill-[#FF6B6B]' : 'text-white'} />
        </button>

        {/* Logo overlapping */}
        <div className="absolute -bottom-7 left-5 w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center border-2 border-white">
          <span className="font-extrabold text-[#7546ED] text-xl">{biz.name.charAt(0)}</span>
        </div>
      </div>

      {/* Business info */}
      <div className="px-5 pt-10 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-[#12173B]">{biz.name}</h1>
            <span className="inline-block bg-[#7546ED]/10 text-[#7546ED] text-xs font-semibold px-2 py-0.5 rounded-full mt-1">
              {biz.category}
            </span>
          </div>
          <button
            onClick={() => setFollowed(f => !f)}
            className={`px-4 py-2 rounded-btn text-sm font-bold border-2 transition-all duration-200 ${
              followed
                ? 'bg-[#7546ED] border-[#7546ED] text-white'
                : 'bg-transparent border-[#7546ED] text-[#7546ED]'
            }`}
          >
            {followed ? 'Following' : 'Follow'}
          </button>
        </div>
        <p className="text-[#B1A9E5] text-xs mt-2 leading-relaxed">{biz.description}</p>
        <div className="flex items-center gap-1 mt-2">
          <MapPin size={12} className="text-[#B1A9E5]" />
          <span className="text-[#B1A9E5] text-xs">{biz.address}</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <Phone size={12} className="text-[#B1A9E5]" />
          <span className="text-[#B1A9E5] text-xs">{biz.phone}</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-5 mb-4 overflow-x-auto scrollbar-hide">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
              tab === t
                ? 'bg-[#7546ED] text-white'
                : 'bg-white text-[#B1A9E5] border border-[#B1A9E5]/20'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-5">
        {tab === 'Feed' && (
          <div className="space-y-3">
            {biz.news.map(n => (
              <div key={n.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#B1A9E5]">{n.date}</span>
                  {n.pinned && (
                    <span className="text-[9px] font-bold text-[#7546ED] bg-[#7546ED]/10 px-2 py-0.5 rounded-full">PINNED</span>
                  )}
                </div>
                <p className="font-bold text-[#12173B] text-sm">{n.title}</p>
                <p className="text-[#B1A9E5] text-xs mt-1">{n.excerpt}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'Promotions' && (
          <div className="space-y-3">
            {biz.promotions.map(p => (
              <div
                key={p.id}
                className="rounded-2xl p-4 text-white"
                style={{ background: 'linear-gradient(135deg, #DC89FF, #7546ED)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {p.discount}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    p.status === 'Active' ? 'bg-[#10B981]/30 text-white' : 'bg-white/20 text-white/70'
                  }`}>{p.status}</span>
                </div>
                <p className="font-bold text-sm">{p.title}</p>
                <p className="text-white/70 text-xs mt-1">{p.dateRange}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'Products' && (
          <div className="grid grid-cols-2 gap-3">
            {biz.products.map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-3 shadow-sm border border-[#B1A9E5]/10">
                <div className="h-16 rounded-xl bg-[#7546ED]/10 mb-2 flex items-center justify-center">
                  <span className="text-[#7546ED] font-bold text-xl">{p.name.charAt(0)}</span>
                </div>
                <p className="font-bold text-[#12173B] text-xs leading-tight">{p.name}</p>
                <p className="text-[#B1A9E5] text-[10px] mt-0.5">{p.category}</p>
                <p className="text-[#7546ED] font-extrabold text-sm mt-1">
                  ${p.price.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === 'Rewards' && (
          <div className="space-y-3">
            {biz.rewards.map(r => (
              <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#12173B] text-sm">{r.name}</p>
                  <span className="inline-block bg-[#7546ED]/10 text-[#7546ED] text-xs font-bold px-2 py-0.5 rounded-full mt-1">
                    {r.pointsCost} pts
                  </span>
                </div>
                <button
                  onClick={() => setRedeemModal({ name: r.name, cost: r.pointsCost })}
                  disabled={!loyalty || loyalty.points < r.pointsCost}
                  className="px-4 py-2 rounded-btn bg-[#7546ED] text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-[#6035cc]"
                >
                  Redeem
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hours */}
        <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10">
          <h3 className="font-bold text-[#12173B] text-sm mb-3">Hours</h3>
          <div className="space-y-1.5">
            {biz.hours.map((h, i) => (
              <div
                key={h.day}
                className={`flex items-center justify-between text-xs py-1.5 px-2 rounded-lg transition-colors ${
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

      {/* Sticky bottom bar */}
      {loyalty && (
        <div className="fixed bottom-16 left-0 right-0 z-20 px-4">
          <div
            className="rounded-2xl px-5 py-3 flex items-center justify-between shadow-lg"
            style={{ background: 'rgba(18,23,59,0.85)', backdropFilter: 'blur(16px)' }}
          >
            <div>
              <p className="text-white/60 text-xs">Your points</p>
              <p className="text-white font-extrabold text-xl">{loyalty.points.toLocaleString()}</p>
            </div>
            <span className={`text-white font-bold text-xs px-3 py-1.5 rounded-full ${levelBg[loyalty.level]}`}>
              {loyalty.level}
            </span>
          </div>
        </div>
      )}

      {/* Redeem modal */}
      <Modal open={!!redeemModal} onClose={() => setRedeemModal(null)} title="Redeem Reward">
        {redeemModal && (
          <div>
            <p className="text-[#12173B] font-semibold mb-1">{redeemModal.name}</p>
            <p className="text-[#B1A9E5] text-sm mb-4">
              This will cost <span className="text-[#7546ED] font-bold">{redeemModal.cost} pts</span>.
              Your balance: <span className="text-[#12173B] font-bold">{loyalty?.points ?? 0} pts</span>
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
