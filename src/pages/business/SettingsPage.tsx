/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Camera, Clock, Power } from 'lucide-react';
import { useBusinessData } from '../../context/BusinessDataContext';
import { useApp } from '../../context/AppContext';

// Time options for selectors
const timeOptions = [
  'Cerrado',
  '12:00 AM', '12:30 AM', '1:00 AM', '1:30 AM', '2:00 AM', '2:30 AM', '3:00 AM', '3:30 AM',
  '4:00 AM', '4:30 AM', '5:00 AM', '5:30 AM', '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM',
];

function parseTimeRange(timeRange: string): { open: string; close: string } {
  if (!timeRange || timeRange === 'Cerrado') return { open: 'Cerrado', close: 'Cerrado' };
  // Handle both " - " (from DB) and " – " (en-dash)
  const parts = timeRange.split(/\s[-–]\s/);
  if (parts.length < 2) return { open: 'Cerrado', close: 'Cerrado' };
  return { open: parts[0].trim(), close: parts[1].trim() };
}

function formatTimeRange(open: string, close: string): string {
  if (open === 'Cerrado') return 'Cerrado';
  return `${open} – ${close}`;
}

export default function SettingsPage() {
  const { business, loading, updateBusiness } = useBusinessData();
  const { showToast } = useApp();
  const [hours, setHours] = useState<any[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  
  // Form states for business profile
  const [profileForm, setProfileForm] = useState({
    name: '',
    category: '',
    description: '',
    address: '',
    phone: ''
  });

  // Default hours structure
  const defaultHours = [
    { day: 'Lunes', hours: 'Cerrado', open: 'Cerrado', close: 'Cerrado' },
    { day: 'Martes', hours: '9:00 AM – 6:00 PM', open: '9:00 AM', close: '6:00 PM' },
    { day: 'Miércoles', hours: '9:00 AM – 6:00 PM', open: '9:00 AM', close: '6:00 PM' },
    { day: 'Jueves', hours: '9:00 AM – 6:00 PM', open: '9:00 AM', close: '6:00 PM' },
    { day: 'Viernes', hours: '9:00 AM – 6:00 PM', open: '9:00 AM', close: '6:00 PM' },
    { day: 'Sábado', hours: '9:00 AM – 6:00 PM', open: '9:00 AM', close: '6:00 PM' },
    { day: 'Domingo', hours: 'Cerrado', open: 'Cerrado', close: 'Cerrado' },
  ];

  // Parse hours and profile when business loads
  useEffect(() => {
    if (business?.hours && business.hours.length > 0) {
      setHours(business.hours.map((h: any) => ({
        ...h,
        ...parseTimeRange(h.hours)
      })));
    } else if (business) {
      // Initialize with default hours if none exist
      setHours(defaultHours);
    }
    if (business) {
      setProfileForm({
        name: business.name || '',
        category: business.category || '',
        description: business.description || '',
        address: business.address || '',
        phone: business.phone || ''
      });
    }
  }, [business]);

  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  const updateDayHours = (dayIndex: number, type: 'open' | 'close', value: string) => {
    setHours((prev: any[]) => prev.map((h: any, i: number) => {
      if (i === dayIndex) {
        const updated = { ...h, [type]: value };
        return {
          ...updated,
          hours: formatTimeRange(updated.open, updated.close)
        };
      }
      return h;
    }));
  };

  if (loading) {
    return (
      <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-[#B1A9E5]/30 border-t-[#7546ED] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#B1A9E5] text-sm">Cargando información...</p>
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
      <h1 className="font-extrabold text-[#12173B] text-xl mb-5">Ajustes</h1>

      {/* Business Profile */}
      <section className="mb-6">
        <h2 className="font-bold text-[#12173B] text-sm mb-3">Perfil del negocio</h2>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10 space-y-4">
          {/* Cover placeholder */}
          <div
            className="h-24 rounded-xl relative flex items-center justify-center cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #12173B, #7546ED)' }}
          >
            <button className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Camera size={16} className="text-white" />
            </button>
            <span className="absolute bottom-2 right-2 text-white/50 text-[10px]">Foto de portada</span>
          </div>

          {/* Logo placeholder */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-[#7546ED]/10 flex items-center justify-center">
                <span className="text-[#7546ED] font-extrabold text-xl">{(business?.name || 'M').charAt(0)}</span>
              </div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#7546ED] flex items-center justify-center">
                <Camera size={12} className="text-white" />
              </button>
            </div>
            <div>
              <p className="font-bold text-[#12173B] text-sm">{business?.name || 'Cargando...'}</p>
              <p className="text-[#B1A9E5] text-xs">{business?.category || 'Cargando...'}</p>
            </div>
          </div>

          {[
            { label: 'Nombre del negocio', key: 'name', placeholder: 'Nombre de tu negocio' },
            { label: 'Categoría', key: 'category', placeholder: 'Ej: Restaurante, Tienda...' },
            { label: 'Descripción', key: 'description', placeholder: 'Describe tu negocio' },
            { label: 'Dirección', key: 'address', placeholder: 'Dirección completa' },
            { label: 'Teléfono', key: 'phone', placeholder: 'Número de contacto' },
          ].map(field => (
            <div key={field.key}>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">{field.label}</label>
              <input
                value={profileForm[field.key as keyof typeof profileForm]}
                onChange={(e) => setProfileForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/20 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all"
              />
            </div>
          ))}
          <button 
            onClick={async () => {
              setSavingProfile(true);
              const result = await updateBusiness({
                name: profileForm.name,
                category: profileForm.category,
                description: profileForm.description,
                address: profileForm.address,
                phone: profileForm.phone
              });
              if (result.success) {
                showToast('Perfil guardado exitosamente', 'success');
              } else {
                showToast('Error al guardar: ' + result.error, 'error');
              }
              setSavingProfile(false);
            }}
            disabled={savingProfile}
            className="w-full py-2.5 rounded-btn bg-[#7546ED] text-white font-bold text-sm disabled:opacity-50"
          >
            {savingProfile ? 'Guardando...' : 'Guardar perfil'}
          </button>
        </div>
      </section>

      {/* Operating Hours */}
      <section className="mb-6">
        <h2 className="font-bold text-[#12173B] text-sm mb-3">Horarios de atención</h2>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#B1A9E5]/10">
          {hours.map((day: any, i: number) => (
            <div
              key={day.day}
              className={`px-4 py-3 ${
                i < hours.length - 1 ? 'border-b border-[#B1A9E5]/10' : ''
              } ${i === todayIndex ? 'bg-[#7546ED]/5' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-semibold w-28 ${i === todayIndex ? 'text-[#7546ED]' : 'text-[#12173B]'}`}>
                  {day.day}
                </span>
                <div className="flex items-center gap-2">
                  {day.open === 'Cerrado' ? (
                    <button
                      onClick={() => updateDayHours(i, 'open', '9:00 AM')}
                      className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                    >
                      <Power size={12} />
                      Cerrado
                    </button>
                  ) : (
                    <button
                      onClick={() => updateDayHours(i, 'open', 'Cerrado')}
                      className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors"
                    >
                      <Clock size={12} />
                      Abierto
                    </button>
                  )}
                </div>
              </div>
              
              {day.open !== 'Cerrado' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Clock size={14} className="text-[#B1A9E5]" />
                    <span className="text-xs text-[#B1A9E5] font-medium">Abre:</span>
                  </div>
                  <select
                    value={day.open}
                    onChange={(e: any) => updateDayHours(i, 'open', e.target.value)}
                    className={`flex-1 px-2 py-1 rounded-lg border text-sm outline-none transition-all ${
                      i === todayIndex 
                        ? 'border-[#7546ED] text-[#7546ED] bg-[#7546ED]/5' 
                        : 'border-[#B1A9E5]/20 text-[#12173B] bg-white'
                    }`}
                  >
                    {timeOptions.filter(t => t !== 'Cerrado').map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  
                  <span className="text-[#B1A9E5] text-sm">a</span>
                  
                  <select
                    value={day.close}
                    onChange={(e: any) => updateDayHours(i, 'close', e.target.value)}
                    className={`flex-1 px-2 py-1 rounded-lg border text-sm outline-none transition-all ${
                      i === todayIndex 
                        ? 'border-[#7546ED] text-[#7546ED] bg-[#7546ED]/5' 
                        : 'border-[#B1A9E5]/20 text-[#12173B] bg-white'
                    }`}
                  >
                    {timeOptions.filter(t => t !== 'Cerrado').map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
        <button 
          onClick={async () => {
            setSavingHours(true);
            const result = await updateBusiness({
              hours: hours.map(h => ({ day: h.day, hours: h.hours }))
            });
            if (result.success) {
              showToast('Horarios guardados exitosamente', 'success');
            } else {
              showToast('Error al guardar: ' + result.error, 'error');
            }
            setSavingHours(false);
          }}
          disabled={savingHours}
          className="w-full mt-3 py-2.5 rounded-btn bg-[#7546ED] text-white font-bold text-sm disabled:opacity-50"
        >
          {savingHours ? 'Guardando...' : 'Guardar horarios'}
        </button>
      </section>

      {/* Loyalty Program - Hidden for now */}
      {/*
      <section className="mb-6">
        <h2 className="font-bold text-[#12173B] text-sm mb-3">Programa de lealtad</h2>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#12173B]">Puntos por compra</span>
            <div className="flex items-center gap-2">
              <span className="text-[#7546ED] font-extrabold text-lg">Individual</span>
              <span className="text-[#B1A9E5] text-sm">por producto</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#B1A9E5] mb-3">Umbrales de nivel</p>
            <div className="space-y-2">
              {business?.levels?.map((l: any) => (
                <div key={l.level} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: levelDots[l.level as Level] }} />
                    <span className="text-sm font-semibold text-[#12173B]">{l.level}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      defaultValue={l.minPoints}
                      className="w-20 text-right px-2 py-1 rounded-lg border border-[#B1A9E5]/20 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all"
                    />
                    <span className="text-[#B1A9E5] text-xs">pts</span>
                  </div>
                </div>
              )) || []}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#B1A9E5] mb-2">Vista previa</p>
            <div className="relative h-2.5 bg-[#B1A9E5]/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: '75%',
                  background: 'linear-gradient(90deg, #7546ED, #DC89FF)',
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              {business?.levels?.map((l: any) => (
                <span key={l.level} className="text-[9px] text-[#B1A9E5] font-medium">{l.level}</span>
              )) || []}
            </div>
          </div>

          <button className="w-full py-2.5 rounded-btn bg-[#7546ED] text-white font-bold text-sm">
            Guardar ajustes
          </button>
        </div>
      </section>
      */}
    </div>
  );
}
