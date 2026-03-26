export default function Loading() {
  return (
    <main className="min-h-screen bg-[#030712] flex items-center justify-center relative overflow-hidden">
      {/* Background Blurs */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Spinner */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/[0.05]" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-bold tracking-widest text-slate-300 uppercase">Loading</p>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
          </div>
        </div>
      </div>
    </main>
  );
}