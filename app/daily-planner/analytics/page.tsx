// app/daily-planner/analytics/page.tsx
import { prisma } from "@/lib/prisma_client";
import AnalyticsView from "@/components/daily-planner/views/AnalyticsView";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  // 1. Fetch all data
  const timeEntries = await prisma.timeEntry.findMany({
    orderBy: { startedAt: "asc" },
    include: { planItem: true },
  });

  const planItems = await prisma.dailyPlanItem.findMany({
    where: { status: { in: ["COMPLETED", "SKIPPED", "PUSHED_TOMORROW"] } },
  });

  // 2. Crunching the High-Level Stats
  const totalSeconds = timeEntries.reduce(
    (sum, e) => sum + (e.durationSeconds || 0),
    0,
  );

  const liveSeconds = timeEntries
    .filter((e) => e.entryType === "LIVE_TRACKED")
    .reduce((sum, e) => sum + (e.durationSeconds || 0), 0);
  const livePercent =
    totalSeconds > 0 ? Math.round((liveSeconds / totalSeconds) * 100) : 0;

  const adhocSeconds = timeEntries
    .filter((e) => e.planItemId === null)
    .reduce((sum, e) => sum + (e.durationSeconds || 0), 0);
  const adhocPercent =
    totalSeconds > 0 ? Math.round((adhocSeconds / totalSeconds) * 100) : 0;

  // Completion Rate
  const completedCount = planItems.filter(
    (i) => i.status === "COMPLETED",
  ).length;
  const completionRate =
    planItems.length > 0
      ? Math.round((completedCount / planItems.length) * 100)
      : 0;

  // 3. Crunching the Daily Chart Data (Grouping by Date)
  const dailyDataMap: Record<string, number> = {};
  timeEntries.forEach((entry) => {
    const dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(entry.startedAt);
    if (!dailyDataMap[dateStr]) dailyDataMap[dateStr] = 0;
    dailyDataMap[dateStr] += entry.durationSeconds || 0;
  });

  // Convert map to array for the chart, take the last 7 active days
  const chartData = Object.keys(dailyDataMap)
    .sort()
    .slice(-7)
    .map((date) => {
      const dateObj = new Date(date);
      return {
        label: dateObj.toLocaleDateString("en-US", { weekday: "short" }),
        fullDate: dateObj.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        hours: Number((dailyDataMap[date] / 3600).toFixed(1)), // Convert to hours for chart
        seconds: dailyDataMap[date],
      };
    });

  // 4. Estimation Accuracy Math (Reality vs Intent)
  let totalEstimatedSeconds = 0;
  let totalActualSeconds = 0;

  planItems
    .filter((i) => i.status === "COMPLETED" && i.originalCycles)
    .forEach((item) => {
      // 1 cycle = 45 mins = 2700 seconds (Adjust if your cycles are different)
      totalEstimatedSeconds += item.originalCycles! * 45 * 60;
      const actualTime = timeEntries
        .filter((e) => e.planItemId === item.id)
        .reduce((sum, e) => sum + (e.durationSeconds || 0), 0);
      totalActualSeconds += actualTime;
    });

  let estimationAccuracy = 0;
  if (totalEstimatedSeconds > 0 && totalActualSeconds > 0) {
    estimationAccuracy = Math.round(
      (Math.min(totalEstimatedSeconds, totalActualSeconds) /
        Math.max(totalEstimatedSeconds, totalActualSeconds)) *
        100,
    );
  }

  // Pass it all to the God-Tier Client View
  return (
    <AnalyticsView
      stats={{
        totalHours: (totalSeconds / 3600).toFixed(1),
        livePercent,
        adhocPercent,
        completionRate,
        estimationAccuracy,
        chartData,
      }}
    />
  );
}
