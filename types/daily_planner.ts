// ============================================
// STATUS ENUMS
// ============================================

export type DayStatus =
  | "PLANNING"
  | "ACTIVE"
  | "COMPLETED"
  | "ENDED_EARLY"
  | "REST_DAY"
  | "GHOSTED";

export type ItemStatus =
  | "TODO"
  | "COMPLETED"
  | "SKIPPED"
  | "PUSHED_TOMORROW";

export type TaskStatus =
  | "BACKLOG"
  | "QUEUED"
  | "DONE";

export type EntryType = "LIVE_TRACKED" | "MANUAL";

// ============================================
// CORE MODELS
// ============================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  userId: string;
  dailyItems?: DailyPlanItem[];
}

export interface Habit {
  id: string;
  title: string;
  defaultCycles: number;
  daysOfWeek: number[];
  userId: string;
  dailyItems?: DailyPlanItem[];
}

export interface DailyRecord {
  date: Date;
  status: string;
  notes: string | null;
  userId: string;
  items: DailyPlanItem[];
}

export interface DailyPlanItem {
  id: string;
  date: Date;
  userId: string;
  taskId: string | null;
  habitId: string | null;
  title: string;
  orderIndex: number;
  estimatedCycles: number;
  originalCycles: number | null;
  status: string;
  timeEntries?: TimeEntry[];
  task?: Task | null;
  habit?: Habit | null;
}

export interface TimeEntry {
  id: string;
  planItemId: string | null;
  title: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  entryType: string;
  notes: string | null;
  planItem?: DailyPlanItem | null;
}

// ============================================
// ANALYTICS
// ============================================
export interface ChartDataPoint {
  label: string;
  fullDate: string;
  hours: number;
  seconds?: number;
}

export interface AnalyticsStats {
  totalHours: string;
  livePercent: number;
  adhocPercent: number;
  completionRate: number;
  estimationAccuracy: number;
  chartData: ChartDataPoint[];
}