import { ensureUserInDB } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This runs ONCE per navigation.
  // First visit: creates User row in Prisma.
  // Subsequent visits: upsert is a no-op (~1ms).
  await ensureUserInDB();

  return <>{children}</>;
}