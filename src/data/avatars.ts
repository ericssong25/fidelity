import adventurer1 from '../assets/avatars/adventurer-1.svg';
import adventurer2 from '../assets/avatars/adventurer-2.svg';
import adventurer3 from '../assets/avatars/adventurer-3.svg';
import adventurer4 from '../assets/avatars/adventurer-4.svg';
import adventurer5 from '../assets/avatars/adventurer-5.svg';
import adventurer6 from '../assets/avatars/adventurer-6.svg';
import lorelei1 from '../assets/avatars/lorelei-1.svg';
import lorelei2 from '../assets/avatars/lorelei-2.svg';
import lorelei3 from '../assets/avatars/lorelei-3.svg';
import lorelei4 from '../assets/avatars/lorelei-4.svg';
import lorelei5 from '../assets/avatars/lorelei-5.svg';
import lorelei6 from '../assets/avatars/lorelei-6.svg';
import emoji1 from '../assets/avatars/emoji-1.svg';
import emoji2 from '../assets/avatars/emoji-2.svg';
import emoji3 from '../assets/avatars/emoji-3.svg';
import emoji4 from '../assets/avatars/emoji-4.svg';
import emoji5 from '../assets/avatars/emoji-5.svg';
import emoji6 from '../assets/avatars/emoji-6.svg';

export interface AvatarOption {
  id: string;
  collection: string;
  label: string;
  src: string;
}

export interface AvatarCollection {
  id: string;
  label: string;
  avatars: AvatarOption[];
}

export const AVATAR_COLLECTIONS: AvatarCollection[] = [
  {
    id: 'adventurer',
    label: 'Aventureros',
    avatars: [
      { id: 'adventurer-1', collection: 'adventurer', label: 'Aventureros', src: adventurer1 },
      { id: 'adventurer-2', collection: 'adventurer', label: 'Aventureros', src: adventurer2 },
      { id: 'adventurer-3', collection: 'adventurer', label: 'Aventureros', src: adventurer3 },
      { id: 'adventurer-4', collection: 'adventurer', label: 'Aventureros', src: adventurer4 },
      { id: 'adventurer-5', collection: 'adventurer', label: 'Aventureros', src: adventurer5 },
      { id: 'adventurer-6', collection: 'adventurer', label: 'Aventureros', src: adventurer6 },
    ],
  },
  {
    id: 'lorelei',
    label: 'Minimalistas',
    avatars: [
      { id: 'lorelei-1', collection: 'lorelei', label: 'Minimalistas', src: lorelei1 },
      { id: 'lorelei-2', collection: 'lorelei', label: 'Minimalistas', src: lorelei2 },
      { id: 'lorelei-3', collection: 'lorelei', label: 'Minimalistas', src: lorelei3 },
      { id: 'lorelei-4', collection: 'lorelei', label: 'Minimalistas', src: lorelei4 },
      { id: 'lorelei-5', collection: 'lorelei', label: 'Minimalistas', src: lorelei5 },
      { id: 'lorelei-6', collection: 'lorelei', label: 'Minimalistas', src: lorelei6 },
    ],
  },
  {
    id: 'fun-emoji',
    label: 'Emojis',
    avatars: [
      { id: 'emoji-1', collection: 'fun-emoji', label: 'Emojis', src: emoji1 },
      { id: 'emoji-2', collection: 'fun-emoji', label: 'Emojis', src: emoji2 },
      { id: 'emoji-3', collection: 'fun-emoji', label: 'Emojis', src: emoji3 },
      { id: 'emoji-4', collection: 'fun-emoji', label: 'Emojis', src: emoji4 },
      { id: 'emoji-5', collection: 'fun-emoji', label: 'Emojis', src: emoji5 },
      { id: 'emoji-6', collection: 'fun-emoji', label: 'Emojis', src: emoji6 },
    ],
  },
];

const avatarMap = new Map<string, AvatarOption>();
for (const collection of AVATAR_COLLECTIONS) {
  for (const avatar of collection.avatars) {
    avatarMap.set(avatar.id, avatar);
  }
}

export function getAvatarById(id: string): AvatarOption | null {
  return avatarMap.get(id) || null;
}
