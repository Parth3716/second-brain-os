"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, CheckCircle2, FastForward, Coffee, CalendarOff, Settings2, X, PlusCircle, Target, PartyPopper, Trash2, CalendarClock } from "lucide-react";
import { startLiveTask, pauseLiveTask, completeLiveTask, endDay, wrapUpDayEarly, abandonLiveTask, addCycleToItem} from "@/actions/daily-planner"
import { getCurrentDateTimeIST } from "@/lib/helpers";

const SECONDS_PER_CYCLE = 60; // Set to 45 * 60 for real life!
const BREAK_DURATION = 5 * 60; // 5 minutes

export default function HUDView({ dailyRecord, activeTimeEntry, pastDurationSeconds }: { dailyRecord: any, activeTimeEntry: any, pastDurationSeconds: number }) {
  const queue = (dailyRecord.items || []).filter((item: any) => item.status === "TODO");
  const currentTask = queue[0];
  const nextTaskInBar = queue[1];

  // --- STATE DECLARATIONS ---
  const [hudState, setHudState] = useState<"STANDBY" | "RUNNING" | "PAUSED" | "OVERTIME" | "BREAK">("RUNNING");
  const [displaySeconds, setDisplaySeconds] = useState(pastDurationSeconds);
  const [sessionElapsed, setSessionElapsed] = useState(0); 
  const [breakElapsed, setBreakElapsed] = useState(0);
  
  const [showJunction, setShowJunction] = useState(false);
  const [showEndDayModal, setShowEndDayModal] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  const isRunning = !!activeTimeEntry;
  const expectedSeconds = currentTask ? currentTask.estimatedCycles * SECONDS_PER_CYCLE : 0;
  const isOvertime = displaySeconds >= expectedSeconds;

  // --- THE TIMESTAMP DIFFING ENGINE (IST SHIFTED) ---
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && activeTimeEntry) {
      const dbStartTimeMs = new Date(activeTimeEntry.startedAt).getTime();
      interval = setInterval(() => {
        const istNowMs = getCurrentDateTimeIST().getTime();
        const liveDiffSeconds = Math.floor((istNowMs - dbStartTimeMs) / 1000);
        
        setDisplaySeconds(pastDurationSeconds + liveDiffSeconds);
        setSessionElapsed(liveDiffSeconds); 
      }, 1000);
    } 
    else if (hudState === "BREAK") {
      interval = setInterval(() => { setBreakElapsed(prev => prev + 1); }, 1000);
    } 
    else {
      setDisplaySeconds(pastDurationSeconds);
    }

    return () => clearInterval(interval);
  }, [isRunning, activeTimeEntry, pastDurationSeconds, hudState]);

  useEffect(() => {
    if (currentTask && !showJunction && hudState !== "BREAK") {
      setDisplaySeconds(0);
      setSessionElapsed(0);
      if (hudState !== "STANDBY") setHudState("RUNNING"); 
    }
  }, [currentTask?.id]);

  useEffect(() => {
    if (hudState === "RUNNING" && isOvertime && expectedSeconds > 0) {
      setHudState("OVERTIME");
    }
  }, [displaySeconds, isOvertime, hudState, expectedSeconds]);

  // --- ACTIONS ---
  const handleStart = async () => { await startLiveTask(currentTask.id); };

  const handlePause = async () => {
    if (activeTimeEntry) {
      setHudState("PAUSED");
      await pauseLiveTask(activeTimeEntry.id);
      setSessionElapsed(0);
    }
  };

  const handleAddCycle = async () => {
    if (hudState === "OVERTIME") setHudState("RUNNING");
    await addCycleToItem(currentTask.id);
  };

  const handleComplete = async () => {
    setHudState("PAUSED");
    await completeLiveTask(currentTask.id, activeTimeEntry?.id);
    setSessionElapsed(0);
    if (queue.length <= 1) await endDay(); else setShowJunction(true);
  };

  const handleOpenEndDay = async () => {
    if (activeTimeEntry) {
      setHudState("PAUSED");
      await pauseLiveTask(activeTimeEntry.id);
      setSessionElapsed(0);
    }
    setShowEndDayModal(true);
  }

  const handleAbandonClick = async () => {
    if (activeTimeEntry) {
      setHudState("PAUSED");
      await pauseLiveTask(activeTimeEntry.id);
      setSessionElapsed(0);
    }
    setShowAbandonModal(true);
  };

  const executeAbandon = async (actionType: "PUSH" | "SKIP") => {
    setShowAbandonModal(false);
    await abandonLiveTask(currentTask.id, actionType);
    if (queue.length <= 1) await endDay(); else setHudState("STANDBY");
  };

  // --- HELPERS ---
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const clockValue = isOvertime ? displaySeconds - expectedSeconds : expectedSeconds - displaySeconds;
  const breakDisplay = BREAK_DURATION - breakElapsed;

  // --- DYNAMIC THEMING HELPERS ---
  const getTheme = () => {
    if (hudState === "BREAK") return { glow: "bg-blue-600/20", ring: "border-blue-500 shadow-[0_0_60px_rgba(59,130,246,0.3)]", text: "text-blue-400" };
    if (hudState === "STANDBY") return { glow: "bg-slate-600/10", ring: "border-slate-700 shadow-[0_0_40px_rgba(71,85,105,0.15)]", text: "text-white" };
    if (hudState === "OVERTIME") return { glow: "bg-orange-600/20", ring: "border-orange-500 shadow-[0_0_80px_rgba(249,115,22,0.3)]", text: "text-orange-400" };
    if (hudState === "PAUSED") return { glow: "bg-amber-500/10", ring: "border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.25)] opacity-50", text: "text-amber-400" };
    return { glow: "bg-emerald-600/20", ring: "border-emerald-500 shadow-[0_0_80px_rgba(16,185,129,0.3)]", text: "text-emerald-400" }; // RUNNING
  };
  const theme = getTheme();

  // Status indicator in top left
  const getStatusDisplay = () => {
    if (hudState === "BREAK") return { text: "BREAK", dot: "bg-blue-400", col: "text-blue-400", bg: "bg-blue-900/20 border-blue-500/30" };
    if (hudState === "STANDBY") return { text: "STANDBY", dot: "bg-slate-400", col: "text-slate-300", bg: "bg-white/[0.03] border-white/10" };
    if (hudState === "OVERTIME") return { text: "OVERTIME", dot: "bg-orange-500", col: "text-orange-400", bg: "bg-orange-900/20 border-orange-500/30" };
    if (hudState === "PAUSED") return { text: "PAUSED", dot: "bg-amber-400", col: "text-amber-400", bg: "bg-amber-900/20 border-amber-500/30" };
    return { text: "ACTIVE", dot: "bg-emerald-400", col: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-500/30" }; // RUNNING
  };
  const statusTheme = getStatusDisplay();

  // --- EMPTY QUEUE SCREEN ---
  if (!currentTask && !showJunction && hudState !== "BREAK") {
    return (
      <main className="min-h-screen bg-[#030712] relative flex justify-center p-4 md:p-12 overflow-hidden selection:bg-indigo-500/30">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="flex flex-col items-center justify-center text-white space-y-6 relative z-10 text-center animate-in zoom-in-95 duration-500">
          <PartyPopper className="w-20 h-20 text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Queue Empty!</h1>
          <p className="text-slate-400 text-lg">You finished everything you planned today.</p>
          <form action={endDay} className="pt-6">
            <button type="submit" className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> End Workday
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030712] text-slate-200 flex flex-col items-center p-4 md:p-8 overflow-hidden relative selection:bg-indigo-500/30">
      
      {/* --- AMBIENT DYNAMIC GLOW --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex justify-center items-center">
        <div className={`absolute w-[120vw] h-[120vw] md:w-[60vw] md:h-[60vw] rounded-full blur-[150px] transition-colors duration-1000 ease-in-out opacity-40 ${theme.glow}`} />
      </div>

      {/* --- HEADER --- */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-12 md:mb-20 border-b border-white/5 pb-6 relative z-10">
        {/* DYNAMIC STATUS PILL */}
        <div className={`flex items-center gap-3 border px-4 py-2 rounded-full shadow-inner backdrop-blur-md transition-colors duration-500 ${statusTheme.bg}`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${statusTheme.dot}`} />
          <span className={`text-[10px] md:text-xs font-bold tracking-widest uppercase transition-colors duration-500 ${statusTheme.col}`}>
            {statusTheme.text}
          </span>
        </div>
        
        <button onClick={handleOpenEndDay} className="text-[10px] md:text-xs font-bold tracking-widest text-rose-400 hover:text-white border border-rose-900/30 hover:border-rose-500 bg-rose-900/10 hover:bg-rose-600 px-4 py-2 rounded-full transition-all flex items-center gap-2">
          <CalendarOff className="w-3.5 h-3.5" /> END DAY
        </button>
      </div>

      <div className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center relative z-10 -mt-10 md:-mt-20">
        
        {/* --- BREAK MODE UI --- */}
        {hudState === "BREAK" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center">
            <Coffee className="w-16 h-16 text-blue-400/80 mb-6 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
            <h2 className="text-xl md:text-2xl font-medium text-slate-300 mb-8">Take a breather.</h2>
            <div className="text-7xl md:text-9xl font-mono text-white mb-12 drop-shadow-[0_0_40px_rgba(59,130,246,0.5)] tracking-tighter">
              {formatTime(Math.max(0, breakDisplay))}
            </div>
            <button 
              onClick={() => { setHudState("STANDBY"); setBreakElapsed(0); }} 
              className="px-8 py-4 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-2xl font-bold tracking-widest text-sm transition-all flex items-center gap-3"
            >
              END BREAK <FastForward className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* --- NORMAL HUD UI --- */}
        {hudState !== "BREAK" && (
          <div className={`flex flex-col items-center w-full transition-opacity duration-500 ${showJunction || showAbandonModal || showEndDayModal ? 'opacity-10 pointer-events-none scale-95' : 'opacity-100 scale-100'}`}>
            
            <div className="text-center space-y-3 mb-10 md:mb-16 w-full px-4">
              <h2 className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest flex justify-center items-center gap-2">
                <Target className="w-3 h-3 md:w-4 md:h-4 text-indigo-400" />
                {hudState === "STANDBY" ? "READY FOR NEXT TASK" : "CURRENT FOCUS"}
              </h2>
              {/* TRUNCATE REMOVED. Text wraps beautifully for long titles */}
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight pb-2 leading-tight text-wrap max-w-3xl mx-auto break-words">
                {currentTask?.title}
              </h1>
              {hudState !== "STANDBY" && (
                <div className="text-slate-500 text-xs md:text-sm font-mono">
                  Est: {currentTask?.estimatedCycles} Cycle(s)
                </div>
              )}
            </div>

            {/* THE BIG CLOCK */}
            <div className={`relative flex items-center justify-center w-64 h-64 md:w-80 md:h-80 rounded-full border-4 md:border-8 mb-12 md:mb-16 transition-all duration-700 backdrop-blur-sm bg-[#030712]/50 ${theme.ring} ${showJunction ? 'opacity-10 scale-95' : ''}`}>
              <div className="flex flex-col items-center">
                {isOvertime && <span className="text-orange-500 text-[10px] md:text-xs font-bold tracking-widest mb-2 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20">+ OVERTIME</span>}
                <span className={`text-6xl md:text-8xl font-light tracking-tighter font-mono transition-colors duration-500 ${theme.text}`}>
                  {formatTime(Math.max(0, clockValue))}
                </span>
              </div>
            </div>

            {/* --- HUD CONTROLS --- */}
            <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-10 w-full px-4">
              
              {hudState === "STANDBY" && (
                <>
                  <form action={async () => { setHudState("RUNNING"); await handleStart(); }}>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="px-10 py-4 md:py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl font-bold tracking-widest text-sm md:text-base shadow-[0_10px_40px_rgba(16,185,129,0.3)] transition-all flex items-center gap-3">
                      <Play className="w-5 h-5 fill-current" /> START TIMER
                    </motion.button>
                  </form>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleAbandonClick} className="px-6 py-4 md:py-5 bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 rounded-2xl font-bold tracking-widest text-sm border border-white/10 transition-all flex items-center gap-2">
                    <FastForward className="w-4 h-4" /> SKIP
                  </motion.button>
                </>
              )}

              {(hudState === "RUNNING" || hudState === "OVERTIME") && (
                <AnimatePresence mode="popLayout">
                  {/* ADDED UNIQUE KEYS HERE TO FIX REACT ERROR */}
                  <motion.form key="act-complete" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} action={handleComplete}>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="px-8 py-4 md:py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold tracking-widest text-xs md:text-sm shadow-[0_10px_30px_rgba(37,99,235,0.3)] flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> COMPLETE
                    </motion.button>
                  </motion.form>
                  
                  <motion.form key="act-pause" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} action={handlePause}>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="px-6 py-4 md:py-5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-2xl font-bold tracking-widest text-xs md:text-sm border border-amber-500/30 transition-all flex items-center gap-2">
                      <Pause className="w-5 h-5 fill-current" /> PAUSE
                    </motion.button>
                  </motion.form>

                  {isOvertime && (
                    <motion.form key="act-addcyc" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} action={handleAddCycle}>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="px-6 py-4 md:py-5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-2xl font-bold tracking-widest text-xs md:text-sm border border-orange-500/30 transition-all flex items-center gap-2">
                        <PlusCircle className="w-5 h-5" /> 1 CYC
                      </motion.button>
                    </motion.form>
                  )}
                  
                  <motion.button key="act-skip" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleAbandonClick} className="px-6 py-4 md:py-5 bg-[#0c1222] text-slate-500 hover:text-slate-300 rounded-2xl font-bold tracking-widest text-xs md:text-sm border border-white/5 transition-all">
                    SKIP
                  </motion.button>
                </AnimatePresence>
              )}

              {hudState === "PAUSED" && (
                <AnimatePresence mode="popLayout">
                  {/* ADDED UNIQUE KEYS HERE TO FIX REACT ERROR */}
                  <motion.form key="pau-resume" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} action={async () => { setHudState(isOvertime ? "OVERTIME" : "RUNNING"); await handleStart(); }}>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="px-8 py-4 md:py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold tracking-widest text-xs md:text-sm shadow-[0_10px_30px_rgba(16,185,129,0.3)] flex items-center gap-2">
                      <Play className="w-5 h-5 fill-current" /> RESUME
                    </motion.button>
                  </motion.form>
                  
                  <motion.form key="pau-wrap" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} action={handleComplete}>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="px-6 py-4 md:py-5 bg-white/[0.05] hover:bg-blue-500/20 text-slate-300 hover:text-blue-400 rounded-2xl font-bold tracking-widest text-xs md:text-sm border border-white/10 hover:border-blue-500/30 transition-all flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> WRAP UP
                    </motion.button>
                  </motion.form>

                  {isOvertime && (
                    <motion.form key="pau-addcyc" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} action={handleAddCycle}>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="px-6 py-4 md:py-5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-2xl font-bold tracking-widest text-xs md:text-sm border border-orange-500/30 transition-all flex items-center gap-2">
                        <PlusCircle className="w-5 h-5" /> 1 CYC
                      </motion.button>
                    </motion.form>
                  )}
                  
                  <motion.button key="pau-skip" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleAbandonClick} className="px-6 py-4 md:py-5 bg-[#0c1222] text-slate-500 hover:text-slate-300 rounded-2xl font-bold tracking-widest text-xs md:text-sm border border-white/5 transition-all">
                    SKIP
                  </motion.button>
                </AnimatePresence>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- UP NEXT BAR (Hidden if Modal is open) --- */}
      {!showJunction && hudState !== "BREAK" && (
        <div className="w-full max-w-2xl mt-auto border-t border-white/5 pt-6 flex items-center justify-between opacity-80 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center">
              <FastForward className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Up Next</span>
              <span className="text-sm font-medium text-slate-300 truncate max-w-[200px] md:max-w-xs">
                {nextTaskInBar ? nextTaskInBar.title : "Nothing else scheduled! 🎉"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          GOD-TIER MODALS 
      ========================================= */}

      {/* 1. JUNCTION MODAL */}
      <AnimatePresence>
        {showJunction && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#030712]/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#0c1222] border border-white/10 rounded-3xl shadow-[0_0_100px_rgba(37,99,235,0.15)] w-full max-w-md overflow-hidden">
              <div className="p-8 text-center border-b border-white/5 bg-gradient-to-b from-blue-500/10 to-transparent relative overflow-hidden">
                <PartyPopper className="w-16 h-16 text-blue-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                <h2 className="text-2xl font-extrabold text-white mb-2">Cycle Complete!</h2>
                <p className="text-slate-400 text-sm">Great focus. Logged to your timeline.</p>
              </div>
              <div className="p-6 bg-black/20 text-center border-b border-white/5">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Up Next in Queue</h3>
                {currentTask ? (
                  <div className="bg-white/[0.02] border border-white/10 p-4 rounded-2xl">
                    <span className="font-semibold text-slate-200 text-lg truncate">{currentTask.title}</span>
                  </div>
                ) : (
                  <div className="text-emerald-400 text-sm font-medium">Queue is empty!</div>
                )}
              </div>
              <div className="p-6 space-y-3">
                {currentTask && (
                  <button onClick={() => { setShowJunction(false); setHudState("RUNNING"); handleStart(); }} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-2">
                    <Play className="w-4 h-4 fill-current" /> START NEXT TASK
                  </button>
                )}
                <button onClick={() => { setShowJunction(false); setHudState("BREAK"); setBreakElapsed(0); }} className="w-full py-4 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                  <Coffee className="w-4 h-4" /> TAKE 5M BREAK
                </button>
                <button onClick={() => { setShowJunction(false); setHudState("STANDBY"); }} className="w-full py-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-slate-300 hover:text-white rounded-xl font-bold text-sm transition-all">
                  GO TO STANDBY
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. ABANDON MODAL */}
      <AnimatePresence>
        {showAbandonModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#030712]/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#0c1222] border border-white/10 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6 border-b border-white/5 text-center bg-white/[0.02]">
                <h3 className="font-bold text-white text-lg mb-2">Skip this task?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">Time spent so far has been saved. What do you want to do with the remainder of this task?</p>
              </div>
              <div className="p-6 flex flex-col gap-3">
                <button onClick={() => executeAbandon("PUSH")} className="w-full py-4 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2">
                  <CalendarClock className="w-4 h-4" /> PUSH TO TOMORROW
                </button>
                <button onClick={() => executeAbandon("SKIP")} className="w-full py-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-slate-300 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2">
                  <Trash2 className="w-4 h-4" /> RETURN TO BACKLOG
                </button>
                <button onClick={() => setShowAbandonModal(false)} className="w-full py-3 mt-2 text-slate-500 hover:text-white font-medium text-sm transition-all">
                  Cancel & Keep Task
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. EARLY END MODAL */}
      <AnimatePresence>
        {showEndDayModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#030712]/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#0c1222] border border-white/10 rounded-3xl shadow-[0_0_100px_rgba(225,29,72,0.15)] w-full max-w-2xl overflow-hidden">
              <div className="flex justify-between items-center bg-white/[0.02] p-5 border-b border-white/5">
                <h3 className="font-bold text-white flex items-center gap-2 text-lg"><CalendarOff className="w-5 h-5 text-rose-400"/> Wrap Up Early</h3>
                <button onClick={() => setShowEndDayModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              <form action={wrapUpDayEarly}>
                <div className="p-6 space-y-6">
                  <div className="text-slate-300 text-sm bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-center">
                    You have <span className="font-bold text-rose-400">{queue.length} items</span> left in your queue. Let's clean them up:
                  </div>
                  <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                    {queue.map((item: any) => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-black/20 border border-white/5 p-3 rounded-xl gap-3">
                        <span className="text-sm font-medium text-slate-300 truncate pr-4 flex items-center gap-2">
                          <Settings2 className="w-4 h-4 text-slate-600" /> {item.title}
                        </span>
                        <select name={`action_${item.id}`} className="bg-[#0c1222] border border-white/10 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer w-full sm:w-auto" defaultValue={item.habitId ? "SKIP" : "PUSH"}>
                          <option value="PUSH">📅 Push to Tomorrow</option>
                          <option value="SKIP">🗑️ Return to Backlog</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Daily Journal (Optional)</label>
                    <textarea name="journalNote" placeholder="Brain is fried, stopping early to go see a movie." className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-slate-300 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none min-h-[100px] transition-all" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-5 border-t border-white/5 bg-white/[0.01]">
                  <button type="button" onClick={() => setShowEndDayModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-2.5 text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors shadow-lg shadow-rose-900/20 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Finalize & End Day
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}