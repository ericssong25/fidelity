import { useApp } from '../context/AppContext';
import { CheckCircle, XCircle, Info } from 'lucide-react';

const config = {
  success: { bg: 'bg-[#10B981]', Icon: CheckCircle },
  error: { bg: 'bg-[#FF6B6B]', Icon: XCircle },
  info: { bg: 'bg-[#7546ED]', Icon: Info },
};

export default function ToastContainer() {
  const { toasts } = useApp();

  return (
    <div className="fixed bottom-24 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map((t) => {
        const { bg, Icon } = config[t.type];
        return (
          <div
            key={t.id}
            className={`${bg} text-white flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up`}
            style={{ minWidth: 220, maxWidth: 340 }}
          >
            <Icon size={16} />
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
