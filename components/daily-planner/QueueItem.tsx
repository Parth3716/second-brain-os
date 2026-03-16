"use client";

import { useState } from "react";
import { moveItemUp, moveItemDown, removeItemFromQueue } from "@/actions/daily-planner";

type QueueItemProps = {
  id: string;
  title: string;
  estimatedCycles: number;
  isFirst: boolean;
  isLast: boolean;
};

export default function QueueItem({ id, title, estimatedCycles, isFirst, isLast }: QueueItemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const renderCycles = (count: number) => {
    return Array.from({ length: count }).map((_, i) => (
      <span key={i} className="text-slate-400 text-xs mx-[1px]">(○)</span>
    ));
  };

  return (
    <>
      <li className="p-3 bg-slate-900/80 hover:bg-slate-800 transition-colors rounded-xl border border-slate-800 shadow-sm group">
        <div className="flex items-center gap-3">
          
          {/* REORDERING ARROWS */}
          <div className="flex flex-col gap-1 pr-2 border-r border-slate-700/50">
            <form action={async () => { await moveItemUp(id); }}>
              <button disabled={isFirst} className="text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
              </button>
            </form>
            <form action={async () => { await moveItemDown(id); }}>
              <button disabled={isLast} className="text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
            </form>
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <div className="flex justify-between items-start">
              <span className="font-medium text-slate-200 text-sm">{title}</span>
              
              {/* --- NEW REMOVE BUTTON --- */}
              <form action={async () => { await removeItemFromQueue(id); }}>
                <button 
                  type="submit" 
                  title="Remove from Queue"
                  className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 px-2"
                >
                  ✖
                </button>
              </form>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex">{renderCycles(estimatedCycles)}</div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setIsModalOpen(true)} className="text-xs font-bold text-slate-400 hover:text-white transition-colors">
                  🔙 LOG PAST
                </button>
              </div>
            </div>
          </div>

        </div>
      </li>

      {/* --- RETROACTIVE MODAL REMAINS THE SAME --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center bg-slate-800/50 p-4 border-b border-slate-700">
              <h3 className="font-medium text-slate-200 flex items-center gap-2"><span>🔙</span> Retroactive Log</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✖</button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Task</label>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 text-sm">{title}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Start</label>
                  <input type="time" defaultValue="07:30" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">End</label>
                  <input type="time" defaultValue="09:00" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-slate-800 bg-slate-900/50">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white">Cancel</button>
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg">✔ Save to Timeline</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}