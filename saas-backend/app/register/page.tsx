import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { authOptions } from "@/lib/auth-options";

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <RegisterForm />
      <p className="mt-6 text-center text-xs text-slate-500">
        <Link href="/" className="hover:underline">
          На главную
        </Link>
      </p>
    </div>
  );
}
