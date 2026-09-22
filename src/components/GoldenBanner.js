export default function GoldenBanner() {
  return (
    <div className="mb-6 rounded-xl overflow-hidden border-2 border-yellow-600/70 shadow-lg shadow-yellow-900/30">
      {/* Golden gradient background */}
      <div className="bg-gradient-to-br from-yellow-950/60 via-amber-900/40 to-yellow-900/50 p-6 md:p-8">
        <div className="flex flex-col items-center text-center">
          {/* Decorative top ornament */}
          <div className="text-yellow-500 text-3xl mb-3 tracking-widest">
            ✦ ✦ ✦
          </div>

          {/* GOLDEN RULE HEADING */}
          <p className="text-yellow-500/90 text-xs tracking-[0.3em] uppercase font-bold mb-4">
            Golden Rule · For Your Mind
          </p>

          {/* THE GOLDEN RULE — the anchor */}
          <p className="text-yellow-50 text-base md:text-lg font-semibold leading-relaxed italic max-w-2xl">
            "The market will always be there.
            <br />
            Your capital may not.
            <br />
            Prepare your mind before you prepare your chart.
            <br />
            A disciplined trader is a prepared trader."
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5 w-full max-w-xs">
            <div className="flex-1 h-px bg-yellow-700/40" />
            <span className="text-yellow-600/70 text-xs">✦</span>
            <div className="flex-1 h-px bg-yellow-700/40" />
          </div>

          {/* Scripture anchor */}
          <p className="text-yellow-200/80 text-xs md:text-sm leading-relaxed max-w-xl">
            "Trust in the Lord with all your heart and lean not on your own
            understanding; in all your ways submit to Him, and He will make
            your paths straight."
          </p>
          <p className="text-yellow-500/70 text-xs mt-2 font-bold tracking-wider">
            PROVERBS 3:5–6
          </p>
        </div>
      </div>
    </div>
  );
}