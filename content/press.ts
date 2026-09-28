import type { Locale } from "./site";
export interface PressCoverage {
  id: string;
  publication: string;
  publishedAt: string;
  sourceUrl: string;
  title: Record<Locale, string>;
  excerpt: Record<Locale, string>;
}
// Only add coverage after checking the actual publication and its source URL.
export const pressCoverage: PressCoverage[] = [];
