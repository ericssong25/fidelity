export default function NewsPage() {
  return (
    <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-extrabold text-[#12173B] text-xl mb-4">News</h1>
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#B1A9E5]/10">
          <div className="w-16 h-16 rounded-full bg-[#7546ED]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📰</span>
          </div>
          <h2 className="font-bold text-[#12173B] text-lg mb-2">Coming soon</h2>
          <p className="text-[#B1A9E5] text-sm">
            We're working on a news system to keep your customers informed. Stay tuned!
          </p>
        </div>
      </div>
    </div>
  );
}
