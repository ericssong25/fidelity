import { NavLink } from 'react-router-dom';
import { Home, CreditCard, User } from 'lucide-react';

const items = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/cards', icon: CreditCard, label: 'My Cards' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all duration-200 ${
                isActive ? 'text-[#7546ED]' : 'text-[#B1A9E5]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? 'text-[#7546ED]' : 'text-[#B1A9E5]'}
                />
                <span className={`text-[10px] font-semibold ${isActive ? 'text-[#7546ED]' : 'text-[#B1A9E5]'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
