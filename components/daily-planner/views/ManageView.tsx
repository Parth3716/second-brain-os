"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ArrowLeft, Settings2, CheckCircle2, Target, CalendarDays, Loader2, Calendar, Edit2, X } from "lucide-react";
import Link from "next/link";
import { addTaskToBacklog, deleteTaskFromBacklog, addHabitToBacklog, deleteHabitFromBacklog, editTaskInBacklog, editHabitInBacklog } from "@/actions/daily-planner"
import SignOutButton from "@/components/auth/SignOutButton";
import { formatShortDisplayDateIST, getDisplayDateIST, getDateString } from "@/lib/helpers";
import type { Task, Habit } from "@/types/daily_planner";

const DAYS = [
  { value: 1, label: "M" }, { value: 2, label: "T" }, { value: 3, label: "W" },
  { value: 4, label: "T" }, { value: 5, label: "F" }, { value: 6, label: "S" }, { value: 0, label: "S" },
];

function formatDays(daysArray: number[]) {
  if (daysArray.length === 7) return "Every day";
  if (daysArray.length === 5 && !daysArray.includes(0) && !daysArray.includes(6)) return "Weekdays";
  const dayMap: Record<number, string> = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 0: "Sun" };
  return [...daysArray].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)).map(d => dayMap[d]).join(", ");
}

export default function ManageView({ initialTasks, initialHabits }: { initialTasks: Task[], initialHabits: Habit[] }) {
  {/* --- USE STATES --- */ }
  const [backlogTasksState, setBacklogTasksState] = useState<Task[] | []>(initialTasks);
  const [habitsState, setHabitsState] = useState<Habit[] | []>(initialHabits);
  const taskFormRef = useRef<HTMLFormElement>(null);
  const habitFormRef = useRef<HTMLFormElement>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isTaskEditModalOpen, setIsTaskEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editScheduleDate, setEditScheduleDate] = useState("");
  const [isHabitEditModalOpen, setIsHabitEditModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  {/* --- HANDLER FUNCTIONS --- */ }
  const handleAddTask = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading("Adding Task");
    const formData = new FormData(e.currentTarget);
    const newTask = await addTaskToBacklog(formData);
    if (!newTask) return;

    setBacklogTasksState(prev => [...prev, newTask])
    taskFormRef.current?.reset();
    setScheduleDate("");
    setIsLoading(null);
  };

  const handleAddHabit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading("Adding Habit");
    const formData = new FormData(e.currentTarget);
    const newHabit = await addHabitToBacklog(formData);
    if (!newHabit) return;

    setHabitsState(prev => [...prev, newHabit])
    habitFormRef.current?.reset();
    setIsLoading(null);
  };

  const handleDeleteTask = async (id: string) => {
    setIsLoading(`delete_${id}`);
    setBacklogTasksState(prev => prev.filter(task => task.id !== id));
    await deleteTaskFromBacklog(id);
    setIsLoading(null);
  };

  const handleDeleteHabit = async (id: string) => {
    setIsLoading(`delete_${id}`);
    setHabitsState(prev => prev.filter(habit => habit.id !== id));
    await deleteHabitFromBacklog(id);
    setIsLoading(null);
  };

  const handleTaskEditModalOpen = (task: Task) => {
    setEditingTask(task);
    setIsTaskEditModalOpen(true);
    setEditScheduleDate(task?.dailyItems && task.dailyItems.length > 0 ? getDateString(task.dailyItems[0].date) : "")
  }

  const handleHabitEditModalOpen = (habit: Habit) => {
    setEditingHabit(habit);
    setIsHabitEditModalOpen(true);
  }

  const handleEditBacklogTask = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading("Edit Task")
    const formData = new FormData(e.currentTarget);
    const updatedTask = await editTaskInBacklog(formData);
    if (!updatedTask) return;

    setBacklogTasksState(prev => prev.map(task => task.id === updatedTask.id ? updatedTask : task))
    setIsLoading(null)
    setIsTaskEditModalOpen(false);
  }

  const handleEditBacklogHabit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading("Edit Habit")
    const formData = new FormData(e.currentTarget);
    const updatedHabit = await editHabitInBacklog(formData);
    if (!updatedHabit) return;

    setHabitsState(prev => prev.map(habit => habit.id === updatedHabit.id ? updatedHabit : habit))
    setIsLoading(null)
    setIsHabitEditModalOpen(false);
  }

  return (
    <>
      <div className="w-full max-w-[90rem] space-y-12 relative z-10 px-4 xl:px-10">

        {/* --- HEADER --- */}
        <header className="flex justify-between items-end border-b border-white/10 pb-6">
          <div className="space-y-1">
            <Link href="/daily-planner" className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-2 mb-4 group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Return to Today
            </Link>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 flex items-center gap-4">
              <Settings2 className="w-10 h-10 text-white" /> Manage Backlog
            </h1>
          </div>
          <SignOutButton />
        </header>

        {/* --- MAIN GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">

          {/* --- LEFT --- */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-indigo-400" />
              <h2 className="text-base font-bold text-slate-300 uppercase tracking-widest">Backlog Tasks</h2>
            </div>

            <form ref={taskFormRef} onSubmit={(e) => handleAddTask(e)} className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative flex flex-col md:flex-row bg-[#0c1222] border border-white/10 rounded-2xl shadow-2xl p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all gap-1.5">
                <input
                  type="text"
                  name="title"
                  placeholder="What needs to be done?"
                  required
                  className="flex-1 bg-transparent text-slate-200 px-4 py-3 text-lg focus:outline-none placeholder:text-slate-600 min-w-0"
                />

                <div className="flex flex-1 md:flex-none gap-1.5">
                  <div className="relative flex items-center justify-center bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] transition-colors rounded-xl px-4 py-3 w-full md:w-auto min-w-[120px] cursor-pointer group/date">
                    <Calendar className={`w-4 h-4 mr-2 transition-colors ${scheduleDate ? 'text-indigo-400' : 'text-slate-500 group-hover/date:text-indigo-400'}`} />
                    <span className={`text-sm font-medium transition-colors truncate ${scheduleDate ? 'text-white' : 'text-slate-400 group-hover/date:text-white'}`}>
                      {getDisplayDateIST(scheduleDate)}
                    </span>
                    <input
                      type="date"
                      name="scheduledDate"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      onClick={(e) => {
                        if ('showPicker' in HTMLInputElement.prototype) {
                          (e.target as HTMLInputElement).showPicker();
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <button disabled={isLoading !== null} type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 rounded-xl font-medium transition-colors flex items-center justify-center min-w-[120px]">
                    {isLoading === "Adding Task" ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="flex items-center gap-2 text-lg"><Plus className="w-5 h-5" /> Add</span>}
                  </button>
                </div>

              </div>
            </form>

            {/* --- BACKLOG TASKS LIST --- */}
            <ul className="space-y-3 pt-4">
              <AnimatePresence mode="popLayout">
                {backlogTasksState.map((task) => (
                  <motion.li
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    key={task.id}
                    className="group relative flex justify-between items-center p-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] rounded-2xl transition-colors overflow-hidden"
                  >
                    <div className="flex flex-col gap-1 relative z-10 overflow-hidden pr-4">
                      <div className="flex items-center gap-4">
                        <CheckCircle2 className="w-6 h-6 text-slate-600 flex-shrink-0 group-hover:text-indigo-400 transition-colors" />
                        <span className="text-slate-200 font-medium text-lg truncate">{task.title}</span>
                        {task.dailyItems && task.dailyItems.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full whitespace-nowrap w-max">
                            📅 {formatShortDisplayDateIST(task.dailyItems[0].date)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => { handleTaskEditModalOpen(task) }} disabled={isLoading !== null} title="Edit Task"
                        className="text-slate-400 bg-slate-800/60 hover:text-blue-400 hover:bg-blue-400/20 p-2.5 rounded-xl transition-all">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        disabled={isLoading !== null}
                        title="Delete Task"
                        className="relative z-10 flex-shrink-0 text-slate-400 bg-slate-800/60 hover:text-red-400 hover:bg-red-400/20 p-2.5 rounded-xl transition-all"
                      >
                        {isLoading === `delete_${task.id}` ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
              {initialTasks.length === 0 && (
                <div className="text-center py-12 text-slate-600 italic text-lg">No active tasks in backlog.</div>
              )}
            </ul>
          </section>

          {/* --- RIGHT --- */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <CalendarDays className="w-6 h-6 text-emerald-400" />
              <h2 className="text-base font-bold text-slate-300 uppercase tracking-widest">Daily Habits</h2>
            </div>

            <form ref={habitFormRef} onSubmit={(e) => handleAddHabit(e)} className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative bg-[#0c1222] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-6">

                <div className="flex gap-4">
                  <input type="text" name="title" placeholder="Habit name (e.g. Gym)" required className="flex-1 bg-white/[0.03] border border-white/10 text-slate-200 px-5 py-4 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600 min-w-0" />
                  <div className="relative flex-shrink-0">
                    <input type="number" name="cycles" defaultValue="1" min="1" className="w-24 h-full bg-white/[0.03] border border-white/10 text-slate-200 px-4 py-4 rounded-xl text-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <span className="absolute -top-3 right-3 bg-[#0c1222] px-2 text-[11px] text-slate-500 font-bold tracking-widest uppercase">Cycles</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                  <div className="flex gap-2 justify-center w-full sm:w-auto">
                    {DAYS.map((day, i) => (
                      <label key={i} className="cursor-pointer relative">
                        <input type="checkbox" name="daysOfWeek" value={day.value} className="peer sr-only" defaultChecked />
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/80 text-slate-500 text-sm font-bold peer-checked:bg-emerald-500 peer-checked:text-white peer-checked:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all duration-300 hover:bg-slate-700">
                          {day.label}
                        </div>
                      </label>
                    ))}
                  </div>

                  <button disabled={isLoading !== null} type="submit" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl text-lg font-medium transition-colors flex items-center justify-center shadow-lg shadow-emerald-900/20">
                    {isLoading === "Adding Habit" ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="flex items-center gap-2"><Plus className="w-5 h-5" /> Save</span>}
                  </button>
                </div>
              </div>
            </form>

            {/* BACKLOG HABITS LIST */}
            <ul className="space-y-3 pt-4">
              <AnimatePresence mode="popLayout">
                {habitsState.map((habit) => (
                  <motion.li
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    key={habit.id}
                    className="group relative flex justify-between items-center p-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] rounded-2xl transition-colors"
                  >
                    <div className="flex flex-col gap-2 overflow-hidden pr-4">
                      <div className="flex items-center gap-4">
                        <span className="text-slate-200 font-bold text-xl truncate">{habit.title}</span>
                        <span className="flex-shrink-0 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                          {habit.defaultCycles} CYC
                        </span>
                      </div>
                      <span className="text-sm text-slate-500 font-medium tracking-wide flex items-center gap-2 truncate">
                        <CalendarDays className="w-4 h-4 flex-shrink-0" /> {formatDays(habit.daysOfWeek)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => { handleHabitEditModalOpen(habit) }} disabled={isLoading !== null} title="Edit Habit"
                        className="text-slate-400 bg-slate-800/60 hover:text-blue-400 hover:bg-blue-400/20 p-2.5 rounded-xl transition-all">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteHabit(habit.id)}
                        disabled={isLoading !== null}
                        title="Delete Habit"
                        className="flex-shrink-0 text-slate-400 bg-slate-800/60 hover:text-red-400 hover:bg-red-400/20 p-2.5 rounded-xl transition-all"
                      >
                        {isLoading === `delete_${habit.id}` ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
              {initialHabits.length === 0 && (
                <div className="text-center py-12 text-slate-600 italic text-lg">No habits scheduled.</div>
              )}
            </ul>
          </section>

        </div>
      </div>

      {/* --- TASK EDIT MODAL --- */}
      <AnimatePresence>
        {isTaskEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030712]/80 backdrop-blur-md p-4">
            <div className="bg-[#0c1222] border border-white/10 rounded-3xl shadow-2xl w-full max-w-[90vw] md:max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center bg-white/[0.02] p-4 md:p-5 border-b border-white/5">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm md:text-base"><Edit2 className="w-4 h-4 md:w-5 md:h-5 text-blue-400" /> Edit Item</h3>
                <button onClick={() => setIsTaskEditModalOpen(false)} disabled={isLoading !== null} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={(e) => handleEditBacklogTask(e)}>
                <input type="hidden" name="taskId" value={editingTask?.id} />
                <div className="p-5 md:p-6 space-y-5">
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Task Title</label>
                    <input type="text" name="title" required defaultValue={editingTask?.title} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 md:p-3.5 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm md:text-base transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Scheduled At</label>
                    <div className="relative flex items-center justify-center bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] transition-colors rounded-xl px-4 py-3 w-full md:w-auto min-w-[120px] cursor-pointer group/date">
                      <Calendar className={`w-4 h-4 mr-2 transition-colors ${editScheduleDate ? 'text-indigo-400' : 'text-slate-500 group-hover/date:text-indigo-400'}`} />
                      <span className={`text-sm font-medium transition-colors truncate ${editScheduleDate ? 'text-white' : 'text-slate-400 group-hover/date:text-white'}`}>
                        {getDisplayDateIST(editScheduleDate)}
                      </span>
                      <input
                        type="date"
                        name="scheduledDate"
                        value={editScheduleDate}
                        onChange={(e) => setEditScheduleDate(e.target.value)}
                        onClick={(e) => {
                          if ('showPicker' in HTMLInputElement.prototype) {
                            (e.target as HTMLInputElement).showPicker();
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-4 md:p-5 border-t border-white/5 bg-white/[0.01]">
                  <button type="button" disabled={isLoading !== null} onClick={() => setIsTaskEditModalOpen(false)} className="px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-medium text-slate-400 hover:text-white transition-colors">Cancel</button>
                  {isLoading == "Edit Task" ? <button type="submit" disabled={isLoading !== null} className="px-5 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shadow-lg shadow-blue-900/20"><Loader2 className="w-4 h-4 animate-spin" /></button> : <button type="submit" disabled={isLoading !== null} className="px-5 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shadow-lg shadow-blue-900/20">Save Changes</button>}
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* --- HABIT EDIT MODAL --- */}
      <AnimatePresence>
        {isHabitEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030712]/80 backdrop-blur-md p-4">
            <div className="bg-[#0c1222] border border-white/10 rounded-3xl shadow-2xl w-full max-w-[90vw] md:max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center bg-white/[0.02] p-4 md:p-5 border-b border-white/5">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm md:text-base"><Edit2 className="w-4 h-4 md:w-5 md:h-5 text-blue-400" /> Edit Item</h3>
                <button onClick={() => setIsHabitEditModalOpen(false)} disabled={isLoading !== null} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={(e) => handleEditBacklogHabit(e)}>
                <input type="hidden" name="habitId" value={editingHabit?.id} />
                <div className="p-5 md:p-6 space-y-5">
                  <div className="flex gap-4">
                    <input type="text" name="title" defaultValue={editingHabit?.title} placeholder="Habit name (e.g. Gym)" required className="flex-1 bg-white/[0.03] border border-white/10 text-slate-200 px-5 py-4 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600 min-w-0" />
                    <div className="relative flex-shrink-0">
                      <input type="number" name="cycles" defaultValue={editingHabit?.defaultCycles} min="1" className="w-24 h-full bg-white/[0.03] border border-white/10 text-slate-200 px-4 py-4 rounded-xl text-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      <span className="absolute -top-3 right-3 bg-[#0c1222] px-2 text-[11px] text-slate-500 font-bold tracking-widest uppercase">Cycles</span>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-center w-full sm:w-auto">
                    {DAYS.map((day, i) => (
                      <label key={i} className="cursor-pointer relative">
                        <input type="checkbox" name="daysOfWeek" value={day.value} className="peer sr-only" defaultChecked={editingHabit?.daysOfWeek.includes(day.value)} />
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/80 text-slate-500 text-sm font-bold peer-checked:bg-emerald-500 peer-checked:text-white peer-checked:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all duration-300 hover:bg-slate-700">
                          {day.label}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-4 md:p-5 border-t border-white/5 bg-white/[0.01]">
                  <button type="button" disabled={isLoading !== null} onClick={() => setIsHabitEditModalOpen(false)} className="px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-medium text-slate-400 hover:text-white transition-colors">Cancel</button>
                  {isLoading == "Edit Habit" ? <button type="submit" disabled={isLoading !== null} className="px-5 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shadow-lg shadow-blue-900/20"><Loader2 className="w-4 h-4 animate-spin" /></button> : <button type="submit" disabled={isLoading !== null} className="px-5 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shadow-lg shadow-blue-900/20">Save Changes</button>}
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}