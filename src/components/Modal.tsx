import { ReactNode, useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: Props) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
      document.body.style.overflow = 'hidden';
    } else if (visible) {
      setClosing(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setClosing(false);
        document.body.style.overflow = '';
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [open, visible]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      onClose();
    }, 250);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 ${
        closing ? 'animate-slide-down' : ''
      }`}
      style={{ background: 'rgba(18,23,59,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-2xl w-full max-w-sm shadow-2xl ${
          closing ? 'animate-slide-down' : 'animate-slide-up'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h3 className="font-bold text-[#12173B] text-base">{title}</h3>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-[#B1A9E5]" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
