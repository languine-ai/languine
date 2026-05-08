import { db } from "..";
import { projects } from "../schema";
import type { ProjectSettings } from "../../trpc/routers/schema";
import { eq } from "drizzle-orm";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const createProject = async ({ name }: { name: string }) => {
  const [project] = await db
    .insert(projects)
    .values({ name, slug: slugify(name) })
    .returning();

  return project;
};

export const updateProject = async ({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) => {
  const [project] = await db
    .update(projects)
    .set({ name, updatedAt: new Date() })
    .where(eq(projects.slug, slug))
    .returning();

  return project;
};

export const deleteProject = async ({ slug }: { slug: string }) => {
  const [project] = await db
    .delete(projects)
    .where(eq(projects.slug, slug))
    .returning();

  return project;
};

export const getProjectBySlug = async ({ slug }: { slug: string }) => {
  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, slug),
  });

  return project;
};

export const getProjectById = async ({ id }: { id: string }) => {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
  });

  return project;
};

export const listProjects = async () => {
  return db.query.projects.findMany({
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });
};

export const updateProjectSettings = async ({
  slug,
  settings,
}: {
  slug: string;
  settings: ProjectSettings;
}) => {
  const [project] = await db
    .update(projects)
    .set({ ...settings, updatedAt: new Date() })
    .where(eq(projects.slug, slug))
    .returning();

  return project;
};
