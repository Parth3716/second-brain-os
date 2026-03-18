"use client";

import { useState } from "react";
import { History, Edit2, X, ChevronUp, ChevronDown, CheckCircle2 } from "lucide-react";
import { moveItemUpInQueue, moveItemDownInQueue, removeItemFromQueue, logPastEntry, updateQueueItem } from "@/actions/daily-planner"

type QueueItemProps = {
  id: string;
  title: string;
  estimatedCycles: number;
  isFirst: boolean;
  isLast: boolean;
  taskId: string | null;
};

export default function QueueItem({ id, title, estimatedCycles, isFirst, isLast, taskId }: QueueItemProps) {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <>
      <div className="flex bg-[#0c1222] hover:bg-[#111827] transition-all rounded-2xl border border-white/[0.05] shadow-lg group overflow-hidden">
        
        {/* REORDERING ARROWS */}
        <div className="flex flex-col bg-white/[0.02] border-r border-white/[0.05] p-1.5 md:p-2 justify-center gap-1 md:gap-2">
          <form action={async () => { await moveItemUpInQueue(id); }}>
            <button disabled={isFirst} className="text-slate-500 hover:text-white disabled:opacity-20 transition-colors p-1 md:p-1.5 rounded-lg hover:bg-white/5">
              <ChevronUp className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </form>
          <form action={async () => { await moveItemDownInQueue(id); }}>
            <button disabled={isLast} className="text-slate-500 hover:text-white disabled:opacity-20 transition-colors p-1 md:p-1.5 rounded-lg hover:bg-white/5">
              <ChevronDown className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </form>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex flex-col flex-1 p-3 md:p-5 gap-3 min-w-0">
          <div className="flex justify-between items-start gap-4">
            
            <span className="font-bold text-slate-200 text-base md:text-lg leading-tight truncate mt-1">
              {title}
            </span>
            
            {/* ACTION BUTTONS (Always Visible, Sleek Styling) */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {taskId && (
                <button onClick={() => setIsEditModalOpen(true)} title="Edit Task" className="text-slate-400 bg-white/[0.03] hover:text-blue-400 hover:bg-blue-500/10 p-2 rounded-xl transition-all border border-white/[0.05]">
                  <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              )}
              <form action={async () => { await removeItemFromQueue(id); }}>
                <button type="submit" title="Remove from Queue" className="text-slate-400 bg-white/[0.03] hover:text-red-400 hover:bg-red-500/10 p-2 rounded-xl transition-all border border-white/[0.05]">
                  <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              </form>
            </div>

          </div>

          <div className="flex items-center justify-between mt-1">
            
            {/* THE NEW PROMINENT CYCLE BADGE */}
            <span className="text-[10px] md:text-xs font-mono font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full shadow-sm tracking-wide">
              {estimatedCycles} CYC
            </span>

            <button onClick={() => setIsLogModalOpen(true)} className="text-[10px] md:text-[11px] font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 bg-white/[0.03] hover:bg-white/[0.1] px-3 py-1.5 md:py-2 rounded-lg border border-white/[0.05]">
              <History className="w-3 h-3 md:w-4 md:h-4" /> LOG PAST
            </button>

          </div>
        </div>
      </div>

      {/* --- THE EDIT MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030712]/80 backdrop-blur-md p-4">
          {/* Note: max-w-[90vw] ensures it never hits the edge of a phone screen! */}
          <div className="bg-[#0c1222] border border-white/10 rounded-3xl shadow-2xl w-full max-w-[90vw] md:max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center bg-white/[0.02] p-4 md:p-5 border-b border-white/5">
              <h3 className="font-bold text-white flex items-center gap-2 text-sm md:text-base"><Edit2 className="w-4 h-4 md:w-5 md:h-5 text-blue-400"/> Edit Item</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form action={async (formData) => { await updateQueueItem(formData); setIsEditModalOpen(false); }}>
              <input type="hidden" name="itemId" value={id} />
              <div className="p-5 md:p-6 space-y-5">
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Title</label>
                  <input type="text" name="title" required defaultValue={title} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 md:p-3.5 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm md:text-base transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Estimated Cycles</label>
                  <input type="number" name="cycles" min="1" required defaultValue={estimatedCycles} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 md:p-3.5 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm md:text-base transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-4 md:p-5 border-t border-white/5 bg-white/[0.01]">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-medium text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-5 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shadow-lg shadow-blue-900/20">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- THE RETROACTIVE LOG MODAL --- */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030712]/80 backdrop-blur-md p-4">
          <div className="bg-[#0c1222] border border-white/10 rounded-3xl shadow-2xl w-full max-w-[95vw] md:max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center bg-white/[0.02] p-4 md:p-5 border-b border-white/5">
              <h3 className="font-bold text-white flex items-center gap-2 text-sm md:text-base"><History className="w-4 h-4 md:w-5 md:h-5 text-emerald-400"/> Retroactive Log</h3>
              <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form action={async (formData) => { await logPastEntry(formData); setIsLogModalOpen(false); }}>
              <input type="hidden" name="itemId" value={id} />
              <div className="p-5 md:p-6 space-y-5 md:space-y-6">
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Task</label>
                  <div className="bg-black/20 border border-white/5 rounded-xl p-3 md:p-3.5 text-slate-300 text-xs md:text-sm font-medium truncate">{title}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Start Time</label>
                    <input type="time" name="startTime" required defaultValue="09:00" className="w-full bg-black/20 border border-white/10 rounded-xl p-3 md:p-3.5 text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all text-sm md:text-base" />
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">End Time</label>
                    <input type="time" name="endTime" required defaultValue="10:00" className="w-full bg-black/20 border border-white/10 rounded-xl p-3 md:p-3.5 text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all text-sm md:text-base" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Note (Optional)</label>
                  <textarea name="note" placeholder="How did it go?" className="w-full bg-black/20 border border-white/10 rounded-xl p-3 md:p-3.5 text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none min-h-[80px] md:min-h-[100px] transition-all text-sm md:text-base" />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-4 md:p-5 border-t border-white/5 bg-white/[0.01]">
                <button type="button" onClick={() => setIsLogModalOpen(false)} className="px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-medium text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-5 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 rounded-xl transition-colors shadow-lg shadow-emerald-900/20"><CheckCircle2 className="w-4 h-4"/> Save to Timeline</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}