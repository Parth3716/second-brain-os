"use client";

import { useState, useEffect } from "react";
import { startLiveTask, pauseLiveTask, completeLiveTask, skipLiveTask, endDay} from "../../actions/daily-planner"
import { getCurrentDateTimeIST } from "@/lib/helpers";

// --- TESTING CONSTANT --- (Set to 45 * 60 for 45 minutes)
const SECONDS_PER_CYCLE = 60; 
const BREAK_DURATION = 5 * 60; // 5 minutes

export default function HUDScreen({ dailyRecord, activeTimeEntry, pastDurationSeconds }: { dailyRecord: any, activeTimeEntry: any, pastDurationSeconds: number }) {
  // 1. Get the queue and the current task
  const queue = (dailyRecord.items || []).filter((item: any) => item.status === "TODO");
  const currentTask = queue[0];
  const nextTaskInBar = queue[1]; // Used ONLY for the preview bar at the bottom

  // --- STATE DECLARATIONS ---
  const [hudState, setHudState] = useState<"STANDBY" | "RUNNING" | "PAUSED" | "OVERTIME" | "BREAK">("RUNNING");
  const [displaySeconds, setDisplaySeconds] = useState(pastDurationSeconds);
  const [sessionElapsed, setSessionElapsed] = useState(0); // Tracks current un-saved chunk
  const [breakElapsed, setBreakElapsed] = useState(0);
  const [showJunction, setShowJunction] = useState(false);

  const isRunning = !!activeTimeEntry;
  const expectedSeconds = currentTask ? currentTask.estimatedCycles * SECONDS_PER_CYCLE : 0;
  const isOvertime = displaySeconds >= expectedSeconds;

  // --- THE TIMESTAMP DIFFING ENGINE (IST SHIFTED) ---
  useEffect(() => {
    let interval: NodeJS.Timeout;

    // 1. Handle Active Work Timer
    if (isRunning && activeTimeEntry) {
      const dbStartTimeMs = new Date(activeTimeEntry.startedAt).getTime();

      interval = setInterval(() => {
        const istNowMs = getCurrentDateTimeIST().getTime()
        const liveDiffSeconds = Math.floor((istNowMs - dbStartTimeMs) / 1000);
        
        setDisplaySeconds(pastDurationSeconds + liveDiffSeconds);
        setSessionElapsed(liveDiffSeconds); // Keep track of the current unsaved chunk
      }, 1000);
      
    } 
    // 2. Handle Break Timer
    else if (hudState === "BREAK") {
      interval = setInterval(() => {
        setBreakElapsed(prev => prev + 1);
      }, 1000);
    } 
    // 3. Handle Paused State
    else {
      setDisplaySeconds(pastDurationSeconds);
    }

    return () => clearInterval(interval);
  }, [isRunning, activeTimeEntry, pastDurationSeconds, hudState]);

  // Reset timers when a new task officially loads
  useEffect(() => {
    if (currentTask && !showJunction && hudState !== "BREAK") {
      setDisplaySeconds(0);
      setSessionElapsed(0);
      if (hudState !== "STANDBY") setHudState("RUNNING"); 
    }
  }, [currentTask?.id]);


  // --- ACTIONS ---
  const handleStart = async () => {
    await startLiveTask(currentTask.id);
  };

  const handlePause = async () => {
    if (activeTimeEntry) {
      setHudState("PAUSED");
      await pauseLiveTask(activeTimeEntry.id);
      setSessionElapsed(0);
    }
  };

  const handleComplete = async () => {
    await completeLiveTask(currentTask.id, activeTimeEntry?.id);
    setSessionElapsed(0);
    setShowJunction(true);
  };


  // --- HELPERS ---
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const clockValue = isOvertime ? displaySeconds - expectedSeconds : expectedSeconds - displaySeconds;
  const breakDisplay = BREAK_DURATION - breakElapsed;

  // --- EMPTY QUEUE SCREEN ---
  if (!currentTask && !showJunction && hudState !== "BREAK") {
    return (
      <div className="min-h-screen bg-[#060a13] flex flex-col items-center justify-center text-white space-y-6">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-bold">Queue Empty!</h1>
        <form action={endDay}>
          <button type="submit" className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-colors">🏁 End Workday</button>
        </form>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#060a13] text-slate-200 flex flex-col items-center p-6 transition-colors duration-700">
      
      <div className="w-full max-w-4xl flex justify-between items-center mb-20 border-b border-slate-800/60 pb-6 opacity-50">
        <span className="text-sm font-bold tracking-widest text-slate-400 flex items-center gap-2">
          {hudState === "BREAK" ? "☕ BREAK TIME" : "🟢 WORKDAY ACTIVE"}
        </span>
      </div>

      {/* --- BREAK MODE UI --- */}
      {hudState === "BREAK" && (
        <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
          <h2 className="text-xl font-medium text-slate-400 mb-8">Take a breather.</h2>
          <div className="text-7xl font-mono text-blue-400 mb-12 drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            {formatTime(Math.max(0, breakDisplay))}
          </div>
          <button 
            onClick={() => { setHudState("STANDBY"); setBreakElapsed(0); }} 
            className="px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold tracking-widest text-sm transition-all"
          >
            ⏹ END BREAK & GO TO STANDBY
          </button>
        </div>
      )}

      {/* --- NORMAL HUD UI --- */}
      {hudState !== "BREAK" && (
        <>
          <div className={`text-center space-y-2 mb-10 transition-opacity ${showJunction ? 'opacity-10' : 'opacity-100'}`}>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              {!isRunning ? "READY" : "CURRENT FOCUS"}
            </h2>
            <h1 className="text-3xl font-bold text-white max-w-2xl truncate">≡ {currentTask?.title}</h1>
          </div>

          {/* THE BIG CLOCK */}
          <div className={`relative flex items-center justify-center w-64 h-64 rounded-full border-4 mb-12 transition-all duration-500
            ${showJunction ? 'opacity-10 scale-95' : 'shadow-2xl'}
            ${!isRunning ? "border-slate-800 shadow-none" : ""}
            ${isRunning && !isOvertime ? "border-emerald-500 shadow-emerald-900/20" : ""}
            ${isRunning && isOvertime ? "border-orange-500 shadow-orange-900/20" : ""}
          `}>
            <div className="flex flex-col items-center">
              {isOvertime && <span className="text-orange-500 text-sm font-bold tracking-widest mb-1">+ OVERTIME</span>}
              <span className={`text-6xl font-light tracking-tight font-mono ${isOvertime ? "text-orange-400" : "text-white"}`}>
                {formatTime(Math.max(0, clockValue))}
              </span>
              {!isRunning && pastDurationSeconds > 0 && <span className="text-slate-400 text-sm tracking-widest mt-2 uppercase">Paused</span>}
            </div>
          </div>

          {/* HUD CONTROLS */}
          {!showJunction && (
            <div className="flex gap-4 mb-20 animate-in fade-in slide-in-from-bottom-4">
              
              {!isRunning && (
                <form action={handleStart}>
                  <button type="submit" className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold tracking-widest text-sm shadow-lg">
                    ▶ START TIMER
                  </button>
                </form>
              )}

              {isRunning && (
                <>
                  <form action={handleComplete}>
                    <button type="submit" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold tracking-widest text-sm shadow-lg">
                      ✔ COMPLETE
                    </button>
                  </form>
                  <form action={handlePause}>
                    <button type="submit" className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold tracking-widest text-sm border border-slate-700">
                      ⏸ PAUSE
                    </button>
                  </form>
                </>
              )}

              {!isRunning && pastDurationSeconds > 0 && (
                 <form action={handleComplete}>
                   <button type="submit" className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold tracking-widest text-sm border border-slate-700">
                     🏁 WRAP UP EARLY
                   </button>
                 </form>
              )}
            </div>
          )}
        </>
      )}

      {/* --- UP NEXT BAR (Hidden if Modal is open) --- */}
      {!showJunction && hudState !== "BREAK" && (
        <div className="w-full max-w-2xl border-t border-slate-800 pt-6 flex items-center justify-between opacity-80">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">⬇ UP NEXT</span>
            <span className="text-slate-300 font-medium">
              {nextTaskInBar ? nextTaskInBar.title : "Nothing else scheduled! 🎉"}
            </span>
          </div>
          
          {nextTaskInBar && (
            <form action={async () => { await skipLiveTask(currentTask.id, sessionElapsed); }}>
              <button type="submit" title="Send to bottom of queue" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 transition-colors">
                {sessionElapsed > 10 ? "⏭ Save & Skip" : "⏭ Skip"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* --- THE JUNCTION MODAL (Shows currentTask because of the instant shift!) --- */}
      {showJunction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 text-center border-b border-slate-800 bg-slate-800/20">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-white mb-2">Task Complete!</h2>
            </div>
            <div className="p-6 bg-slate-950/50">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 pl-1">Up Next in Queue:</h3>
              {currentTask ? (
                <div className="flex items-center justify-between bg-slate-900 border border-slate-700 p-4 rounded-xl">
                  <span className="font-medium text-slate-200 truncate">≡ {currentTask.title}</span>
                  <form action={async () => { await skipLiveTask(currentTask.id, 0); }}>
                    <button type="submit" onClick={() => setShowJunction(false)} className="text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded">⏭ Skip</button>
                  </form>
                </div>
              ) : (
                <div className="text-emerald-400 text-center text-sm font-medium">Queue is empty!</div>
              )}
            </div>
            <div className="p-6 space-y-3">
              {currentTask && (
                <button onClick={() => { setShowJunction(false); setHudState("RUNNING"); handleStart(); }} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg">
                  ▶ START NEXT TASK
                </button>
              )}
              <button onClick={() => { setShowJunction(false); setHudState("BREAK"); setBreakElapsed(0); }} className="w-full py-4 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-xl font-bold text-sm">
                ☕ TAKE 5m BREAK
              </button>
              <button onClick={() => { setShowJunction(false); setHudState("STANDBY"); }} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm">
                🟡 GO TO STANDBY
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}