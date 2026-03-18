import {prisma} from "../../lib/prisma_client"
import { initializeDailyRecordAndHabits } from "../../actions/daily-planner"
import { getCurrentDateIST } from "../../lib/helpers"
import Planning from "../../components/daily-planner/Planning"
import HUD from "../../components/daily-planner/HUD"
import Log from "../../components/daily-planner/Log"

export default async function DailyPlannerHome() {
  await initializeDailyRecordAndHabits();
  const today = getCurrentDateIST();

  const dailyRecord = await prisma.dailyRecord.findUnique({
    where: { date: today },
    include: { items: { orderBy: { orderIndex: 'asc' } } }
  });

  const status = dailyRecord?.status;

  if (status === "PLANNING") {
    return <Planning dailyRecord={dailyRecord} />;
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
      <HUD
        dailyRecord={dailyRecord} 
        activeTimeEntry={activeTimeEntry} 
        pastDurationSeconds={pastDurationSeconds} 
      />
    )
  }

  if (status === "COMPLETED" || status === "REST_DAY" || status === "ENDED_EARLY") {
    return <Log dailyRecord={dailyRecord} />;
  }

  return <div className="text-white p-10">Unknown State: {status}</div>;
}