import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export interface ArticleTeaser {
  id: string;
  href: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  categoryId: string;
}
export function ArticleCard({
  article,
  variant = "image",
  headingLevel = 3,
}: {
  article: ArticleTeaser;
  variant?: "image" | "editorial";
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  if (variant === "editorial") {
    return (
      <article className="article-entry">
        <Link href={article.href}>
          <Heading>{article.title}</Heading>
          <p>{article.excerpt}</p>
          <ArrowUpRight
            className="article-entry-arrow"
            size={22}
            aria-hidden="true"
          />
        </Link>
      </article>
    );
  }
  return (
    <article className="article-card">
      <Link href={article.href}>
        {article.image && (
          <div className="article-card-image">
            <Image
              unoptimized={article.image.startsWith("/api/media/")}
              src={article.image}
              alt=""
              fill
              sizes="(max-width:760px) 90vw, 400px"
            />
          </div>
        )}
        <div className="article-card-copy">
          <span className="article-category">{article.category}</span>
          <Heading>{article.title}</Heading>
          <p>{article.excerpt}</p>
        </div>
      </Link>
    </article>
  );
}
