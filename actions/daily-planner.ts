"use server";
import { prisma } from "@/lib/prisma_client"
import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/auth";
import { getCurrentDateIST, getISTDayOfWeek, getCurrentDateTimeIST, buildISTDateTime } from "@/lib/helpers";

//-----------------------------------------------------------
//---------------------DAILY RECORD--------------------------
//-----------------------------------------------------------
export async function initializeDailyRecordAndHabits() {
  const userId = await getUserId();
  const currentDate = getCurrentDateIST()

  await prisma.dailyRecord.upsert({ where: {date_userId: { date: currentDate, userId } }, create: { date: currentDate, userId, status: "PLANNING" }, update: {} })

  const currentDayOfWeek = getISTDayOfWeek();
  const todaysHabits = await prisma.habit.findMany({
    where: { userId, daysOfWeek: { has: currentDayOfWeek } },
  });

  if (todaysHabits.length > 0) {
    await prisma.dailyPlanItem.createMany({
      data: todaysHabits.map((habit, index) => ({
        date: currentDate,
        userId,
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

export interface RolloverTask {
  taskId: string | null;
  title: string;
  estimatedCycles: number;
  originalCycles: number | null;
}

export async function cleanupGhostDays() {
  const userId = await getUserId();
  const currentDate = getCurrentDateIST();

  const ghostCount = await prisma.dailyRecord.count({
    where: {
      userId,
      date: { lt: currentDate },
      status: { in: ["PLANNING", "ACTIVE"] },
    },
  });

  if (ghostCount === 0) return;

  const ghostRecords = await prisma.dailyRecord.findMany({
    where: {
      userId,
      date: { lt: currentDate },
      status: { in: ["PLANNING", "ACTIVE"] },
    },
    include: { items: true },
    orderBy: { date: "asc" },
  });

  const tasksToRollover: RolloverTask[] = [];

  for (const record of ghostRecords) {
    await prisma.timeEntry.deleteMany({
      where: { 
        planItem: { date: record.date },
        endedAt: null
      }
    });

    for (const item of record.items) {
      if (item.status === "TODO") {
        if (item.taskId) {
          await prisma.dailyPlanItem.update({
            where: { id: item.id },
            data: { status: "PUSHED_TOMORROW" }
          });

          await prisma.task.update({
            where: { id: item.taskId },
            data: { status: "QUEUED" }
          });

          tasksToRollover.push({
            taskId: item.taskId,
            title: item.title,
            estimatedCycles: item.estimatedCycles,
            originalCycles: item.originalCycles
          });
        } 

        else if (item.habitId) {
          await prisma.dailyPlanItem.update({
            where: { id: item.id },
            data: { status: "SKIPPED" }
          });
        }
      }
    }

    await prisma.dailyRecord.update({
      where: { date_userId: { date: record.date, userId } },
      data: { status: "GHOSTED" }
    });
  }

  if (tasksToRollover.length > 0) {
    await prisma.dailyRecord.upsert({ where: {date_userId: { date: currentDate, userId } }, create: { date: currentDate, userId, status: "PLANNING" }, update: {} })

    const todaysItemsCount = await prisma.dailyPlanItem.count({ where: { date: currentDate, userId } });

    const newItems = tasksToRollover.map((task, index) => ({
      date: currentDate,
      taskId: task.taskId,
      userId,
      title: task.title,
      estimatedCycles: task.estimatedCycles,
      originalCycles: task.originalCycles,
      orderIndex: todaysItemsCount + index,
      status: "TODO"
    }));

    await prisma.dailyPlanItem.createMany({
      data: newItems
    });
  }
}

export async function startDay() {
  const userId = await getUserId();
  const currentDate = getCurrentDateIST();

  await prisma.dailyRecord.update({
    where: { date_userId: { date: currentDate, userId } },
    data: { status: "ACTIVE" }
  });

  const firstTask = await prisma.dailyPlanItem.findFirst({
    where: { date: currentDate, userId, status: "TODO" },
    orderBy: { orderIndex: "asc" }
  });

  if (firstTask) {
    const existingRunningTimer = await prisma.timeEntry.findFirst({
      where: { planItem: { date: currentDate, userId }, endedAt: null },
    });

    if (!existingRunningTimer) {
      await prisma.timeEntry.create({
        data: {
          planItemId: firstTask.id,
          title: firstTask.title,
          startedAt: getCurrentDateTimeIST(),
          entryType: "LIVE_TRACKED",
        }
      });
    }
  }
}

export async function takeDayOff() {
  const userId = await getUserId();
  const currentDate = getCurrentDateIST();

  await prisma.dailyRecord.update({
    where: { date_userId: { date: currentDate, userId } },
    data: { status: "REST_DAY" }
  });

  const items = await prisma.dailyPlanItem.findMany({
      where: { date: currentDate, userId },
  });
  
  for (const item of items) {
    if (item.taskId) {
      await prisma.task.update({ where: { id: item.taskId }, data: { status: "BACKLOG" } });
    }
  }

  await prisma.dailyPlanItem.updateMany({
    where: { date: currentDate, userId, status: "TODO" },
    data: { status: "SKIPPED" },
  });

  revalidatePath("/daily-planner");
}

export async function endDay() {
  const userId = await getUserId();
  const currentDate = getCurrentDateIST();

  await prisma.dailyRecord.update({
    where: { date_userId: { date: currentDate, userId } },
    data: { status: "COMPLETED" },
  });

  revalidatePath("/daily-planner");
}

export async function wrapUpDayEarly(formData: FormData) {
  const userId = await getUserId();
  const currentDate = getCurrentDateIST();
  const journalNote = formData.get("journalNote") as string;

  const remainingItems = await prisma.dailyPlanItem.findMany({
      where: { date: currentDate, userId, status: "TODO" },
  });

  await prisma.dailyRecord.update({
    where: { date_userId: { date: currentDate, userId } },
    data: { status: "ENDED_EARLY", notes: journalNote || null },
  });

  for (const item of remainingItems) {
    const action = formData.get(`action_${item.id}`);

    if (action === "SKIP") {
      await prisma.dailyPlanItem.update({
        where: { id: item.id },
        data: { status: "SKIPPED" }
      });

      if (item.taskId) {
        await prisma.task.update({
          where: { id: item.taskId },
          data: { status: "BACKLOG" }
        });
      }
    }
    
    else if (action === "PUSH") {
      await prisma.dailyPlanItem.update({
        where: { id: item.id },
        data: { status: "PUSHED_TOMORROW" }
      });

      const nextDay = currentDate;
      nextDay.setDate(currentDate.getDate() + 1);

      await prisma.dailyRecord.upsert({ where: {date_userId: { date: nextDay, userId } }, create: { date: nextDay, userId, status: "PLANNING" }, update: {} })

      const tomorrowCount = await prisma.dailyPlanItem.count({
        where: { date: nextDay, userId },
      });

      await prisma.dailyPlanItem.create({
        data: {
          date: nextDay,
          userId,
          taskId: item.taskId,
          habitId: item.habitId,
          title: item.title,
          estimatedCycles: item.estimatedCycles,
          orderIndex: tomorrowCount,
          status: "TODO"
        }
      });
    }
  }

  revalidatePath("/daily-planner");
}

//-----------------------------------------------------------
//---------------------TASKS---------------------------------
//-----------------------------------------------------------
export async function getCurrentBacklogTasks() {
  const userId = await getUserId();
  const today = getCurrentDateIST();
  const backlogTasks = await prisma.task.findMany({
    where: {
      userId,
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
  
  return backlogTasks
}

export async function addTaskToBacklog(formData: FormData) {
  const userId = await getUserId();
  const title = formData.get("title") as string;
  const scheduledDateStr = formData.get("scheduledDate") as string;
  
  if (!title || title.trim() === "") return;

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      userId,
      status: scheduledDateStr ? "QUEUED" : "BACKLOG", 
    },
  });

  if (scheduledDateStr) {
    const scheduledDate = new Date(`${scheduledDateStr}T00:00:00.000Z`);
    await prisma.dailyRecord.upsert({ where: {date_userId: { date: scheduledDate, userId } }, create: { date: scheduledDate, userId, status: "PLANNING" }, update: {} })

    const futureCount = await prisma.dailyPlanItem.count({
      where: { date: scheduledDate, userId },
    });

    await prisma.dailyPlanItem.create({
      data: {
        date: scheduledDate,
        userId,
        taskId: task.id,
        title: task.title,
        estimatedCycles: 1,
        originalCycles: 1,
        orderIndex: futureCount,
        status: "TODO",
      }
    });
  }

  revalidatePath("/daily-planner/manage");
  revalidatePath("/daily-planner");
}

export async function deleteTaskFromBacklog(id: string) {
  await prisma.task.delete({
    where: { id },
  });
  
  revalidatePath("/daily-planner/manage");
}

//-----------------------------------------------------------
//---------------------HABITS--------------------------------
//-----------------------------------------------------------
export async function getUserHabits() {
  const userId = await getUserId();
  const habits = await prisma.habit.findMany({ where: { userId }, orderBy: { title: "asc" } });
  
  return habits
}

export async function addHabitToBacklog(formData: FormData) {
  const userId = await getUserId();
  const title = formData.get("title") as string;
  const cycles = parseInt(formData.get("cycles") as string) || 1;

  const daysOfWeekStrings = formData.getAll("daysOfWeek");
  let daysOfWeek = daysOfWeekStrings.map(day => parseInt(day as string));

  if (daysOfWeek.length === 0) {
    daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
  }

  if (!title || title.trim() === "") return;

  await prisma.habit.create({
    data: { title: title.trim(), defaultCycles: cycles, daysOfWeek, userId },
  });
  
  revalidatePath("/daily-planner/manage");
  revalidatePath("/daily-planner");
}

export async function deleteHabitFromBacklog(id: string) {
  await prisma.habit.delete({ 
    where: { id } 
  });

  revalidatePath("/daily-planner/manage");
  revalidatePath("/daily-planner");
}

//-----------------------------------------------------------
//---------------------DAILY PLAN ITEM-----------------------
//-----------------------------------------------------------
export async function addTaskToQueue(taskId: string, formData: FormData) {
  const userId = await getUserId();
  const currentDate = getCurrentDateIST()

  const cyclesInput = formData.get("cycles");
  const estimatedCycles = cyclesInput ? parseInt(cyclesInput.toString(), 10) : 1;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  await prisma.dailyRecord.upsert({ where: {date_userId: { date: currentDate, userId } }, create: { date: currentDate, userId, status: "PLANNING" }, update: {} })
  
  const activeCount = await prisma.dailyPlanItem.count({ 
    where: { date: currentDate, userId, status: "TODO" } 
  });

  const result = await prisma.$transaction([
    prisma.dailyPlanItem.create({
      data: {
        date: currentDate,
        userId,
        taskId: task.id,
        title: task.title,
        estimatedCycles: estimatedCycles,
        originalCycles: estimatedCycles,
        orderIndex: activeCount,
      }
    }),

    prisma.task.update({
      where: { id: taskId },
      data: { status: "QUEUED" }
    })
  ]);

  return {
    newDailyPlanItem: result[0],
    updatedTask: result[1]
  }
}

export async function addHabitToQueue(habitId: string) {
  const userId = await getUserId();
  const currentDate = getCurrentDateIST()

  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit) return;

  await prisma.dailyRecord.upsert({ where: {date_userId: { date: currentDate, userId } }, create: { date: currentDate, userId, status: "PLANNING" }, update: {} })

  const activeCount = await prisma.dailyPlanItem.count({ 
    where: { date: currentDate, userId, status: "TODO" } 
  });

  const newDailyPlanItem = await prisma.dailyPlanItem.create({
    data: {
      date: currentDate,
      userId,
      habitId: habit.id,
      title: habit.title,
      estimatedCycles: habit.defaultCycles,
      originalCycles: habit.defaultCycles,
      orderIndex: activeCount,
      status: "TODO",
    }
  });

  return newDailyPlanItem
}

export async function removeItemFromQueue(itemId: string) {
  const queuedItem = await prisma.dailyPlanItem.findUnique({ 
    where: { id: itemId } 
  });
  
  if (!queuedItem) return;

  let transactions = [
    prisma.dailyPlanItem.delete({
      where: { id: itemId }
    })
  ]

  if (queuedItem.taskId) {
    transactions.push(
      prisma.task.update({
        where: { id: queuedItem.taskId },
        data: { status: "BACKLOG" }
      }) as any
    )
  }

  const result = await prisma.$transaction(transactions);

  await normalizeQueueOrder(queuedItem.date, queuedItem.userId);
  return {
    updatedDailyPlanItem: result[0],
    updatedTask: result[1] ?? null
  }
}

export async function updateQueueItem(formData: FormData) {
  const itemId = formData.get("itemId") as string;
  const title = formData.get("title") as string;
  const cycles = parseInt(formData.get("cycles") as string, 10);

  if (!itemId || !title || isNaN(cycles)) return;

  const item = await prisma.dailyPlanItem.findUnique({ where: { id: itemId } });
  if (!item) return;
  const previousEstimatedCycles = item.estimatedCycles

  const transaction = [];

  transaction.push(
    prisma.dailyPlanItem.update({
      where: { id: itemId },
      data: { 
        title: title.trim(), 
        estimatedCycles: cycles,
        originalCycles: cycles
      }
    }) as any
  );

  if (item.taskId) {
    transaction.push(
      prisma.task.update({
        where: { id: item.taskId },
        data: { title: title.trim() }
      }) as any
    );
  }

  const result = await prisma.$transaction(transaction);
  return {
    updatedDailyPlanItem: result[0],
    updatedTask: result[1] ?? null,
    previousEstimatedCylces: previousEstimatedCycles
  }
}

export async function moveItemUpInQueue(itemId: string) {
  const item = await prisma.dailyPlanItem.findUnique({ where: { id: itemId } });
  if (!item) return;

  const itemAbove = await prisma.dailyPlanItem.findFirst({
    where: { date: item.date, userId: item.userId, orderIndex: { lt: item.orderIndex } },
    orderBy: { orderIndex: 'desc' }
  });

  if (itemAbove) {
    const result = await prisma.$transaction([
      prisma.dailyPlanItem.update({ where: { id: item.id }, data: { orderIndex: itemAbove.orderIndex } }),
      prisma.dailyPlanItem.update({ where: { id: itemAbove.id }, data: { orderIndex: item.orderIndex } })
    ]);
    return {
      updatedDailyPlanItem: result[0],
      updatedDailyPlanItemAdjacent: result[1]
    };
  }
}

export async function moveItemDownInQueue(itemId: string) {
  const item = await prisma.dailyPlanItem.findUnique({ where: { id: itemId } });
  if (!item) return;

  const itemBelow = await prisma.dailyPlanItem.findFirst({
    where: { date: item.date, userId: item.userId, orderIndex: { gt: item.orderIndex } },
    orderBy: { orderIndex: 'asc' }
  });

  if (itemBelow) {
    const result = await prisma.$transaction([
      prisma.dailyPlanItem.update({ where: { id: item.id }, data: { orderIndex: itemBelow.orderIndex } }),
      prisma.dailyPlanItem.update({ where: { id: itemBelow.id }, data: { orderIndex: item.orderIndex } })
    ]);
    return {
      updatedDailyPlanItem: result[0],
      updatedDailyPlanItemAdjacent: result[1]
    };
  }
}

export async function addCycleToItem(itemId: string) {
  const item = await prisma.dailyPlanItem.findUnique({ where: { id: itemId } });
  if (!item) return;

  await prisma.dailyPlanItem.update({
    where: { id: itemId },
    data: { estimatedCycles: item.estimatedCycles + 1 }
  });

  revalidatePath("/daily-planner");
}

//-----------------------------------------------------------
//---------------------TIME ENTRY----------------------------
//-----------------------------------------------------------
export async function logPastEntry(formData: FormData) {
  const itemId = formData.get("itemId") as string;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const note = formData.get("note") as string;

  if (!itemId || !startTime || !endTime) return;

  const currentDate = getCurrentDateIST();
  const startDateTime = buildISTDateTime(currentDate, startTime);
  const endDateTime = buildISTDateTime(currentDate, endTime);

  const diffMs = endDateTime.getTime() - startDateTime.getTime();
  const durationSeconds = Math.round(diffMs / 1000);

  if (durationSeconds <= 0) return;

  const planItem = await prisma.dailyPlanItem.findUnique({ where: { id: itemId } });
  if (!planItem) return;

  const result = await prisma.$transaction([
    prisma.timeEntry.create({
      data: {
        planItemId: planItem.id,
        title: planItem.title,
        startedAt: startDateTime,
        endedAt: endDateTime,
        durationSeconds: durationSeconds,
        entryType: "MANUAL",
        notes: note || null,
      }
    }),
    prisma.dailyPlanItem.update({
      where: { id: planItem.id },
      data: { status: "COMPLETED" }
    })
  ]);

  await normalizeQueueOrder(planItem.date, planItem.userId);
  const updatedDailyPlanItem = result[1]
  return updatedDailyPlanItem
}

export async function startLiveTask(itemId: string) {
  const item = await prisma.dailyPlanItem.findUnique({ where: { id: itemId } });
  if (!item) return;

  await prisma.timeEntry.create({
    data: {
      planItemId: item.id,
      title: item.title,
      startedAt: getCurrentDateTimeIST(),
      entryType: "LIVE_TRACKED",
    }
  });

  revalidatePath("/daily-planner");
}

export async function pauseLiveTask(timeEntryId: string) {
  const existingEntry = await prisma.timeEntry.findUnique({ where: { id: timeEntryId } });
  if (!existingEntry || existingEntry.endedAt) return;

  const endedAt = getCurrentDateTimeIST();
  const diffSeconds = Math.round((endedAt.getTime() - existingEntry.startedAt.getTime()) / 1000);

  await prisma.timeEntry.update({
    where: { id: timeEntryId },
    data: { 
      endedAt: endedAt,
      durationSeconds: diffSeconds 
    }
  });

  revalidatePath("/daily-planner");
}

export async function completeLiveTask(itemId: string, activeTimeEntryId?: string) {
  if (activeTimeEntryId) {
    await pauseLiveTask(activeTimeEntryId);
  }

  const item = await prisma.dailyPlanItem.findUnique({ where: { id: itemId } });
  if (!item) return;

  const transaction = [
    prisma.dailyPlanItem.update({
      where: { id: itemId },
      data: { status: "COMPLETED" }
    })
  ];

  if (item.taskId) {
    transaction.push(
      prisma.task.update({
        where: { id: item.taskId },
        data: { status: "DONE" }
      }) as any
    );
  }

  await prisma.$transaction(transaction);
  await normalizeQueueOrder(item.date, item.userId);
  revalidatePath("/daily-planner");
}

export async function abandonLiveTask(itemId: string, action: "PUSH" | "SKIP") {
  const userId = await getUserId();
  const currentDate = getCurrentDateIST();
  const item = await prisma.dailyPlanItem.findUnique({ where: { id: itemId } });
  if (!item) return;

  if (action === "SKIP") {
    await prisma.dailyPlanItem.update({ where: { id: item.id }, data: { status: "SKIPPED" } });
    if (item.taskId) {
      await prisma.task.update({ where: { id: item.taskId }, data: { status: "BACKLOG" } });
    }
  } 
  else if (action === "PUSH") {
    await prisma.dailyPlanItem.update({ where: { id: item.id }, data: { status: "PUSHED_TOMORROW" } });
    
    const nextDay = new Date(currentDate);
    nextDay.setUTCDate(currentDate.getUTCDate() + 1);

    await prisma.dailyRecord.upsert({ where: {date_userId: { date: nextDay, userId } }, create: { date: nextDay, userId, status: "PLANNING" }, update: {} })
    
    const tomorrowCount = await prisma.dailyPlanItem.count({
      where: { date: nextDay, userId },
    });

    await prisma.dailyPlanItem.create({
      data: {
        date: nextDay,
        userId,
        taskId: item.taskId,
        habitId: item.habitId,
        title: item.title,
        estimatedCycles: item.estimatedCycles,
        orderIndex: tomorrowCount,
        status: "TODO"
      }
    });
  }

  revalidatePath("/daily-planner");
}

export async function updateTimeEntry(id: string, formData: FormData) {
  const currentDate = getCurrentDateIST()
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const notes = formData.get("notes") as string;

  const entry = await prisma.timeEntry.findUnique({ where: { id }, include: { planItem: true } });
  if (!entry || !entry.planItem) return;

  const currentDateStr = currentDate.toISOString().split('T')[0];
  const startDateTime = buildISTDateTime(currentDate, startTime);
  const endDateTime = buildISTDateTime(currentDate, endTime);
  
  const diffMs = endDateTime.getTime() - startDateTime.getTime();
  const durationSeconds = Math.round(diffMs / 1000);

  if (durationSeconds <= 0) return { error: "End time must be after start time." };

  await prisma.timeEntry.update({
    where: { id },
    data: { startedAt: startDateTime, endedAt: endDateTime, durationSeconds, notes: notes || null }
  });
  revalidatePath("/daily-planner");
}

export async function addAdhocLog(formData: FormData) {
  const currentDate = getCurrentDateIST()
  const title = formData.get("title") as string;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const notes = formData.get("notes") as string;

  if (!title || !startTime || !endTime) return;

  const startDateTime = buildISTDateTime(currentDate, startTime);
  const endDateTime = buildISTDateTime(currentDate, endTime);

  const diffMs = endDateTime.getTime() - startDateTime.getTime();
  const durationSeconds = Math.round(diffMs / 1000);

  if (durationSeconds <= 0) return { error: "End time must be after start time." };

  await prisma.timeEntry.create({
    data: {
      planItemId: null,
      title: title,
      startedAt: startDateTime,
      endedAt: endDateTime,
      durationSeconds: durationSeconds,
      entryType: "MANUAL",
      notes: notes || null,
    }
  });

  revalidatePath("/daily-planner");
}

export async function deleteTimeEntry(id: string) {
  const entry = await prisma.timeEntry.findUnique({ 
    where: { id },
    include: { planItem: true }
  });
  
  if (!entry) return;

  const planItemId = entry.planItemId;
  const planItem = entry.planItem;

  await prisma.timeEntry.delete({ where: { id } });

  if (planItemId && planItem) {
    const remainingEntriesCount = await prisma.timeEntry.count({
      where: { planItemId }
    });

    if (remainingEntriesCount === 0) {
      if (!planItem.taskId && !planItem.habitId) {
        await prisma.dailyPlanItem.delete({ where: { id: planItemId } });
      } 
      else {
        await prisma.dailyPlanItem.update({
          where: { id: planItemId },
          data: { status: "SKIPPED" }
        });

        if (planItem.taskId) {
          await prisma.task.update({
            where: { id: planItem.taskId },
            data: { status: "BACKLOG" }
          });
        }
      }
    }
  }

  revalidatePath("/daily-planner");
}

//-----------------------------------------------------------
//---------------------TIME ENTRY----------------------------
//-----------------------------------------------------------
async function normalizeQueueOrder(date: Date, userId: string) {
  const activeItems = await prisma.dailyPlanItem.findMany({
    where: { date: date, userId, status: "TODO" },
    orderBy: { orderIndex: "asc" }
  });

  if (activeItems.length === 0) return;

  await prisma.$transaction(
    activeItems.map((item, index) =>
      prisma.dailyPlanItem.update({
        where: { id: item.id },
        data: { orderIndex: index },
      })
    )
  );
}