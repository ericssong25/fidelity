import { Pencil } from 'lucide-react';
import { getAvatarById } from '../data/avatars';

interface UserAvatarProps {
  avatarId: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  editable?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
} as const;

const fontClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
  xl: 'text-2xl font-extrabold',
} as const;

const pencilSizes = {
  sm: 10,
  md: 14,
  lg: 16,
  xl: 18,
} as const;

export default function UserAvatar({ avatarId, name, size = 'md', onClick, editable }: UserAvatarProps) {
  const avatar = avatarId ? getAvatarById(avatarId) : null;
  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const container = avatar ? (
    <img
      src={avatar.src}
      alt=""
      className={`${sizeClasses[size]} rounded-full object-cover`}
    />
  ) : (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white ${fontClasses[size]}`}
      style={{ background: 'linear-gradient(135deg, #7546ED, #DC89FF)' }}
    >
      {initials}
    </div>
  );

  const content = (onClick || editable) ? (
    <button
      type="button"
      onClick={onClick}
      className="relative group"
    >
      {container}
      {editable && (
        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#7546ED] rounded-full flex items-center justify-center border-2 border-white">
          <Pencil size={pencilSizes[size] >= 12 ? 10 : 8} className="text-white" />
        </span>
      )}
    </button>
  ) : (
    container
  );

  return content;
}
