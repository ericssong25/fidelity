/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Zap, Gift, AlertCircle, RefreshCw, DollarSign, ShoppingCart, Award, ArrowUpRight, CreditCard } from 'lucide-react';
import { useBusinessData } from '../../context/BusinessDataContext';
import { supabase } from '../../lib/supabase';
import RoleSwitcher from '../../components/RoleSwitcher';
import { useApp } from '../../context/AppContext';

interface Transaction {
  id: string;
  customer_name: string;
  customer_initial: string;
  amount: number;
  points: number;
  date: string;
  type: 'purchase' | 'redemption';
  description?: string;
  status?: string;
}

interface DailyStat {
  date: string;
  purchases: number;
  revenue: number;
  points_issued: number;
}

export default function OverviewPage() {
  const { business, loyaltyCards, loading, error, refresh } = useBusinessData();
  const { showToast } = useApp();
  const navigate = useNavigate();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [redemptions, setRedemptions] = useState<Transaction[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  interface TopCustomer {
  id: string;
  name: string;
  initials: string;
  level: string;
  points: number;
  visits: number;
  lastVisit: string;
  initial?: string;
  totalSpent?: number;
}

const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month'>('today');

  // Calculate KPIs
  const totalCustomers = loyaltyCards.length;
  const activeThisMonth = loyaltyCards.filter(card => {
    const issuedDate = new Date(card.issued_at);
    const thisMonth = new Date();
    return issuedDate.getMonth() === thisMonth.getMonth() && 
           issuedDate.getFullYear() === thisMonth.getFullYear();
  }).length;
  
  // const totalPointsIssued = loyaltyCards.reduce((sum, card) => sum + (card.total_points_earned || 0), 0);
  const pendingRedemptions = redemptions.filter(r => r.status === 'pending').length;

  // Filtered stats based on date selection
  const filteredTransactions = transactions.filter(t => {
    const txDate = new Date(t.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateFilter === 'today') {
      return txDate >= today;
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return txDate >= weekAgo;
    } else {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return txDate >= monthAgo;
    }
  });

  const totalRevenue = filteredTransactions
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const totalPurchases = filteredTransactions.filter(t => t.type === 'purchase').length;
  const totalRedemptions = filteredTransactions.filter(t => t.type === 'redemption').length;
  const pointsIssued = filteredTransactions
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + (t.points || 0), 0);

  // Load detailed stats
  useEffect(() => {
    if (!business?.id) return;
    
    async function loadStats() {
      setStatsLoading(true);
      try {
        // Primero obtener las tarjetas del negocio
        if (!business?.id) return;
        
        const { data: businessCards } = await supabase
          .from('loyalty_cards')
          .select('id')
          .eq('business_id', business.id);
        
        const businessCardIds = (businessCards || []).map((c: any) => c.id);
        
        if (businessCardIds.length === 0) {
          // No hay tarjetas, no hay transacciones
          setTransactions([]);
          setRedemptions([]);
          setTopCustomers([]);
          setDailyStats([]);
          setStatsLoading(false);
          return;
        }

        // Load point transactions (purchases) - filtrar por loyalty_card_id
        const { data: txData, error: txError } = await supabase
          .from('point_transactions')
          .select(`
            id,
            points,
            description,
            created_at,
            loyalty_card_id,
            reference_id,
            type
          `)
          .in('loyalty_card_id', businessCardIds)
          .order('created_at', { ascending: false })
          .limit(50);

        if (txError) throw txError;

        // Get unique user_ids from transactions
        const cardIds = [...new Set((txData || []).map((tx: any) => tx.loyalty_card_id))];
        
        // Get loyalty cards with user_ids
        const { data: cardsData } = await supabase
          .from('loyalty_cards')
          .select('id, user_id')
          .in('id', cardIds);
        
        const userIds = [...new Set((cardsData || []).map((c: any) => c.user_id))];
        
        // Get profiles for those users
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);
        
        // Get purchase amounts for earned transactions (reference_id = purchase_id)
        const purchaseIds = (txData || [])
          .filter((tx: any) => tx.type === 'earned' && tx.reference_id)
          .map((tx: any) => tx.reference_id);
        
        const { data: purchasesData } = purchaseIds.length > 0 
          ? await supabase.from('purchases').select('id, total_amount').in('id', purchaseIds)
          : { data: [] };
        
        const purchasesMap = Object.fromEntries((purchasesData || []).map((p: any) => [p.id, p]));
        
        // Create lookup maps
        const cardsMap = Object.fromEntries((cardsData || []).map((c: any) => [c.id, c]));
        const profilesMap = Object.fromEntries((profilesData || []).map((p: any) => [p.id, p]));

        const purchases: Transaction[] = (txData || []).map((tx: any) => {
          const card = cardsMap[tx.loyalty_card_id];
          const profile = card ? profilesMap[card.user_id] : null;
          const name = profile?.name || 'Cliente';
          // Get amount from purchase if it's an earned transaction
          const purchase = tx.type === 'earned' && tx.reference_id ? purchasesMap[tx.reference_id] : null;
          return {
            id: tx.id,
            customer_name: name,
            customer_initial: name.charAt(0).toUpperCase(),
            amount: purchase?.total_amount || 0,
            points: Math.abs(tx.points || 0),
            date: tx.created_at,
            type: 'purchase' as const,
            description: tx.description
          };
        });

        // Load redemptions - filtrar por loyalty_card_id (más seguro, evita joins complejos)
        const { data: redData, error: redError } = await supabase
          .from('reward_redemptions')
          .select(`
            id,
            points_used,
            status,
            created_at,
            loyalty_card_id,
            rewards(name)
          `)
          .in('loyalty_card_id', businessCardIds)
          .order('created_at', { ascending: false })
          .limit(50);

        if (redError) throw redError;

        // Get unique loyalty_card_ids
        const redCardIds = [...new Set((redData || []).map((r: any) => r.loyalty_card_id))];
        
        // Get loyalty cards with user_ids
        const { data: redCardsData } = await supabase
          .from('loyalty_cards')
          .select('id, user_id')
          .in('id', redCardIds);
        
        const redUserIds = [...new Set((redCardsData || []).map((c: any) => c.user_id))];
        
        // Get profiles
        const { data: redProfilesData } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', redUserIds);
        
        // Create lookup maps
        const redCardsMap = Object.fromEntries((redCardsData || []).map((c: any) => [c.id, c]));
        const redProfilesMap = Object.fromEntries((redProfilesData || []).map((p: any) => [p.id, p]));

        const redemptionsList: Transaction[] = (redData || []).map((r: any) => {
          const card = redCardsMap[r.loyalty_card_id];
          const profile = card ? redProfilesMap[card.user_id] : null;
          const name = profile?.name || 'Cliente';
          return {
            id: r.id,
            customer_name: name,
            customer_initial: name.charAt(0).toUpperCase(),
            amount: 0,
            points: r.points_used || 0,
            date: r.created_at,
            type: 'redemption' as const,
            description: r.rewards?.name || 'Recompensa',
            status: r.status
          };
        });

        setTransactions(purchases);
        setRedemptions(redemptionsList);

        // Calculate top customers
        const customerMap = new Map();
        purchases.forEach((tx: Transaction) => {
          const existing = customerMap.get(tx.customer_name) || { 
            name: tx.customer_name, 
            initial: tx.customer_initial,
            visits: 0, 
            totalSpent: 0,
            points: 0 
          };
          existing.visits += 1;
          existing.totalSpent += tx.amount;
          existing.points += tx.points;
          customerMap.set(tx.customer_name, existing);
        });
        
        const sortedCustomers = Array.from(customerMap.values())
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 5);
        setTopCustomers(sortedCustomers);

        // Calculate daily stats for chart
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
        });

        const dailyData = last7Days.map(date => {
          const dayPurchases = purchases.filter((p: Transaction) => 
            p.date.startsWith(date)
          );
          return {
            date: new Date(date).toLocaleDateString('es-ES', { weekday: 'short' }),
            purchases: dayPurchases.length,
            revenue: dayPurchases.reduce((sum, p) => sum + p.amount, 0),
            points_issued: dayPurchases.reduce((sum, p) => sum + p.points, 0)
          };
        });
        setDailyStats(dailyData);

      } catch (err: any) {
        console.error('Error loading stats:', err);
        showToast('Error al cargar estadísticas', 'error');
      } finally {
        setStatsLoading(false);
      }
    }

    loadStats();
  }, [business?.id, showToast]);

  if (loading || statsLoading) {
    return (
      <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-[#B1A9E5]/30 border-t-[#7546ED] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#B1A9E5] text-sm">Cargando panel...</p>
          <p className="text-[#B1A9E5] text-xs mt-2">Esto puede tomar unos segundos</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
        <div className="text-center py-8">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-sm font-medium mb-2">Error al cargar datos</p>
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

  if (!business) {
    return (
      <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
        <div className="text-center py-8">
          <p className="text-[#B1A9E5] text-sm">Sin negocio encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[#B1A9E5] text-sm">Buenos días,</p>
          <h1 className="font-extrabold text-[#12173B] text-xl flex items-center gap-1">
            {business?.name || 'Cargando...'} <span>☕</span>
          </h1>
        </div>
        <RoleSwitcher />
      </div>

      {/* Date Filter */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'today', label: 'Hoy' },
          { key: 'week', label: 'Esta semana' },
          { key: 'month', label: 'Este mes' }
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => setDateFilter(opt.key as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              dateFilter === opt.key 
                ? 'bg-[#7546ED] text-white' 
                : 'bg-white text-[#B1A9E5] border border-[#B1A9E5]/20'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10" style={{ borderLeft: '3px solid #7546ED' }}>
          <div className="flex items-center justify-between mb-2">
            <DollarSign size={18} style={{ color: '#7546ED' }} />
            <span className="text-[10px] text-[#10B981] font-medium flex items-center gap-0.5">
              <ArrowUpRight size={10} /> Ingresos
            </span>
          </div>
          <p className="text-[#12173B] font-extrabold text-2xl">${totalRevenue.toFixed(2)}</p>
          <p className="text-[#B1A9E5] text-xs font-medium mt-0.5">Ingresos totales</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10" style={{ borderLeft: '3px solid #DC89FF' }}>
          <div className="flex items-center justify-between mb-2">
            <ShoppingCart size={18} style={{ color: '#DC89FF' }} />
            <span className="text-[10px] text-[#10B981] font-medium flex items-center gap-0.5">
              <ArrowUpRight size={10} /> Ventas
            </span>
          </div>
          <p className="text-[#12173B] font-extrabold text-2xl">{totalPurchases}</p>
          <p className="text-[#B1A9E5] text-xs font-medium mt-0.5">Compras realizadas</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10" style={{ borderLeft: '3px solid #10B981' }}>
          <div className="flex items-center justify-between mb-2">
            <Zap size={18} style={{ color: '#10B981' }} />
          </div>
          <p className="text-[#12173B] font-extrabold text-2xl">{pointsIssued}</p>
          <p className="text-[#B1A9E5] text-xs font-medium mt-0.5">Puntos emitidos</p>
        </div>

        <button
          onClick={() => navigate('/business/rewards')}
          className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10 hover:shadow-md transition-shadow cursor-pointer"
          style={{ borderLeft: '3px solid #FF6B6B' }}
        >
          <div className="flex items-center justify-between mb-2">
            <Gift size={18} style={{ color: '#FF6B6B' }} />
            {pendingRedemptions > 0 && (
              <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                {pendingRedemptions}
              </span>
            )}
          </div>
          <p className="text-[#12173B] font-extrabold text-2xl">{totalRedemptions}</p>
          <p className="text-[#B1A9E5] text-xs font-medium mt-0.5">Canjes realizados</p>
        </button>
      </div>

      {/* Activity Chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10 mb-6">
        <h3 className="font-bold text-[#12173B] text-sm mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-[#7546ED]" />
          Actividad últimos 7 días
        </h3>
        <div className="flex items-end gap-2 h-24">
          {dailyStats.map((day, i) => {
            const maxValue = Math.max(...dailyStats.map(d => d.purchases), 1);
            const height = (day.purchases / maxValue) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full bg-[#7546ED]/20 rounded-t-lg relative group"
                  style={{ height: `${Math.max(height, 5)}%` }}
                >
                  <div 
                    className="absolute bottom-0 w-full bg-[#7546ED] rounded-t-lg transition-all"
                    style={{ height: '100%' }}
                  />
                </div>
                <span className="text-[10px] text-[#B1A9E5] capitalize">{day.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-[#7546ED]" />
            <span className="text-xs text-[#B1A9E5]">Clientes totales</span>
          </div>
          <p className="text-[#12173B] font-extrabold text-xl">{totalCustomers}</p>
          <p className="text-[#10B981] text-[10px]">+{activeThisMonth} este mes</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={16} className="text-[#7546ED]" />
            <span className="text-xs text-[#B1A9E5]">Ticket promedio</span>
          </div>
          <p className="text-[#12173B] font-extrabold text-xl">
            ${totalPurchases > 0 ? (totalRevenue / totalPurchases).toFixed(2) : '0.00'}
          </p>
          <p className="text-[#B1A9E5] text-[10px]">Por compra</p>
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10 mb-6">
        <h3 className="font-bold text-[#12173B] text-sm mb-3 flex items-center gap-2">
          <Award size={16} className="text-[#7546ED]" />
          Top clientes
        </h3>
        {topCustomers.length === 0 ? (
          <p className="text-[#B1A9E5] text-xs text-center py-4">Sin datos de compras aún</p>
        ) : (
          <div className="space-y-2">
            {topCustomers.map((customer, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[#F4F3FB]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#7546ED]/10 flex items-center justify-center">
                    <span className="text-[#7546ED] font-bold text-xs">{customer.initial}</span>
                  </div>
                  <div>
                    <p className="font-medium text-[#12173B] text-xs">{customer.name}</p>
                    <p className="text-[#B1A9E5] text-[10px]">{customer.visits} visitas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#12173B] text-xs">${(customer.totalSpent || 0).toFixed(2)}</p>
                  <p className="text-[#B1A9E5] text-[10px]">{customer.points} pts</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Purchases */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10 mb-6">
        <h3 className="font-bold text-[#12173B] text-sm mb-3 flex items-center gap-2">
          <ShoppingCart size={16} className="text-[#7546ED]" />
          Compras recientes
        </h3>
        {transactions.filter(t => t.type === 'purchase').length === 0 ? (
          <p className="text-[#B1A9E5] text-xs text-center py-4">Sin compras registradas</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {transactions
              .filter(t => t.type === 'purchase')
              .slice(0, 10)
              .map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-2 border-b border-[#B1A9E5]/10 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#10B981]/10 flex items-center justify-center">
                    <span className="text-[#10B981] font-bold text-xs">{tx.customer_initial}</span>
                  </div>
                  <div>
                    <p className="font-medium text-[#12173B] text-xs">{tx.customer_name}</p>
                    <p className="text-[#B1A9E5] text-[10px]">
                      {new Date(tx.date).toLocaleDateString('es-ES', { 
                        day: 'numeric', 
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#12173B] text-xs">${tx.amount?.toFixed(2) || '0.00'}</p>
                  <p className="text-[#10B981] text-[10px]">+{tx.points} pts</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Redemptions */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10 mb-6">
        <h3 className="font-bold text-[#12173B] text-sm mb-3 flex items-center gap-2">
          <Gift size={16} className="text-[#7546ED]" />
          Canjes recientes
        </h3>
        {redemptions.length === 0 ? (
          <p className="text-[#B1A9E5] text-xs text-center py-4">Sin canjes registrados</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {redemptions.slice(0, 10).map((red) => (
              <div key={red.id} className="flex items-center justify-between p-2 border-b border-[#B1A9E5]/10 last:border-0">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    red.status === 'pending' ? 'bg-yellow-100' : 'bg-[#7546ED]/10'
                  }`}>
                    <span className={`font-bold text-xs ${
                      red.status === 'pending' ? 'text-yellow-600' : 'text-[#7546ED]'
                    }`}>{red.customer_initial}</span>
                  </div>
                  <div>
                    <p className="font-medium text-[#12173B] text-xs">{red.customer_name}</p>
                    <p className="text-[#B1A9E5] text-[10px]">{red.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    red.status === 'pending' 
                      ? 'bg-yellow-100 text-yellow-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {red.status === 'pending' ? 'Pendiente' : 'Completado'}
                  </span>
                  <p className="text-[#FF6B6B] text-[10px] font-medium">-{red.points} pts</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Loyalty Cards */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10">
        <h3 className="font-bold text-[#12173B] text-sm mb-3 flex items-center gap-2">
          <Users size={16} className="text-[#7546ED]" />
          Tarjetas de lealtad activas
          <span className="ml-auto text-[#B1A9E5] text-xs font-normal">{loyaltyCards.length} total</span>
        </h3>
        {loyaltyCards.length === 0 ? (
          <div className="text-center py-4">
            <Gift size={32} className="text-[#B1A9E5] mx-auto mb-2" />
            <p className="text-[#B1A9E5] text-xs">Aún no hay tarjetas creadas</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {loyaltyCards.slice(0, 20).map((card: any) => (
              <div key={card.id} className="flex items-center justify-between p-2 rounded-lg bg-[#F4F3FB]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#7546ED]/10 flex items-center justify-center">
                    <span className="text-[#7546ED] font-bold text-xs">
                      {card.profiles?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-[#12173B] text-xs">
                      {card.profiles?.name || 'Cliente'}
                    </p>
                    <p className="text-[#B1A9E5] text-[10px]">
                      Tarjeta: {card.card_number}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#12173B] text-xs">{card.current_points} pts</p>
                  <p className="text-[#B1A9E5] text-[10px]">
                    {card.total_points_earned || 0} acumulados
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
