"use client";

import { useState } from "react";
import PlanningView from "./PlanningView";
import HUDView from "@/components/daily-planner/views/HUDView"
import RestDayView from "./RestDayView";
import type { DailyRecord } from "@/types/daily_planner";

function DailyPlannerClientHome({initalStatus, dailyRecord}: {initalStatus: string, dailyRecord: DailyRecord}) {
    const [status, setStatus] = useState<string>(initalStatus);

    if (status === "PLANNING") {
          return (
              <PlanningView
                setStatus={setStatus}
                dailyRecord={dailyRecord}
              />
          );
    }

    if (status === "ACTIVE") {
          return (
              <HUDView
                setStatus={setStatus}
              />
          );
    }

    if (status === "REST_DAY") {
      return <RestDayView />;
    }

    return <div className="text-white p-10">Unknown State: {status}</div>;
}

export default DailyPlannerClientHome