import { getMarkdownContent } from "@/lib/markdown";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: { params: Promise<{ locale: string; all: string[] }> }) {
  const { locale, all } = await params;

  try {
    const content = await getMarkdownContent(locale, all?.at(0) ?? "");
    return content;
  } catch (error) {
    notFound();
  }
}
