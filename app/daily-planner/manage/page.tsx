import { prisma } from "../../../lib/prisma_client";
import Link from "next/link";
import { addTaskToBacklog, deleteTaskFromBacklog, addHabitToBacklog, deleteHabitFromBacklog } from "@/actions/daily-planner";

export const dynamic = "force-dynamic";

// Helper logic to build the checkbox row
const DAYS = [
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
  { value: 0, label: "S" },
];

// Helper logic to display the saved days cleanly
function formatDays(daysArray: number[]) {
  if (daysArray.length === 7) return "Every day";
  if (daysArray.length === 5 && !daysArray.includes(0) && !daysArray.includes(6)) return "Weekdays";
  
  const dayMap: Record<number, string> = { 1: "M", 2: "T", 3: "W", 4: "Th", 5: "F", 6: "Sa", 0: "Su" };
  // Sort them so Monday(1) comes before Sunday(0) at the end, standard calendar style
  const sorted = [...daysArray].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  return sorted.map(d => dayMap[d]).join(", ");
}

export default async function ManageUniversePage() {
  const backlogTasks = await prisma.task.findMany({ where: { status: "BACKLOG" }, orderBy: { title: "asc" } });
  const habits = await prisma.habit.findMany({ orderBy: { title: "asc" } });

  return (
    <main className="min-h-screen bg-[#060a13] text-slate-200 p-6 md:p-10 flex justify-center">
      <div className="w-full max-w-6xl space-y-8">
        
        <header className="flex justify-between items-center border-b border-slate-800/60 pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>⚙️</span> Manage Universe
          </h1>

          <div className="flex gap-4 items-center">
            <Link href="/daily-planner" className="text-sm text-slate-400 hover:text-white transition-colors">
              ← Back to Command Center
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
          {/* LEFT: BACKLOG TASKS */}
          <section className="space-y-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-1">One-Off Tasks</h2>
            
            <form action={addTaskToBacklog} className="flex shadow-xl">
              <input type="text" name="title" placeholder="Add new task..." required className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 px-4 py-3 rounded-l-lg focus:outline-none focus:border-blue-500" />
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-r-lg font-medium transition-colors">Add</button>
            </form>

            <ul className="space-y-2 mt-6">
              {backlogTasks.map((task) => (
                <li key={task.id} className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center group">
                  <span className="text-sm">{task.title}</span>
                  <form action={async () => { "use server"; await deleteTaskFromBacklog(task.id); }}>
                    <button type="submit" className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
                  </form>
                </li>
              ))}
            </ul>
          </section>

          {/* RIGHT: HABITS & ROUTINES */}
          <section className="space-y-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-1">Daily Habits</h2>
            
            {/* UPDATED HABIT FORM */}
            <form action={addHabitToBacklog} className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-xl flex flex-col gap-4">
              
              {/* Row 1: Text Inputs */}
              <div className="flex gap-2">
                <input type="text" name="title" placeholder="Habit name (e.g. Gym - Leg Day)" required className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 px-4 py-2 rounded-lg focus:outline-none focus:border-emerald-500 text-sm" />
                <input type="number" name="cycles" placeholder="Cyc" min="1" defaultValue="1" className="w-16 bg-slate-950 border border-slate-800 text-slate-200 px-2 py-2 rounded-lg focus:outline-none focus:border-emerald-500 text-sm text-center" />
              </div>

              {/* Row 2: Day Selectors & Submit */}
              <div className="flex justify-between items-center">
                <div className="flex gap-1">
                  {DAYS.map((day, i) => (
                    <label key={i} className="cursor-pointer relative">
                      {/* Hidden native checkbox */}
                      <input type="checkbox" name="daysOfWeek" value={day.value} className="peer sr-only" defaultChecked />
                      {/* Beautiful stylized UI box */}
                      <div className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-950 border border-slate-800 text-slate-500 text-xs font-bold peer-checked:bg-emerald-600 peer-checked:text-white peer-checked:border-emerald-500 transition-all">
                        {day.label}
                      </div>
                    </label>
                  ))}
                </div>
                
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Save Habit
                </button>
              </div>
            </form>

            <ul className="space-y-2 mt-6">
              {habits.map((habit) => (
                <li key={habit.id} className="p-4 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center group">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{habit.title}</span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {habit.defaultCycles} cyc
                      </span>
                    </div>
                    {/* Shows "Every day", "Weekdays", or "M, W, F" */}
                    <span className="text-xs text-slate-500 mt-1">{formatDays(habit.daysOfWeek)}</span>
                  </div>
                  <form action={async () => { "use server"; await deleteHabitFromBacklog(habit.id); }}>
                    <button type="submit" className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
                  </form>
                </li>
              ))}
            </ul>
          </section>

        </div>
      </div>
    </main>
  );
}