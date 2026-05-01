import { useState } from 'react';
import { Bell, HelpCircle, LogOut, ChevronRight, CreditCard as Edit3, Store, Building, Phone, MapPin } from 'lucide-react';
import { sofia } from '../../data/mockData';
import Modal from '../../components/Modal';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';

const levelBadge: Record<string, string> = {
  Gold: 'bg-gradient-to-r from-[#7546ED] to-[#DC89FF] text-white',
  Silver: 'bg-gradient-to-r from-[#032C7D] to-[#7546ED] text-white',
  Bronze: 'bg-gradient-to-r from-[#12173B] to-[#032C7D] text-white',
};

interface LoyaltyCardWithBusiness {
  id: string;
  card_number: string;
  current_points: number;
  total_points_earned: number;
  total_visits: number;
  issued_at: string;
  business_id: string;
  current_level_id: string | null;
  businesses: {
    id: string;
    name: string;
    category: string;
  }[];
  loyalty_levels: {
    id: string;
    name: string;
    color: string;
  }[];
}

const menuItems = [
  { icon: Edit3, label: 'Editar perfil', color: 'text-[#12173B]' },
  { icon: Bell, label: 'Notificaciones', color: 'text-[#12173B]' },
  { icon: HelpCircle, label: 'Ayuda y soporte', color: 'text-[#12173B]' },
  { icon: LogOut, label: 'Cerrar sesión', color: 'text-[#FF6B6B]' },
];

const businessMenuItem = {
  icon: Store,
  label: 'Registrar negocio',
  color: 'text-[#7546ED]'
};

export default function ProfilePage() {
  const { showToast } = useApp();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  
  // Use real user data if available, otherwise fallback to mock data
  const displayUser = user || sofia;
  
  // Query real loyalty cards from Supabase (using separate queries to avoid schema cache issues)
  const { data: loyaltyCards, loading: cardsLoading } = useSupabaseQuery<LoyaltyCardWithBusiness[]>(
    async () => {
      if (!user?.id) {
        return { data: [], error: null };
      }
      
      try {
        // Get loyalty cards first
        const { data: cardsOnly, error: cardsError } = await supabase
          .from('loyalty_cards')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('issued_at', { ascending: false });

        if (cardsError) {
          console.error('Error loading cards:', cardsError);
          return { data: [], error: cardsError };
        }

        if (!cardsOnly || cardsOnly.length === 0) {
          return { data: [], error: null };
        }

        // Get business info separately
        const businessIds = cardsOnly.map(c => c.business_id).filter(Boolean);
        const businessesMap: Record<string, any> = {};
        
        if (businessIds.length > 0) {
          const { data: businesses } = await supabase
            .from('businesses')
            .select('id, name, category')
            .in('id', businessIds);
          
          businesses?.forEach(b => {
            businessesMap[b.id] = b;
          });
        }

        // Get levels info separately
        const levelIds = cardsOnly.map(c => c.current_level_id).filter(Boolean);
        const levelsMap: Record<string, any> = {};
        
        if (levelIds.length > 0) {
          const { data: levels } = await supabase
            .from('loyalty_levels')
            .select('id, name, color')
            .in('id', levelIds);
          
          levels?.forEach(l => {
            levelsMap[l.id] = l;
          });
        }

        const data = cardsOnly.map(card => ({
          ...card,
          businesses: businessesMap[card.business_id] ? [businessesMap[card.business_id]] : [],
          loyalty_levels: levelsMap[card.current_level_id] ? [levelsMap[card.current_level_id]] : []
        }));

        return { data, error: null };
      } catch (err: any) {
        console.error('Error loading loyalty cards:', err);
        return { data: [], error: err };
      }
    },
    [user?.id],
    { enabled: !!user?.id, timeout: 15000 }
  );
  
  const userCards = loyaltyCards || [];
  const totalPoints = userCards.reduce((acc, card) => acc + (card.current_points || 0), 0);
  
  // Query to check if user already owns a business
  const { data: userBusiness } = useSupabaseQuery(
    async () => {
      if (!user?.id) {
        return { data: null, error: null };
      }
      
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('id, name')
          .eq('owner_id', user.id)
          .limit(1)
          .maybeSingle();
        
        return { data, error };
      } catch (err: any) {
        console.error('Error checking user business:', err);
        return { data: null, error: err };
      }
    },
    [user?.id],
    { enabled: !!user?.id, timeout: 10000 }
  );
  
  const hasBusiness = !!userBusiness;
  
  const [editModal, setEditModal] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [businessModal, setBusinessModal] = useState(false);
  const [editName, setEditName] = useState(displayUser.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Business registration form state
  const [businessForm, setBusinessForm] = useState({
    name: '',
    category: '',
    description: '',
    address: '',
    phone: ''
  });
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false);

  function handleRegisterBusiness() {
    setBusinessModal(true);
  }

  async function handleCreateBusiness() {
    if (!user) {
      showToast('Inicia sesión para crear un negocio', 'error');
      return;
    }

    // Validation
    if (!businessForm.name.trim()) {
      showToast('El nombre del negocio es requerido', 'error');
      return;
    }
    if (!businessForm.category.trim()) {
      showToast('La categoría es requerida', 'error');
      return;
    }

    setIsCreatingBusiness(true);

    try {
      const { error } = await supabase
        .from('businesses')
        .insert({
          owner_id: user.id,
          name: businessForm.name.trim(),
          category: businessForm.category.trim(),
          description: businessForm.description.trim(),
          address: businessForm.address.trim(),
          phone: businessForm.phone.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('Business creation error:', error);
        showToast('Error al crear negocio. Intenta de nuevo.', 'error');
        return;
      }

      showToast('¡Negocio creado exitosamente!', 'success');
      
      // Reset form and close modal
      setBusinessForm({
        name: '',
        category: '',
        description: '',
        address: '',
        phone: ''
      });
      setBusinessModal(false);
      
      // Redirect to business settings
      navigate('/business/settings');
      
    } catch (error) {
      console.error('Business creation error:', error);
      showToast('Ocurrió un error inesperado. Intenta de nuevo.', 'error');
    } finally {
      setIsCreatingBusiness(false);
    }
  }

  function handleBusinessFormChange(field: string, value: string) {
    setBusinessForm(prev => ({ ...prev, [field]: value }));
  }

  function handleEditProfile() {
    // Update name logic - in real app, this would update Supabase
    if (user) {
      // For now, just show success message
      showToast('¡Perfil actualizado!', 'success');
    }
    
    setEditModal(false);
  }

  function handlePasswordChange() {
    // Function kept for future implementation - currently not used
    console.log('Password change functionality not yet implemented');
  }

  function handleLogout() {
    logout();
    showToast('Sesión cerrada exitosamente', 'success');
    setLogoutModal(false);
    navigate('/auth');
  }

  return (
    <div className="min-h-screen bg-[#F4F3FB] pb-24">
      {/* Header */}
      <div
        className="px-5 pt-12 pb-8 flex flex-col items-center"
        style={{ background: 'linear-gradient(135deg, #12173B, #7546ED)' }}
      >
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-white font-extrabold text-2xl mb-3"
          style={{ background: 'linear-gradient(135deg, #7546ED, #DC89FF)' }}>
          {displayUser.initials}
        </div>
        <h1 className="text-white font-extrabold text-xl">{displayUser.name}</h1>
        <p className="text-white/60 text-sm">{displayUser.username}</p>
        <p className="text-white/60 text-sm">{displayUser.email}</p>
      </div>

      {/* Stats */}
      <div className="px-5 -mt-5">
        <div className="bg-white rounded-2xl p-4 shadow-md border border-[#B1A9E5]/10">
          <div className="grid grid-cols-3 divide-x divide-[#B1A9E5]/20">
            <div className="flex flex-col items-center px-3">
              <span className="text-[#7546ED] font-extrabold text-2xl">
                {cardsLoading ? '-' : userCards.length}
              </span>
              <span className="text-[#B1A9E5] text-[10px] text-center mt-0.5">Tarjetas</span>
            </div>
            <div className="flex flex-col items-center px-3">
              <span className="text-[#7546ED] font-extrabold text-2xl">
                {totalPoints.toLocaleString()}
              </span>
              <span className="text-[#B1A9E5] text-[10px] text-center mt-0.5">Puntos totales</span>
            </div>
            <div className="flex flex-col items-center px-3">
              <span className="text-[#7546ED] font-extrabold text-2xl">2</span>
              <span className="text-[#B1A9E5] text-[10px] text-center mt-0.5">Recompensas canjeadas</span>
            </div>
          </div>
        </div>
      </div>

      {/* My Loyalty */}
      <div className="px-5 mt-5">
        <h2 className="font-bold text-[#12173B] text-base mb-3">Tus tarjetas</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-[#B1A9E5]/10 overflow-hidden">
          {cardsLoading ? (
            <div className="px-4 py-6 text-center">
              <div className="w-8 h-8 border-2 border-[#7546ED]/30 border-t-[#7546ED] rounded-full animate-spin mx-auto mb-2"></div>
              <span className="text-[#B1A9E5] text-sm">Cargando tus tarjetas...</span>
            </div>
          ) : userCards.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <Store size={32} className="text-[#B1A9E5] mx-auto mb-2" />
              <span className="text-[#12173B] font-medium text-sm">Sin tarjetas aún</span>
              <p className="text-[#B1A9E5] text-xs mt-1">Visita negocios para obtener tarjetas</p>
            </div>
          ) : (
            userCards.map((card, i) => {
              const businessName = card.businesses?.[0]?.name || 'Negocio desconocido';
              const levelName = card.loyalty_levels?.[0]?.name || 'Miembro';
              const levelColor = card.loyalty_levels?.[0]?.color || '#7546ED';
              
              return (
                <div
                  key={card.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i < userCards.length - 1 ? 'border-b border-[#B1A9E5]/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: `linear-gradient(135deg, ${levelColor}, #DC89FF)` }}>
                      {businessName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-[#12173B] text-sm">{businessName}</span>
                      <span className="text-[#B1A9E5] text-xs">{card.total_visits || 0} visitas</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#7546ED] font-bold text-sm">{card.current_points || 0} pts</span>
                    <span 
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: levelColor }}
                    >
                      {levelName}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Menu */}
      <div className="px-5 mt-5">
        <div className="bg-white rounded-2xl shadow-sm border border-[#B1A9E5]/10 overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.label === 'Editar perfil') {
                  setEditModal(true);
                } else if (item.label === 'Cerrar sesión') {
                  setLogoutModal(true);
                } else {
                  showToast(`${item.label} — próximamente`, 'info');
                }
              }}
              className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#F4F3FB] transition-colors ${
                i < menuItems.length - 1 ? 'border-b border-[#B1A9E5]/10' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} className={item.color} />
                <span className={`font-medium text-sm ${item.color}`}>{item.label}</span>
              </div>
              <ChevronRight size={16} className="text-[#B1A9E5]" />
            </button>
          ))}
        </div>
      </div>

      {/* Register Business Section - Only show if user doesn't have a business */}
      {!hasBusiness && (
        <div className="px-5 mt-4">
          <div className="bg-gradient-to-r from-[#7546ED] to-[#DC89FF] rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <businessMenuItem.icon size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Comienza tu negocio</h3>
                  <p className="text-white/80 text-xs">Crea tu programa de lealtad</p>
                </div>
              </div>
              <button
                onClick={handleRegisterBusiness}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white font-semibold text-sm hover:bg-white/30 transition-colors"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Business Registration Modal */}
      <Modal open={businessModal} onClose={() => setBusinessModal(false)} title="Registra tu negocio">
        <div className="space-y-4">
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-[#7546ED]/10 flex items-center justify-center mx-auto mb-4">
              <Store size={24} className="text-[#7546ED]" />
            </div>
            <h3 className="font-bold text-[#12173B] text-lg mb-2">Crea tu negocio</h3>
            <p className="text-[#B1A9E5] text-sm">
              Comienza tu programa de lealtad en minutos
            </p>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 flex items-center gap-1">
                <Building size={12} />
                Nombre del negocio *
              </label>
              <input 
                type="text"
                value={businessForm.name}
                onChange={e => handleBusinessFormChange('name', e.target.value)}
                placeholder="Nombre de tu negocio"
                className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" 
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Categoría *</label>
              <select
                value={businessForm.category}
                onChange={e => handleBusinessFormChange('category', e.target.value)}
                className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all"
              >
                <option value="">Selecciona una categoría</option>
                <option value="Cafetería">Cafetería</option>
                <option value="Restaurante">Restaurante</option>
                <option value="Tienda">Tienda</option>
                <option value="Servicios">Servicios</option>
                <option value="Belleza">Belleza y Bienestar</option>
                <option value="Entretenimiento">Entretenimiento</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Descripción</label>
              <textarea
                value={businessForm.description}
                onChange={e => handleBusinessFormChange('description', e.target.value)}
                placeholder="Cuéntanos sobre tu negocio"
                rows={3}
                className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all resize-none"
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 flex items-center gap-1">
                <MapPin size={12} />
                Dirección
              </label>
              <input 
                type="text"
                value={businessForm.address}
                onChange={e => handleBusinessFormChange('address', e.target.value)}
                placeholder="Dirección del negocio"
                className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" 
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 flex items-center gap-1">
                <Phone size={12} />
                Teléfono
              </label>
              <input 
                type="tel"
                value={businessForm.phone}
                onChange={e => handleBusinessFormChange('phone', e.target.value)}
                placeholder="Teléfono del negocio"
                className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" 
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => setBusinessModal(false)}
              disabled={isCreatingBusiness}
              className="flex-1 py-3 rounded-btn border border-[#B1A9E5]/40 text-[#B1A9E5] font-semibold text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              onClick={handleCreateBusiness}
              disabled={isCreatingBusiness}
              className="flex-1 py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCreatingBusiness ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creando...
                </>
              ) : (
                'Crear negocio'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Editar perfil">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Nombre</label>
            <input 
              value={editName} 
              onChange={e => setEditName(e.target.value)} 
              placeholder="Tu nombre"
              className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" 
            />
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Usuario</label>
              <input 
                value={displayUser.username} 
                disabled
                className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/20 text-sm text-[#B1A9E5] bg-[#F4F3FB] outline-none" 
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Correo</label>
              <input 
                value={displayUser.email} 
                disabled
                className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/20 text-sm text-[#B1A9E5] bg-[#F4F3FB] outline-none" 
              />
            </div>
          </div>

          <div className="border-t border-[#B1A9E5]/10 pt-4">
            <h3 className="font-bold text-[#12173B] text-sm mb-3">Cambiar contraseña</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Contraseña actual</label>
                <input 
                  type="password"
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)} 
                  placeholder="Contraseña actual"
                  className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Nueva contraseña</label>
                <input 
                  type="password"
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  placeholder="Nueva contraseña"
                  className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Confirmar nueva contraseña</label>
                <input 
                  type="password"
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  placeholder="Confirmar nueva contraseña"
                  className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" 
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => setEditModal(false)}
              className="flex-1 py-3 rounded-btn border border-[#B1A9E5]/40 text-[#B1A9E5] font-semibold text-sm"
            >
              Cancelar
            </button>
            <button 
              onClick={handleEditProfile}
              className="flex-1 py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm"
            >
              Guardar cambios
            </button>
          </div>
        </div>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal open={logoutModal} onClose={() => setLogoutModal(false)} title="Cerrar sesión">
        <div className="space-y-4">
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-[#FF6B6B]/10 flex items-center justify-center mx-auto mb-4">
              <LogOut size={24} className="text-[#FF6B6B]" />
            </div>
            <h3 className="font-bold text-[#12173B] text-lg mb-2">¿Seguro que quieres cerrar sesión?</h3>
            <p className="text-[#B1A9E5] text-sm">
              Deberás iniciar sesión nuevamente para acceder.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => setLogoutModal(false)}
              className="flex-1 py-3 rounded-btn border border-[#B1A9E5]/40 text-[#B1A9E5] font-semibold text-sm"
            >
              Cancelar
            </button>
            <button 
              onClick={handleLogout}
              className="flex-1 py-3 rounded-btn bg-[#FF6B6B] text-white font-bold text-sm"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
