import { createSupabaseServerClient } from "@/lib/supabase_server"
import { prisma } from "@/lib/prisma_client";
import { redirect } from "next/navigation";

/**
 * Lightweight — reads session from cookie. No DB call.
 * Use in server actions and pages that just need the userId.
 * Middleware already handles redirects, so the redirect here
 * is just a safety net for edge cases.
 */
export async function getUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  return user.id;
}

export async function ensureUserInDB(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await prisma.user.upsert({
    where: { id: user.id },
    update: {
      email: user.email ?? "",
      name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "",
      image: user.user_metadata?.avatar_url ?? null,
    },
    create: {
      id: user.id,
      email: user.email ?? "",
      name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "",
      image: user.user_metadata?.avatar_url ?? null,
    },
  });

  return user.id;
}

export async function getOptionalUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}