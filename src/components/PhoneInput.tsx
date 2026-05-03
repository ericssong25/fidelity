import { useState, useEffect } from 'react';
import { Phone } from 'lucide-react';

const PREFIXES = ['0424', '0414', '0412', '0416', '0426'];

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function PhoneInput({ value, onChange, placeholder }: Props) {
  const [prefix, setPrefix] = useState('0424');
  const [number, setNumber] = useState('');

  // Parse incoming value into prefix + number
  useEffect(() => {
    const digits = value.replace(/\D/g, '');
    // Check with leading 0 prefix (4 digits)
    if (digits.length >= 4) {
      const possiblePrefix = digits.slice(0, 4);
      if (PREFIXES.includes(possiblePrefix)) {
        setPrefix(possiblePrefix);
        formatNumber(digits.slice(4));
      } else if (digits.length >= 3) {
        // Check without leading 0 (3 digits) — stored format
        const prefix3 = '0' + digits.slice(0, 3);
        if (PREFIXES.includes(prefix3)) {
          setPrefix(prefix3);
          formatNumber(digits.slice(3));
        } else {
          setPrefix('0424');
          formatNumber(digits);
        }
      } else {
        setNumber(digits);
      }
    } else {
      setNumber(digits);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function formatNumber(raw: string) {
    const clean = raw.replace(/\D/g, '').slice(0, 7);
    setNumber(clean);
    return clean;
  }

  function emitChange(newPrefix: string, newNumber: string) {
    const raw = (newPrefix + newNumber).replace(/\D/g, '');
    if (raw.length === 0) {
      onChange('');
      return;
    }
    // Strip leading 0 from prefix for storage: 0424 → 424, 0416 → 416
    const storedPrefix = newPrefix.startsWith('0') ? newPrefix.slice(1) : newPrefix;
    const cleanNumber = newNumber.replace(/\D/g, '').slice(0, 7);
    // Format for storage: 424 1234567
    const formatted = cleanNumber.length > 0
      ? `${storedPrefix} ${cleanNumber}`
      : storedPrefix;
    onChange(formatted);
  }

  function handlePrefixChange(newPrefix: string) {
    setPrefix(newPrefix);
    emitChange(newPrefix, number);
  }

  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '');
    const clean = raw.startsWith('0') ? raw.slice(1) : raw;
    const formatted = formatNumber(clean);
    emitChange(prefix, formatted);
  }

  return (
    <div className="flex gap-2">
      {/* Prefix dropdown */}
      <div className="relative flex-shrink-0">
        <Phone size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#B1A9E5]" />
        <select
          value={prefix}
          onChange={e => handlePrefixChange(e.target.value)}
          className="appearance-none pl-7 pr-7 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] bg-white outline-none focus:border-[#7546ED] transition-all cursor-pointer"
        >
          {PREFIXES.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#B1A9E5] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* Number input — single block, 7 digits */}
      <input
        type="tel"
        value={number}
        onChange={handleNumberChange}
        placeholder={placeholder || '1234567'}
        maxLength={7}
        className="flex-1 px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] placeholder-[#B1A9E5] outline-none focus:border-[#7546ED] transition-all"
      />
    </div>
  );
}
