"use client";

import { useState, useEffect } from "react";
import { startLiveTask, pauseLiveTask, completeLiveTask, endDay, wrapUpDayEarly, abandonLiveTask, addCycleToItem} from "../../actions/daily-planner"
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
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [breakElapsed, setBreakElapsed] = useState(0);
  const [showJunction, setShowJunction] = useState(false);
  const [showEndDayModal, setShowEndDayModal] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false)

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

  const handleAddCycle = async () => {
    if (hudState === "OVERTIME") {
      setHudState("RUNNING");
    }
    await addCycleToItem(currentTask.id);
  };

  const handleComplete = async () => {
    setHudState("PAUSED");
    await completeLiveTask(currentTask.id, activeTimeEntry?.id);
    setSessionElapsed(0);

    if (queue.length <= 1) {
      await endDay(); 
    } else {
      setShowJunction(true);
    }
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
    if (queue.length <= 1) {
      await endDay(); 
    } else {
      setHudState("STANDBY");
    }
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

        <button onClick={handleOpenEndDay} className="text-xs font-bold tracking-widest text-red-400 hover:text-red-300 border border-red-900/30 bg-red-900/10 px-4 py-2 rounded transition-colors flex items-center gap-2">
          🛑 END DAY
        </button>
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
              {/* FIX: Strictly use hudState for the text */}
              {hudState === "STANDBY" ? "READY FOR NEXT TASK" : "CURRENT FOCUS"}
            </h2>
            <h1 className="text-3xl font-bold text-white max-w-2xl truncate">≡ {currentTask?.title}</h1>
          </div>

          {/* --- THE BIG CLOCK --- */}
          <div className={`relative flex items-center justify-center w-64 h-64 rounded-full border-4 mb-12 transition-all duration-500
            ${showJunction ? 'opacity-10 scale-95' : 'shadow-2xl'}
            ${hudState === "STANDBY" ? "border-slate-800 shadow-none" : ""}
            ${(hudState === "RUNNING" && !isOvertime) ? "border-emerald-500 shadow-emerald-900/20" : ""}
            ${(hudState === "RUNNING" && isOvertime) ? "border-orange-500 shadow-orange-900/20" : ""}
            ${hudState === "PAUSED" ? "border-slate-600 opacity-50" : ""}
          `}>
            <div className="flex flex-col items-center">
              {isOvertime && <span className="text-orange-500 text-sm font-bold tracking-widest mb-1">+ OVERTIME</span>}
              <span className={`text-6xl font-light tracking-tight font-mono ${isOvertime ? "text-orange-400" : "text-white"}`}>
                {formatTime(Math.max(0, clockValue))}
              </span>
              {hudState === "PAUSED" && <span className="text-slate-400 text-sm tracking-widest mt-2 uppercase">Paused</span>}
            </div>
          </div>

          {/* --- HUD CONTROLS --- */}
          {!showJunction && (
            <div className="flex gap-4 mb-20 animate-in fade-in slide-in-from-bottom-4">
              
              {/* 1. STANDBY STATE: Only show the giant Start button */}
              {hudState === "STANDBY" && (
                <>
                  <form action={async () => { setHudState("RUNNING"); await handleStart(); }}>
                    <button type="submit" className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold tracking-widest text-sm shadow-lg transition-colors">
                      ▶ START TIMER
                    </button>
                  </form>
                  <button onClick={handleAbandonClick} className="px-6 py-4 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl font-bold tracking-widest text-sm border border-slate-800 transition-colors">
                      ⏭ SKIP
                  </button>
                </>
              )}

              {/* 2. RUNNING STATE: Show Complete, Pause, and Skip */}
              {(hudState === "RUNNING" || hudState === "OVERTIME") && (
                <>
                  <form action={handleComplete}>
                    <button type="submit" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold tracking-widest text-sm shadow-lg transition-colors">
                      ✔ COMPLETE
                    </button>
                  </form>
                  <form action={handlePause}>
                    <button type="submit" className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold tracking-widest text-sm border border-slate-700 transition-colors">
                      ⏸ PAUSE
                    </button>
                  </form>
                  
                  {/* NEW: ONLY APPEARS IF TIMER IS PAST ESTIMATED TIME */}
                  {isOvertime && (
                    <form action={handleAddCycle}>
                      <button type="submit" className="px-6 py-4 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl font-bold tracking-widest text-sm transition-colors">
                        +1 CYCLE
                      </button>
                    </form>
                  )}

                  <button onClick={handleAbandonClick} className="px-6 py-4 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl font-bold tracking-widest text-sm border border-slate-800 transition-colors">
                    ⏭ SKIP
                  </button>
                </>
              )}

              {/* 3. PAUSED STATE: Show Resume, Wrap Up, and Skip */}
              {hudState === "PAUSED" && (
                 <>
                   <form action={async () => { setHudState(isOvertime ? "OVERTIME" : "RUNNING"); await handleStart(); }}>
                     <button type="submit" className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold tracking-widest text-sm shadow-lg transition-colors">
                       ▶ RESUME
                     </button>
                   </form>
                   <form action={handleComplete}>
                     <button type="submit" className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold tracking-widest text-sm border border-slate-700 transition-colors">
                       🏁 WRAP UP
                     </button>
                   </form>
                   
                   {/* NEW: ALLOW ADDING CYCLES EVEN WHILE PAUSED IN OVERTIME */}
                   {isOvertime && (
                     <form action={handleAddCycle}>
                       <button type="submit" className="px-6 py-4 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl font-bold tracking-widest text-sm transition-colors">
                         +1 CYCLE
                       </button>
                     </form>
                   )}

                   <button onClick={handleAbandonClick} className="px-6 py-4 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl font-bold tracking-widest text-sm border border-slate-800 transition-colors">
                     ⏭ SKIP
                   </button>
                 </>
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

      {showEndDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center bg-slate-800/50 p-5 border-b border-slate-700">
              <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                <span>🛑</span> Wrap Up Day Early
              </h3>
              <button onClick={() => setShowEndDayModal(false)} className="text-slate-400 hover:text-white text-xl">✖</button>
            </div>

            <form action={wrapUpDayEarly}>
              <div className="p-6 space-y-6">
                
                <div className="text-slate-300 text-sm">
                  You have <span className="font-bold text-white">{queue.length} items</span> left in your queue. Let's clean them up:
                </div>

                {/* List remaining tasks with dropdowns */}
                <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2">
                  {queue.map((item:any) => (
                    <div key={item.id} className="flex items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-lg">
                      <span className="text-sm font-medium text-slate-300 truncate pr-4">
                        ≡ {item.title}
                      </span>
                      
                      <select 
                        name={`action_${item.id}`} 
                        className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                        defaultValue={item.habitId ? "SKIP" : "PUSH"} 
                      >
                        <option value="PUSH">📅 Push to Tomorrow</option>
                        {/* Simplified the wording here! */}
                        <option value="SKIP">🗑️ Skip / Return to Backlog</option>
                      </select>
                    </div>
                  ))}
                </div>

                {/* Journal Note */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                    Daily Journal (Optional)
                  </label>
                  <textarea 
                    name="journalNote"
                    placeholder="Brain is fried, stopping early to go see a movie." 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 text-sm focus:border-blue-500 focus:outline-none min-h-[80px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-5 border-t border-slate-800 bg-slate-900/50">
                <button type="button" onClick={() => setShowEndDayModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg">
                  ✔ Finalize & End Day
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {showAbandonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-slate-800 text-center">
              <h3 className="font-bold text-white text-lg mb-2">Skip this task?</h3>
              <p className="text-sm text-slate-400">
                Time spent so far has been saved. What do you want to do with the remainder of this task?
              </p>
            </div>

            <div className="p-6 flex flex-col gap-3">
              <button 
                onClick={() => executeAbandon("PUSH")} 
                className="w-full py-4 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-xl font-bold text-sm transition-all"
              >
                📅 PUSH TO TOMORROW
              </button>
              
              <button 
                onClick={() => executeAbandon("SKIP")} 
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition-all border border-slate-700"
              >
                🗑️ SKIP / RETURN TO BACKLOG
              </button>
              
              <button 
                onClick={() => setShowAbandonModal(false)} 
                className="w-full py-3 mt-2 text-slate-500 hover:text-white font-medium text-sm transition-all"
              >
                Cancel & Keep Task
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}