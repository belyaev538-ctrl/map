import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { CreateProjectForm } from "@/components/create-project-form";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { locations: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900">Проекты</h1>
      <p className="mt-1 text-sm text-slate-600">Создайте проект и откройте карту точек</p>

      <div className="mt-8">
        <CreateProjectForm />
      </div>

      <ul className="mt-8 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm">
        {projects.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-slate-500">Пока нет проектов</li>
        ) : (
          projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/dashboard/projects/${p.id}`}
                className="flex min-h-[52px] items-center justify-between gap-4 px-4 py-4 active:bg-slate-100 hover:bg-slate-50"
              >
                <span className="text-base font-medium text-slate-900">{p.name}</span>
                <span className="shrink-0 text-sm text-slate-500">{p._count.locations} точек</span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
