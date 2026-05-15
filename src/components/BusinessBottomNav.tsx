import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Package, Tag, Gift, Shield, Settings } from 'lucide-react';
import { useBusinessData } from '../context/BusinessDataContext';
import { supabase } from '../lib/supabase';

const items = [
  { to: '/business/overview', icon: LayoutDashboard, label: 'Overview' },
  { to: '/business/customers', icon: Users, label: 'Customers' },
  { to: '/business/products', icon: Package, label: 'Products' },
  { to: '/business/promotions', icon: Tag, label: 'Promos' },
  { to: '/business/rewards', icon: Gift, label: 'Rewards' },
  { to: '/business/levels', icon: Shield, label: 'Niveles' },
  { to: '/business/settings', icon: Settings, label: 'Settings' },
];

export default function BusinessBottomNav() {
  const { business } = useBusinessData();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!business?.id) return;
    supabase
      .from('reward_redemptions')
      .select('id, rewards!inner(business_id)', { count: 'exact', head: true })
      .eq('rewards.business_id', business.id)
      .eq('status', 'pending')
      .then(({ count }) => setPendingCount(count ?? 0));
  }, [business?.id]);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#12173B] border-t border-white/10">
      <div className="flex items-center justify-around px-1 py-2">
        {items.map(({ to, icon: Icon, label }) => {
          const isRewards = to === '/business/rewards';
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all duration-200 ${
                  isActive ? 'text-[#7546ED]' : 'text-[#B1A9E5]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                    {isRewards && pendingCount > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-[16px] h-[16px] rounded-full bg-[#FF6B6B] text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
                        {pendingCount >= 10 ? '9+' : pendingCount}
                      </span>
                    )}
                  </span>
                  <span className="text-[9px] font-semibold">{label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
