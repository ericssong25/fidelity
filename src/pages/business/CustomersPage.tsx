/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { Search, X, Plus, CreditCard, AlertCircle, RefreshCw, ShoppingCart, Minus, Trash2, CheckCircle2, MessageCircle } from 'lucide-react';
import Modal from '../../components/Modal';
import { useApp } from '../../context/AppContext';
import { useBusinessData } from '../../context/BusinessDataContext';
import { usePurchaseRegistration } from '../../hooks/usePurchaseRegistration';
import { supabase } from '../../lib/supabase';

type Level = 'Bronze' | 'Silver' | 'Gold';

const levelBadge: Record<Level, string> = {
  Gold: 'bg-gradient-to-r from-[#7546ED] to-[#DC89FF] text-white',
  Silver: 'bg-gradient-to-r from-[#032C7D] to-[#7546ED] text-white',
  Bronze: 'bg-[#12173B] text-white',
};

const defaultLevel: Level = 'Bronze';

interface SelectedCustomer {
  id: string;
  loyaltyCardId: string;
  name: string;
  initials: string;
  level: Level;
  points: number;
  visits: number;
  lastVisit: string;
  username: string;
  phone: string | null;
  transactions: { id: string; description: string; date: string; points: number }[];
}

type LevelFilter = 'All' | Level;

export default function CustomersPage() {
  const { showToast } = useApp();
  const { business, loyaltyCards, loading, error, refresh, refreshCards } = useBusinessData();
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('All');
  const [selected, setSelected] = useState<SelectedCustomer | null>(null);
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  
  // Level names map
  const [levelNames, setLevelNames] = useState<Record<string, Level>>({});
  
  // Card creation state
  const [cardModal, setCardModal] = useState(false);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  
  // Purchase registration hook
  const purchase = usePurchaseRegistration({
    businessId: business?.id,
    showToast,
    refreshCards: refreshCards,
  });
  
  // User search state
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [existingCardUserIds, setExistingCardUserIds] = useState<Set<string>>(new Set());

  // Fetch level names from business.loyalty_levels JSONB
  useEffect(() => {
    if (!business) return;

    const loyaltyLevels = (business as unknown as Record<string, unknown> | null)?.loyalty_levels as Array<{
      name: string; color?: string;
    }> | undefined;

    if (loyaltyLevels && Array.isArray(loyaltyLevels) && loyaltyLevels.length > 0) {
      const map: Record<string, Level> = {};
      loyaltyLevels.forEach((l, i) => {
        const name = l.name as Level;
        if (name === 'Bronze' || name === 'Silver' || name === 'Gold') {
          // Use array index as the level ID for simplicity
          map[String(i)] = name;
        }
      });
      setLevelNames(map);
    }
  }, [business]);

  // Track which users already have cards (for search results indicator)
  useEffect(() => {
    setExistingCardUserIds(new Set(loyaltyCards.filter(c => c.is_active).map(c => c.user_id)));
  }, [loyaltyCards]);

  // Filtered cards
  const filteredCards = useMemo(() => {
    return loyaltyCards.filter(card => {
      const name = card.profiles?.name || '';
      const username = card.profiles?.username || '';
      const email = card.profiles?.email || '';
      const searchLower = search.toLowerCase();

      const matchesSearch = !searchLower ||
        name.toLowerCase().includes(searchLower) ||
        username.toLowerCase().includes(searchLower) ||
        email.toLowerCase().includes(searchLower);

      const cardLevel = card.current_level_id
        ? (levelNames[card.current_level_id] || defaultLevel)
        : defaultLevel;
      const matchesLevel = levelFilter === 'All' || cardLevel === levelFilter;

      return matchesSearch && matchesLevel;
    });
  }, [loyaltyCards, search, levelFilter, levelNames]);

  function handleAdjust() {
    setAdjustModal(false);
    setAdjustAmount('');
    setAdjustReason('');
    showToast('Puntos ajustados exitosamente', 'success');
  }

  function handleCreateCard() {
    setCardModal(true);
  }

  async function handleSelectCustomer(customer: SelectedCustomer) {
    setSelected(customer);
    setIsLoadingTransactions(true);
    
    try {
      // Load transactions for this customer's loyalty card
      const { data: transactions, error } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('loyalty_card_id', customer.loyaltyCardId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Error loading transactions:', error);
      } else {
        setSelected(prev => prev ? {
          ...prev,
          transactions: (transactions || []).map(tx => ({
            id: tx.id,
            description: tx.description,
            date: new Date(tx.created_at).toLocaleDateString(),
            points: tx.points
          }))
        } : null);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setIsLoadingTransactions(false);
    }
  }

  function handleRegisterPurchase() {
    if (!business?.id) {
      showToast('Negocio no encontrado', 'error');
      return;
    }
    if (!selected) {
      showToast('Selecciona un cliente primero', 'error');
      return;
    }
    purchase.openPurchase({
      loyaltyCardId: selected.loyaltyCardId,
      userId: selected.id,
      name: selected.name,
      points: selected.points,
      visits: selected.visits,
    });
  }

  async function handleCreateLoyaltyCard() {
    if (!business?.id) {
      showToast('Negocio no encontrado', 'error');
      return;
    }

    if (!selectedUser) {
      showToast('Selecciona un usuario de los resultados', 'error');
      return;
    }

    setIsCreatingCard(true);

    try {
      // Check if card already exists
      const { data: existingCard } = await supabase
        .from('loyalty_cards')
        .select('id')
        .eq('user_id', selectedUser.id)
        .eq('business_id', business.id)
        .maybeSingle();

      if (existingCard) {
        showToast('Este usuario ya tiene tarjeta en tu negocio', 'error');
        return;
      }

      // Create loyalty card
      const { error: cardError } = await supabase
        .from('loyalty_cards')
        .insert({
          user_id: selectedUser.id,
          business_id: business.id,
          card_number: `FID-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          current_points: 0,
          total_visits: 0
        });

      if (cardError) {
        console.error('Card creation error:', cardError);
        showToast('Error al crear tarjeta. Intenta de nuevo.', 'error');
        return;
      }

      showToast('¡Tarjeta de lealtad creada!', 'success');
      
      // Reset form and close modal
      setUserSearch('');
      setSelectedUser(null);
      setCardModal(false);
      
      // Refresh cards from context
      await refreshCards();
      
    } catch (error) {
      console.error('Card creation error:', error);
      showToast('An unexpected error occurred. Please try again.', 'error');
    } finally {
      setIsCreatingCard(false);
    }
  }

  // Search users function
  async function searchUsers(query: string) {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      const searchTerm = `%${query.trim()}%`;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, username, phone')
        .or(`email.ilike.${searchTerm},username.ilike.${searchTerm},name.ilike.${searchTerm}`)
        .limit(5);
      
      if (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } else {
        setSearchResults(data || []);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  // Handle user selection
  function handleUserSelect(user: any) {
    if (existingCardUserIds.has(user.id)) {
      showToast('Este usuario ya tiene tarjeta en tu negocio', 'error');
      return;
    }
    setSelectedUser(user);
    setUserSearch(`${user.name} (${user.email})`);
    setSearchResults([]);
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(userSearch);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [userSearch]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
        <h1 className="font-extrabold text-[#12173B] text-xl mb-4">Customers</h1>
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-[#B1A9E5]/30 border-t-[#7546ED] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#B1A9E5] text-sm">Loading customers...</p>
        </div>
      </div>
    );
  }

  // Show error state with retry
  if (error) {
    return (
      <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
        <h1 className="font-extrabold text-[#12173B] text-xl mb-4">Customers</h1>
        <div className="text-center py-8">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-sm font-medium mb-2">Error loading customers</p>
          <p className="text-[#B1A9E5] text-xs mb-4">{error}</p>
          <button
            onClick={refresh}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-[#7546ED] text-white rounded-btn text-sm font-bold"
          >
            <RefreshCw size={16} />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto relative">
      <h1 className="font-extrabold text-[#12173B] text-xl mb-4">Customers</h1>

      {/* Floating Add Button */}
      <button
        onClick={handleCreateCard}
        className="fixed bottom-24 right-6 z-20 w-12 h-12 rounded-full bg-[#7546ED] text-white flex items-center justify-center shadow-lg hover:bg-[#6B3FD0] transition-colors"
      >
        <Plus size={20} />
      </button>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B1A9E5]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o @usuario..."
          className="w-full pl-9 pr-4 py-2.5 rounded-inp bg-white border border-[#B1A9E5]/20 text-sm text-[#12173B] placeholder-[#B1A9E5] outline-none focus:border-[#7546ED] transition-all"
        />
      </div>

      {/* Level filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {(['All', 'Bronze', 'Silver', 'Gold'] as LevelFilter[]).map(l => (
          <button
            key={l}
            onClick={() => setLevelFilter(l)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
              levelFilter === l
                ? 'bg-[#7546ED] border-[#7546ED] text-white'
                : 'bg-white border-[#B1A9E5]/40 text-[#B1A9E5]'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Customer list with real cards */}
      <div className="space-y-3">
        {filteredCards.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard size={48} className="text-[#B1A9E5] mx-auto mb-4" />
            <p className="text-[#B1A9E5] text-sm">
              {search || levelFilter !== 'All' ? 'Sin resultados' : 'Sin tarjetas de lealtad aún'}
            </p>
            <p className="text-[#B1A9E5] text-xs mt-1">
              {search || levelFilter !== 'All' ? 'Ajusta los filtros' : 'Presiona + para crear tu primera tarjeta'}
            </p>
          </div>
        ) : (
          filteredCards.map((card: any) => {
            const cardLevel = card.current_level_id
              ? (levelNames[card.current_level_id] || defaultLevel)
              : defaultLevel;
              
            return (
            <div
              key={card.id}
              onClick={() => handleSelectCustomer({
                id: card.user_id,
                loyaltyCardId: card.id,
                name: card.profiles?.name || 'Unknown',
                initials: (card.profiles?.name || 'Unknown').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
                level: cardLevel,
                points: card.current_points,
                visits: card.total_visits,
                lastVisit: new Date(card.issued_at).toLocaleDateString(),
                username: card.profiles?.username || '',
                phone: card.profiles?.phone || null,
                transactions: []
              })}
              className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10 flex items-center gap-3 cursor-pointer hover:shadow-md transition-all"
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #7546ED, #DC89FF)' }}>
                {(card.profiles?.name || 'Unknown').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[#12173B] text-sm truncate">{card.profiles?.name || 'Unknown'}</p>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${levelBadge[cardLevel]}`}>
                    {cardLevel}
                  </span>
                </div>
                <p className="text-[#B1A9E5] text-xs">{card.profiles?.email || 'No email'}</p>
                <p className="text-[#B1A9E5] text-xs">{card.profiles?.username || 'No username'}</p>
                {card.profiles?.phone && (
                  <p className="text-[#B1A9E5] text-xs">{card.profiles.phone}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-[#7546ED] text-lg">{card.current_points}</p>
                <p className="text-[#B1A9E5] text-xs">points</p>
                <p className="text-[#B1A9E5] text-xs mt-1">{card.total_visits} visits</p>
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* Customer drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          style={{ background: 'rgba(18,23,59,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white w-full max-w-sm h-full overflow-y-auto animate-slide-in-right"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="px-5 pt-8 pb-6"
              style={{ background: 'linear-gradient(135deg, #12173B, #7546ED)' }}
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center"
              >
                <X size={16} className="text-white" />
              </button>
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg mb-3"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                {selected.initials}
              </div>
              <h2 className="text-white font-extrabold text-xl">{selected.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${levelBadge[selected.level]}`}>
                  {selected.level}
                </span>
                <span className="text-white/70 text-xs">{selected.points} pts</span>
                <span className="text-white/70 text-xs">{selected.visits} visits</span>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#12173B] text-sm">Historial de Transacciones</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleRegisterPurchase}
                    className="px-3 py-1.5 rounded-btn bg-[#10B981]/10 text-[#10B981] text-xs font-bold flex items-center gap-1"
                  >
                    <ShoppingCart size={12} />
                    Registrar Compra
                  </button>
                  <button
                    onClick={() => setAdjustModal(true)}
                    className="px-3 py-1.5 rounded-btn bg-[#7546ED]/10 text-[#7546ED] text-xs font-bold"
                  >
                    Ajustar Puntos
                  </button>
                </div>
              </div>
              {selected.phone && (
                <a
                  href={`https://wa.me/58${selected.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 mb-4 py-2 rounded-btn bg-[#25D366]/10 text-[#25D366] text-xs font-bold hover:bg-[#25D366]/20 transition-colors"
                >
                  <MessageCircle size={14} />
                  Enviar mensaje por WhatsApp
                </a>
              )}
              <div className="space-y-2">
                {isLoadingTransactions ? (
                  <div className="text-center py-4">
                    <div className="w-5 h-5 border-2 border-[#B1A9E5]/30 border-t-[#7546ED] rounded-full animate-spin mx-auto"></div>
                    <p className="text-[#B1A9E5] text-xs mt-2">Cargando transacciones...</p>
                  </div>
                ) : selected.transactions.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-[#B1A9E5] text-xs">Sin transacciones aún</p>
                    <p className="text-[#B1A9E5] text-xs mt-1">Realiza una compra para empezar a ganar puntos</p>
                  </div>
                ) : (
                  selected.transactions.map((tx: { id: string; description: string; date: string; points: number }) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-2 border-b border-[#B1A9E5]/10"
                    >
                      <div>
                        <p className="text-[#12173B] font-semibold text-sm">{tx.description}</p>
                        <p className="text-[#B1A9E5] text-xs">{tx.date}</p>
                      </div>
                      <span className={`font-extrabold text-sm ${tx.points > 0 ? 'text-[#10B981]' : 'text-[#FF6B6B]'}`}>
                        {tx.points > 0 ? '+' : ''}{tx.points} pts
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal open={adjustModal} onClose={() => setAdjustModal(false)} title="Ajustar Puntos">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Cantidad de Puntos</label>
            <input
              value={adjustAmount}
              onChange={e => setAdjustAmount(e.target.value)}
              type="number"
              placeholder="+50 o -50"
              className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Razón</label>
            <input
              value={adjustReason}
              onChange={e => setAdjustReason(e.target.value)}
              placeholder="ej. Corrección manual"
              className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setAdjustModal(false)}
              className="flex-1 py-3 rounded-btn border border-[#B1A9E5]/40 text-[#B1A9E5] font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdjust}
              className="flex-1 py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm"
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Card Modal */}
      <Modal open={cardModal} onClose={() => setCardModal(false)} title="Crear Tarjeta de Lealtad">
        <div className="space-y-4">
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-[#7546ED]/10 flex items-center justify-center mx-auto mb-4">
              <CreditCard size={24} className="text-[#7546ED]" />
            </div>
            <h3 className="font-bold text-[#12173B] text-lg mb-2">Crear Nueva Tarjeta</h3>
            <p className="text-[#B1A9E5] text-sm">
              Busca un usuario registrado para crear su tarjeta
            </p>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Buscar Usuario</label>
              <div className="relative">
                <input 
                  type="text"
                  value={userSearch}
                  onChange={e => {
                    setUserSearch(e.target.value);
                    setSelectedUser(null);
                  }}
                  placeholder="Buscar por nombre, email o usuario..."
                  className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" 
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-[#B1A9E5]/30 border-t-[#7546ED] rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              
               {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="mt-1 bg-white border border-[#B1A9E5]/20 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((user: any) => {
                    const alreadyHasCard = existingCardUserIds.has(user.id);
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        disabled={alreadyHasCard}
                        className={`w-full px-3 py-2 text-left transition-colors border-b border-[#B1A9E5]/10 last:border-b-0 ${
                          alreadyHasCard
                            ? 'opacity-60 cursor-not-allowed bg-[#F4F3FB]'
                            : 'hover:bg-[#F4F3FB]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#7546ED] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {(user.name || 'User').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-[#12173B] text-sm truncate">{user.name || 'Unknown'}</p>
                              {alreadyHasCard && (
                                <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-semibold text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded-full">
                                  <CheckCircle2 size={10} />
                                  Ya tiene tarjeta
                                </span>
                              )}
                            </div>
                            <p className="text-[#B1A9E5] text-xs truncate">{user.email}</p>
                            {user.username && (
                              <p className="text-[#B1A9E5] text-xs">{user.username}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Selected User Display */}
            {selectedUser && (
              <div className="bg-[#F4F3FB] rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#7546ED] text-white flex items-center justify-center text-sm font-bold">
                    {(selectedUser.name || 'User').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#12173B] text-sm">{selectedUser.name || 'Unknown'}</p>
                    <p className="text-[#B1A9E5] text-xs">{selectedUser.email}</p>
                    {selectedUser.username && (
                      <p className="text-[#B1A9E5] text-xs">{selectedUser.username}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setUserSearch('');
                    }}
                    className="text-[#B1A9E5] hover:text-[#7546ED] transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-[#F4F3FB] rounded-lg p-3">
            <p className="text-[#B1A9E5] text-xs">
              <strong>Nota:</strong> Busca usuarios por nombre, email o usuario. Selecciona uno para crear su tarjeta.
            </p>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => {
                setCardModal(false);
                setUserSearch('');
                setSelectedUser(null);
                setSearchResults([]);
              }}
              disabled={isCreatingCard}
              className="flex-1 py-3 rounded-btn border border-[#B1A9E5]/40 text-[#B1A9E5] font-semibold text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              onClick={handleCreateLoyaltyCard}
              disabled={isCreatingCard || !selectedUser}
              className="flex-1 py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCreatingCard ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creando...
                </>
              ) : (
                'Crear Tarjeta'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Simplified Purchase Registration Modal */}
      <Modal open={purchase.purchaseModal} onClose={purchase.closePurchase} title="Compra Rápida">
        <div className="space-y-3 max-h-[75vh] overflow-y-auto">
          {/* Customer Info */}
          <div className="bg-[#F4F3FB] rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-[#12173B] font-semibold text-sm">{purchase.customer?.name}</p>
              <p className="text-[#B1A9E5] text-xs">{purchase.customer?.points} pts • {purchase.customer?.visits} visitas</p>
            </div>
            {purchase.cart.length > 0 && (
              <div className="text-right">
                <p className="text-[#7546ED] font-extrabold text-lg">${purchase.cartTotal.toFixed(2)}</p>
                <p className="text-[#10B981] text-xs font-semibold">+{purchase.cartPoints} pts</p>
              </div>
            )}
          </div>

          {/* Product Search */}
          <div>
            <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Buscar Producto</label>
            <div className="relative">
              <input
                value={purchase.productSearch}
                onChange={e => purchase.setProductSearch(e.target.value)}
                placeholder="Escribe nombre de producto..."
                className="w-full pl-3 pr-9 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all"
              />
              {purchase.productSearch && (
                <button
                  onClick={() => purchase.setProductSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#B1A9E5] hover:text-[#7546ED]"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Search Results */}
            {purchase.filteredProducts.length > 0 && (
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {purchase.filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => {
                      purchase.addToCart(product);
                      purchase.setProductSearch('');
                    }}
                    className="w-full flex items-center justify-between p-2 bg-white border border-[#B1A9E5]/20 rounded-lg hover:border-[#7546ED]/40 transition-colors"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-[#12173B] text-sm">{product.name}</p>
                      <p className="text-[#B1A9E5] text-xs">${product.price} • {product.points} pts • {product.category}</p>
                    </div>
                    <div className="w-7 h-7 rounded bg-[#10B981] text-white flex items-center justify-center">
                      <Plus size={16} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {purchase.productSearch && purchase.filteredProducts.length === 0 && !purchase.isLoadingProducts && (
              <p className="text-[#B1A9E5] text-xs mt-2 text-center">Sin productos encontrados</p>
            )}
          </div>

          {/* Cart */}
          {purchase.cart.length > 0 && (
            <div className="bg-[#F4F3FB] rounded-lg p-3">
              <h4 className="font-bold text-[#12173B] text-sm mb-2">Items ({purchase.cart.length})</h4>
              <div className="space-y-2">
                {purchase.cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-white p-2 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#12173B] text-sm truncate">{item.name}</p>
                      <p className="text-[#B1A9E5] text-xs">${item.price} c/u</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => purchase.updateQuantity(item.id, -1)}
                        className="w-6 h-6 rounded bg-[#B1A9E5]/20 text-[#12173B] flex items-center justify-center"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-semibold text-[#12173B] text-sm w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => purchase.updateQuantity(item.id, 1)}
                        className="w-6 h-6 rounded bg-[#7546ED]/20 text-[#7546ED] flex items-center justify-center"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => purchase.removeFromCart(item.id)}
                        className="w-6 h-6 rounded text-[#FF6B6B] flex items-center justify-center ml-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty Cart State */}
          {purchase.cart.length === 0 && (
            <div className="text-center py-4">
              <ShoppingCart size={32} className="text-[#B1A9E5] mx-auto mb-2" />
              <p className="text-[#B1A9E5] text-xs">Search and add products to cart</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={purchase.closePurchase}
              disabled={purchase.isProcessingPurchase}
              className="flex-1 py-3 rounded-btn border border-[#B1A9E5]/40 text-[#B1A9E5] font-semibold text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={purchase.handleSubmitPurchase}
              disabled={purchase.isProcessingPurchase || purchase.cart.length === 0}
              className="flex-[2] py-3 rounded-btn bg-[#10B981] text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {purchase.isProcessingPurchase ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Procesando...
                </>
              ) : (
                <>Complete +{purchase.cartPoints} pts</>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
