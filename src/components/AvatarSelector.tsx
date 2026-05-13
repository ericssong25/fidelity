import { useState } from 'react';
import Modal from './Modal';
import { AVATAR_COLLECTIONS, getAvatarById } from '../data/avatars';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

interface AvatarSelectorProps {
  open: boolean;
  onClose: () => void;
  currentAvatarId: string | null;
  userName: string;
}

export default function AvatarSelector({ open, onClose, currentAvatarId, userName }: AvatarSelectorProps) {
  const { showToast } = useApp();
  const { updateAvatar } = useAuth();
  const [activeCollection, setActiveCollection] = useState(AVATAR_COLLECTIONS[0].id);
  const [selectedId, setSelectedId] = useState<string | null>(currentAvatarId);
  const [saving, setSaving] = useState(false);

  const initiative = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  function handleSelect(id: string | null) {
    setSelectedId(id);
  }

  async function handleSave() {
    setSaving(true);
    await updateAvatar(selectedId);
    showToast('Avatar actualizado', 'success');
    setSaving(false);
    onClose();
  }

  function handleClose() {
    setSelectedId(currentAvatarId);
    onClose();
  }

  const collection = AVATAR_COLLECTIONS.find(c => c.id === activeCollection);
  const selectedAvatar = selectedId ? getAvatarById(selectedId) : null;

  return (
    <Modal open={open} onClose={handleClose} title="Elige tu avatar">
      <div className="space-y-5">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {AVATAR_COLLECTIONS.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCollection(c.id)}
              className={`px-4 py-2 rounded-btn text-xs font-semibold whitespace-nowrap transition-all ${
                activeCollection === c.id
                  ? 'bg-[#7546ED] text-white'
                  : 'border border-[#B1A9E5]/30 text-[#B1A9E5] hover:border-[#7546ED] hover:text-[#7546ED]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Current selection preview */}
        <div className="flex items-center gap-3 px-1">
          <span className="text-xs text-[#B1A9E5]">Vista previa:</span>
          {selectedId ? (
            <img
              src={selectedAvatar?.src}
              alt=""
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #7546ED, #DC89FF)' }}
            >
              {initiative}
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Initials option */}
          <button
            onClick={() => handleSelect(null)}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all ${
              selectedId === null
                ? 'ring-2 ring-[#7546ED] ring-offset-1 scale-105'
                : 'hover:scale-105'
            }`}
          >
            <div
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-white font-bold text-xl"
              style={{ background: 'linear-gradient(135deg, #7546ED, #DC89FF)' }}
            >
              {initiative}
            </div>
            <span className="text-[10px] text-[#B1A9E5] font-medium">Iniciales</span>
          </button>

          {/* Avatar options */}
          {collection?.avatars.map(avatar => (
            <button
              key={avatar.id}
              onClick={() => handleSelect(avatar.id)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all ${
                selectedId === avatar.id
                  ? 'ring-2 ring-[#7546ED] ring-offset-1 scale-105'
                  : 'hover:scale-105'
              }`}
            >
              <img
                src={avatar.src}
                alt=""
                className="w-[72px] h-[72px] rounded-full"
              />
            </button>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleClose}
            disabled={saving}
            className="flex-1 py-3 rounded-btn border border-[#B1A9E5]/40 text-[#B1A9E5] font-semibold text-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
