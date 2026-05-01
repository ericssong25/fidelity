import { useState } from 'react';
import { Bell, HelpCircle, LogOut, ChevronRight, CreditCard as Edit3, Store, Building, Phone, MapPin } from 'lucide-react';
import { sofia, sofiaLoyalty, businesses } from '../../data/mockData';
import type { Level } from '../../data/mockData';
import Modal from '../../components/Modal';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const levelBadge: Record<Level, string> = {
  Gold: 'bg-gradient-to-r from-[#7546ED] to-[#DC89FF] text-white',
  Silver: 'bg-gradient-to-r from-[#032C7D] to-[#7546ED] text-white',
  Bronze: 'bg-gradient-to-r from-[#12173B] to-[#032C7D] text-white',
};

const menuItems = [
  { icon: Edit3, label: 'Edit Profile', color: 'text-[#12173B]' },
  { icon: Bell, label: 'Notifications', color: 'text-[#12173B]' },
  { icon: HelpCircle, label: 'Help & Support', color: 'text-[#12173B]' },
  { icon: LogOut, label: 'Log out', color: 'text-[#FF6B6B]' },
];

const businessMenuItem = {
  icon: Store,
  label: 'Register Business',
  color: 'text-[#7546ED]'
};

export default function ProfilePage() {
  const { showToast } = useApp();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  
  // Use real user data if available, otherwise fallback to mock data
  const displayUser = user || sofia;
  const totalPoints = sofiaLoyalty.reduce((acc, r) => acc + r.points, 0);
  
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
      showToast('Please log in to create a business', 'error');
      return;
    }

    // Validation
    if (!businessForm.name.trim()) {
      showToast('Business name is required', 'error');
      return;
    }
    if (!businessForm.category.trim()) {
      showToast('Category is required', 'error');
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
        showToast('Failed to create business. Please try again.', 'error');
        return;
      }

      showToast('Business created successfully!', 'success');
      
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
      showToast('An unexpected error occurred. Please try again.', 'error');
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
      showToast('Profile updated successfully!', 'success');
    }
    
    setEditModal(false);
  }

  function handlePasswordChange() {
    // Function kept for future implementation - currently not used
    console.log('Password change functionality not yet implemented');
  }

  function handleLogout() {
    logout();
    showToast('Logged out successfully', 'success');
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
                {sofiaLoyalty.length}
              </span>
              <span className="text-[#B1A9E5] text-[10px] text-center mt-0.5">Businesses visited</span>
            </div>
            <div className="flex flex-col items-center px-3">
              <span className="text-[#7546ED] font-extrabold text-2xl">
                {totalPoints.toLocaleString()}
              </span>
              <span className="text-[#B1A9E5] text-[10px] text-center mt-0.5">Total points</span>
            </div>
            <div className="flex flex-col items-center px-3">
              <span className="text-[#7546ED] font-extrabold text-2xl">2</span>
              <span className="text-[#B1A9E5] text-[10px] text-center mt-0.5">Rewards redeemed</span>
            </div>
          </div>
        </div>
      </div>

      {/* My Loyalty */}
      <div className="px-5 mt-5">
        <h2 className="font-bold text-[#12173B] text-base mb-3">My Loyalty</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-[#B1A9E5]/10 overflow-hidden">
          {sofiaLoyalty.map((record, i) => {
            const biz = businesses.find(b => b.id === record.businessId)!;
            return (
              <div
                key={record.businessId}
                className={`flex items-center justify-between px-4 py-3 ${
                  i < sofiaLoyalty.length - 1 ? 'border-b border-[#B1A9E5]/10' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg, #7546ED, #DC89FF)' }}>
                    {biz.name.charAt(0)}
                  </div>
                  <span className="font-semibold text-[#12173B] text-sm">{biz.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#7546ED] font-bold text-sm">{record.points} pts</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${levelBadge[record.level]}`}>
                    {record.level}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Menu */}
      <div className="px-5 mt-5">
        <div className="bg-white rounded-2xl shadow-sm border border-[#B1A9E5]/10 overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.label === 'Edit Profile') {
                  setEditModal(true);
                } else if (item.label === 'Log out') {
                  setLogoutModal(true);
                } else {
                  showToast(`${item.label} — coming soon`, 'info');
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

      {/* Register Business Section */}
      <div className="px-5 mt-4">
        <div className="bg-gradient-to-r from-[#7546ED] to-[#DC89FF] rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <businessMenuItem.icon size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Start Your Business</h3>
                <p className="text-white/80 text-xs">Create your loyalty program</p>
              </div>
            </div>
            <button
              onClick={handleRegisterBusiness}
              className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white font-semibold text-sm hover:bg-white/30 transition-colors"
            >
              Register
            </button>
          </div>
        </div>
      </div>

      {/* Business Registration Modal */}
      <Modal open={businessModal} onClose={() => setBusinessModal(false)} title="Register Your Business">
        <div className="space-y-4">
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-[#7546ED]/10 flex items-center justify-center mx-auto mb-4">
              <Store size={24} className="text-[#7546ED]" />
            </div>
            <h3 className="font-bold text-[#12173B] text-lg mb-2">Create Your Business</h3>
            <p className="text-[#B1A9E5] text-sm">
              Start your loyalty program in minutes
            </p>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 flex items-center gap-1">
                <Building size={12} />
                Business Name *
              </label>
              <input 
                type="text"
                value={businessForm.name}
                onChange={e => handleBusinessFormChange('name', e.target.value)}
                placeholder="Enter your business name"
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
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Description</label>
              <textarea
                value={businessForm.description}
                onChange={e => handleBusinessFormChange('description', e.target.value)}
                placeholder="Tell us about your business"
                rows={3}
                className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all resize-none"
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 flex items-center gap-1">
                <MapPin size={12} />
                Address
              </label>
              <input 
                type="text"
                value={businessForm.address}
                onChange={e => handleBusinessFormChange('address', e.target.value)}
                placeholder="Business address"
                className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" 
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 flex items-center gap-1">
                <Phone size={12} />
                Phone
              </label>
              <input 
                type="tel"
                value={businessForm.phone}
                onChange={e => handleBusinessFormChange('phone', e.target.value)}
                placeholder="Business phone number"
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
              Cancel
            </button>
            <button 
              onClick={handleCreateBusiness}
              disabled={isCreatingBusiness}
              className="flex-1 py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCreatingBusiness ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                'Create Business'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Profile">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Name</label>
            <input 
              value={editName} 
              onChange={e => setEditName(e.target.value)} 
              placeholder="Your name"
              className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" 
            />
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Username</label>
              <input 
                value={displayUser.username} 
                disabled
                className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/20 text-sm text-[#B1A9E5] bg-[#F4F3FB] outline-none" 
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Email</label>
              <input 
                value={displayUser.email} 
                disabled
                className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/20 text-sm text-[#B1A9E5] bg-[#F4F3FB] outline-none" 
              />
            </div>
          </div>

          <div className="border-t border-[#B1A9E5]/10 pt-4">
            <h3 className="font-bold text-[#12173B] text-sm mb-3">Change Password</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Current Password</label>
                <input 
                  type="password"
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)} 
                  placeholder="Enter current password"
                  className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">New Password</label>
                <input 
                  type="password"
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  placeholder="Enter new password"
                  className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Confirm New Password</label>
                <input 
                  type="password"
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  placeholder="Confirm new password"
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
              Cancel
            </button>
            <button 
              onClick={handleEditProfile}
              className="flex-1 py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal open={logoutModal} onClose={() => setLogoutModal(false)} title="Log Out">
        <div className="space-y-4">
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-[#FF6B6B]/10 flex items-center justify-center mx-auto mb-4">
              <LogOut size={24} className="text-[#FF6B6B]" />
            </div>
            <h3 className="font-bold text-[#12173B] text-lg mb-2">Are you sure you want to log out?</h3>
            <p className="text-[#B1A9E5] text-sm">
              You will need to sign in again to access your account.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => setLogoutModal(false)}
              className="flex-1 py-3 rounded-btn border border-[#B1A9E5]/40 text-[#B1A9E5] font-semibold text-sm"
            >
              Cancel
            </button>
            <button 
              onClick={handleLogout}
              className="flex-1 py-3 rounded-btn bg-[#FF6B6B] text-white font-bold text-sm"
            >
              Log Out
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
