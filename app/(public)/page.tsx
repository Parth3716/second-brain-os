import Link from "next/link";
import { getOptionalUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const user = await getOptionalUser();
  if (user) redirect("/daily-planner");

  return (
    <main className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
      <div className="text-center space-y-8">
        <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
          Second Brain OS
        </h1>
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          Your personal execution operating system.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/signup" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all">
            Get Started
          </Link>
          <Link href="/login" className="px-8 py-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white rounded-2xl font-bold transition-all">
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}