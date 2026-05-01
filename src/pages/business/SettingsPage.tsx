import { useState, useEffect } from 'react';
import { Camera, Clock, Power } from 'lucide-react';
import { useBusinessData } from '../../context/BusinessDataContext';

type Level = 'Bronze' | 'Silver' | 'Gold';

// Time options for selectors
const timeOptions = [
  'Closed',
  '12:00 AM', '12:30 AM', '1:00 AM', '1:30 AM', '2:00 AM', '2:30 AM', '3:00 AM', '3:30 AM',
  '4:00 AM', '4:30 AM', '5:00 AM', '5:30 AM', '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM',
];

function parseTimeRange(timeRange: string): { open: string; close: string } {
  if (timeRange === 'Closed') return { open: 'Closed', close: 'Closed' };
  const [open, close] = timeRange.split(' – ');
  return { open: open.trim(), close: close.trim() };
}

function formatTimeRange(open: string, close: string): string {
  if (open === 'Closed') return 'Closed';
  return `${open} – ${close}`;
}

const levelDots: Record<Level, string> = {
  Bronze: '#12173B',
  Silver: '#032C7D',
  Gold: '#7546ED',
};

export default function SettingsPage() {
  const { business, loading } = useBusinessData();
  const [hours, setHours] = useState<any[]>([]);

  // Parse hours when business loads
  useEffect(() => {
    if (business?.hours) {
      setHours(business.hours.map((h: any) => ({
        ...h,
        ...parseTimeRange(h.hours)
      })));
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
          <p className="text-[#B1A9E5] text-sm">Loading business information...</p>
        </div>
      </div>
    );
  }
  
  if (!business) {
    return (
      <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
        <div className="text-center py-8">
          <p className="text-[#B1A9E5] text-sm">No business found</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
      <h1 className="font-extrabold text-[#12173B] text-xl mb-5">Settings</h1>

      {/* Business Profile */}
      <section className="mb-6">
        <h2 className="font-bold text-[#12173B] text-sm mb-3">Business Profile</h2>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10 space-y-4">
          {/* Cover placeholder */}
          <div
            className="h-24 rounded-xl relative flex items-center justify-center cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #12173B, #7546ED)' }}
          >
            <button className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Camera size={16} className="text-white" />
            </button>
            <span className="absolute bottom-2 right-2 text-white/50 text-[10px]">Cover photo</span>
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
              <p className="font-bold text-[#12173B] text-sm">{business?.name || 'Loading...'}</p>
              <p className="text-[#B1A9E5] text-xs">{business?.category || 'Loading...'}</p>
            </div>
          </div>

          {[
            { label: 'Business Name', value: business?.name || 'Loading...' },
            { label: 'Category', value: business?.category || 'Loading...' },
            { label: 'Description', value: business?.description || 'Loading...' },
            { label: 'Address', value: business?.address || 'Loading...' },
            { label: 'Phone', value: business?.phone || 'Loading...' },
          ].map(field => (
            <div key={field.label}>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">{field.label}</label>
              <input
                defaultValue={field.value}
                className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/20 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all"
              />
            </div>
          ))}
          <button className="w-full py-2.5 rounded-btn bg-[#7546ED] text-white font-bold text-sm">
            Save Profile
          </button>
        </div>
      </section>

      {/* Operating Hours */}
      <section className="mb-6">
        <h2 className="font-bold text-[#12173B] text-sm mb-3">Operating Hours</h2>
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
                  {day.open === 'Closed' ? (
                    <button
                      onClick={() => updateDayHours(i, 'open', '9:00 AM')}
                      className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                    >
                      <Power size={12} />
                      Closed
                    </button>
                  ) : (
                    <button
                      onClick={() => updateDayHours(i, 'open', 'Closed')}
                      className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors"
                    >
                      <Clock size={12} />
                      Open
                    </button>
                  )}
                </div>
              </div>
              
              {day.open !== 'Closed' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Clock size={14} className="text-[#B1A9E5]" />
                    <span className="text-xs text-[#B1A9E5] font-medium">Open:</span>
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
                    {timeOptions.filter(t => t !== 'Closed').map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  
                  <span className="text-[#B1A9E5] text-sm">to</span>
                  
                  <select
                    value={day.close}
                    onChange={(e: any) => updateDayHours(i, 'close', e.target.value)}
                    className={`flex-1 px-2 py-1 rounded-lg border text-sm outline-none transition-all ${
                      i === todayIndex 
                        ? 'border-[#7546ED] text-[#7546ED] bg-[#7546ED]/5' 
                        : 'border-[#B1A9E5]/20 text-[#12173B] bg-white'
                    }`}
                  >
                    {timeOptions.filter(t => t !== 'Closed').map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
        <button className="w-full mt-3 py-2.5 rounded-btn bg-[#7546ED] text-white font-bold text-sm">
          Save Operating Hours
        </button>
      </section>

      {/* Loyalty Program */}
      <section className="mb-6">
        <h2 className="font-bold text-[#12173B] text-sm mb-3">Loyalty Program</h2>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#12173B]">Points per purchase</span>
            <div className="flex items-center gap-2">
              <span className="text-[#7546ED] font-extrabold text-lg">Individual</span>
              <span className="text-[#B1A9E5] text-sm">per product</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#B1A9E5] mb-3">Level Thresholds</p>
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

          {/* Progression preview */}
          <div>
            <p className="text-xs font-semibold text-[#B1A9E5] mb-2">Progression Preview</p>
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
            Save Program Settings
          </button>
        </div>
      </section>
    </div>
  );
}
