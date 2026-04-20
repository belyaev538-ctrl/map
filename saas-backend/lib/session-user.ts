import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth-options";

/** id пользователя из JWT-сессии NextAuth (httpOnly cookie). */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  return user?.id ?? null;
}
