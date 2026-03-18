"use client";

import { useState } from "react";
import { moveItemUpInQueue, moveItemDownInQueue, removeItemFromQueue, logPastEntry, updateQueueItem } from "../../actions/daily-planner";

type QueueItemProps = {
  id: string;
  taskId: string;
  title: string;
  estimatedCycles: number;
  isFirst: boolean;
  isLast: boolean;
};

export default function QueueItem({ id, taskId, title, estimatedCycles, isFirst, isLast }: QueueItemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
            <form action={async () => { await moveItemUpInQueue(id); }}>
              <button disabled={isFirst} className="text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
              </button>
            </form>
            <form action={async () => { await moveItemDownInQueue(id); }}>
              <button disabled={isLast} className="text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
            </form>
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <div className="flex justify-between items-start">
              <span className="font-medium text-slate-200 text-sm">{title}</span>
                {taskId && (
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    title="Edit Task"
                    className="text-slate-500 hover:text-blue-400 transition-colors px-2 text-sm"
                  >
                    ✏️
                  </button>
                )}
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

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center bg-slate-800/50 p-4 border-b border-slate-700">
              <h3 className="font-medium text-slate-200 flex items-center gap-2">
                <span>✏️</span> Edit Item
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">✖</button>
            </div>

            <form action={async (formData) => {
              await updateQueueItem(formData);
              setIsEditModalOpen(false); // Close modal on success!
            }}>
              <input type="hidden" name="itemId" value={id} />

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">Title</label>
                  <input 
                    type="text" 
                    name="title"
                    required
                    defaultValue={title} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 focus:border-blue-500 focus:outline-none text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">Estimated Cycles</label>
                  <input 
                    type="number" 
                    name="cycles"
                    min="1"
                    required
                    defaultValue={estimatedCycles} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 focus:border-blue-500 focus:outline-none text-sm" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-4 border-t border-slate-800 bg-slate-900/50">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg shadow-blue-900/20">
                  ✔ Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center bg-slate-800/50 p-4 border-b border-slate-700">
              <h3 className="font-medium text-slate-200 flex items-center gap-2">
                <span>🔙</span> Retroactive Log
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✖</button>
            </div>

            {/* We convert the body into a real form that calls our Server Action */}
            <form action={async (formData) => {
              await logPastEntry(formData);
              setIsModalOpen(false); // Close modal on success!
            }}>
              
              {/* Hidden input to secretly pass the ID to the server */}
              <input type="hidden" name="itemId" value={id} />

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">Task</label>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 text-sm">
                    {title}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">Start Time</label>
                    <input 
                      type="time" 
                      name="startTime"
                      required
                      defaultValue="09:00" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 focus:border-blue-500 focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">End Time</label>
                    <input 
                      type="time" 
                      name="endTime"
                      required
                      defaultValue="10:00" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 focus:border-blue-500 focus:outline-none" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">Note (Optional)</label>
                  <textarea 
                    name="note"
                    placeholder="Hit a new PR on squats!" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 focus:border-blue-500 focus:outline-none min-h-[80px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-4 border-t border-slate-800 bg-slate-900/50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20">
                  ✔ Save to Timeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}