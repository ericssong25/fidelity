export default function ExplorePage() {
  return (
    <div className="min-h-screen bg-[#F4F3FB] pb-24 flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-extrabold text-[#12173B] text-xl mb-4">Explore</h1>
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#B1A9E5]/10">
          <div className="w-16 h-16 rounded-full bg-[#7546ED]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <h2 className="font-bold text-[#12173B] text-lg mb-2">Coming soon</h2>
          <p className="text-[#B1A9E5] text-sm">
            Discover new businesses and loyalty programs in your area. Stay tuned!
          </p>
        </div>
      </div>
    </div>
  );
}
