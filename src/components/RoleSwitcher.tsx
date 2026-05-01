import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function RoleSwitcher() {
  const { role, setRole } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasBusiness, setHasBusiness] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user has a business
  useEffect(() => {
    async function checkBusinessOwnership() {
      if (!user) {
        setHasBusiness(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error('Error checking business ownership:', error);
        }

        setHasBusiness(!!data);
      } catch (error) {
        console.error('Error checking business ownership:', error);
        setHasBusiness(false);
      } finally {
        setLoading(false);
      }
    }

    checkBusinessOwnership();
  }, [user]);

  function toggle() {
    if (role === 'customer') {
      setRole('business');
      navigate('/business/overview');
    } else {
      setRole('customer');
      navigate('/home');
    }
  }

  // Don't show switch if user doesn't have a business or is still loading
  if (loading || !hasBusiness) {
    return null;
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center rounded-full border border-[#B1A9E5]/40 bg-white/10 backdrop-blur-sm overflow-hidden text-xs font-semibold transition-all"
      style={{ padding: 2 }}
    >
      <span
        className={`px-3 py-1 rounded-full transition-all duration-200 ${
          role === 'customer'
            ? 'bg-[#7546ED] text-white'
            : 'text-[#B1A9E5]'
        }`}
      >
        Customer
      </span>
      <span
        className={`px-3 py-1 rounded-full transition-all duration-200 ${
          role === 'business'
            ? 'bg-[#7546ED] text-white'
            : 'text-[#B1A9E5]'
        }`}
      >
        Business
      </span>
    </button>
  );
}
