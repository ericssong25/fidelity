import { useState, useEffect } from 'react';
import { Shield, Plus, X, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useBusinessData } from '../../context/BusinessDataContext';
import { supabase } from '../../lib/supabase';

interface LevelConfig {
  name: string;
  min_points: number;
  color: string;
  multiplier: number;
  discount_percent: number;
  perks: string[];
}

interface LevelDistribution {
  current_level: string;
  count: number;
}

const DEFAULT_LEVELS: LevelConfig[] = [
  {
    name: 'Bronze',
    min_points: 0,
    color: '#CD7F32',
    multiplier: 1.0,
    discount_percent: 0,
    perks: ['Acumula puntos en cada compra'],
  },
  {
    name: 'Silver',
    min_points: 500,
    color: '#C0C0C0',
    multiplier: 1.5,
    discount_percent: 5,
    perks: ['1.5x puntos por compra', '5% descuento permanente'],
  },
  {
    name: 'Gold',
    min_points: 1200,
    color: '#FFD700',
    multiplier: 2.0,
    discount_percent: 10,
    perks: ['2x puntos por compra', '10% descuento permanente', 'Acceso a recompensas exclusivas'],
  },
];

export default function LevelsPage() {
  const { showToast } = useApp();
  const { business } = useBusinessData();
  const [levels, setLevels] = useState<LevelConfig[]>([]);
  const [distribution, setDistribution] = useState<LevelDistribution[]>([]);
  const [loadingDist, setLoadingDist] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loyaltyLevels = (business as unknown as Record<string, unknown>)?.loyalty_levels as LevelConfig[] | undefined;
    if (loyaltyLevels && Array.isArray(loyaltyLevels) && loyaltyLevels.length > 0) {
      setLevels(loyaltyLevels.map(l => ({
        ...l,
        perks: Array.isArray(l.perks) ? l.perks : [],
      })));
    } else {
      setLevels(DEFAULT_LEVELS);
    }
  }, [business]);

  useEffect(() => {
    async function loadDistribution() {
      if (!business?.id) {
        setLoadingDist(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('loyalty_cards')
          .select('current_level')
          .eq('business_id', business.id);

        if (error) {
          console.error('Error loading distribution:', error);
          setLoadingDist(false);
          return;
        }

        const counts: Record<string, number> = {};
        (data || []).forEach((card: { current_level: string | null }) => {
          const level = card.current_level || 'Sin nivel';
          counts[level] = (counts[level] || 0) + 1;
        });

        const dist: LevelDistribution[] = Object.entries(counts).map(([level, count]) => ({
          current_level: level,
          count,
        }));

        setDistribution(dist);
      } catch (err) {
        console.error('Error loading distribution:', err);
      } finally {
        setLoadingDist(false);
      }
    }

    loadDistribution();
  }, [business?.id]);

  function updateLevel(index: number, field: keyof LevelConfig, value: string | number | string[]) {
    setLevels(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function addPerk(levelIndex: number) {
    setLevels(prev => {
      const updated = [...prev];
      const current = updated[levelIndex];
      if (current.perks.length >= 6) return prev;
      updated[levelIndex] = { ...current, perks: [...current.perks, ''] };
      return updated;
    });
  }

  function removePerk(levelIndex: number, perkIndex: number) {
    setLevels(prev => {
      const updated = [...prev];
      const current = updated[levelIndex];
      updated[levelIndex] = {
        ...current,
        perks: current.perks.filter((_, i) => i !== perkIndex),
      };
      return updated;
    });
  }

  function updatePerk(levelIndex: number, perkIndex: number, value: string) {
    setLevels(prev => {
      const updated = [...prev];
      const current = updated[levelIndex];
      const newPerks = [...current.perks];
      newPerks[perkIndex] = value;
      updated[levelIndex] = { ...current, perks: newPerks };
      return updated;
    });
  }

  async function handleSave() {
    if (!business?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          loyalty_levels: levels,
          updated_at: new Date().toISOString(),
        })
        .eq('id', business.id);

      if (error) {
        console.error('Error saving levels:', error);
        showToast('Error al guardar niveles', 'error');
      } else {
        showToast('Niveles actualizados', 'success');
      }
    } catch (err) {
      console.error('Error saving levels:', err);
      showToast('Error al guardar niveles', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!business?.id) {
    return (
      <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
        <div className="text-center py-12">
          <AlertCircle size={48} className="text-[#B1A9E5] mx-auto mb-4" />
          <p className="text-[#B1A9E5]">Primero registra un negocio</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
      <div className="mb-6">
        <h1 className="font-extrabold text-[#12173B] text-xl">Programa de Niveles</h1>
        <p className="text-[#B1A9E5] text-sm mt-1">Configura los niveles y beneficios para tus clientes</p>
      </div>

      <div className="space-y-4 mb-6">
        {levels.map((level, i) => (
          <div
            key={level.name}
            className="bg-white rounded-2xl p-5 shadow-sm border border-[#B1A9E5]/10"
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ background: level.color }}
              />
              <h3 className="font-bold text-[#12173B] text-base">{level.name}</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[10px] font-semibold text-[#B1A9E5] mb-1 block">
                  Puntos requeridos
                </label>
                <input
                  type="number"
                  value={level.min_points}
                  onChange={e => updateLevel(i, 'min_points', parseInt(e.target.value) || 0)}
                  disabled={i === 0}
                  className="w-full px-3 py-2 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all disabled:opacity-50 disabled:bg-[#F4F3FB]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#B1A9E5] mb-1 block">
                  Multiplicador
                </label>
                <input
                  type="number"
                  value={level.multiplier}
                  onChange={e => updateLevel(i, 'multiplier', parseFloat(e.target.value) || 1.0)}
                  min={1}
                  max={5}
                  step={0.5}
                  className="w-full px-3 py-2 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[10px] font-semibold text-[#B1A9E5] mb-1 block">
                Descuento permanente (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={level.discount_percent}
                  onChange={e => updateLevel(i, 'discount_percent', parseInt(e.target.value))}
                  className="flex-1 accent-[#7546ED]"
                />
                <span className="text-sm font-bold text-[#12173B] min-w-[3rem] text-right">
                  {level.discount_percent}%
                </span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-[#B1A9E5] mb-2 block">
                Beneficios
              </label>
              <div className="space-y-2">
                {level.perks.map((perk, pi) => (
                  <div key={pi} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={perk}
                      onChange={e => updatePerk(i, pi, e.target.value)}
                      placeholder="Nombre del beneficio"
                      className="flex-1 px-3 py-2 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all"
                    />
                    <button
                      onClick={() => removePerk(i, pi)}
                      className="p-2 rounded-inp bg-[#FF6B6B]/10 text-[#FF6B6B] hover:bg-[#FF6B6B]/20 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {level.perks.length < 6 ? (
                <button
                  onClick={() => addPerk(i)}
                  className="flex items-center gap-1 mt-2 text-[#7546ED] text-xs font-semibold hover:underline"
                >
                  <Plus size={12} />
                  Agregar beneficio
                </button>
              ) : (
                <p className="text-[#B1A9E5] text-xs mt-2">Máximo 6 beneficios por nivel</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 mb-8"
      >
        {saving ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Guardando...
          </>
        ) : (
          'Guardar cambios'
        )}
      </button>

      <div className="mb-8">
        <h2 className="font-bold text-[#12173B] text-base mb-3">Distribución de clientes</h2>
        {loadingDist ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10 text-center">
                <div className="w-12 h-12 bg-[#B1A9E5]/20 rounded-full mx-auto mb-2 animate-pulse" />
                <div className="w-12 h-4 bg-[#B1A9E5]/20 rounded mx-auto animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {levels.map(level => {
              const dist = distribution.find(d => d.current_level === level.name);
              const count = dist?.count || 0;
              return (
                <div
                  key={level.name}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10 text-center"
                >
                  <div
                    className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
                    style={{ background: `${level.color}20` }}
                  >
                    <Shield size={18} style={{ color: level.color }} />
                  </div>
                  <p className="text-[#12173B] font-extrabold text-lg">{count}</p>
                  <p className="text-[#B1A9E5] text-xs font-medium">
                    {count === 1 ? 'cliente' : 'clientes'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
