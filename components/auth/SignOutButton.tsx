"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase_client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className="text-[10px] md:text-xs font-bold tracking-widest text-slate-400 hover:text-white border border-white/10 hover:border-white/30 bg-white/[0.03] hover:bg-white/[0.08] px-4 py-2 rounded-full transition-all flex items-center gap-2"
    >
      <LogOut className="w-3.5 h-3.5" /> SIGN OUT
    </button>
  );
}