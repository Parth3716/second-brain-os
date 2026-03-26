import {prisma} from "@/lib/prisma_client"
import { initializeToday } from "@/actions/daily-planner"
import { getCurrentDateIST } from "@/lib/helpers"
import { getUserId } from "@/lib/auth";
import DailyPlannerClientHome from "@/components/daily-planner/views/DailyPlannerClientHome";

export default async function DailyPlannerHomePage() {
  const userId = await getUserId();
  await initializeToday();
  const today = getCurrentDateIST();

  const dailyRecord = await prisma.dailyRecord.findUnique({
    where: { date_userId: { date: today, userId } },
    include: { items: { orderBy: { orderIndex: 'asc' } } }
  });

  if (!dailyRecord) {
    return <div className="text-white p-10">No record found for today.</div>;
  }

  const todaysQueue = (dailyRecord.items || []).filter((item) => item.status === "TODO");
  const totalCycles = todaysQueue.reduce((sum, item) => sum + item.estimatedCycles, 0);

    const activeTimeEntry = await prisma.timeEntry.findFirst({
      where: { 
        endedAt: null, 
        entryType: "LIVE_TRACKED",
        planItem: { date: today }
      }
    });

    const currentTask = dailyRecord.items.find(i => i.status === "TODO");

    let pastDurationSeconds = 0;
    if (currentTask) {
      const pastEntries = await prisma.timeEntry.findMany({
        where: { planItemId: currentTask.id, endedAt: { not: null } }
      });
      pastDurationSeconds = pastEntries.reduce((sum, e) => sum + (e.durationSeconds || 0), 0);
    }

  return (
    <DailyPlannerClientHome
      initalStatus={dailyRecord.status}
      dailyRecord={dailyRecord}
    />
  );

  // if (status === "PLANNING") {
  //   const backlogTasks = await prisma.task.findMany({
  //     where: {
  //       userId,
  //       status: { in: ["BACKLOG", "QUEUED"] },
  //       dailyItems: {
  //         none: { date: today, status: "TODO" }
  //       }
  //     },
  //     include: {
  //       dailyItems: {
  //         where: { status: "TODO", date: { gt: today } },
  //         orderBy: { date: 'asc' },
  //         take: 1
  //       }
  //     },
  //     orderBy: { title: "asc" }
  //   });
  //   const habits = await prisma.habit.findMany({ where: { userId }, orderBy: { title: "asc" } });

  //   const todaysQueue = (dailyRecord.items || []).filter((item) => item.status === "TODO");
  //   const totalCycles = todaysQueue.reduce((sum, item) => sum + item.estimatedCycles, 0);

  //   return (
  //       <PlanningView 
  //         backlogTasks={backlogTasks} 
  //         habits={habits} 
  //         todaysQueue={todaysQueue} 
  //         totalCycles={totalCycles}
  //         formattedDate={formatDisplayDateIST()}
  //       />
  //   );
  // }

  // if (status === "ACTIVE") {
  //   const activeTimeEntry = await prisma.timeEntry.findFirst({
  //     where: { 
  //       endedAt: null, 
  //       entryType: "LIVE_TRACKED",
  //       planItem: { date: today }
  //     }
  //   });

  //   const currentTask = dailyRecord.items.find(i => i.status === "TODO");

  //   let pastDurationSeconds = 0;
  //   if (currentTask) {
  //     const pastEntries = await prisma.timeEntry.findMany({
  //       where: { planItemId: currentTask.id, endedAt: { not: null } }
  //     });
  //     pastDurationSeconds = pastEntries.reduce((sum, e) => sum + (e.durationSeconds || 0), 0);
  //   }

  //   return (
  //     <HUDView
  //       dailyRecord={dailyRecord} 
  //       activeTimeEntry={activeTimeEntry} 
  //       pastDurationSeconds={pastDurationSeconds} 
  //     />
  //   )
  // }

  // if (status === "COMPLETED" || status === "ENDED_EARLY") {
  //   const timeEntries = await prisma.timeEntry.findMany({
  //     where: { planItem: { date: today } },
  //     orderBy: { startedAt: 'asc' },
  //     include: { planItem: true }
  //   });

  //   return <ReviewView dailyRecord={dailyRecord} timeEntries={timeEntries} formattedDate={formatDisplayDateIST()}/>;
  // }
}
