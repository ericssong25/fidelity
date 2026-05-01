import { useState } from 'react';
import { Plus, CheckCircle, XCircle } from 'lucide-react';
import { businesses, pendingRedemptions } from '../../data/mockData';
import Modal from '../../components/Modal';
import { useApp } from '../../context/AppContext';

export default function RewardsPage() {
  const { showToast } = useApp();
  const [rewards, setRewards] = useState(businesses[0].rewards.map(r => ({ ...r })));
  const [redemptions, setRedemptions] = useState(pendingRedemptions.map(r => ({ ...r, resolved: null as null | 'completed' | 'cancelled' })));
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [points, setPoints] = useState('');

  function toggleAvailable(id: string) {
    setRewards(prev => prev.map(r => r.id === id ? { ...r, available: !r.available } : r));
  }

  function resolveRedemption(id: string, action: 'completed' | 'cancelled') {
    setRedemptions(prev => prev.map(r => r.id === id ? { ...r, resolved: action } : r));
    showToast(action === 'completed' ? 'Redemption completed!' : 'Redemption cancelled', action === 'completed' ? 'success' : 'error');
  }

  function handleCreate() {
    setModal(false);
    setName(''); setPoints('');
    showToast('Reward created!', 'success');
  }

  return (
    <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-extrabold text-[#12173B] text-xl">Rewards</h1>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-btn bg-[#7546ED] text-white text-xs font-bold"
        >
          <Plus size={14} />
          Create
        </button>
      </div>

      {/* Rewards list */}
      <div className="space-y-3 mb-8">
        {rewards.map(r => (
          <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10 flex items-center justify-between">
            <div>
              <p className="font-bold text-[#12173B] text-sm">{r.name}</p>
              <span className="inline-block bg-[#7546ED]/10 text-[#7546ED] text-xs font-bold px-2 py-0.5 rounded-full mt-1">
                {r.pointsCost} pts
              </span>
            </div>
            <button
              onClick={() => toggleAvailable(r.id)}
              className={`w-11 h-6 rounded-full transition-all duration-300 relative ${r.available ? 'bg-[#10B981]' : 'bg-[#B1A9E5]/30'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${r.available ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>

      {/* Pending Redemptions */}
      <h2 className="font-bold text-[#12173B] text-base mb-3">Pending Redemptions</h2>
      <div className="space-y-3">
        {redemptions.map(r => (
          <div key={r.id} className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
            r.resolved === 'completed' ? 'border-[#10B981]/30 opacity-60' :
            r.resolved === 'cancelled' ? 'border-[#FF6B6B]/30 opacity-60' :
            'border-[#B1A9E5]/10'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-[#12173B] text-sm">{r.customer}</p>
                <p className="text-[#B1A9E5] text-xs">{r.reward}</p>
                <p className="text-[#B1A9E5] text-xs mt-0.5">{r.date}</p>
              </div>
              {!r.resolved ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => resolveRedemption(r.id, 'completed')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-btn bg-[#10B981]/10 text-[#10B981] text-xs font-bold"
                  >
                    <CheckCircle size={13} />
                    Complete
                  </button>
                  <button
                    onClick={() => resolveRedemption(r.id, 'cancelled')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-btn bg-[#FF6B6B]/10 text-[#FF6B6B] text-xs font-bold"
                  >
                    <XCircle size={13} />
                    Cancel
                  </button>
                </div>
              ) : (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  r.resolved === 'completed' ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#FF6B6B]/10 text-[#FF6B6B]'
                }`}>
                  {r.resolved.charAt(0).toUpperCase() + r.resolved.slice(1)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Create Reward">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Reward Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Free Espresso"
              className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Points Cost</label>
            <input value={points} onChange={e => setPoints(e.target.value)} type="number" placeholder="0"
              className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" />
          </div>
          <button onClick={handleCreate} className="w-full py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm">
            Create Reward
          </button>
        </div>
      </Modal>
    </div>
  );
}
