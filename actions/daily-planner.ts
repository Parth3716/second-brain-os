"use server";
import { prisma } from "@/lib/prisma_client"
import { revalidatePath } from "next/cache";
import { getCurrentDateIST, getCurrentDateTimeIST, convertToIST } from "@/lib/helpers";

//-----------------------------------------------------------
//---------------------DAILY RECORD--------------------------
//-----------------------------------------------------------
export async function initializeDailyRecordAndHabits() {
  const currentDate = getCurrentDateIST()

  let dailyRecord = await prisma.dailyRecord.findUnique({ where: { date: currentDate } });

  if (!dailyRecord) {
    dailyRecord = await prisma.dailyRecord.create({ data: { date: currentDate, status: "PLANNING" } });
    const currentDayOfWeek = currentDate.getDay(); 
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
      status: { in: ["PLANNING", "ACTIVE"] }
    },
    include: { items: true },
    orderBy: { date: 'asc' }
  });

  if (ghostRecords.length === 0) return;

  const tasksToRollover: any[] = [];

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
      where: { date: record.date },
      data: { status: "GHOSTED" }
    });
  }

  if (tasksToRollover.length > 0) {
    let todaysRecord = await prisma.dailyRecord.findUnique({ where: { date: currentDate } });
    if (!todaysRecord) {
      todaysRecord = await prisma.dailyRecord.create({ data: { date: currentDate, status: "PLANNING" } });
    }

    const todaysItemsCount = await prisma.dailyPlanItem.count({ where: { date: currentDate } });

    const newItems = tasksToRollover.map((task, index) => ({
      date: currentDate,
      taskId: task.taskId,
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
  const currentDate = getCurrentDateIST();

  await prisma.dailyRecord.update({
    where: { date: currentDate },
    data: { status: "ACTIVE" }
  });

  const firstTask = await prisma.dailyPlanItem.findFirst({
    where: { date: currentDate, status: "TODO" },
    orderBy: { orderIndex: "asc" }
  });

  if (firstTask) {
    const existingRunningTimer = await prisma.timeEntry.findFirst({
      where: { 
        planItem: { date: currentDate },
        endedAt: null 
      }
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

  revalidatePath("/daily-planner");
}

export async function takeDayOff() {
  const currentDate = getCurrentDateIST();

  await prisma.dailyRecord.update({
    where: { date: currentDate },
    data: { status: "REST_DAY" }
  });

  const items = await prisma.dailyPlanItem.findMany({ where: { date: currentDate } });
  
  for (const item of items) {
    if (item.taskId) {
      await prisma.task.update({ where: { id: item.taskId }, data: { status: "BACKLOG" } });
    }
  }

  await prisma.dailyPlanItem.updateMany({ 
    where: { date: currentDate, status: "TODO" },
    data: { status: "SKIPPED" }
  });

  revalidatePath("/daily-planner");
}

export async function endDay() {
  const currentDate = getCurrentDateIST();
  await prisma.dailyRecord.update({
    where: { date: currentDate },
    data: { status: "COMPLETED" }
  });

  revalidatePath("/daily-planner");
}

export async function wrapUpDayEarly(formData: FormData) {
  const currentDate = getCurrentDateIST();
  const journalNote = formData.get("journalNote") as string;

  const remainingItems = await prisma.dailyPlanItem.findMany({
    where: { date: currentDate, status: "TODO" }
  });

  await prisma.dailyRecord.update({
    where: { date: currentDate },
    data: { 
      status: "ENDED_EARLY",
      notes: journalNote || null
    }
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

      let tomorrowRecord = await prisma.dailyRecord.findUnique({ where: { date: nextDay } });
      if (!tomorrowRecord) {
        tomorrowRecord = await prisma.dailyRecord.create({ data: { date: nextDay, status: "PLANNING" } });
      }

      const tomorrowItems = await prisma.dailyPlanItem.findMany({ where: { date: nextDay } });
      await prisma.dailyPlanItem.create({
        data: {
          date: nextDay,
          taskId: item.taskId,
          habitId: item.habitId,
          title: item.title,
          estimatedCycles: item.estimatedCycles,
          orderIndex: tomorrowItems.length,
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
export async function addTaskToBacklog(formData: FormData) {
  const title = formData.get("title") as string;
  const scheduledDateStr = formData.get("scheduledDate") as string;
  
  if (!title || title.trim() === "") return;

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      status: scheduledDateStr ? "QUEUED" : "BACKLOG", 
    },
  });

  if (scheduledDateStr) {
    const scheduledDate = new Date(`${scheduledDateStr}T00:00:00.000Z`);
    let futureRecord = await prisma.dailyRecord.findUnique({ where: { date: scheduledDate } });
    if (!futureRecord) {
      futureRecord = await prisma.dailyRecord.create({ data: { date: scheduledDate, status: "PLANNING" } });
    }

    const futureItems = await prisma.dailyPlanItem.findMany({ where: { date: scheduledDate } });

    await prisma.dailyPlanItem.create({
      data: {
        date: scheduledDate,
        taskId: task.id,
        title: task.title,
        estimatedCycles: 1,
        originalCycles: 1,
        orderIndex: futureItems.length,
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
  
  revalidatePath("/daily-planner/backlog");
}

//-----------------------------------------------------------
//---------------------HABITS--------------------------------
//-----------------------------------------------------------
export async function addHabitToBacklog(formData: FormData) {
  const title = formData.get("title") as string;
  const cycles = parseInt(formData.get("cycles") as string) || 1;

  const daysOfWeekStrings = formData.getAll("daysOfWeek");
  let daysOfWeek = daysOfWeekStrings.map(day => parseInt(day as string));

  if (daysOfWeek.length === 0) {
    daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
  }

  if (!title || title.trim() === "") return;

  await prisma.habit.create({
    data: {
      title: title.trim(),
      defaultCycles: cycles,
      daysOfWeek: daysOfWeek,
    },
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
  const currentDate = getCurrentDateIST()

  const cyclesInput = formData.get("cycles");
  const estimatedCycles = cyclesInput ? parseInt(cyclesInput.toString(), 10) : 1;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  let dailyRecord = await prisma.dailyRecord.findUnique({ where: { date: currentDate } });
  if (!dailyRecord) dailyRecord = await prisma.dailyRecord.create({ data: { date: currentDate } });
  
  const activeCount = await prisma.dailyPlanItem.count({ 
    where: { date: currentDate, status: "TODO" } 
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
      }
    }),

    prisma.task.update({
      where: { id: taskId },
      data: { status: "QUEUED" }
    })
  ]);

  revalidatePath("/daily-planner");
}

export async function addHabitToQueue(habitId: string) {
  const currentDate = getCurrentDateIST()

  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit) return;

  let dailyRecord = await prisma.dailyRecord.findUnique({ where: { date: currentDate } });
  if (!dailyRecord) {
    dailyRecord = await prisma.dailyRecord.create({ data: { date: currentDate, status: "ACTIVE" } });
  }

  const activeCount = await prisma.dailyPlanItem.count({ 
    where: { date: currentDate, status: "TODO" } 
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
    }
  });

  revalidatePath("/daily-planner");
}

export async function removeItemFromQueue(itemId: string) {
  const queuedItem = await prisma.dailyPlanItem.findUnique({ 
    where: { id: itemId } 
  });
  
  if (!queuedItem) return;

  await prisma.$transaction(async (tx) => {
    if (queuedItem.taskId) {
      await tx.task.update({
        where: { id: queuedItem.taskId },
        data: { status: "BACKLOG" }
      });
    }

    await tx.dailyPlanItem.delete({
      where: { id: itemId }
    });
  });

  await normalizeQueueOrder(queuedItem.date);
  revalidatePath("/daily-planner");
}

export async function updateQueueItem(formData: FormData) {
  const itemId = formData.get("itemId") as string;
  const title = formData.get("title") as string;
  const cycles = parseInt(formData.get("cycles") as string, 10);

  if (!itemId || !title || isNaN(cycles)) return;

  const item = await prisma.dailyPlanItem.findUnique({ where: { id: itemId } });
  if (!item) return;

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

  await prisma.$transaction(transaction);
  revalidatePath("/daily-planner");
}

export async function moveItemUpInQueue(itemId: string) {
  const item = await prisma.dailyPlanItem.findUnique({ where: { id: itemId } });
  if (!item) return;

  const itemAbove = await prisma.dailyPlanItem.findFirst({
    where: { date: item.date, orderIndex: { lt: item.orderIndex } },
    orderBy: { orderIndex: 'desc' }
  });

  if (itemAbove) {
    await prisma.$transaction([
      prisma.dailyPlanItem.update({ where: { id: item.id }, data: { orderIndex: itemAbove.orderIndex } }),
      prisma.dailyPlanItem.update({ where: { id: itemAbove.id }, data: { orderIndex: item.orderIndex } })
    ]);
    revalidatePath("/daily-planner");
  }
}

export async function moveItemDownInQueue(itemId: string) {
  const item = await prisma.dailyPlanItem.findUnique({ where: { id: itemId } });
  if (!item) return;

  const itemBelow = await prisma.dailyPlanItem.findFirst({
    where: { date: item.date, orderIndex: { gt: item.orderIndex } },
    orderBy: { orderIndex: 'asc' }
  });

  if (itemBelow) {
    await prisma.$transaction([
      prisma.dailyPlanItem.update({ where: { id: item.id }, data: { orderIndex: itemBelow.orderIndex } }),
      prisma.dailyPlanItem.update({ where: { id: itemBelow.id }, data: { orderIndex: item.orderIndex } })
    ]);
    revalidatePath("/daily-planner");
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

async function normalizeQueueOrder(date: Date) {
  const activeItems = await prisma.dailyPlanItem.findMany({
    where: { date: date, status: "TODO" },
    orderBy: { orderIndex: "asc" }
  });

  const transactions = activeItems.map((item, index) => 
    prisma.dailyPlanItem.update({
      where: { id: item.id },
      data: { orderIndex: index }
    })
  );

  await prisma.$transaction(transactions);
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

  const currentDate = getCurrentDateIST().toISOString().split('T')[0];
  const startDateTime = convertToIST(`${currentDate}T${startTime}:00`);
  const endDateTime = convertToIST(`${currentDate}T${endTime}:00`);

  const diffMs = endDateTime.getTime() - startDateTime.getTime();
  const durationSeconds = Math.round(diffMs / 1000);

  if (durationSeconds <= 0) return { error: "End time must be after start time." };

  const planItem = await prisma.dailyPlanItem.findUnique({ where: { id: itemId } });
  if (!planItem) return;

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
      }
    }),
    prisma.dailyPlanItem.update({
      where: { id: planItem.id },
      data: { status: "COMPLETED" }
    })
  ]);

  await normalizeQueueOrder(planItem.date);

  revalidatePath("/daily-planner");
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
  await normalizeQueueOrder(item.date);
  revalidatePath("/daily-planner");
}

export async function abandonLiveTask(itemId: string, action: "PUSH" | "SKIP") {
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
    
    const nextDay = currentDate;
    nextDay.setDate(currentDate.getDate() + 1);
    
    let tomorrowRecord = await prisma.dailyRecord.findUnique({ where: { date: nextDay } });
    if (!tomorrowRecord) tomorrowRecord = await prisma.dailyRecord.create({ data: { date: nextDay, status: "PLANNING" } });
    
    const tomorrowItems = await prisma.dailyPlanItem.findMany({ where: { date: nextDay } });
    await prisma.dailyPlanItem.create({
      data: {
        date: nextDay,
        taskId: item.taskId,
        habitId: item.habitId,
        title: item.title,
        estimatedCycles: item.estimatedCycles,
        orderIndex: tomorrowItems.length,
        status: "TODO"
      }
    });
  }

  revalidatePath("/daily-planner");
}