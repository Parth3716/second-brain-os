import { ensureUserInDB } from "@/lib/auth";

export default async function ProtectedLayout({children}: {children: React.ReactNode}) {
  await ensureUserInDB();
  return <>{children}</>;
}