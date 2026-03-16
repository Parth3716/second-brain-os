"use server";
import { prisma } from "../lib/prisma_client";
import { revalidatePath } from "next/cache";
import { getCurrentDateIST } from "@/lib/helpers";

// 2. Move Item UP
export async function moveItemUp(itemId: string) {
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

// 3. Move Item DOWN
export async function moveItemDown(itemId: string) {
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

//-----------------------------------------------------------
//---------------------INITIAL SETUP-------------------------
//-----------------------------------------------------------
export async function initializeDailyRecordAndHabits() {
  const currentDate = getCurrentDateIST()

  let dailyRecord = await prisma.dailyRecord.findUnique({ where: { date: currentDate } });

  if (!dailyRecord) {
    dailyRecord = await prisma.dailyRecord.create({ data: { date: currentDate, status: "ACTIVE" } });
    const currentDayOfWeek = new Date(currentDate).getDay(); 
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
          orderIndex: index,
          status: "TODO",
        })),
      });
    }
  }
}

//-----------------------------------------------------------
//---------------------TASKS---------------------------------
//-----------------------------------------------------------
export async function addTaskToBacklog(formData: FormData) {
  const title = formData.get("title") as string;
  
  if (!title || title.trim() === "") return;

  await prisma.task.create({
    data: {
      title: title.trim(),
      status: "BACKLOG", 
    },
  });

  revalidatePath("/daily-planner/backlog");
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
//---------------------DAILY QUEUE---------------------------
//-----------------------------------------------------------
export async function addTaskToQueue(taskId: string, formData: FormData) {
  const currentDate = getCurrentDateIST()

  const cyclesInput = formData.get("cycles");
  const estimatedCycles = cyclesInput ? parseInt(cyclesInput.toString(), 10) : 1;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  let dailyRecord = await prisma.dailyRecord.findUnique({ where: { date: currentDate } });
  if (!dailyRecord) dailyRecord = await prisma.dailyRecord.create({ data: { date: currentDate } });

  const existingItems = await prisma.dailyPlanItem.findMany({ where: { date: currentDate } });
  
  await prisma.$transaction([
    prisma.dailyPlanItem.create({
      data: {
        date: currentDate,
        taskId: task.id,
        title: task.title,
        estimatedCycles: estimatedCycles,
        orderIndex: existingItems.length,
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

  const existingItems = await prisma.dailyPlanItem.findMany({ where: { date: currentDate } });
  const nextIndex = existingItems.length;

  await prisma.dailyPlanItem.create({
    data: {
      date: currentDate,
      habitId: habit.id,
      title: habit.title,
      estimatedCycles: habit.defaultCycles,
      orderIndex: nextIndex,
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

  revalidatePath("/daily-planner");
}