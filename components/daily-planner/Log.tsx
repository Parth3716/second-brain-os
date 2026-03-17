import Link from "next/link";

export default function Log({ dailyRecord }: { dailyRecord: any }) {
  const isRestDay = dailyRecord.status === "REST_DAY";

  return (
    <main className="min-h-screen bg-[#060a13] text-slate-200 p-6 md:p-10 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center shadow-2xl animate-in zoom-in-95 duration-500">
        
        {isRestDay ? (
          <>
            <div className="text-6xl mb-6">🌴</div>
            <h1 className="text-3xl font-bold text-white mb-4">Rest Day Logged</h1>
            <p className="text-slate-400 mb-8">
              Your queue has been cleared and tasks returned to the backlog. Enjoy your time off to recharge.
            </p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-6">🏆</div>
            <h1 className="text-3xl font-bold text-white mb-4">Day Completed!</h1>
            <p className="text-slate-400 mb-8">
              Great job today. Here is where your Daily Timeline and Analytics will go.
            </p>
          </>
        )}

        <div className="flex gap-4 justify-center">
          <Link href="/daily-planner/manage" className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-medium">
            Go to Backlog
          </Link>
        </div>

      </div>
    </main>
  );
}