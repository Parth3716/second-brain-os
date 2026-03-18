import { prisma } from "../../lib/prisma_client"
import QueueItem from "../../components/daily-planner/QueueItem"
import Link from "next/link";
import { addTaskToQueue, addHabitToQueue, startDay, takeDayOff} from "../../actions/daily-planner"

export default async function Planning({ dailyRecord }: { dailyRecord: any }) {
  const backlogTasks = await prisma.task.findMany({
    where: { status: "BACKLOG" },
    orderBy: { title: "asc" },
  });

  const routines = await prisma.habit.findMany({
    orderBy: { title: "asc" }
  });

  const todaysQueue = (dailyRecord.items || []).filter(
    (item: any) => item.status === "TODO"
  );
  const totalCycles = todaysQueue.reduce((sum: number, item: any) => sum + item.estimatedCycles, 0);

  return (
    <main className="min-h-screen bg-[#060a13] text-slate-200 p-6 md:p-10 flex justify-center">
      <div className="w-full max-w-7xl space-y-8 animate-in fade-in duration-500">
        
        {/* --- HEADER --- */}
        <header className="flex justify-between items-center border-b border-slate-800/60 pb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <span className="text-slate-500">⌘</span> COMMAND CENTER
              <span className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded font-mono ml-2">PLANNING STATE</span>
            </h1>
          </div>
          <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">👤</div>
        </header>

        {/* --- SPLIT SCREEN LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* === LEFT: YOUR UNIVERSE === */}
          <div className="lg:col-span-4 space-y-8">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-1">BACKLOG</h2>

            {/* 1. HABITS */}
            <details className="group" open>
              <summary className="flex justify-between items-center cursor-pointer list-none outline-none">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 hover:text-white transition-colors">
                  <span className="text-[10px] text-slate-500 transition-transform duration-200 group-open:rotate-90">▶</span> 
                  HABITS & ROUTINES
                </h3>
              </summary>
              <ul className="pl-5 space-y-2 border-l border-slate-800 ml-1 mt-3">
                {routines.length === 0 ? (
                  <li className="text-xs text-slate-600 italic">No habits configured.</li>
                ) : (
                  routines.map((habit:any) => (
                    <li key={habit.id} className="text-sm text-slate-400 flex items-center justify-between group/item h-8">
                      <span className="truncate pr-4">• {habit.title}</span>
                      <form action={async () => { "use server"; await addHabitToQueue(habit.id); }}>
                        <button type="submit" title="Add to Queue" className="text-xs bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-500 w-6 h-6 rounded flex items-center justify-center transition-colors opacity-0 group-hover/item:opacity-100">+</button>
                      </form>
                    </li>
                  ))
                )}
              </ul>
            </details>

            {/* 2. TASKS */}
            <details className="group" open>
              <summary className="flex justify-between items-center cursor-pointer list-none outline-none">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 hover:text-white transition-colors">
                  <span className="text-[10px] text-slate-500 transition-transform duration-200 group-open:rotate-90">▶</span> 
                  ACTIVE TASKS
                </h3>
              </summary>
              <div className="pl-5 border-l border-slate-800 ml-1 mt-3">
                <ul className="space-y-2">
                  {backlogTasks.length === 0 ? (
                    <li className="text-xs text-slate-600 italic">No tasks. Add some in Manage.</li>
                  ) : (
                    backlogTasks.map((task:any) => (
                      <li key={task.id} className="text-sm text-slate-400 flex items-center justify-between group/item h-8">
                        <span className="truncate pr-4 flex items-center gap-2">
                          <span className="text-slate-700 group-hover/item:text-slate-500 transition-colors">≡</span>
                          {task.title}
                        </span>
                        
                        {/* Inline Form for Task Cycles + Add Button */}
                        <form action={addTaskToQueue.bind(null, task.id)} className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <input type="number" name="cycles" defaultValue="1" min="1" max="10" title="Estimated Cycles" className="w-10 bg-slate-900 border border-slate-700 text-slate-300 text-xs px-1 py-1 rounded text-center focus:outline-none focus:border-blue-500" />
                          <button type="submit" title="Add to Queue" className="text-xs bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-400 w-6 h-6 rounded flex items-center justify-center transition-colors">+</button>
                        </form>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </details>
          </div>

          {/* === RIGHT: EXECUTION QUEUE === */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex justify-between items-end pl-1 border-b border-slate-800/60 pb-2">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Today's Execution Queue</h2>
              <span className="text-xs text-slate-500 font-mono">Est: {totalCycles} Cycles</span>
            </div>
            
            <div className="min-h-[500px] flex flex-col">
              
              {/* === THE STATE CHANGERS === */}
              <div className="flex gap-4 mb-6">
                
                {/* 1. BEGIN WORKDAY: Flips the database state to ACTIVE */}
                <form action={startDay} className="flex-1">
                  <button type="submit" disabled={todaysQueue.length === 0} className="w-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 py-4 rounded-xl font-bold tracking-widest text-sm transition-all flex justify-center items-center shadow-lg disabled:opacity-30 disabled:cursor-not-allowed">
                    ▶ START DAY
                  </button>
                </form>

                {/* 2. TAKE DAY OFF: Clears queue, skips habits, logs as REST_DAY */}
                <form action={takeDayOff} className="flex-1">
                  <button type="submit" className="w-full bg-slate-900 text-slate-400 hover:text-red-400 hover:bg-red-900/10 border border-slate-800 hover:border-red-900/30 py-4 rounded-xl font-bold tracking-widest text-sm transition-all flex justify-center items-center shadow-lg">
                    🏳️ TAKE DAY OFF
                  </button>
                </form>

                {/* 3. MANAGE: Goes to settings route */}
                <Link href="/daily-planner/manage" className="flex-1 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 py-4 rounded-xl font-bold tracking-widest text-sm transition-all flex justify-center items-center shadow-lg">
                  ⚙️ MANAGE
                </Link>
              </div>

              {/* === THE QUEUE LIST === */}
              <ul className="space-y-3">
                {todaysQueue.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-800/60 rounded-xl bg-slate-900/20">
                    <p className="text-slate-500 text-sm">Your queue is empty.</p>
                    <p className="text-slate-600 text-xs mt-1">Click the [+] buttons on the left to plan your day.</p>
                  </div>
                ) : (
                  todaysQueue.map((item: any, index: number) => (
                    <div key={item.id} className="flex gap-4 items-center">
                      <div className="text-slate-600 font-mono text-sm font-bold w-4 text-right">
                        {index + 1}.
                      </div>
                      <div className="flex-1">
                        <QueueItem 
                          id={item.id}
                          taskId={item.taskId} 
                          title={item.title} 
                          estimatedCycles={item.estimatedCycles} 
                          isFirst={index === 0} 
                          isLast={index === todaysQueue.length - 1}
                        />
                      </div>
                    </div>
                  ))
                )}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}