"use client";
import Link from "next/link";
import { CheckCircle2, RotateCcw, CalendarOff, Settings2, Sparkles, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function ReviewView({ dailyRecord, formattedDate }: { dailyRecord: any, formattedDate: string }) {
  const isPartial = dailyRecord.status === "PARTIAL_DAY";

  // Dynamic Content based on Partial vs Completed
  const headerText = isPartial ? "Day ended early." : "Execution complete.";
  const pillText = isPartial ? "PARTIAL DAY" : "COMPLETED";
  const pillColor = isPartial ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  
  return (
    <main className="min-h-screen bg-[#030712] relative flex justify-center p-4 md:p-12 overflow-hidden selection:bg-indigo-500/30">
      
      {/* Ambient Execution Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-900/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[90rem] relative z-10 px-0 sm:px-4 xl:px-10 flex flex-col space-y-10">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/5 pb-6 gap-4">
          <div className="space-y-1">
            <span className="text-xs md:text-sm font-bold tracking-widest text-indigo-400 uppercase">
              {formattedDate}
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              {headerText}
            </h1>
          </div>
          
          <div className={`flex items-center gap-3 border px-4 py-2 rounded-full shadow-inner ${pillColor}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${isPartial ? "bg-amber-400" : "bg-emerald-400"}`} />
            <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase">{pillText}</span>
          </div>
        </header>

        {/* SPLIT LAYOUT: Summary & Future Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          
          {/* LEFT: Summary & Actions */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-white/[0.02] border border-white/[0.05] shadow-xl mb-6">
                {isPartial ? <CalendarOff className="w-8 h-8 text-amber-400/80" /> : <Sparkles className="w-8 h-8 text-emerald-400/80" />}
              </div>

              <h2 className="text-2xl font-bold text-white/90 mb-3">Daily Log Secured</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                Your timeline has been successfully logged. All metrics, durations, and partial task histories have been preserved for your analytics.
              </p>

              {dailyRecord.notes && (
                <div className="mb-8 p-5 bg-black/20 border border-white/5 rounded-2xl text-left w-full">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Journal Note</span>
                  <p className="text-slate-300 italic text-sm">"{dailyRecord.notes}"</p>
                </div>
              )}

              <div className="flex flex-col w-full gap-3">
                <Link href="/daily-planner/manage" className="w-full py-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white rounded-xl transition-all font-medium text-sm flex items-center justify-center gap-2">
                  <Settings2 className="w-4 h-4" /> Manage Backlog
                </Link>
              </div>
            </motion.div>
          </div>

          {/* RIGHT: Timeline Placeholder */}
          <div className="lg:col-span-7">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest pl-1 mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Execution Analytics
            </h2>
            
            <div className="h-[400px] border-2 border-dashed border-white/10 rounded-3xl bg-white/[0.01] flex flex-col items-center justify-center text-slate-500 space-y-3">
              <span className="text-4xl opacity-50">📊</span>
              <p className="font-medium">Timeline Chart & Cycle Accuracy</p>
              <p className="text-xs">(To be built in the next phase!)</p>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}