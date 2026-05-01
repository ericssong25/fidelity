import { useNavigate } from 'react-router-dom';
import RoleSwitcher from '../../components/RoleSwitcher';
import LoyaltyCard from '../../components/LoyaltyCard';
import { sofia, sofiaLoyalty, businesses } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';

function getBusinessById(id: string) {
  return businesses.find(b => b.id === id)!;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Use real user data if available, otherwise fallback to mock data
  const displayUser = user || sofia;

  // Unused variables - commented out since sections are hidden
  // const allNews = businesses.flatMap(b =>
  //   b.news.map(n => ({ ...n, businessName: b.name, businessId: b.id }))
  // ).sort(() => Math.random() - 0.5).slice(0, 6);

  // const allPromos = businesses.flatMap(b =>
  //   b.promotions.map(p => ({ ...p, businessName: b.name, businessId: b.id }))
  // );

  // const dotColors: Record<string, string> = {
  //   moka: '#7546ED',
  //   epico: '#032C7D',
  //   fortuna: '#10B981',
  //   inboga: '#DC89FF',
  // };

  return (
    <div className="min-h-screen bg-[#F4F3FB] pb-24">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-[#F4F3FB]/80 backdrop-blur-md px-5 py-3 flex items-center justify-between border-b border-[#B1A9E5]/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7546ED] to-[#DC89FF] flex items-center justify-center">
            <span className="text-white font-bold text-xs">F</span>
          </div>
          <span className="font-bold text-[#12173B] text-base">FidelyApp</span>
        </div>
        <RoleSwitcher />
      </div>

      <div className="px-5 pt-6">
        {/* Greeting */}
        <div className="mb-6">
          <div className="flex items-center gap-1">
            <h1 className="text-2xl font-extrabold text-[#12173B]">Hello, {displayUser.name.split(' ')[0]}</h1>
            <span className="text-2xl">👋</span>
          </div>
          <p className="text-[#B1A9E5] text-sm mt-0.5 font-medium">Here's what's new today</p>
        </div>

        {/* Your Cards */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[#12173B] text-base">Your Cards</h2>
            <button
              onClick={() => navigate('/cards')}
              className="text-[#7546ED] text-xs font-semibold"
            >
              See all
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
            {sofiaLoyalty.map(record => {
              const biz = getBusinessById(record.businessId);
              return (
                <div
                  key={record.businessId}
                  onClick={() => navigate(`/cards/${record.businessId}`)}
                  className="cursor-pointer hover:scale-105 transition-transform duration-200"
                >
                  <LoyaltyCard
                    businessName={biz.name}
                    points={record.points}
                    level={record.level}
                    visits={record.visits}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* What's New - Hidden */}
        {/* <section className="mb-8">
          <h2 className="font-bold text-[#12173B] text-base mb-3">What's New</h2>
          <div className="space-y-3">
            {allNews.map(news => (
              <div
                key={`${news.businessId}-${news.id}`}
                className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: dotColors[news.businessId] ?? '#7546ED' }}
                  />
                  <span className="text-xs text-[#B1A9E5] font-medium">{news.businessName}</span>
                  <span className="text-xs text-[#B1A9E5] ml-auto">{news.date}</span>
                </div>
                <p className="font-bold text-[#12173B] text-sm leading-snug">{news.title}</p>
                <p className="text-[#B1A9E5] text-xs mt-1 line-clamp-2">{news.excerpt}</p>
              </div>
            ))}
          </div>
        </section> */}

        {/* Active Promotions - Hidden */}
        {/* <section className="mb-8">
          <h2 className="font-bold text-[#12173B] text-base mb-3">Active Promotions</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
            {allPromos.map(promo => (
              <div
                key={`${promo.businessId}-${promo.id}`}
                className="flex-shrink-0 w-52 rounded-2xl p-4 text-white"
                style={{ background: 'linear-gradient(135deg, #DC89FF, #7546ED)' }}
              >
                <div className="inline-block bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-bold mb-2">
                  {promo.discount}
                </div>
                <p className="text-xs text-white/70 font-medium">{promo.businessName}</p>
                <p className="font-bold text-sm leading-snug mt-0.5">{promo.title}</p>
                <p className="text-white/60 text-xs mt-2">{promo.dateRange}</p>
              </div>
            ))}
          </div>
        </section> */}
      </div>
    </div>
  );
}
