import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Package, Tag, Gift, Shield, Settings } from 'lucide-react';

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
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#12173B] border-t border-white/10">
      <div className="flex items-center justify-around px-1 py-2">
        {items.map(({ to, icon: Icon, label }) => (
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
                <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[9px] font-semibold">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
