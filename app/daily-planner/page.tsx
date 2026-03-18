import {prisma} from "@/lib/prisma_client"
import { initializeDailyRecordAndHabits, cleanupGhostDays } from "@/actions/daily-planner"
import { getCurrentDateIST, formatDisplayDateIST } from "@/lib/helpers"
import PlanningView from "@/components/daily-planner/views/PlanningView"
import HUDView from "@/components/daily-planner/views/HUDView"
import ReviewView from "@/components/daily-planner/views/ReviewView"
import RestDayView from "@/components/daily-planner/views/RestDayView";

export const dynamic = 'force-dynamic';

export default async function DailyPlannerHomePage() {
  await cleanupGhostDays();
  await initializeDailyRecordAndHabits();
  const today = getCurrentDateIST();

  const dailyRecord = await prisma.dailyRecord.findUnique({
    where: { date: today },
    include: { items: { orderBy: { orderIndex: 'asc' } } }
  });

  const status = dailyRecord?.status;

  if (status === "PLANNING") {
    const backlogTasks = await prisma.task.findMany({
      where: {
        status: { in: ["BACKLOG", "QUEUED"] },
        dailyItems: {
          none: { date: today, status: "TODO" }
        }
      },
      include: {
        dailyItems: {
          where: { status: "TODO", date: { gt: today } },
          orderBy: { date: 'asc' },
          take: 1
        }
      },
      orderBy: { title: "asc" }
    });
    const routines = await prisma.habit.findMany({ orderBy: { title: "asc" } });

    const todaysQueue = (dailyRecord?.items || []).filter((item: any) => item.status === "TODO");
    const totalCycles = todaysQueue.reduce((sum: number, item: any) => sum + item.estimatedCycles, 0);

    return (
        <PlanningView 
          backlogTasks={backlogTasks} 
          routines={routines} 
          todaysQueue={todaysQueue} 
          totalCycles={totalCycles}
          formattedDate={formatDisplayDateIST()}
        />
    );
  }

  if (status === "ACTIVE") {
    const activeTimeEntry = await prisma.timeEntry.findFirst({
      where: { 
        endedAt: null, 
        entryType: "LIVE_TRACKED",
        planItem: { date: today }
      }
    });

    const currentTask = dailyRecord?.items.find(i => i.status === "TODO");

    let pastDurationSeconds = 0;
    if (currentTask) {
      const pastEntries = await prisma.timeEntry.findMany({
        where: { planItemId: currentTask.id, endedAt: { not: null } }
      });
      pastDurationSeconds = pastEntries.reduce((sum, e) => sum + (e.durationSeconds || 0), 0);
    }

    return (
      <HUDView
        dailyRecord={dailyRecord} 
        activeTimeEntry={activeTimeEntry} 
        pastDurationSeconds={pastDurationSeconds} 
      />
    )
  }

  if (status === "REST_DAY") {
    return <RestDayView formattedDate={formatDisplayDateIST()} />;
  }

  if (status === "COMPLETED" || status === "ENDED_EARLY") {
    const timeEntries = await prisma.timeEntry.findMany({
      where: { planItem: { date: today } },
      orderBy: { startedAt: 'asc' },
      include: { planItem: true } // Pulls in the task details
    });

    return <ReviewView dailyRecord={dailyRecord} timeEntries={timeEntries} formattedDate={formatDisplayDateIST()}/>;
  }

  return <div className="text-white p-10">Unknown State: {status}</div>;
}
