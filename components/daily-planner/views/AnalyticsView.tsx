"use client";

import { motion, Variants } from "framer-motion";
import {
  ArrowLeft,
  Activity,
  Clock,
  Target,
  Zap,
  BrainCircuit,
  Flame,
  CalendarOff,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import type { AnalyticsStats, ChartDataPoint } from "@/types/daily-planner";

export default function AnalyticsView({ stats }: { stats: AnalyticsStats }) {
  const containerVars: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVars: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  // Chart math to calculate the heights of the bars dynamically
  const maxHours =
    stats.chartData.length > 0
      ? Math.max(...stats.chartData.map((d) => d.hours))
      : 1;

  return (
    <main className="min-h-screen bg-[#030712] relative flex justify-center p-4 md:p-12 overflow-hidden selection:bg-indigo-500/30">
      {/* Ambient Execution Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[90rem] relative z-10 px-0 sm:px-4 xl:px-10 flex flex-col space-y-10">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-6 gap-4">
          <div className="space-y-1">
            <Link
              href="/daily-planner"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-2 mb-4 group w-max"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />{" "}
              Return to Today
            </Link>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 flex items-center gap-4">
              <Activity className="w-10 h-10 text-indigo-400" /> OS Analytics
            </h1>
          </div>
        </header>

        <motion.div
          variants={containerVars}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12"
        >
          {/* =========================================
              LEFT COLUMN: HERO METRICS
          ========================================= */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Total Focus Hero */}
            <motion.div
              variants={itemVars}
              className="bg-gradient-to-br from-indigo-900/40 to-[#0c1222] border border-indigo-500/20 rounded-3xl p-8 shadow-[0_0_50px_rgba(99,102,241,0.1)] flex flex-col"
            >
              <span className="text-indigo-400 font-bold tracking-widest uppercase text-xs mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Lifetime Focus
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-extrabold text-white tracking-tighter">
                  {stats.totalHours}
                </span>
                <span className="text-xl text-slate-400 font-medium">hrs</span>
              </div>
              <p className="text-slate-400 text-sm mt-4">
                Total time logged across all projects, habits, and ad-hoc
                sessions.
              </p>
            </motion.div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                variants={itemVars}
                className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 flex flex-col justify-center text-center items-center gap-2"
              >
                <Flame className="w-6 h-6 text-emerald-400 mb-1" />
                <span className="text-3xl font-bold text-white">
                  {stats.livePercent}%
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  Deep Work State
                </span>
              </motion.div>
              <motion.div
                variants={itemVars}
                className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 flex flex-col justify-center text-center items-center gap-2"
              >
                <Zap className="w-6 h-6 text-amber-400 mb-1" />
                <span className="text-3xl font-bold text-white">
                  {stats.adhocPercent}%
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  Spontaneous / Ad-hoc
                </span>
              </motion.div>
            </div>
          </div>

          {/* =========================================
              RIGHT COLUMN: CHARTS & INSIGHTS
          ========================================= */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* --- CUSTOM CSS BAR CHART --- */}
            <motion.div
              variants={itemVars}
              className="bg-[#0c1222] border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl"
            >
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-8">
                <BarChart3 className="w-5 h-5 text-indigo-400" /> Focus Velocity
                (Last 7 Days)
              </h2>

              {stats.chartData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500">
                  <CalendarOff className="w-10 h-10 mb-2 opacity-50" />
                  <p>Not enough data to graph yet.</p>
                </div>
              ) : (
                <div className="h-64 flex items-end justify-between gap-2 md:gap-6 pt-6 border-b border-white/10 relative">
                  {/* Background Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 opacity-20">
                    <div className="w-full border-t border-dashed border-white flex justify-end">
                      <span className="text-xs -mt-5">{maxHours}h</span>
                    </div>
                    <div className="w-full border-t border-dashed border-white" />
                    <div className="w-full border-t border-dashed border-white" />
                  </div>

                  {/* The Bars */}
                  {stats.chartData.map((data, idx) => {
                    const heightPercent =
                      maxHours > 0 ? (data.hours / maxHours) * 100 : 0;
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-3 relative group"
                      >
                        {/* Hover Tooltip */}
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-20">
                          {data.hours} hrs
                        </div>

                        {/* Animated Bar */}
                        <div className="w-full max-w-[60px] h-full flex items-end justify-center relative z-10">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${heightPercent}%` }}
                            transition={{
                              duration: 1,
                              delay: idx * 0.1,
                              type: "spring",
                            }}
                            className="w-full bg-gradient-to-t from-indigo-600/50 to-indigo-400 rounded-t-md hover:to-indigo-300 transition-colors cursor-pointer"
                          />
                        </div>

                        {/* X-Axis Label */}
                        <div className="flex flex-col items-center text-center">
                          <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">
                            {data.label}
                          </span>
                          <span className="text-[9px] text-slate-600 hidden sm:block">
                            {data.fullDate}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* AI Insights / Accuracy Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                variants={itemVars}
                className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-3xl flex items-center gap-6"
              >
                <div className="w-16 h-16 rounded-full border-[6px] border-emerald-500/20 flex items-center justify-center flex-shrink-0 relative">
                  <motion.svg
                    className="absolute inset-0 w-full h-full -rotate-90"
                    viewBox="0 0 100 100"
                  >
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="46"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={289}
                      strokeDashoffset={
                        289 - (stats.completionRate / 100) * 289
                      }
                      className="text-emerald-400"
                      strokeLinecap="round"
                      initial={{ strokeDashoffset: 289 }}
                      animate={{
                        strokeDashoffset:
                          289 - (stats.completionRate / 100) * 289,
                      }}
                      transition={{ duration: 1.5 }}
                    />
                  </motion.svg>
                  <span className="font-bold text-white text-sm">
                    {stats.completionRate}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-400" /> Intent
                    Adherence
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Percentage of drafted tasks that were successfully
                    completed.
                  </p>
                </div>
              </motion.div>

              <motion.div
                variants={itemVars}
                className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-3xl flex items-center gap-6"
              >
                <div className="w-16 h-16 rounded-full border-[6px] border-blue-500/20 flex items-center justify-center flex-shrink-0 relative">
                  <motion.svg
                    className="absolute inset-0 w-full h-full -rotate-90"
                    viewBox="0 0 100 100"
                  >
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="46"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={289}
                      strokeDashoffset={
                        289 - (stats.estimationAccuracy / 100) * 289
                      }
                      className="text-blue-400"
                      strokeLinecap="round"
                      initial={{ strokeDashoffset: 289 }}
                      animate={{
                        strokeDashoffset:
                          289 - (stats.estimationAccuracy / 100) * 289,
                      }}
                      transition={{ duration: 1.5 }}
                    />
                  </motion.svg>
                  <span className="font-bold text-white text-sm">
                    {stats.estimationAccuracy}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-blue-400" />{" "}
                    Estimation Accuracy
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    How closely your reality matched your original cycle
                    estimates.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
