import { prisma } from "@/lib/prisma_client"
import ManageView from "@/components/daily-planner/views/ManageView"
import { getCurrentDateIST } from "@/lib/helpers";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  const currentDate = getCurrentDateIST();

  const backlogTasks = await prisma.task.findMany({
    where: {
      status: { in: ["BACKLOG", "QUEUED"] },

      dailyItems: {
        none: { date: currentDate, status: "TODO" }
      }
    },
    include: {
      dailyItems: {
        where: { status: "TODO", date: { gt: currentDate } },
        orderBy: { date: 'asc' },
        take: 1
      }
    },
    orderBy: { title: "asc" }
  });
  
  const habits = await prisma.habit.findMany({ 
    orderBy: { title: "asc" } 
  });

  return (
    <main className="min-h-screen bg-[#030712] relative flex justify-center p-4 md:p-12 overflow-hidden selection:bg-indigo-500/30">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />
      <ManageView initialTasks={backlogTasks} initialHabits={habits} />
    </main>
  );
}