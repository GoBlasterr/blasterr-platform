import type { PreloadedSubjectInput } from "./social-repository";

/** Deliberately small, reviewable starter set. Add curated subjects here or use CSV import. */
export const PRELOADED_SUBJECTS: readonly PreloadedSubjectInput[] = [
  { name: "Donald Trump", slug: "donald-trump", type: "person", category: "person", aliases: ["Trump", "Donald J Trump", "Donald J. Trump", "DJT"], featured: true },
  { name: "Taylor Swift", slug: "taylor-swift", type: "person", category: "celebrity", aliases: ["Taylor Alison Swift"], featured: true },
  { name: "LeBron James", slug: "lebron-james", type: "person", category: "athlete", aliases: ["LeBron", "King James"], featured: true },
  { name: "Los Angeles", slug: "los-angeles", type: "place", category: "place", aliases: ["LA", "L.A.", "Los Angeles CA", "City of Los Angeles"], featured: true },
  { name: "New York City", slug: "new-york-city", type: "place", category: "place", aliases: ["NYC", "New York, NY"], featured: true },
  { name: "New York Knicks", slug: "new-york-knicks", type: "sports", category: "sports_team", aliases: ["Knicks", "NY Knicks"], featured: true },
  { name: "Los Angeles Lakers", slug: "los-angeles-lakers", type: "sports", category: "sports_team", aliases: ["Lakers", "LA Lakers"], featured: true },
] as const;