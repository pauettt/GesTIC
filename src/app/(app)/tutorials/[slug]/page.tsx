import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";

export default async function TutorialArticlePage({ params }: PageProps<"/tutorials/[slug]">) {
  await requireUser();
  const { slug } = await params;

  const article = await db.tutorialArticle.findUnique({
    where: { slug },
    include: { category: true },
  });

  if (!article) notFound();

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <Link href="/tutorials" className="text-sm text-muted-foreground hover:underline">
          &larr; Tots els tutorials
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">{article.category.name}</p>
        <h1 className="text-2xl font-semibold">{article.title}</h1>
      </div>
      <div className="prose prose-sm max-w-none rounded-lg border bg-background p-6 dark:prose-invert">
        <Markdown>{article.contentMarkdown}</Markdown>
      </div>
    </article>
  );
}
