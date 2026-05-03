import { NavLink } from 'react-router-dom';
import { Home, CreditCard, Bell, User } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const items = [
  { to: '/home', icon: Home, label: 'Inicio' },
  { to: '/cards', icon: CreditCard, label: 'Tarjetas' },
  { to: '/notifications', icon: Bell, label: 'Notificaciones', badge: true },
  { to: '/profile', icon: User, label: 'Perfil' },
];

export default function BottomNav() {
  const { notificationCount } = useNotifications();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all duration-200 ${
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
                {badge && notificationCount > 0 && (
                  <span className="absolute -top-0.5 right-1 min-w-[18px] h-[18px] rounded-full bg-[#FF6B6B] text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
                    {notificationCount >= 10 ? '9+' : notificationCount}
                  </span>
                )}
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
