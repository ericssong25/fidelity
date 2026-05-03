import { useState, useEffect } from 'react';
import { Plus, CheckCircle, XCircle, Edit2, Clock, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import Modal from '../../components/Modal';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useApp } from '../../context/AppContext';
import { useBusinessData } from '../../context/BusinessDataContext';
import { supabase } from '../../lib/supabase';

interface Reward {
  id: string;
  name: string;
  description: string;
  points_cost: number;
  image_url: string | null;
  category: string | null;
  is_available: boolean;
  is_limited: boolean;
  quantity_available: number | null;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
}

interface Redemption {
  id: string;
  loyalty_card_id: string;
  reward_id: string;
  points_used: number;
  status: 'pending' | 'claimed' | 'expired';
  redemption_code: string;
  claimed_at: string | null;
  expires_at: string | null;
  created_at: string;
  customer_name?: string;
  reward_name?: string;
  rewards?: { name: string };
}

export default function RewardsPage() {
  const { showToast } = useApp();
  const { business } = useBusinessData();
  
  // Rewards state
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  
  // Redemptions state
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(true);
  
  // Create/Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('');
  const [category, setCategory] = useState('');
  const [isLimited, setIsLimited] = useState(false);
  const [quantityAvailable, setQuantityAvailable] = useState('');
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load rewards from Supabase
  async function loadRewards() {
    if (!business?.id) {
      setLoadingRewards(false);
      return;
    }

    setLoadingRewards(true);
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading rewards:', error);
        showToast('Error al cargar recompensas', 'error');
      } else {
        setRewards(data || []);
      }
    } catch (err) {
      console.error('Error loading rewards:', err);
      showToast('Failed to load rewards', 'error');
    } finally {
      setLoadingRewards(false);
    }
  }

  // Load pending redemptions
  async function loadRedemptions() {
    if (!business?.id) {
      setLoadingRedemptions(false);
      return;
    }

    setLoadingRedemptions(true);
    try {
      // Get redemptions for this business via rewards
      const { data: redemptionsData, error: redemptionsError } = await supabase
        .from('reward_redemptions')
        .select(`
          *,
          rewards!inner(name, business_id)
        `)
        .eq('rewards.business_id', business.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (redemptionsError) {
        console.error('Error loading redemptions:', redemptionsError);
        setRedemptions([]);
        setLoadingRedemptions(false);
        return;
      }

      // Get loyalty cards and profiles separately
      const loyaltyCardIds = [...new Set((redemptionsData || []).map(r => r.loyalty_card_id))];
      
      let profilesMap: Record<string, string> = {};
      
      if (loyaltyCardIds.length > 0) {
        // Get loyalty cards with user_ids
        const { data: cardsData } = await supabase
          .from('loyalty_cards')
          .select('id, user_id')
          .in('id', loyaltyCardIds);
        
        if (cardsData && cardsData.length > 0) {
          const userIds = [...new Set(cardsData.map(c => c.user_id))];
          
          // Get profiles
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', userIds);
          
          // Create mapping: loyalty_card_id -> customer_name
          profilesMap = cardsData.reduce((acc: Record<string, string>, card) => {
            const profile = profilesData?.find(p => p.id === card.user_id);
            acc[card.id] = profile?.name || 'Unknown';
            return acc;
          }, {});
        }
      }

      const mappedRedemptions = (redemptionsData || []).map((r: Redemption) => ({
        ...r,
        customer_name: profilesMap[r.loyalty_card_id] || 'Unknown',
        reward_name: r.rewards?.name || 'Unknown Reward'
      }));
      
      setRedemptions(mappedRedemptions);
    } catch (err) {
      console.error('Error loading redemptions:', err);
      setRedemptions([]);
    } finally {
      setLoadingRedemptions(false);
    }
  }

  useEffect(() => {
    loadRewards();
    loadRedemptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if reward is currently valid (within time window)
  function isRewardCurrentlyValid(reward: Reward): boolean {
    const now = new Date();
    
    if (reward.valid_from && new Date(reward.valid_from) > now) {
      return false; // Not started yet
    }
    
    if (reward.valid_until && new Date(reward.valid_until) < now) {
      return false; // Already expired
    }
    
    return true;
  }

  // Get reward status text
  function getRewardStatus(reward: Reward): { text: string; color: string } {
    if (!reward.is_available) {
      return { text: 'Disabled', color: 'text-[#B1A9E5]' };
    }
    
    if (!isRewardCurrentlyValid(reward)) {
      if (reward.valid_from && new Date(reward.valid_from) > new Date()) {
        return { text: `Starts ${new Date(reward.valid_from).toLocaleDateString()}`, color: 'text-[#F59E0B]' };
      }
      return { text: 'Expired', color: 'text-[#FF6B6B]' };
    }
    
    if (reward.is_limited && reward.quantity_available !== null && reward.quantity_available <= 0) {
      return { text: 'Out of Stock', color: 'text-[#FF6B6B]' };
    }
    
    if (reward.is_limited && reward.quantity_available !== null) {
      return { text: `${reward.quantity_available} left`, color: 'text-[#10B981]' };
    }
    
    if (reward.valid_until) {
      const hoursLeft = Math.ceil((new Date(reward.valid_until).getTime() - Date.now()) / (1000 * 60 * 60));
      if (hoursLeft <= 24) {
        return { text: `Ends in ${hoursLeft}h`, color: 'text-[#F59E0B]' };
      }
      return { text: 'Active', color: 'text-[#10B981]' };
    }
    
    return { text: 'Active', color: 'text-[#10B981]' };
  }

  // Toggle reward availability
  async function toggleAvailable(reward: Reward) {
    try {
      const { error } = await supabase
        .from('rewards')
        .update({ is_available: !reward.is_available })
        .eq('id', reward.id);

      if (error) {
        console.error('Error updating reward:', error);
        showToast('Error al actualizar recompensa', 'error');
      } else {
        setRewards(prev => prev.map(r => 
          r.id === reward.id ? { ...r, is_available: !r.is_available } : r
        ));
        showToast('Recompensa actualizada', 'success');
      }
    } catch (err) {
      console.error('Error updating reward:', err);
      showToast('Failed to update reward', 'error');
    }
  }

  // Open create modal
  function openCreateModal() {
    setEditingReward(null);
    setName('');
    setDescription('');
    setPoints('');
    setCategory('');
    setIsLimited(false);
    setQuantityAvailable('');
    setHasTimeLimit(false);
    setValidFrom('');
    setValidUntil('');
    setModalOpen(true);
  }

  // Open edit modal
  function openEditModal(reward: Reward) {
    setEditingReward(reward);
    setName(reward.name);
    setDescription(reward.description || '');
    setPoints(reward.points_cost.toString());
    setCategory(reward.category || '');
    setIsLimited(reward.is_limited);
    setQuantityAvailable(reward.quantity_available?.toString() || '');
    setHasTimeLimit(!!(reward.valid_from || reward.valid_until));
    setValidFrom(reward.valid_from ? new Date(reward.valid_from).toISOString().slice(0, 16) : '');
    setValidUntil(reward.valid_until ? new Date(reward.valid_until).toISOString().slice(0, 16) : '');
    setModalOpen(true);
  }

  // Save reward (create or update)
  async function handleSave() {
    if (!business?.id) {
      showToast('Negocio no encontrado', 'error');
      return;
    }

    if (!name.trim() || !points.trim()) {
        showToast('Nombre y puntos son requeridos', 'error');
      return;
    }

    setIsSaving(true);

    const rewardData = {
      business_id: business.id,
      name: name.trim(),
      description: description.trim() || null,
      points_cost: parseInt(points),
      category: category.trim() || null,
      is_limited: isLimited,
      quantity_available: isLimited ? (parseInt(quantityAvailable) || 0) : null,
      valid_from: hasTimeLimit && validFrom ? new Date(validFrom).toISOString() : null,
      valid_until: hasTimeLimit && validUntil ? new Date(validUntil).toISOString() : null,
    };

    try {
      if (editingReward) {
        // Update existing
        const { error } = await supabase
          .from('rewards')
          .update(rewardData)
          .eq('id', editingReward.id);

        if (error) {
          console.error('Error updating reward:', error);
          showToast('Error al actualizar recompensa', 'error');
        } else {
          showToast('¡Recompensa actualizada!', 'success');
          setModalOpen(false);
          loadRewards();
        }
      } else {
        // Create new
        const { error } = await supabase
          .from('rewards')
          .insert({ ...rewardData, is_available: true });

        if (error) {
          console.error('Error creating reward:', error);
          showToast('Error al crear recompensa', 'error');
        } else {
          showToast('¡Recompensa creada!', 'success');
          setModalOpen(false);
          loadRewards();
        }
      }
    } catch (err) {
      console.error('Error saving reward:', err);
      showToast('Error al guardar recompensa', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  // Resolve redemption
  async function resolveRedemption(redemption: Redemption, action: 'claimed' | 'expired') {
    try {
      const { error } = await supabase
        .from('reward_redemptions')
        .update({
          status: action,
          claimed_at: action === 'claimed' ? new Date().toISOString() : null
        })
        .eq('id', redemption.id);

      if (error) {
        console.error('Error updating redemption:', error);
        showToast('Error al actualizar canje', 'error');
        return;
      }

      // If cancelled, refund points to the customer
      if (action === 'expired') {
        // Get current points from loyalty card
        const { data: card, error: cardError } = await supabase
          .from('loyalty_cards')
          .select('current_points')
          .eq('id', redemption.loyalty_card_id)
          .single();

        if (cardError) {
          console.error('Error fetching loyalty card:', cardError);
          showToast('Error al recuperar tarjeta de fidelidad', 'error');
          return;
        }

        // Refund points to loyalty card
        const { error: refundError } = await supabase
          .from('loyalty_cards')
          .update({
            current_points: card.current_points + redemption.points_used,
            updated_at: new Date().toISOString()
          })
          .eq('id', redemption.loyalty_card_id);

        if (refundError) {
          console.error('Error refunding points:', refundError);
          showToast('Error al devolver puntos', 'error');
          return;
        }

        // Record the point refund transaction
        await supabase
          .from('point_transactions')
          .insert({
            loyalty_card_id: redemption.loyalty_card_id,
            type: 'adjusted',
            points: redemption.points_used,
            description: `Devolución: ${redemption.reward_name || 'Recompensa'} (canje cancelado)`,
            reference_id: redemption.id,
            reference_type: 'reward_redemption'
          });
      }

      setRedemptions(prev => prev.filter(r => r.id !== redemption.id));
      showToast(action === 'claimed' ? '¡Canje completado!' : 'Canje cancelado y puntos devueltos',
        action === 'claimed' ? 'success' : 'error');
    } catch (err) {
      console.error('Error resolving redemption:', err);
      showToast('Failed to update redemption', 'error');
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-extrabold text-[#12173B] text-xl">Recompensas</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { loadRewards(); loadRedemptions(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-btn bg-[#B1A9E5]/10 text-[#7546ED] text-xs font-bold"
          >
            <RefreshCw size={14} />
            Actualizar
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-btn bg-[#7546ED] text-white text-xs font-bold"
          >
            <Plus size={14} />
            Crear
          </button>
        </div>
      </div>

      {/* Rewards list */}
      {loadingRewards ? (
        <SkeletonLoader rows={3} className="mb-8" />
      ) : rewards.length === 0 ? (
        <div className="text-center py-8 mb-8 bg-white rounded-2xl border border-[#B1A9E5]/10">
          <AlertCircle size={48} className="text-[#B1A9E5] mx-auto mb-3" />
          <p className="text-[#B1A9E5] text-sm">Sin recompensas aún</p>
          <p className="text-[#B1A9E5] text-xs mt-1">Crea tu primera recompensa para comenzar</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {rewards.map(reward => {
            const status = getRewardStatus(reward);
            const isValid = isRewardCurrentlyValid(reward);
            
            return (
              <div key={reward.id} className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
                !reward.is_available || !isValid ? 'border-[#B1A9E5]/30 opacity-75' : 'border-[#B1A9E5]/10'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[#12173B] text-sm">{reward.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.color} bg-current/10`}>
                        {status.text}
                      </span>
                    </div>
                    {reward.description && (
                      <p className="text-[#B1A9E5] text-xs mt-1">{reward.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="inline-block bg-[#7546ED]/10 text-[#7546ED] text-xs font-bold px-2 py-0.5 rounded-full">
                        {reward.points_cost} pts
                      </span>
                      {reward.category && (
                        <span className="text-[#B1A9E5] text-xs">{reward.category}</span>
                      )}
                      {reward.is_limited && (
                        <span className="flex items-center gap-1 text-[#F59E0B] text-xs">
                          <Clock size={12} />
                          Limited
                        </span>
                      )}
                      {(reward.valid_from || reward.valid_until) && (
                        <span className="flex items-center gap-1 text-[#7546ED] text-xs">
                          <Calendar size={12} />
                          {reward.valid_from && reward.valid_until 
                            ? `${new Date(reward.valid_from).toLocaleDateString()} - ${new Date(reward.valid_until).toLocaleDateString()}`
                            : reward.valid_until 
                              ? `Until ${new Date(reward.valid_until).toLocaleDateString()}`
                              : `From ${new Date(reward.valid_from!).toLocaleDateString()}`
                          }
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(reward)}
                      className="p-2 rounded-btn bg-[#B1A9E5]/10 text-[#7546ED] hover:bg-[#7546ED]/20 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => toggleAvailable(reward)}
                      className={`w-11 h-6 rounded-full transition-all duration-300 relative ${
                        reward.is_available && isValid ? 'bg-[#10B981]' : 'bg-[#B1A9E5]/30'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${
                        reward.is_available && isValid ? 'left-[22px]' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pending Redemptions */}
      <h2 className="font-bold text-[#12173B] text-base mb-3">Canjes Pendientes</h2>
      {loadingRedemptions ? (
        <SkeletonLoader rows={2} />
      ) : redemptions.length === 0 ? (
        <div className="text-center py-6 bg-white rounded-2xl border border-[#B1A9E5]/10">
          <CheckCircle size={32} className="text-[#10B981] mx-auto mb-2" />
          <p className="text-[#B1A9E5] text-sm">Sin canjes pendientes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {redemptions.map(redemption => (
            <div key={redemption.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-[#12173B] text-sm">{redemption.customer_name}</p>
                  <p className="text-[#7546ED] text-xs font-medium">{redemption.reward_name}</p>
                  <p className="text-[#B1A9E5] text-xs mt-0.5">{redemption.points_used} pts • Code: {redemption.redemption_code}</p>
                  <p className="text-[#B1A9E5] text-[10px]">
                    {new Date(redemption.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolveRedemption(redemption, 'claimed')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-btn bg-[#10B981]/10 text-[#10B981] text-xs font-bold hover:bg-[#10B981]/20 transition-colors"
                  >
                    <CheckCircle size={13} />
                    Completar
                  </button>
                  <button
                    onClick={() => resolveRedemption(redemption, 'expired')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-btn bg-[#FF6B6B]/10 text-[#FF6B6B] text-xs font-bold hover:bg-[#FF6B6B]/20 transition-colors"
                  >
                    <XCircle size={13} />
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingReward ? 'Editar Recompensa' : 'Crear Recompensa'}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Nombre de Recompensa *</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="ej. Café gratis"
              className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" 
            />
          </div>
          
          <div>
            <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Descripción</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="ej. ¡Disfruta un café gratis por nosotros!"
              rows={2}
              className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all resize-none" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Costo en Puntos *</label>
              <input 
                value={points} 
                onChange={e => setPoints(e.target.value)} 
                type="number" 
                placeholder="100"
                className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" 
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Categoría</label>
              <input 
                value={category} 
                onChange={e => setCategory(e.target.value)} 
                placeholder="ej. Bebida, Comida"
                className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" 
              />
            </div>
          </div>

          {/* Limited Quantity Toggle */}
          <div className="border border-[#B1A9E5]/20 rounded-xl p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isLimited}
                onChange={e => setIsLimited(e.target.checked)}
                className="w-4 h-4 rounded border-[#B1A9E5] text-[#7546ED] focus:ring-[#7546ED]"
              />
              <span className="text-sm font-medium text-[#12173B]">Limited Quantity</span>
            </label>
            {isLimited && (
              <div className="mt-2">
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Quantity Available</label>
                <input 
                  value={quantityAvailable} 
                  onChange={e => setQuantityAvailable(e.target.value)} 
                  type="number" 
                  placeholder="50"
                  className="w-full px-3 py-2 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" 
                />
              </div>
            )}
          </div>

          {/* Time Limit Toggle */}
          <div className="border border-[#B1A9E5]/20 rounded-xl p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasTimeLimit}
                onChange={e => setHasTimeLimit(e.target.checked)}
                className="w-4 h-4 rounded border-[#B1A9E5] text-[#7546ED] focus:ring-[#7546ED]"
              />
              <span className="text-sm font-medium text-[#12173B]">Limited Time Availability</span>
            </label>
            {hasTimeLimit && (
              <div className="mt-2 space-y-2">
                <div>
                  <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Available From (optional)</label>
                  <input 
                    value={validFrom} 
                    onChange={e => setValidFrom(e.target.value)} 
                    type="datetime-local"
                    className="w-full px-3 py-2 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Available Until (optional)</label>
                  <input 
                    value={validUntil} 
                    onChange={e => setValidUntil(e.target.value)} 
                    type="datetime-local"
                    className="w-full px-3 py-2 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" 
                  />
                </div>
                <p className="text-[10px] text-[#B1A9E5]">
                  Example: Set "Available Until" to today 5PM for "Canjea hoy hasta las 5PM"
                </p>
              </div>
            )}
          </div>

          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              editingReward ? 'Update Reward' : 'Create Reward'
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}
