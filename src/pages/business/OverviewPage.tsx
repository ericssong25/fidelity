import { Users, TrendingUp, Zap, Gift, AlertCircle, RefreshCw } from 'lucide-react';
import { useBusinessData } from '../../context/BusinessDataContext';
import RoleSwitcher from '../../components/RoleSwitcher';

export default function OverviewPage() {
  const { business, loyaltyCards, loading, error, refresh } = useBusinessData();

  // Calculate real KPIs from data
  const totalCustomers = loyaltyCards.length;
  const activeThisMonth = loyaltyCards.filter(card => {
    const issuedDate = new Date(card.issued_at);
    const thisMonth = new Date();
    return issuedDate.getMonth() === thisMonth.getMonth() && 
           issuedDate.getFullYear() === thisMonth.getFullYear();
  }).length;
  
  const pointsToday = loyaltyCards.reduce((sum, card) => sum + (card.current_points || 0), 0);
  const redemptions = 0; // TODO: Implement redemptions tracking

  // Update KPIs with real data
  const realKpiCards = [
    { label: 'Total Customers', value: totalCustomers, icon: Users, color: '#7546ED' },
    { label: 'Active This Month', value: activeThisMonth, icon: TrendingUp, color: '#DC89FF' },
    { label: 'Points Today', value: pointsToday, icon: Zap, color: '#10B981' },
    { label: 'Redemptions', value: redemptions, icon: Gift, color: '#FF6B6B' },
  ];

  if (loading) {
    return (
      <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-[#B1A9E5]/30 border-t-[#7546ED] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#B1A9E5] text-sm">Loading dashboard...</p>
          <p className="text-[#B1A9E5] text-xs mt-2">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
        <div className="text-center py-8">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-sm font-medium mb-2">Error loading data</p>
          <p className="text-[#B1A9E5] text-xs mb-4">{error}</p>
          <button
            onClick={refresh}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-[#7546ED] text-white rounded-btn text-sm font-bold"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
        <div className="text-center py-8">
          <p className="text-[#B1A9E5] text-sm">No business found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[#B1A9E5] text-sm">Good morning,</p>
          <h1 className="font-extrabold text-[#12173B] text-xl flex items-center gap-1">
            {business?.name || 'Loading...'} <span>☕</span>
          </h1>
        </div>
        <RoleSwitcher />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {realKpiCards.map(kpi => (
          <div
            key={kpi.label}
            className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10"
            style={{ borderLeft: `3px solid ${kpi.color}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <kpi.icon size={18} style={{ color: kpi.color }} />
            </div>
            <p className="text-[#12173B] font-extrabold text-2xl">{kpi.value}</p>
            <p className="text-[#B1A9E5] text-xs font-medium mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#B1A9E5]/10">
        <h2 className="font-bold text-[#12173B] text-lg mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {loyaltyCards.length === 0 ? (
            <div className="text-center py-8">
              <Gift size={48} className="text-[#B1A9E5] mx-auto mb-4" />
              <p className="text-[#B1A9E5] text-sm">No loyalty cards created yet</p>
              <p className="text-[#B1A9E5] text-xs mt-1">Create your first card to see activity here</p>
            </div>
          ) : (
            loyaltyCards.slice(0, 5).map((card: any) => (
              <div key={card.id} className="flex items-center justify-between p-3 border-b border-[#B1A9E5]/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#7546ED]/10 flex items-center justify-center">
                    <span className="text-[#7546ED] font-bold text-sm">
                      {card.profiles?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-[#12173B] text-sm">
                      {card.profiles?.name || 'Unknown User'}
                    </p>
                    <p className="text-[#B1A9E5] text-xs">
                      Card: {card.card_number} • {card.current_points} pts
                    </p>
                    <p className="text-[#B1A9E5] text-xs">
                      Joined: {new Date(card.issued_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
