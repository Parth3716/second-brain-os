"use server";

import { prisma } from "@/lib/prisma_client";
import { revalidatePath } from "next/cache";
import {
  getCurrentDateIST,
  getCurrentDateTimeIST,
  buildISTDateTime,
} from "@/lib/helpers";
import type { ActionResult } from "@/lib/action_utils";
import { successResult, errorResult } from "@/lib/action_utils";

// Internal type — only used in cleanupGhostDays
interface RolloverTask {
  taskId: string | null;
  title: string;
  estimatedCycles: number;
  originalCycles: number | null;
}

//-----------------------------------------------------------
// CATEGORY A: Server-component-only — errors bubble to error.tsx
//-----------------------------------------------------------

export async function initializeDailyRecordAndHabits() {
  const currentDate = getCurrentDateIST();

  let dailyRecord = await prisma.dailyRecord.findUnique({
    where: { date: currentDate },
  });

  if (!dailyRecord) {
    dailyRecord = await prisma.dailyRecord.create({
      data: { date: currentDate, status: "PLANNING" },
    });

    const currentDayOfWeek = currentDate.getUTCDay();
    const todaysHabits = await prisma.habit.findMany({
      where: { daysOfWeek: { has: currentDayOfWeek } },
    });

    if (todaysHabits.length > 0) {
      await prisma.dailyPlanItem.createMany({
        data: todaysHabits.map((habit, index) => ({
          date: currentDate,
          habitId: habit.id,
          title: habit.title,
          estimatedCycles: habit.defaultCycles,
          originalCycles: habit.defaultCycles,
          orderIndex: index,
          status: "TODO",
        })),
      });
    }
  }
}

export async function cleanupGhostDays() {
  const currentDate = getCurrentDateIST();

  const ghostRecords = await prisma.dailyRecord.findMany({
    where: {
      date: { lt: currentDate },
      status: { in: ["PLANNING", "ACTIVE"] },
    },
    include: { items: true },
    orderBy: { date: "asc" },
  });

  if (ghostRecords.length === 0) return;

  const tasksToRollover: RolloverTask[] = [];

  for (const record of ghostRecords) {
    await prisma.timeEntry.deleteMany({
      where: {
        planItem: { date: record.date },
        endedAt: null,
      },
    });

    for (const item of record.items) {
      if (item.status === "TODO") {
        if (item.taskId) {
          await prisma.dailyPlanItem.update({
            where: { id: item.id },
            data: { status: "PUSHED_TOMORROW" },
          });

          await prisma.task.update({
            where: { id: item.taskId },
            data: { status: "QUEUED" },
          });

          tasksToRollover.push({
            taskId: item.taskId,
            title: item.title,
            estimatedCycles: item.estimatedCycles,
            originalCycles: item.originalCycles,
          });
        } else if (item.habitId) {
          await prisma.dailyPlanItem.update({
            where: { id: item.id },
            data: { status: "SKIPPED" },
          });
        }
      }
    }

    await prisma.dailyRecord.update({
      where: { date: record.date },
      data: { status: "GHOSTED" },
    });
  }

  if (tasksToRollover.length > 0) {
    let todaysRecord = await prisma.dailyRecord.findUnique({
      where: { date: currentDate },
    });
    if (!todaysRecord) {
      todaysRecord = await prisma.dailyRecord.create({
        data: { date: currentDate, status: "PLANNING" },
      });
    }

    const todaysItemsCount = await prisma.dailyPlanItem.count({
      where: { date: currentDate },
    });

    await prisma.dailyPlanItem.createMany({
      data: tasksToRollover.map((task, index) => ({
        date: currentDate,
        taskId: task.taskId,
        title: task.title,
        estimatedCycles: task.estimatedCycles,
        originalCycles: task.originalCycles,
        orderIndex: todaysItemsCount + index,
        status: "TODO",
      })),
    });
  }
}

//-----------------------------------------------------------
// CATEGORY C: Internal helper — never called from client
//-----------------------------------------------------------

async function normalizeQueueOrder(date: Date) {
  const activeItems = await prisma.dailyPlanItem.findMany({
    where: { date: date, status: "TODO" },
    orderBy: { orderIndex: "asc" },
  });

  const transactions = activeItems.map((item, index) =>
    prisma.dailyPlanItem.update({
      where: { id: item.id },
      data: { orderIndex: index },
    }),
  );

  await prisma.$transaction(transactions);
}

//-----------------------------------------------------------
// CATEGORY B: Client-facing — all return ActionResult
//-----------------------------------------------------------

// =================== DAILY RECORD ==========================

export async function startDay(): Promise<ActionResult> {
  try {
    const currentDate = getCurrentDateIST();

    await prisma.dailyRecord.update({
      where: { date: currentDate },
      data: { status: "ACTIVE" },
    });

    const firstTask = await prisma.dailyPlanItem.findFirst({
      where: { date: currentDate, status: "TODO" },
      orderBy: { orderIndex: "asc" },
    });

    if (firstTask) {
      const existingRunningTimer = await prisma.timeEntry.findFirst({
        where: {
          planItem: { date: currentDate },
          endedAt: null,
        },
      });

      if (!existingRunningTimer) {
        await prisma.timeEntry.create({
          data: {
            planItemId: firstTask.id,
            title: firstTask.title,
            startedAt: getCurrentDateTimeIST(),
            entryType: "LIVE_TRACKED",
          },
        });
      }
    }

    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("startDay failed:", error);
    return errorResult("Failed to start your day. Please try again.");
  }
}

export async function takeDayOff(): Promise<ActionResult> {
  try {
    const currentDate = getCurrentDateIST();

    await prisma.dailyRecord.update({
      where: { date: currentDate },
      data: { status: "REST_DAY" },
    });

    const items = await prisma.dailyPlanItem.findMany({
      where: { date: currentDate },
    });

    for (const item of items) {
      if (item.taskId) {
        await prisma.task.update({
          where: { id: item.taskId },
          data: { status: "BACKLOG" },
        });
      }
    }

    await prisma.dailyPlanItem.updateMany({
      where: { date: currentDate, status: "TODO" },
      data: { status: "SKIPPED" },
    });

    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("takeDayOff failed:", error);
    return errorResult("Failed to mark day off. Please try again.");
  }
}

export async function endDay(): Promise<ActionResult> {
  try {
    const currentDate = getCurrentDateIST();
    await prisma.dailyRecord.update({
      where: { date: currentDate },
      data: { status: "COMPLETED" },
    });
    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("endDay failed:", error);
    return errorResult("Failed to end the day. Please try again.");
  }
}

export async function wrapUpDayEarly(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const currentDate = getCurrentDateIST();
    const journalNote = formData.get("journalNote") as string;

    const remainingItems = await prisma.dailyPlanItem.findMany({
      where: { date: currentDate, status: "TODO" },
    });

    await prisma.dailyRecord.update({
      where: { date: currentDate },
      data: {
        status: "ENDED_EARLY",
        notes: journalNote || null,
      },
    });

    for (const item of remainingItems) {
      const action = formData.get(`action_${item.id}`);

      if (action === "SKIP") {
        await prisma.dailyPlanItem.update({
          where: { id: item.id },
          data: { status: "SKIPPED" },
        });

        if (item.taskId) {
          await prisma.task.update({
            where: { id: item.taskId },
            data: { status: "BACKLOG" },
          });
        }
      } else if (action === "PUSH") {
        await prisma.dailyPlanItem.update({
          where: { id: item.id },
          data: { status: "PUSHED_TOMORROW" },
        });

        const nextDay = new Date(currentDate);
        nextDay.setUTCDate(currentDate.getUTCDate() + 1);

        let tomorrowRecord = await prisma.dailyRecord.findUnique({
          where: { date: nextDay },
        });
        if (!tomorrowRecord) {
          tomorrowRecord = await prisma.dailyRecord.create({
            data: { date: nextDay, status: "PLANNING" },
          });
        }

        const tomorrowItems = await prisma.dailyPlanItem.findMany({
          where: { date: nextDay },
        });

        await prisma.dailyPlanItem.create({
          data: {
            date: nextDay,
            taskId: item.taskId,
            habitId: item.habitId,
            title: item.title,
            estimatedCycles: item.estimatedCycles,
            orderIndex: tomorrowItems.length,
            status: "TODO",
          },
        });
      }
    }

    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("wrapUpDayEarly failed:", error);
    return errorResult("Failed to wrap up the day. Please try again.");
  }
}

// =================== TASKS ==========================

export async function addTaskToBacklog(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const title = formData.get("title") as string;
    const scheduledDateStr = formData.get("scheduledDate") as string;

    if (!title || title.trim() === "") {
      return errorResult("Task title cannot be empty.");
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        status: scheduledDateStr ? "QUEUED" : "BACKLOG",
      },
    });

    if (scheduledDateStr) {
      const scheduledDate = new Date(`${scheduledDateStr}T00:00:00.000Z`);

      let futureRecord = await prisma.dailyRecord.findUnique({
        where: { date: scheduledDate },
      });
      if (!futureRecord) {
        futureRecord = await prisma.dailyRecord.create({
          data: { date: scheduledDate, status: "PLANNING" },
        });
      }

      const futureItems = await prisma.dailyPlanItem.findMany({
        where: { date: scheduledDate },
      });

      await prisma.dailyPlanItem.create({
        data: {
          date: scheduledDate,
          taskId: task.id,
          title: task.title,
          estimatedCycles: 1,
          originalCycles: 1,
          orderIndex: futureItems.length,
          status: "TODO",
        },
      });
    }

    revalidatePath("/daily-planner/manage");
    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("addTaskToBacklog failed:", error);
    return errorResult("Failed to add task. Please try again.");
  }
}

export async function deleteTaskFromBacklog(id: string): Promise<ActionResult> {
  try {
    if (!id) return errorResult("Invalid task ID.");

    const relatedItems = await prisma.dailyPlanItem.findMany({
      where: { taskId: id },
      select: { id: true },
    });

    const itemIds = relatedItems.map((i) => i.id);

    await prisma.$transaction([
      prisma.timeEntry.deleteMany({ where: { planItemId: { in: itemIds } } }),
      prisma.dailyPlanItem.deleteMany({ where: { taskId: id } }),
      prisma.task.delete({ where: { id } }),
    ]);

    revalidatePath("/daily-planner/manage");
    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("deleteTaskFromBacklog failed:", error);
    return errorResult(
      "Failed to delete task. It may have active dependencies.",
    );
  }
}

// =================== HABITS ==========================

export async function addHabitToBacklog(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const title = formData.get("title") as string;
    const cycles = parseInt(formData.get("cycles") as string) || 1;
    const daysOfWeekStrings = formData.getAll("daysOfWeek");
    let daysOfWeek = daysOfWeekStrings.map((day) => parseInt(day as string));

    if (!title || title.trim() === "") {
      return errorResult("Habit name cannot be empty.");
    }

    if (cycles < 1) {
      return errorResult("Cycles must be at least 1.");
    }

    if (daysOfWeek.length === 0) {
      daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
    }

    await prisma.habit.create({
      data: {
        title: title.trim(),
        defaultCycles: cycles,
        daysOfWeek: daysOfWeek,
      },
    });

    revalidatePath("/daily-planner/manage");
    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("addHabitToBacklog failed:", error);
    return errorResult("Failed to add habit. Please try again.");
  }
}

export async function deleteHabitFromBacklog(
  id: string,
): Promise<ActionResult> {
  try {
    if (!id) return errorResult("Invalid habit ID.");

    const relatedItems = await prisma.dailyPlanItem.findMany({
      where: { habitId: id },
      select: { id: true },
    });

    const itemIds = relatedItems.map((i) => i.id);

    await prisma.$transaction([
      prisma.timeEntry.deleteMany({ where: { planItemId: { in: itemIds } } }),
      prisma.dailyPlanItem.deleteMany({ where: { habitId: id } }),
      prisma.habit.delete({ where: { id } }),
    ]);

    revalidatePath("/daily-planner/manage");
    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("deleteHabitFromBacklog failed:", error);
    return errorResult(
      "Failed to delete habit. It may have active dependencies.",
    );
  }
}

// =================== DAILY PLAN ITEMS ==========================

export async function addTaskToQueue(
  taskId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const currentDate = getCurrentDateIST();
    const cyclesInput = formData.get("cycles");
    const estimatedCycles = cyclesInput
      ? parseInt(cyclesInput.toString(), 10)
      : 1;

    if (estimatedCycles < 1) {
      return errorResult("Cycles must be at least 1.");
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return errorResult("Task not found. It may have been deleted.");

    let dailyRecord = await prisma.dailyRecord.findUnique({
      where: { date: currentDate },
    });
    if (!dailyRecord) {
      dailyRecord = await prisma.dailyRecord.create({
        data: { date: currentDate },
      });
    }

    const activeCount = await prisma.dailyPlanItem.count({
      where: { date: currentDate, status: "TODO" },
    });

    await prisma.$transaction([
      prisma.dailyPlanItem.create({
        data: {
          date: currentDate,
          taskId: task.id,
          title: task.title,
          estimatedCycles: estimatedCycles,
          originalCycles: estimatedCycles,
          orderIndex: activeCount,
        },
      }),
      prisma.task.update({
        where: { id: taskId },
        data: { status: "QUEUED" },
      }),
    ]);

    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("addTaskToQueue failed:", error);
    return errorResult("Failed to add task to queue.");
  }
}

export async function addHabitToQueue(habitId: string): Promise<ActionResult> {
  try {
    const currentDate = getCurrentDateIST();

    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit)
      return errorResult("Habit not found. It may have been deleted.");

    let dailyRecord = await prisma.dailyRecord.findUnique({
      where: { date: currentDate },
    });
    if (!dailyRecord) {
      dailyRecord = await prisma.dailyRecord.create({
        data: { date: currentDate, status: "ACTIVE" },
      });
    }

    const activeCount = await prisma.dailyPlanItem.count({
      where: { date: currentDate, status: "TODO" },
    });

    await prisma.dailyPlanItem.create({
      data: {
        date: currentDate,
        habitId: habit.id,
        title: habit.title,
        estimatedCycles: habit.defaultCycles,
        originalCycles: habit.defaultCycles,
        orderIndex: activeCount,
        status: "TODO",
      },
    });

    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("addHabitToQueue failed:", error);
    return errorResult("Failed to add habit to queue.");
  }
}

export async function removeItemFromQueue(
  itemId: string,
): Promise<ActionResult> {
  try {
    const queuedItem = await prisma.dailyPlanItem.findUnique({
      where: { id: itemId },
    });

    if (!queuedItem) return errorResult("Item not found in queue.");

    await prisma.$transaction(async (tx) => {
      if (queuedItem.taskId) {
        await tx.task.update({
          where: { id: queuedItem.taskId },
          data: { status: "BACKLOG" },
        });
      }

      await tx.dailyPlanItem.delete({
        where: { id: itemId },
      });
    });

    await normalizeQueueOrder(queuedItem.date);
    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("removeItemFromQueue failed:", error);
    return errorResult("Failed to remove item from queue.");
  }
}

export async function updateQueueItem(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const itemId = formData.get("itemId") as string;
    const title = formData.get("title") as string;
    const cycles = parseInt(formData.get("cycles") as string, 10);

    if (!itemId) return errorResult("Invalid item ID.");
    if (!title || title.trim() === "")
      return errorResult("Title cannot be empty.");
    if (isNaN(cycles) || cycles < 1)
      return errorResult("Cycles must be at least 1.");

    const item = await prisma.dailyPlanItem.findUnique({
      where: { id: itemId },
    });
    if (!item) return errorResult("Item not found.");

    await prisma.$transaction(async (tx) => {
      await tx.dailyPlanItem.update({
        where: { id: itemId },
        data: {
          title: title.trim(),
          estimatedCycles: cycles,
          originalCycles: cycles,
        },
      });

      if (item.taskId) {
        await tx.task.update({
          where: { id: item.taskId },
          data: { title: title.trim() },
        });
      }
    });

    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("updateQueueItem failed:", error);
    return errorResult("Failed to update item.");
  }
}

export async function moveItemUpInQueue(itemId: string): Promise<ActionResult> {
  try {
    const item = await prisma.dailyPlanItem.findUnique({
      where: { id: itemId },
    });
    if (!item) return errorResult("Item not found.");

    const itemAbove = await prisma.dailyPlanItem.findFirst({
      where: { date: item.date, orderIndex: { lt: item.orderIndex } },
      orderBy: { orderIndex: "desc" },
    });

    if (itemAbove) {
      await prisma.$transaction([
        prisma.dailyPlanItem.update({
          where: { id: item.id },
          data: { orderIndex: itemAbove.orderIndex },
        }),
        prisma.dailyPlanItem.update({
          where: { id: itemAbove.id },
          data: { orderIndex: item.orderIndex },
        }),
      ]);
    }

    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("moveItemUpInQueue failed:", error);
    return errorResult("Failed to reorder queue.");
  }
}

export async function moveItemDownInQueue(
  itemId: string,
): Promise<ActionResult> {
  try {
    const item = await prisma.dailyPlanItem.findUnique({
      where: { id: itemId },
    });
    if (!item) return errorResult("Item not found.");

    const itemBelow = await prisma.dailyPlanItem.findFirst({
      where: { date: item.date, orderIndex: { gt: item.orderIndex } },
      orderBy: { orderIndex: "asc" },
    });

    if (itemBelow) {
      await prisma.$transaction([
        prisma.dailyPlanItem.update({
          where: { id: item.id },
          data: { orderIndex: itemBelow.orderIndex },
        }),
        prisma.dailyPlanItem.update({
          where: { id: itemBelow.id },
          data: { orderIndex: item.orderIndex },
        }),
      ]);
    }

    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("moveItemDownInQueue failed:", error);
    return errorResult("Failed to reorder queue.");
  }
}

export async function addCycleToItem(itemId: string): Promise<ActionResult> {
  try {
    const item = await prisma.dailyPlanItem.findUnique({
      where: { id: itemId },
    });
    if (!item) return errorResult("Item not found.");

    await prisma.dailyPlanItem.update({
      where: { id: itemId },
      data: { estimatedCycles: item.estimatedCycles + 1 },
    });

    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("addCycleToItem failed:", error);
    return errorResult("Failed to add cycle.");
  }
}

// =================== TIME ENTRIES ==========================

export async function startLiveTask(itemId: string): Promise<ActionResult> {
  try {
    const item = await prisma.dailyPlanItem.findUnique({
      where: { id: itemId },
    });
    if (!item) return errorResult("Task not found.");

    await prisma.timeEntry.create({
      data: {
        planItemId: item.id,
        title: item.title,
        startedAt: getCurrentDateTimeIST(),
        entryType: "LIVE_TRACKED",
      },
    });

    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("startLiveTask failed:", error);
    return errorResult("Failed to start timer.");
  }
}

export async function pauseLiveTask(
  timeEntryId: string,
): Promise<ActionResult> {
  try {
    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
    });
    if (!existingEntry || existingEntry.endedAt) {
      return errorResult("No active timer found to pause.");
    }

    const endedAt = getCurrentDateTimeIST();
    const diffSeconds = Math.round(
      (endedAt.getTime() - existingEntry.startedAt.getTime()) / 1000,
    );

    await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        endedAt: endedAt,
        durationSeconds: diffSeconds,
      },
    });

    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("pauseLiveTask failed:", error);
    return errorResult("Failed to pause timer.");
  }
}

export async function completeLiveTask(
  itemId: string,
  activeTimeEntryId?: string,
): Promise<ActionResult> {
  try {
    if (activeTimeEntryId) {
      await pauseLiveTask(activeTimeEntryId);
    }

    const item = await prisma.dailyPlanItem.findUnique({
      where: { id: itemId },
    });
    if (!item) return errorResult("Task not found.");

    await prisma.$transaction(async (tx) => {
      await tx.dailyPlanItem.update({
        where: { id: itemId },
        data: { status: "COMPLETED" },
      });

      if (item.taskId) {
        await tx.task.update({
          where: { id: item.taskId },
          data: { status: "DONE" },
        });
      }
    });

    await normalizeQueueOrder(item.date);
    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("completeLiveTask failed:", error);
    return errorResult("Failed to complete task.");
  }
}

export async function abandonLiveTask(
  itemId: string,
  action: "PUSH" | "SKIP",
): Promise<ActionResult> {
  try {
    const currentDate = getCurrentDateIST();
    const item = await prisma.dailyPlanItem.findUnique({
      where: { id: itemId },
    });
    if (!item) return errorResult("Task not found.");

    if (action === "SKIP") {
      await prisma.dailyPlanItem.update({
        where: { id: item.id },
        data: { status: "SKIPPED" },
      });
      if (item.taskId) {
        await prisma.task.update({
          where: { id: item.taskId },
          data: { status: "BACKLOG" },
        });
      }
    } else if (action === "PUSH") {
      await prisma.dailyPlanItem.update({
        where: { id: item.id },
        data: { status: "PUSHED_TOMORROW" },
      });

      const nextDay = new Date(currentDate);
      nextDay.setUTCDate(currentDate.getUTCDate() + 1);

      let tomorrowRecord = await prisma.dailyRecord.findUnique({
        where: { date: nextDay },
      });
      if (!tomorrowRecord) {
        tomorrowRecord = await prisma.dailyRecord.create({
          data: { date: nextDay, status: "PLANNING" },
        });
      }

      const tomorrowItems = await prisma.dailyPlanItem.findMany({
        where: { date: nextDay },
      });

      await prisma.dailyPlanItem.create({
        data: {
          date: nextDay,
          taskId: item.taskId,
          habitId: item.habitId,
          title: item.title,
          estimatedCycles: item.estimatedCycles,
          orderIndex: tomorrowItems.length,
          status: "TODO",
        },
      });
    }

    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("abandonLiveTask failed:", error);
    return errorResult("Failed to skip task.");
  }
}

export async function logPastEntry(formData: FormData): Promise<ActionResult> {
  try {
    const itemId = formData.get("itemId") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const note = formData.get("note") as string;

    if (!itemId) return errorResult("Invalid item ID.");
    if (!startTime || !endTime)
      return errorResult("Both start and end time are required.");

    const currentDate = getCurrentDateIST();
    const startDateTime = buildISTDateTime(currentDate, startTime);
    const endDateTime = buildISTDateTime(currentDate, endTime);

    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    const durationSeconds = Math.round(diffMs / 1000);

    if (durationSeconds <= 0) {
      return errorResult("End time must be after start time.");
    }

    const planItem = await prisma.dailyPlanItem.findUnique({
      where: { id: itemId },
    });
    if (!planItem) return errorResult("Queue item not found.");

    await prisma.$transaction([
      prisma.timeEntry.create({
        data: {
          planItemId: planItem.id,
          title: planItem.title,
          startedAt: startDateTime,
          endedAt: endDateTime,
          durationSeconds: durationSeconds,
          entryType: "MANUAL",
          notes: note || null,
        },
      }),
      prisma.dailyPlanItem.update({
        where: { id: planItem.id },
        data: { status: "COMPLETED" },
      }),
    ]);

    await normalizeQueueOrder(planItem.date);
    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("logPastEntry failed:", error);
    return errorResult("Failed to log past entry.");
  }
}

export async function updateTimeEntry(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const notes = formData.get("notes") as string;

    if (!startTime || !endTime)
      return errorResult("Both start and end time are required.");

    const entry = await prisma.timeEntry.findUnique({
      where: { id },
      include: { planItem: true },
    });
    if (!entry) return errorResult("Time entry not found.");

    const currentDate = getCurrentDateIST();
    const startDateTime = buildISTDateTime(currentDate, startTime);
    const endDateTime = buildISTDateTime(currentDate, endTime);

    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    const durationSeconds = Math.round(diffMs / 1000);

    if (durationSeconds <= 0) {
      return errorResult("End time must be after start time.");
    }

    await prisma.timeEntry.update({
      where: { id },
      data: {
        startedAt: startDateTime,
        endedAt: endDateTime,
        durationSeconds,
        notes: notes || null,
      },
    });

    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("updateTimeEntry failed:", error);
    return errorResult("Failed to update time entry.");
  }
}

export async function addAdhocLog(formData: FormData): Promise<ActionResult> {
  try {
    const title = formData.get("title") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const notes = formData.get("notes") as string;

    if (!title || title.trim() === "")
      return errorResult("Activity title cannot be empty.");
    if (!startTime || !endTime)
      return errorResult("Both start and end time are required.");

    const currentDate = getCurrentDateIST();
    const startDateTime = buildISTDateTime(currentDate, startTime);
    const endDateTime = buildISTDateTime(currentDate, endTime);

    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    const durationSeconds = Math.round(diffMs / 1000);

    if (durationSeconds <= 0) {
      return errorResult("End time must be after start time.");
    }

    await prisma.timeEntry.create({
      data: {
        planItemId: null,
        title: title.trim(),
        startedAt: startDateTime,
        endedAt: endDateTime,
        durationSeconds: durationSeconds,
        entryType: "MANUAL",
        notes: notes || null,
      },
    });

    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("addAdhocLog failed:", error);
    return errorResult("Failed to add activity.");
  }
}

export async function deleteTimeEntry(id: string): Promise<ActionResult> {
  try {
    if (!id) return errorResult("Invalid entry ID.");

    const entry = await prisma.timeEntry.findUnique({
      where: { id },
      include: { planItem: true },
    });

    if (!entry) return errorResult("Time entry not found.");

    const planItemId = entry.planItemId;
    const planItem = entry.planItem;

    await prisma.timeEntry.delete({ where: { id } });

    if (planItemId && planItem) {
      const remainingEntriesCount = await prisma.timeEntry.count({
        where: { planItemId },
      });

      if (remainingEntriesCount === 0) {
        if (!planItem.taskId && !planItem.habitId) {
          await prisma.dailyPlanItem.delete({ where: { id: planItemId } });
        } else {
          await prisma.dailyPlanItem.update({
            where: { id: planItemId },
            data: { status: "SKIPPED" },
          });

          if (planItem.taskId) {
            await prisma.task.update({
              where: { id: planItem.taskId },
              data: { status: "BACKLOG" },
            });
          }
        }
      }
    }

    revalidatePath("/daily-planner");
    return successResult();
  } catch (error) {
    console.error("deleteTimeEntry failed:", error);
    return errorResult("Failed to delete time entry.");
  }
}
