"use client";

import { useState } from "react";
import { ArticleCard, type ArticleTeaser } from "./article-card";

export function ArticleList({ articles, filters, label, topicsTitle }: {
  articles: ArticleTeaser[];
  filters: { id: string; label: string }[];
  label: string;
  topicsTitle: string;
}) {
  const [category, setCategory] = useState("all");
  const shown = category === "all" ? articles : articles.filter(article => article.categoryId === category);
  return <div className="journal-layout">
    <aside className="journal-topics" aria-label={label}>
      <h2>{topicsTitle}</h2>
      <div className="article-filters" role="group" aria-label={label}>
        {filters.map(filter => <button key={filter.id} aria-pressed={category === filter.id} aria-controls="journal-articles" onClick={() => setCategory(filter.id)}>
          <span>{filter.label}</span>
          <span className="topic-count" aria-hidden="true">{filter.id === "all" ? articles.length : articles.filter(article => article.categoryId === filter.id).length}</span>
        </button>)}
      </div>
    </aside>
    <div id="journal-articles" className="article-grid" aria-live="polite" aria-atomic="true">
      {shown.map(article => <ArticleCard key={article.id} article={article} variant="editorial" headingLevel={2}/>)}
    </div>
  </div>;
}
