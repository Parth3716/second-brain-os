"use client";

import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-20 h-20 mx-auto bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">
          Something went wrong
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          {error.message}
        </p>
        <button
          onClick={reset}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/20"
        >
          Try Again
        </button>
      </div>
    </main>
  );
}
