import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, Tag, Gift, Newspaper, Settings, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';

const items = [
  { to: '/business/overview', icon: LayoutDashboard, label: 'Overview' },
  { to: '/business/customers', icon: Users, label: 'Customers' },
  { to: '/business/products', icon: Package, label: 'Products' },
  { to: '/business/promotions', icon: Tag, label: 'Promotions' },
  { to: '/business/rewards', icon: Gift, label: 'Rewards' },
  { to: '/business/news', icon: Newspaper, label: 'News' },
  { to: '/business/settings', icon: Settings, label: 'Settings' },
];

export default function BusinessSidebar() {
  const { setRole } = useApp();
  const navigate = useNavigate();

  function switchToCustomer() {
    setRole('customer');
    navigate('/home');
  }

  return (
    <aside className="hidden md:flex flex-col w-56 bg-[#12173B] min-h-screen sticky top-0">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7546ED] to-[#DC89FF] flex items-center justify-center">
            <span className="text-white font-bold text-xs">F</span>
          </div>
          <span className="text-white font-bold text-base">FidelyApp</span>
        </div>
        <p className="text-[#B1A9E5] text-xs mt-1">Moka Café</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[#7546ED] text-white'
                  : 'text-[#B1A9E5] hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={switchToCustomer}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-[#B1A9E5] hover:bg-white/5 hover:text-white transition-all text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Customer View
        </button>
      </div>
    </aside>
  );
}
