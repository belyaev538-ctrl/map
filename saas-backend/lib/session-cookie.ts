/** Имя cookie сессии NextAuth (JWT), как в next-auth/jwt getToken. */
export function nextAuthSessionCookieName(): string {
  const secure =
    process.env.NEXTAUTH_URL?.startsWith("https://") === true || Boolean(process.env.VERCEL);
  return secure ? "__Secure-next-auth.session-token" : "next-auth.session-token";
}

export function nextAuthSessionCookieSecure(): boolean {
  return process.env.NEXTAUTH_URL?.startsWith("https://") === true || Boolean(process.env.VERCEL);
}
