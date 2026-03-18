"use client";
import Link from "next/link";
import { Coffee, Settings2 } from "lucide-react";
import { motion } from "framer-motion";

export default function RestDayView({ formattedDate }: { formattedDate: string }) {
  return (
    <main className="min-h-screen bg-[#030712] relative flex justify-center p-4 md:p-12 overflow-hidden selection:bg-teal-500/30">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-teal-900/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-900/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[90rem] relative z-10 px-0 sm:px-4 xl:px-10 flex flex-col h-[calc(100vh-6rem)]">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/5 pb-6 gap-4">
          <div className="space-y-1">
            <span className="text-xs md:text-sm font-bold tracking-widest text-slate-500 uppercase">
              {formattedDate}
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              Recharging mode engaged.
            </h1>
          </div>
          
          <div className="flex items-center gap-3 border px-4 py-2 rounded-full shadow-inner bg-teal-500/10 text-teal-400 border-teal-500/20">
            <div className="w-2 h-2 rounded-full animate-pulse bg-teal-400" />
            <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase">DAY OFF</span>
          </div>
        </header>

        {/* CENTERPIECE */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center max-w-2xl text-center space-y-6"
          >
            
            <div className="w-24 h-24 rounded-full flex items-center justify-center bg-white/[0.02] border border-white/[0.05] shadow-2xl mb-4">
              <Coffee className="w-10 h-10 text-teal-400/80" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white/90">
              System Offline
            </h2>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-lg">
              Your active queue has been safely cleared. Unfinished tasks were returned to the backlog. Close the app and enjoy your time away from the screen.
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-12">
              <Link href="/daily-planner/manage" className="px-6 py-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white rounded-xl transition-all font-medium text-sm flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Manage Backlog
              </Link>
            </div>

          </motion.div>
        </div>
      </div>
    </main>
  );
}