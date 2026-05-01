interface Props {
  message: string;
  cta?: string;
  onCta?: () => void;
}

export default function EmptyState({ message, cta, onCta }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#7546ED]/10 flex items-center justify-center mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#7546ED]/20" />
      </div>
      <p className="text-[#B1A9E5] text-sm font-medium mb-3">{message}</p>
      {cta && onCta && (
        <button
          onClick={onCta}
          className="px-5 py-2 rounded-btn bg-[#7546ED] text-white text-sm font-semibold"
        >
          {cta}
        </button>
      )}
    </div>
  );
}
