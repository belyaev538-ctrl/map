import { getServerSession } from "next-auth/next";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { FieldProjectView } from "@/components/field-map/field-project-view";

type PageProps = { params: { id: string } };

export default async function ProjectPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true, name: true },
  });

  if (!project) {
    notFound();
  }

  return <FieldProjectView projectId={project.id} projectName={project.name} />;
}
