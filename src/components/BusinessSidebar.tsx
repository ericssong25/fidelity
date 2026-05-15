import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, Tag, Gift, Shield, Newspaper, Settings, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useBusinessData } from '../context/BusinessDataContext';
import { supabase } from '../lib/supabase';

const items = [
  { to: '/business/overview', icon: LayoutDashboard, label: 'Resumen' },
  { to: '/business/customers', icon: Users, label: 'Clientes' },
  { to: '/business/products', icon: Package, label: 'Productos' },
  { to: '/business/promotions', icon: Tag, label: 'Promociones' },
  { to: '/business/rewards', icon: Gift, label: 'Recompensas' },
  { to: '/business/levels', icon: Shield, label: 'Niveles' },
  { to: '/business/news', icon: Newspaper, label: 'Noticias' },
  { to: '/business/settings', icon: Settings, label: 'Ajustes' },
];

export default function BusinessSidebar() {
  const { setRole } = useApp();
  const { business } = useBusinessData();
  const navigate = useNavigate();
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

  function switchToCustomer() {
    setRole('customer');
    navigate('/home');
  }

  return (
    <aside className="hidden md:flex flex-col w-56 bg-[#12173B] min-h-screen sticky top-0">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7546ED] to-[#DC89FF] flex items-center justify-center">
            <span className="text-white font-bold text-xs">Z</span>
          </div>
          <span className="text-white font-bold text-base">Zuma</span>
        </div>
        <p className="text-[#B1A9E5] text-xs mt-1">{business?.name || 'Negocio'}</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {items.map(({ to, icon: Icon, label }) => {
          const isRewards = to === '/business/rewards';
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                  isActive
                    ? 'bg-[#7546ED] text-white'
                    : 'text-[#B1A9E5] hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <span className="relative">
                <Icon size={18} />
                {isRewards && pendingCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full bg-[#FF6B6B] text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
                    {pendingCount >= 10 ? '9+' : pendingCount}
                  </span>
                )}
              </span>
              {label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={switchToCustomer}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-[#B1A9E5] hover:text-white hover:bg-white/5 transition-all text-sm"
        >
          <ArrowLeft size={16} />
          Cambiar a Cliente
        </button>
      </div>
    </aside>
  );
}
