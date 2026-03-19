export default function Loading() {
  return (
    <main className="min-h-screen bg-[#030712] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-white/5" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" />
        </div>
        <span className="text-xs text-slate-500 font-bold tracking-[0.3em] uppercase">
          Initializing
        </span>
      </div>
    </main>
  );
}
