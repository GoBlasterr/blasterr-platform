import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  CreateBlastBackBody,
  CreateBlastBackParams,
  CreateBlastBackResponse,
  CreateBlastBody,
  CreateBlastResponse,
  CreateTargetBody,
  CreateTargetResponse,
  CreateCommentBody,
  CreateCommentParams,
  CreateCommentResponse,
  CreateReportBody,
  CreateReportResponse,
  DeleteBlastParams,
  GetAdminOverviewResponse,
  GetBookmarksResponse,
  GetCurrentUserResponse,
  GetFeedQueryParams,
  GetFeedResponse,
  GetNotificationsResponse,
  GetTargetParams,
  GetTargetResponse,
  GetTrendingResponse,
  GetUserProfileParams,
  GetUserProfileResponse,
  ListTargetsQueryParams,
  ListTargetsResponse,
  ReactToBlastBody,
  ReactToBlastParams,
  ReactToBlastResponse,
  SearchQueryParams,
  SearchResponse,
  ToggleBlockBody,
  ToggleBlockResponse,
  ToggleBookmarkParams,
  ToggleBookmarkResponse,
  ToggleFollowParams,
  ToggleFollowResponse,
  UpdateBlastBody,
  UpdateBlastParams,
  UpdateBlastResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const users = [
  {
    id: "user-kinamin",
    username: "kinamin",
    displayName: "Kinamin",
    avatarUrl: "",
    bio: "Building the next conversation layer of the internet.",
    location: "Atlanta, GA",
    followers: 842,
    following: 318,
    blastCount: 74,
    joinedAt: "2026-01-17T15:20:00.000Z",
    isFollowing: false,
  },
  {
    id: "user-nova",
    username: "novaraye",
    displayName: "Nova Raye",
    avatarUrl: "",
    bio: "Food, cities, and unapologetically honest takes.",
    location: "Atlanta, GA",
    followers: 12840,
    following: 611,
    blastCount: 298,
    joinedAt: "2025-10-05T10:00:00.000Z",
    isFollowing: true,
  },
  {
    id: "user-marcus",
    username: "marcuswaves",
    displayName: "Marcus Waves",
    avatarUrl: "",
    bio: "Sports culture without the recycled hot takes.",
    location: "Charlotte, NC",
    followers: 6210,
    following: 452,
    blastCount: 187,
    joinedAt: "2025-11-21T12:00:00.000Z",
    isFollowing: false,
  },
];

type TargetRecord = {
  id: string;
  name: string;
  slug: string;
  type: "person" | "business" | "place" | "product" | "entertainment" | "sports" | "gaming" | "other";
  location: string;
  blastCount: number;
  imageUrl: string;
  description: string;
};

const targets: TargetRecord[] = [
  {
    id: "target-atl-wings",
    name: "Midnight Wings ATL",
    slug: "midnight-wings-atl",
    type: "business" as const,
    location: "Atlanta, GA",
    blastCount: 1284,
    imageUrl: "",
    description: "Late-night wings, bold sauces, and one of Atlanta's loudest food debates.",
  },
  {
    id: "target-finals",
    name: "2026 Pro Basketball Finals",
    slug: "2026-pro-basketball-finals",
    type: "sports" as const,
    location: "United States",
    blastCount: 9410,
    imageUrl: "",
    description: "The championship series everyone is arguing about.",
  },
  {
    id: "target-neon",
    name: "NEON/STATIC",
    slug: "neon-static",
    type: "entertainment" as const,
    location: "Worldwide",
    blastCount: 3862,
    imageUrl: "",
    description: "The surprise album reshaping this summer's sound.",
  },
  {
    id: "target-atlanta",
    name: "Atlanta",
    slug: "atlanta",
    type: "place" as const,
    location: "Georgia",
    blastCount: 28754,
    imageUrl: "",
    description: "What the city is talking about right now.",
  },
];

type Reaction = "blast" | "facts" | "cap" | "funny" | "watching";
type Blast = {
  id: string;
  content: string;
  createdAt: string;
  author: (typeof users)[number];
  target: (typeof targets)[number];
  location: string;
  mediaUrl: string;
  mediaType: "image" | "video" | null;
  reactions: Record<Reaction, number> & { currentUserReaction: Reaction | null };
  commentCount: number;
  shareCount: number;
  viewCount: number;
  isBookmarked: boolean;
  isBlastBack?: boolean;
  originalBlastId?: string | null;
};

const blasts: Blast[] = [
  {
    id: "blast-1",
    content: "The lemon-pepper glaze here has no business being this good. Midnight Wings just reset the late-night food ranking.",
    createdAt: "2026-08-29T14:08:00.000Z",
    author: users[1],
    target: targets[0],
    location: "Atlanta, GA",
    mediaUrl: "",
    mediaType: null,
    reactions: { blast: 245, facts: 132, cap: 12, funny: 18, watching: 42, currentUserReaction: "blast" },
    commentCount: 128,
    shareCount: 64,
    viewCount: 18400,
    isBookmarked: true,
  },
  {
    id: "blast-2",
    content: "Everybody is talking about the final shot. Nobody is talking about the defensive switch that created it.",
    createdAt: "2026-08-29T12:42:00.000Z",
    author: users[2],
    target: targets[1],
    location: "Charlotte, NC",
    mediaUrl: "",
    mediaType: null,
    reactions: { blast: 904, facts: 611, cap: 87, funny: 33, watching: 240, currentUserReaction: null },
    commentCount: 367,
    shareCount: 218,
    viewCount: 84200,
    isBookmarked: false,
  },
  {
    id: "blast-3",
    content: "Track seven sounds like a city at 2 a.m.—beautiful, anxious, and impossible to leave.",
    createdAt: "2026-08-29T09:18:00.000Z",
    author: users[1],
    target: targets[2],
    location: "Atlanta, GA",
    mediaUrl: "",
    mediaType: null,
    reactions: { blast: 410, facts: 388, cap: 31, funny: 12, watching: 96, currentUserReaction: "facts" },
    commentCount: 91,
    shareCount: 77,
    viewCount: 31900,
    isBookmarked: false,
  },
  {
    id: "blast-4",
    content: "Atlanta's best ideas keep happening after the official meeting ends.",
    createdAt: "2026-08-28T23:51:00.000Z",
    author: users[0],
    target: targets[3],
    location: "Atlanta, GA",
    mediaUrl: "",
    mediaType: null,
    reactions: { blast: 129, facts: 201, cap: 9, funny: 44, watching: 38, currentUserReaction: null },
    commentCount: 46,
    shareCount: 29,
    viewCount: 12600,
    isBookmarked: false,
  },
];

const notifications = [
  { id: "notice-1", type: "reaction" as const, message: "Nova Raye reacted FACTS to your Blast about Atlanta.", createdAt: "2026-08-29T14:31:00.000Z", read: false, actor: users[1] },
  { id: "notice-2", type: "follow" as const, message: "Marcus Waves started following you.", createdAt: "2026-08-29T12:05:00.000Z", read: false, actor: users[2] },
  { id: "notice-3", type: "trending" as const, message: "Your Blast is gaining momentum in Atlanta.", createdAt: "2026-08-28T23:58:00.000Z", read: true, actor: users[0] },
];

router.get("/me", (_req, res): void => {
  res.json(GetCurrentUserResponse.parse(users[0]));
});

router.get("/feed", (req, res): void => {
  const parsed = GetFeedQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const page = parsed.data.page;
  res.json(GetFeedResponse.parse({ items: blasts, page, hasMore: false }));
});

router.get("/trending", (_req, res): void => {
  res.json(GetTrendingResponse.parse({ blasts: [...blasts].sort((a, b) => b.viewCount - a.viewCount), targets }));
});

router.get("/search", (req, res): void => {
  const parsed = SearchQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const q = parsed.data.q.toLowerCase();
  res.json(SearchResponse.parse({
    people: users.filter((user) => `${user.username} ${user.displayName} ${user.bio}`.toLowerCase().includes(q)),
    blasts: blasts.filter((blast) => blast.content.toLowerCase().includes(q)),
    targets: targets.filter((target) => `${target.name} ${target.description} ${target.location}`.toLowerCase().includes(q)),
  }));
});

router.get("/targets", (req, res): void => {
  const parsed = ListTargetsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const q = parsed.data.q?.toLowerCase();
  const result = targets.filter((target) =>
    (!q || `${target.name} ${target.description}`.toLowerCase().includes(q)) &&
    (!parsed.data.type || target.type === parsed.data.type),
  );
  res.json(ListTargetsResponse.parse(result));
});

router.post("/targets", (req, res): void => {
  const parsed = CreateTargetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid Target details" });
    return;
  }

  const baseSlug = parsed.data.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "target";
  const slug = `${baseSlug}-${randomUUID().slice(0, 8)}`;
  const target = {
    id: `target-${randomUUID()}`,
    name: parsed.data.name.trim(),
    slug,
    type: parsed.data.type,
    location: parsed.data.location.trim(),
    blastCount: 0,
    imageUrl: "",
    description: parsed.data.description.trim(),
  };

  targets.push(target);
  res.status(201).json(CreateTargetResponse.parse(target));
});

router.get("/targets/:slug", (req, res): void => {
  const parsed = GetTargetParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const target = targets.find((item) => item.slug === parsed.data.slug);
  if (!target) {
    res.status(404).json({ error: "Target not found" });
    return;
  }
  const targetBlasts = blasts.filter((blast) => blast.target.id === target.id);
  res.json(GetTargetResponse.parse({
    target,
    blasts: targetBlasts,
    stats: {
      positiveReactions: targetBlasts.reduce((sum, blast) => sum + blast.reactions.blast + blast.reactions.facts, 0),
      negativeReactions: targetBlasts.reduce((sum, blast) => sum + blast.reactions.cap, 0),
      engagement: targetBlasts.reduce((sum, blast) => sum + blast.commentCount + blast.shareCount, 0),
      activity: 24,
    },
  }));
});

router.get("/users/:username", (req, res): void => {
  const parsed = GetUserProfileParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = users.find((item) => item.username === parsed.data.username);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const profileBlasts = blasts.filter((blast) => blast.author.id === user.id);
  res.json(GetUserProfileResponse.parse({ ...user, coverUrl: "", blasts: profileBlasts, media: profileBlasts.filter((blast) => blast.mediaUrl) }));
});

router.post("/users/:username/follow", (req, res): void => {
  const parsed = ToggleFollowParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = users.find((item) => item.username === parsed.data.username);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  user.isFollowing = !user.isFollowing;
  user.followers += user.isFollowing ? 1 : -1;
  res.json(ToggleFollowResponse.parse({ isFollowing: user.isFollowing, followerCount: user.followers }));
});

router.post("/blasts", (req, res): void => {
  const parsed = CreateBlastBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const target = targets.find((item) => item.id === parsed.data.targetId);
  if (!target) {
    res.status(400).json({ error: "Target is required" });
    return;
  }
  const blast: Blast = {
    id: randomUUID(),
    content: parsed.data.content,
    createdAt: new Date().toISOString(),
    author: users[0],
    target,
    location: parsed.data.location ?? users[0].location,
    mediaUrl: parsed.data.mediaUrl ?? "",
    mediaType: parsed.data.mediaType ?? null,
    reactions: { blast: 0, facts: 0, cap: 0, funny: 0, watching: 0, currentUserReaction: null },
    commentCount: 0,
    shareCount: 0,
    viewCount: 1,
    isBookmarked: false,
  };
  blasts.unshift(blast);
  res.status(201).json(CreateBlastResponse.parse(blast));
});

router.patch("/blasts/:id", (req, res): void => {
  const params = UpdateBlastParams.safeParse(req.params);
  const body = UpdateBlastBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid Blast update" });
    return;
  }
  const blast = blasts.find((item) => item.id === params.data.id);
  if (!blast) {
    res.status(404).json({ error: "Blast not found" });
    return;
  }
  if (body.data.content !== undefined) blast.content = body.data.content;
  if (body.data.location !== undefined) blast.location = body.data.location;
  res.json(UpdateBlastResponse.parse(blast));
});

router.delete("/blasts/:id", (req, res): void => {
  const parsed = DeleteBlastParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const index = blasts.findIndex((item) => item.id === parsed.data.id);
  if (index < 0) {
    res.status(404).json({ error: "Blast not found" });
    return;
  }
  blasts.splice(index, 1);
  res.sendStatus(204);
});

router.post("/blasts/:id/reactions", (req, res): void => {
  const params = ReactToBlastParams.safeParse(req.params);
  const body = ReactToBlastBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid reaction" });
    return;
  }
  const blast = blasts.find((item) => item.id === params.data.id);
  if (!blast) {
    res.status(404).json({ error: "Blast not found" });
    return;
  }
  const previous = blast.reactions.currentUserReaction;
  if (previous) blast.reactions[previous] = Math.max(0, blast.reactions[previous] - 1);
  if (previous === body.data.type) {
    blast.reactions.currentUserReaction = null;
  } else {
    blast.reactions[body.data.type] += 1;
    blast.reactions.currentUserReaction = body.data.type;
  }
  res.json(ReactToBlastResponse.parse(blast.reactions));
});

router.post("/blasts/:id/comments", (req, res): void => {
  const params = CreateCommentParams.safeParse(req.params);
  const body = CreateCommentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid comment" });
    return;
  }
  const blast = blasts.find((item) => item.id === params.data.id);
  if (!blast) {
    res.status(404).json({ error: "Blast not found" });
    return;
  }
  blast.commentCount += 1;
  res.status(201).json(CreateCommentResponse.parse({
    id: randomUUID(),
    content: body.data.content,
    createdAt: new Date().toISOString(),
    author: users[0],
    likes: 0,
    replyCount: 0,
  }));
});

router.post("/blasts/:id/back", (req, res): void => {
  const params = CreateBlastBackParams.safeParse(req.params);
  const body = CreateBlastBackBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid Blast Back" });
    return;
  }
  const original = blasts.find((item) => item.id === params.data.id);
  const target = targets.find((item) => item.id === body.data.targetId);
  if (!original || !target) {
    res.status(404).json({ error: "Blast or Target not found" });
    return;
  }
  const blast: Blast = {
    id: randomUUID(),
    content: body.data.content,
    createdAt: new Date().toISOString(),
    author: users[0],
    target,
    location: body.data.location ?? users[0].location,
    mediaUrl: body.data.mediaUrl ?? "",
    mediaType: body.data.mediaType ?? null,
    reactions: { blast: 0, facts: 0, cap: 0, funny: 0, watching: 0, currentUserReaction: null },
    commentCount: 0,
    shareCount: 0,
    viewCount: 1,
    isBookmarked: false,
    isBlastBack: true,
    originalBlastId: original.id,
  };
  blasts.unshift(blast);
  res.status(201).json(CreateBlastBackResponse.parse(blast));
});

router.post("/blasts/:id/bookmark", (req, res): void => {
  const parsed = ToggleBookmarkParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const blast = blasts.find((item) => item.id === parsed.data.id);
  if (!blast) {
    res.status(404).json({ error: "Blast not found" });
    return;
  }
  blast.isBookmarked = !blast.isBookmarked;
  res.json(ToggleBookmarkResponse.parse({ isBookmarked: blast.isBookmarked }));
});

router.get("/notifications", (_req, res): void => {
  res.json(GetNotificationsResponse.parse(notifications));
});

router.get("/bookmarks", (_req, res): void => {
  res.json(GetBookmarksResponse.parse(blasts.filter((blast) => blast.isBookmarked)));
});

router.post("/reports", (req, res): void => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.status(201).json(CreateReportResponse.parse({ id: randomUUID(), status: "open" }));
});

router.post("/blocks", (req, res): void => {
  const parsed = ToggleBlockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(ToggleBlockResponse.parse({ isBlocked: true }));
});

router.get("/admin/overview", (_req, res): void => {
  res.json(GetAdminOverviewResponse.parse({
    usersOnline: 2543,
    blastsToday: 12842,
    trendingCount: 78,
    newUsers: 1231,
    engagement: 24,
    chart: [
      { label: "Mon", users: 640, blasts: 3100, engagement: 58 },
      { label: "Tue", users: 720, blasts: 4200, engagement: 63 },
      { label: "Wed", users: 880, blasts: 5100, engagement: 69 },
      { label: "Thu", users: 1120, blasts: 7300, engagement: 74 },
      { label: "Fri", users: 1360, blasts: 9200, engagement: 81 },
      { label: "Sat", users: 1820, blasts: 12842, engagement: 89 },
    ],
  }));
});

export default router;