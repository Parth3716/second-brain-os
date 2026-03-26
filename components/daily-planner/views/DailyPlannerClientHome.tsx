"use client";

import { useState } from "react";
import PlanningView from "./PlanningView";
import RestDayView from "./RestDayView";
import type { DailyRecord } from "@/types/daily_planner";

interface DailyPlannerClientHomeProps {
  initalStatus: string
  dailyRecord: DailyRecord
}

function DailyPlannerClientHome({initalStatus, dailyRecord}: DailyPlannerClientHomeProps) {
    const [status, setStatus] = useState(initalStatus)

    if (status === "PLANNING") {
          return (
              <PlanningView
                setStatus={setStatus}
                dailyRecord={dailyRecord}
              />
          );
    }

    if (status === "REST_DAY") {
      return <RestDayView />;
    }

    return <div className="text-white p-10">Unknown State: {status}</div>;
}

export default DailyPlannerClientHome