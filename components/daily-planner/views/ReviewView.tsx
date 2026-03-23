"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Trash2, Settings2, Sparkles, Clock, History, PlayCircle, Zap, BarChart3, Plus, Edit2, X } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { formatTimeHM } from "@/lib/helpers";
import { updateTimeEntry, addAdhocLog, deleteTimeEntry } from "../../../actions/daily-planner";
import type { DailyRecord, TimeEntry } from "@/types/daily_planner";

export default function ReviewView({ dailyRecord, timeEntries, formattedDate }: { dailyRecord: DailyRecord, timeEntries: TimeEntry[], formattedDate: string }) {
  const isPartial = dailyRecord.status === "ENDED_EARLY" || dailyRecord.status === "PARTIAL_DAY";

  // --- MODAL STATES ---
  const [isAddingAdhoc, setIsAddingAdhoc] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  // --- 1. PREMIUM ANALYTICS MATH ---
  const totalItems = dailyRecord.items.length;
  const completedItems = dailyRecord.items.filter((i) => i.status === "COMPLETED").length;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const totalSeconds = timeEntries.reduce((sum, entry) => sum + (entry.durationSeconds || 0), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const focusTimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const liveSessions = timeEntries.filter((e) => e.entryType === "LIVE_TRACKED").length;
  const manualSessions = timeEntries.filter((e) => e.entryType === "MANUAL").length;

  const liveSeconds = timeEntries.filter((e) => e.entryType === "LIVE_TRACKED").reduce((sum, e) => sum + (e.durationSeconds || 0), 0);
  const manualSeconds = timeEntries.filter((e) => e.entryType === "MANUAL").reduce((sum, e) => sum + (e.durationSeconds || 0), 0);
  
  const livePercent = totalSeconds > 0 ? (liveSeconds / totalSeconds) * 100 : 0;
  const manualPercent = totalSeconds > 0 ? (manualSeconds / totalSeconds) * 100 : 0;

  // --- 3. DYNAMIC MESSAGING ---
  let headerMessage = "";
  if (isPartial) headerMessage = "Day ended early.";
  else if (completionRate === 100) headerMessage = "A flawless day.";
  else if (completionRate >= 50) headerMessage = "Solid progress today.";
  else headerMessage = "Day complete.";

  const pillText = isPartial ? "PARTIAL DAY" : "COMPLETED";
  const pillColor = isPartial ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  
  // Extracts HH:mm for the HTML <input type="time"> editor modals
  const getInputTime = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
  };

  // --- 4. ANIMATION VARIANTS ---
  const containerVars: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVars: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  // Ring Chart Math
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  return (
    <main className="min-h-screen bg-[#030712] relative flex justify-center p-4 md:p-12 overflow-hidden selection:bg-indigo-500/30">
      
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
              {headerMessage}
            </h1>
          </div>
          
          <div className={`flex items-center gap-3 border px-4 py-2 rounded-full shadow-inner ${pillColor}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${isPartial ? "bg-amber-400" : "bg-emerald-400"}`} />
            <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase">{pillText}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
          
          {/* =========================================
              LEFT: SUMMARY & METRICS
          ========================================= */}
          <motion.div variants={containerVars} initial="hidden" animate="show" className="lg:col-span-5 flex flex-col gap-6">
            
            {/* The Main Hero Card with Ring Chart */}
            <motion.div variants={itemVars} className="bg-[#0c1222] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500 opacity-50" />
              
              <div className="relative w-32 h-32 mb-6">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                  <motion.circle 
                    cx="50" cy="50" r={radius} 
                    stroke="currentColor" strokeWidth="8" fill="transparent" 
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    strokeLinecap="round"
                    className={`${completionRate === 100 ? 'text-emerald-500' : 'text-indigo-500'} drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]`} 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {completionRate === 100 ? <Sparkles className="w-8 h-8 text-emerald-400" /> : <span className="text-2xl font-bold text-white">{completionRate}%</span>}
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white/90 mb-2">Daily Summary</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                You completed <strong className="text-slate-200">{completedItems} out of {totalItems}</strong> scheduled items. Your execution metrics have been synced.
              </p>

              {/* Action Buttons Side-by-Side */}
              <div className="grid grid-cols-2 w-full gap-3">
                <Link href="/daily-planner/manage" className="py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-bold text-xs md:text-sm flex flex-col items-center justify-center gap-1 shadow-lg shadow-indigo-900/20">
                  <Settings2 className="w-5 h-5" /> Manage Tomorrow
                </Link>
                <Link href="/daily-planner/analytics" className="py-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white rounded-xl transition-all font-bold text-xs md:text-sm flex flex-col items-center justify-center gap-1">
                  <BarChart3 className="w-5 h-5" /> View Analytics
                </Link>
              </div>
            </motion.div>

            {/* Premium Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div variants={itemVars} className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-2xl flex flex-col gap-2">
                <Clock className="w-5 h-5 text-blue-400 mb-1" />
                <span className="text-2xl font-bold text-white">{focusTimeStr}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Focus Time</span>
              </motion.div>
              
              <motion.div variants={itemVars} className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-2xl flex flex-col justify-center">
                <span className="text-lg font-bold text-white">{timeEntries.length} Sessions</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Timeline Events Logged</span>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-400"><span className="flex items-center gap-1"><PlayCircle className="w-3 h-3 text-emerald-400"/> Live</span> <span className="text-slate-200">{liveSessions}</span></div>
                  <div className="flex items-center justify-between text-xs font-medium text-slate-400"><span className="flex items-center gap-1"><History className="w-3 h-3 text-blue-400"/> Manual</span> <span className="text-slate-200">{manualSessions}</span></div>
                </div>
              </motion.div>
            </div>

          </motion.div>

          {/* =========================================
              RIGHT: THE TIMELINE FEED (WITH EDIT & ADD BUTTONS)
          ========================================= */}
          <motion.div variants={containerVars} initial="hidden" animate="show" className="lg:col-span-7">
            
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" /> Activity Timeline
              </h2>
              
              {/* --- ADD PAST ACTIVITY BUTTON --- */}
              <button 
                onClick={() => setIsAddingAdhoc(true)} 
                className="text-[10px] md:text-xs font-bold bg-white/[0.03] hover:bg-blue-500/20 hover:text-blue-400 border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> ADD PAST ACTIVITY
              </button>
            </div>
            
            {timeEntries.length === 0 ? (
              <div className="h-[300px] border-2 border-dashed border-white/10 rounded-3xl bg-white/[0.01] flex flex-col items-center justify-center text-slate-500 space-y-3">
                <Clock className="w-10 h-10 text-slate-600 mb-2" />
                <p className="font-medium">No time was logged today.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-white/10 ml-4 md:ml-6 pb-10 space-y-8 mt-4">
                {timeEntries.map((entry) => {
                  const isLive = entry.entryType === "LIVE_TRACKED";
                  const mins = entry.durationSeconds ? Math.ceil(entry.durationSeconds / 60) : 0;
                  
                  return (
                    <motion.div variants={itemVars} key={entry.id} className="relative pl-6 md:pl-10 group/card">
                      
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-[#030712] ${isLive ? 'bg-emerald-500' : 'bg-blue-500'} group-hover/card:scale-125 transition-transform duration-300`} />
                      
                      {/* Time Label */}
                      <span className="block text-[10px] md:text-xs font-bold text-slate-500 mb-2 font-mono tracking-wider">
                        {formatTimeHM(entry.startedAt)} {entry.endedAt && `- ${formatTimeHM(entry.endedAt)}`}
                      </span>

                      {/* Timeline Card */}
                      <div className="bg-white/[0.02] hover:bg-[#0c1222] border border-white/[0.05] rounded-2xl p-4 md:p-5 transition-colors shadow-lg flex justify-between items-start gap-4">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="font-semibold text-slate-200 text-base md:text-lg leading-tight truncate">{entry.title}</span>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${isLive ? 'text-emerald-400' : 'text-blue-400'}`}>
                              {isLive ? <PlayCircle className="w-3 h-3"/> : <History className="w-3 h-3"/>}
                              {isLive ? 'Live Session' : 'Manual Log'}
                            </span>
                            <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3"/> {mins} min
                            </span>
                          </div>
                          {entry.notes && (
                            <div className="mt-3 pt-3 border-t border-white/5 text-sm text-slate-400 italic">
                              "{entry.notes}"
                            </div>
                          )}
                        </div>

                        {/* --- EDIT TIMELINE ENTRY BUTTON --- */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button 
                            onClick={() => setEditingEntry(entry)} 
                            title="Edit Time Entry" 
                            className="p-2.5 bg-slate-800/60 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 rounded-xl transition-all flex-shrink-0 border border-white/[0.05]"
                          >
                            <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                          <form action={async () => { await deleteTimeEntry(entry.id); }}>
                              <button 
                                type="submit" 
                                title="Delete Time Entry" 
                                className="p-2.5 bg-slate-800/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-all border border-white/[0.05]"
                              >
                                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                          </form>
                        </div>
                      </div>

                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>

        </div>
      </div>

      {/* ================= MODALS ================= */}
      <AnimatePresence>
        
        {/* --- EDIT EXISTING ENTRY MODAL --- */}
        {editingEntry && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#0c1222] border border-white/10 rounded-3xl shadow-2xl w-full max-w-[95vw] md:max-w-md overflow-hidden">
              <div className="flex justify-between items-center bg-white/[0.02] p-4 md:p-5 border-b border-white/5">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm md:text-base"><Edit2 className="w-4 h-4 md:w-5 md:h-5 text-blue-400"/> Edit Timeline Entry</h3>
                <button onClick={() => setEditingEntry(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              <form action={async (fd: FormData) => { await updateTimeEntry(editingEntry.id, fd); setEditingEntry(null); }}>
                <div className="p-5 md:p-6 space-y-5 md:space-y-6">
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Task</label>
                    <div className="bg-black/20 border border-white/5 rounded-xl p-3 md:p-3.5 text-slate-300 text-xs md:text-sm font-medium truncate">{editingEntry.title}</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                    <div>
                      <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Start Time</label>
                      <input type="time" name="startTime" required defaultValue={getInputTime(editingEntry.startedAt)} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 md:p-3.5 text-slate-200 focus:border-blue-500 focus:outline-none transition-all text-sm md:text-base [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">End Time</label>
                      <input type="time" name="endTime" required defaultValue={editingEntry.endedAt ? getInputTime(editingEntry.endedAt) : ""} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 md:p-3.5 text-slate-200 focus:border-blue-500 focus:outline-none transition-all text-sm md:text-base [color-scheme:dark]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Notes (Optional)</label>
                    <textarea name="notes" defaultValue={editingEntry.notes || ""} placeholder="Add any details about this session..." className="w-full bg-black/20 border border-white/10 rounded-xl p-3 md:p-3.5 text-slate-200 focus:border-blue-500 focus:outline-none min-h-[80px] md:min-h-[100px] transition-all text-sm md:text-base" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-4 md:p-5 border-t border-white/5 bg-white/[0.01]">
                  <button type="button" onClick={() => setEditingEntry(null)} className="px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-medium text-slate-400 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="px-5 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Save</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* --- ADD ADHOC ENTRY MODAL --- */}
        {isAddingAdhoc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#0c1222] border border-white/10 rounded-3xl shadow-2xl w-full max-w-[95vw] md:max-w-md overflow-hidden">
              <div className="flex justify-between items-center bg-white/[0.02] p-4 md:p-5 border-b border-white/5">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm md:text-base"><Plus className="w-4 h-4 md:w-5 md:h-5 text-indigo-400"/> Add Past Activity</h3>
                <button onClick={() => setIsAddingAdhoc(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              <form action={async (fd) => { await addAdhocLog(fd); setIsAddingAdhoc(false); }}>
                <div className="p-5 md:p-6 space-y-5 md:space-y-6">
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Task Title</label>
                    <input type="text" name="title" required placeholder="e.g. Spontaneous Meeting" className="w-full bg-black/20 border border-white/10 rounded-xl p-3 md:p-3.5 text-slate-200 focus:border-indigo-500 focus:outline-none transition-all text-sm md:text-base" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                    <div>
                      <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Start Time</label>
                      <input type="time" name="startTime" required defaultValue="14:00" className="w-full bg-black/20 border border-white/10 rounded-xl p-3 md:p-3.5 text-slate-200 focus:border-indigo-500 focus:outline-none transition-all text-sm md:text-base [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">End Time</label>
                      <input type="time" name="endTime" required defaultValue="15:00" className="w-full bg-black/20 border border-white/10 rounded-xl p-3 md:p-3.5 text-slate-200 focus:border-indigo-500 focus:outline-none transition-all text-sm md:text-base [color-scheme:dark]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Notes (Optional)</label>
                    <textarea name="notes" placeholder="Any details?" className="w-full bg-black/20 border border-white/10 rounded-xl p-3 md:p-3.5 text-slate-200 focus:border-indigo-500 focus:outline-none min-h-[80px] md:min-h-[100px] transition-all text-sm md:text-base" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-4 md:p-5 border-t border-white/5 bg-white/[0.01]">
                  <button type="button" onClick={() => setIsAddingAdhoc(false)} className="px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-medium text-slate-400 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="px-5 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-lg shadow-indigo-900/20 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Add to Timeline</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}