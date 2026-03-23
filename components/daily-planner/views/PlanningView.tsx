"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings2, Play, CalendarOff, ChevronDown, CalendarDays, Target, Plus, GripVertical, Loader2 } from "lucide-react";
import Link from "next/link";
import QueueItem from "@/components/daily-planner/ui/QueueItem";
import { addHabitToQueue, addTaskToQueue, startDay, takeDayOff } from "@/actions/daily-planner"
import { formatShortDisplayDateIST } from "@/lib/helpers";
import type { Task, Habit, DailyPlanItem } from "@/types/daily_planner";

interface PlanningViewProps {
  backlogTasks: Task[];
  routines: Habit[];
  todaysQueue: DailyPlanItem[];
  totalCycles: number;
  formattedDate: string;
}

export default function PlanningView({ backlogTasks, routines, todaysQueue, totalCycles, formattedDate }: PlanningViewProps) {
  const [isHabitsOpen, setIsHabitsOpen] = useState(true);
  const [isTasksOpen, setIsTasksOpen] = useState(true);
  
  const [isStarting, setIsStarting] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [loadingItems, setLoadingItems] = useState<string[]>([]);

  const handleForceHabit = async (id: string) => {
    setLoadingItems(prev => [...prev, id]);
    await addHabitToQueue(id);
    setLoadingItems(prev => prev.filter(i => i !== id));
  };

  const handleForceTask = async (id: string, formData: FormData) => {
    setLoadingItems(prev => [...prev, id]);
    await addTaskToQueue(id, formData);
    setLoadingItems(prev => prev.filter(i => i !== id));
  };

  return (
    <main className="min-h-screen bg-[#030712] relative flex justify-center p-4 md:p-12 overflow-hidden selection:bg-indigo-500/30">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
    <div className="w-full max-w-[90rem] space-y-8 md:space-y-10 relative z-10 px-0 sm:px-4 xl:px-10">
      
      {/* --- HEADER --- */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-6 gap-4">
        <div className="space-y-1">
          <span className="text-xs md:text-sm font-bold tracking-widest text-indigo-400 uppercase">
            {formattedDate}
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            Let's plan your day.
          </h1>
        </div>
        
        <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 px-4 py-2 rounded-full shadow-inner">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[10px] md:text-xs font-bold tracking-widest text-slate-300 uppercase">Planning State</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
        
        {/* ================= LEFT: UNIVERSE ================= */}
        <div className="lg:col-span-4 space-y-8">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest pl-1">Backlog</h2>

          {/* 1. HABITS */}
          <div className="space-y-3">
            <button onClick={() => setIsHabitsOpen(!isHabitsOpen)} className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors w-full group outline-none">
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isHabitsOpen ? '' : '-rotate-90'}`} />
              <CalendarDays className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-bold uppercase tracking-widest">Habits & Routines</span>
            </button>
            
            <AnimatePresence initial={false}>
              {isHabitsOpen && (
                <motion.ul 
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="space-y-2 overflow-hidden pl-1"
                >
                  {routines.length === 0 ? (
                    <li className="text-xs text-slate-600 italic py-2 px-6">No habits configured.</li>
                  ) : (
                    routines.map((habit) => (
                      <li key={habit.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-2 pl-4 text-sm text-slate-300 flex items-center justify-between group/item transition-colors hover:bg-white/[0.04]">
                        <span className="truncate pr-4 flex items-center gap-3 font-medium">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover/item:bg-emerald-500 transition-colors" />
                          {habit.title}
                        </span>
                        <button onClick={() => handleForceHabit(habit.id)} disabled={loadingItems.includes(habit.id)} className="flex-shrink-0 text-slate-400 hover:text-white bg-white/[0.05] hover:bg-emerald-500/20 p-2 rounded-lg transition-all border border-white/[0.05]">
                          {loadingItems.includes(habit.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </button>
                      </li>
                    ))
                  )}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          {/* 2. TASKS */}
          <div className="space-y-3">
            <button onClick={() => setIsTasksOpen(!isTasksOpen)} className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors w-full group outline-none">
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isTasksOpen ? '' : '-rotate-90'}`} />
              <Target className="w-5 h-5 text-indigo-400" />
              <span className="text-sm font-bold uppercase tracking-widest">Active Tasks</span>
            </button>
            
            <AnimatePresence initial={false}>
              {isTasksOpen && (
                <motion.ul 
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="space-y-2 overflow-hidden pl-1"
                >
                  <AnimatePresence mode="popLayout">
                    {backlogTasks.length === 0 ? (
                      <li className="text-xs text-slate-600 italic py-2 px-6">No tasks. Add some in Manage.</li>
                    ) : (
                      backlogTasks.map((task) => (
                        <motion.li 
                          layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                          key={task.id} 
                          className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-2 pl-3 text-sm text-slate-300 flex items-center justify-between group/item transition-colors hover:bg-white/[0.04]"
                        >
                          <span className="truncate pr-2 flex items-center gap-2 font-medium">
                            <GripVertical className="w-4 h-4 text-slate-600 flex-shrink-0" />
                            <span className="truncate">{task.title}</span>
                            {task.dailyItems && task.dailyItems.length > 0 && (
                              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full whitespace-nowrap ml-1">
                                📅 {formatShortDisplayDateIST(task.dailyItems[0].date)}
                              </span>
                            )}
                          </span>
                          
                          <form action={(formData) => handleForceTask(task.id, formData)} className="flex items-center gap-1.5 flex-shrink-0">
                            <input 
                              type="number" 
                              name="cycles" 
                              defaultValue="1" 
                              min="1" max="10" 
                              className="w-10 md:w-12 bg-[#0c1222] border border-white/10 text-slate-200 text-xs md:text-sm px-2 py-2 rounded-lg text-center focus:outline-none focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            />
                            <button type="submit" disabled={loadingItems.includes(task.id)} className="text-slate-400 hover:text-white bg-white/[0.05] hover:bg-indigo-500/20 p-2 rounded-lg transition-all disabled:opacity-50 border border-white/[0.05]">
                              {loadingItems.includes(task.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            </button>
                          </form>
                        </motion.li>
                      ))
                    )}
                  </AnimatePresence>
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ================= RIGHT: EXECUTION QUEUE ================= */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-end border-b border-white/10 pb-3">
            <h2 className="text-sm md:text-base font-bold text-slate-300 uppercase tracking-widest">Today's Execution Queue</h2>
            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg">
              <span className="text-[10px] md:text-xs font-bold text-indigo-400 uppercase tracking-widest">Est: {totalCycles} Cycles</span>
            </div>
          </div>
          
          <div className="min-h-[300px] md:min-h-[500px] flex flex-col">
            
            {/* MASTER CONTROLS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              <form action={async () => { setIsStarting(true); await startDay(); }} className="sm:col-span-1">
                <button type="submit" disabled={todaysQueue.length === 0 || isStarting} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white py-4 rounded-2xl font-bold tracking-widest text-xs md:text-sm transition-all flex justify-center items-center gap-2 shadow-lg shadow-emerald-900/20 disabled:opacity-30 disabled:grayscale">
                  {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Play className="w-4 h-4 fill-current" /> BEGIN WORKDAY</>}
                </button>
              </form>

              <form action={async () => { setIsResting(true); await takeDayOff(); }} className="sm:col-span-1">
                <button type="submit" disabled={isResting} className="w-full bg-white/[0.03] hover:bg-red-500/10 text-slate-300 hover:text-red-400 border border-white/5 hover:border-red-500/30 py-4 rounded-2xl font-bold tracking-widest text-xs md:text-sm transition-all flex justify-center items-center gap-2">
                  {isResting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CalendarOff className="w-4 h-4" /> TAKE DAY OFF</>}
                </button>
              </form>

              <Link href="/daily-planner/manage" className="sm:col-span-1 bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/5 py-4 rounded-2xl font-bold tracking-widest text-xs md:text-sm transition-all flex justify-center items-center gap-2">
                <Settings2 className="w-4 h-4" /> MANAGE
              </Link>
            </div>

            {/* QUEUE LIST */}
            <ul className="space-y-3 md:space-y-4 relative">
              <AnimatePresence mode="popLayout">
                {todaysQueue.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-center py-12 md:py-16 border border-dashed border-white/10 rounded-3xl bg-white/[0.01]"
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-4">
                      <Target className="w-6 h-6 md:w-8 md:h-8 text-slate-600" />
                    </div>
                    <p className="text-slate-300 font-medium text-base md:text-lg">Your queue is empty.</p>
                    <p className="text-slate-500 text-xs md:text-sm mt-1">Click the + buttons on the left to draft your day.</p>
                  </motion.div>
                ) : (
                  todaysQueue.map((item, index) => (
                    <motion.div 
                      layout initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, x: 20 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      key={item.id} 
                      className="flex gap-2 md:gap-4 items-stretch"
                    >
                      <div className="text-slate-600 font-mono text-xs md:text-sm mt-4 md:mt-5 font-bold w-4 md:w-5 text-right flex-shrink-0">
                        {index + 1}.
                      </div>
                      <div className="flex-1 min-w-0">
                        <QueueItem 
                          id={item.id} 
                          title={item.title} 
                          estimatedCycles={item.estimatedCycles} 
                          isFirst={index === 0} 
                          isLast={index === todaysQueue.length - 1}
                          taskId={item.taskId}
                        />
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </ul>
          </div>
        </div>

      </div>
    </div>
  </main>
  );
}