import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Router, type IRouter } from "express";
import { clerkClient, getAuth } from "@clerk/express";
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
  UpdateCurrentUserBody,
  UpdateCurrentUserResponse,
  UpdateBlastBody,
  UpdateBlastParams,
  UpdateBlastResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const stateAbbreviations: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH",
  "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC",
  "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR",
  pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY", "district of columbia": "DC",
};

const stateNamesByAbbreviation = Object.fromEntries(
  Object.entries(stateAbbreviations).map(([name, abbreviation]) => [abbreviation.toLowerCase(), abbreviation]),
);
const validStateAbbreviations = new Set(Object.values(stateAbbreviations));

function titleCaseLocationPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
}

function normalizeState(value: string): string {
  const cleaned = value.trim().toLowerCase();
  return stateAbbreviations[cleaned] ?? stateNamesByAbbreviation[cleaned] ?? titleCaseLocationPart(value.trim());
}

function normalizeLocation(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  const commaParts = cleaned.split(",").map((part) => part.trim()).filter(Boolean);
  let city = "";
  let state = "";

  if (commaParts.length >= 2) {
    city = commaParts.slice(0, -1).join(" ");
    state = commaParts[commaParts.length - 1];
  } else {
    const stateMatch = cleaned.match(
      new RegExp(`^(.*?)(?:\\s|,)(${Object.keys(stateAbbreviations).sort((a, b) => b.length - a.length).join("|")}|[A-Za-z]{2})$`, "i"),
    );
    if (stateMatch) {
      city = stateMatch[1].trim();
      state = stateMatch[2].trim();
    }
  }

  const normalizedState = stateAbbreviations[state.toLowerCase()] ?? stateNamesByAbbreviation[state.toLowerCase()];
  if (!city || !normalizedState) {
    return titleCaseLocationPart(cleaned);
  }

  return `${titleCaseLocationPart(city)}, ${normalizedState}`;
}

function normalizeProfileLocation(city: string, state: string): {
  city: string;
  state: string;
  location: string;
} {
  const normalizedCity = titleCaseLocationPart(city.trim().replace(/\s+/g, " "));
  const normalizedState = normalizeState(state);
  return {
    city: normalizedCity,
    state: normalizedState,
    location: normalizedCity && normalizedState ? `${normalizedCity}, ${normalizedState}` : normalizedCity,
  };
}

const users = [
  {
    id: "user-kinamin",
    username: "kinamin",
    displayName: "Kinamin",
    avatarUrl: "",
    coverUrl: "",
    bio: "Building the next conversation layer of the internet.",
    location: "Atlanta, GA",
    city: "Atlanta",
    state: "GA",
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
    city: "Atlanta",
    state: "GA",
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
    city: "Charlotte",
    state: "NC",
    followers: 6210,
    following: 452,
    blastCount: 187,
    joinedAt: "2025-11-21T12:00:00.000Z",
    isFollowing: false,
  },
];

const authenticatedProfiles = new Map<string, (typeof users)[number]>();
const demoProfilePath = resolve(process.cwd(), "../../.local/state/blasterr-demo-profile.json");
const demoProfileFields = [
  "displayName",
  "username",
  "bio",
  "location",
  "city",
  "state",
  "avatarUrl",
  "coverUrl",
] as const;

async function loadDemoProfile(): Promise<(typeof users)[number]> {
  try {
    const saved = JSON.parse(await readFile(demoProfilePath, "utf8")) as Record<string, unknown>;
    for (const field of demoProfileFields) {
      if (typeof saved[field] === "string") {
        users[0][field] = saved[field];
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  return users[0];
}

async function saveDemoProfile(profile: (typeof users)[number]): Promise<void> {
  const persisted = Object.fromEntries(
    demoProfileFields.map((field) => [field, profile[field]]),
  );
  await mkdir(dirname(demoProfilePath), { recursive: true });
  await writeFile(demoProfilePath, JSON.stringify(persisted, null, 2), "utf8");
}

async function loadAuthenticatedProfile(userId: string): Promise<{
  profile: (typeof users)[number];
  zipCode: string;
}> {
  const clerkUser = await clerkClient.users.getUser(userId);
  const metadata = clerkUser.publicMetadata as Record<string, unknown>;
  const profile = authenticatedProfiles.get(userId) ?? { ...users[0], id: userId };
  const profileFields = [
    "displayName",
    "username",
    "bio",
    "avatarUrl",
    "coverUrl",
  ] as const;

  for (const field of profileFields) {
    if (typeof metadata[field] === "string") {
      profile[field] = metadata[field];
    }
  }

  if (typeof metadata.city === "string" && typeof metadata.state === "string") {
    const structuredLocation = normalizeProfileLocation(metadata.city, metadata.state);
    profile.city = structuredLocation.city;
    profile.state = structuredLocation.state;
    profile.location = structuredLocation.location;
  } else if (typeof metadata.location === "string") {
    const legacyLocation = normalizeLocation(metadata.location);
    const [legacyCity = "", legacyState = ""] = legacyLocation.split(",").map((part) => part.trim());
    profile.city = legacyCity;
    profile.state = normalizeState(legacyState);
    profile.location = legacyLocation;
  }

  authenticatedProfiles.set(userId, profile);
  return {
    profile,
    zipCode: typeof clerkUser.privateMetadata.zipCode === "string"
      ? clerkUser.privateMetadata.zipCode
      : "",
  };
}

type TargetRecord = {
  id: string;
  name: string;
  slug: string;
  type: "person" | "business" | "place" | "product" | "entertainment" | "sports" | "gaming" | "other";
  location: string;
  blastCount: number;
  imageUrl: string;
  description: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
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
    coordinates: { latitude: 33.749, longitude: -84.388 },
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
    coordinates: { latitude: 35.2271, longitude: -80.8431 },
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
    coordinates: { latitude: 33.771, longitude: -84.387 },
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
    coordinates: { latitude: 33.749, longitude: -84.388 },
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

function distanceInMiles(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const earthRadiusMiles = 3958.8;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const startLatitude = toRadians(latitudeA);
  const endLatitude = toRadians(latitudeB);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

router.get("/me", async (req, res): Promise<void> => {
  res.set("Cache-Control", "private, no-store, max-age=0");
  res.set("Vary", "Cookie, Authorization");
  const { userId } = getAuth(req);
  if (!userId) {
    if (process.env.NODE_ENV !== "development") {
      res.status(401).json({ error: "Sign in is required to view profile settings." });
      return;
    }

    try {
      const profile = await loadDemoProfile();
      res.json(GetCurrentUserResponse.parse({ ...profile, zipCode: "" }));
    } catch (error) {
      req.log.error({ err: error }, "Unable to load development preview profile");
      res.status(500).json({ error: "Profile settings could not be loaded. Please try again." });
    }
    return;
  }

  try {
    const { profile, zipCode } = await loadAuthenticatedProfile(userId);
    res.json(GetCurrentUserResponse.parse({ ...profile, zipCode }));
  } catch (error) {
    req.log.error({ err: error }, "Unable to load profile settings");
    res.status(500).json({ error: "Profile settings could not be loaded. Please try again." });
  }
});

router.patch("/me", async (req, res): Promise<void> => {
  res.set("Cache-Control", "private, no-store, max-age=0");
  res.set("Vary", "Cookie, Authorization");
  const { userId } = getAuth(req);
  const isDevelopmentPreview = !userId && process.env.NODE_ENV === "development";
  if (!userId && !isDevelopmentPreview) {
    res.status(401).json({ error: "Sign in is required to save profile settings." });
    return;
  }

  const parsed = UpdateCurrentUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter valid profile information before saving." });
    return;
  }

  try {
    const { profile: current, zipCode: storedZipCode } = userId
      ? await loadAuthenticatedProfile(userId)
      : { profile: await loadDemoProfile(), zipCode: "" };
    const normalizedProfileLocation = normalizeProfileLocation(
      parsed.data.city ?? current.city,
      parsed.data.state ?? current.state,
    );
    if (!normalizedProfileLocation.city || !validStateAbbreviations.has(normalizedProfileLocation.state)) {
      res.status(400).json({ error: "Enter a valid city and U.S. state." });
      return;
    }
    const next = {
      displayName: parsed.data.displayName ?? current.displayName,
      username: parsed.data.username ?? current.username,
      bio: parsed.data.bio ?? current.bio,
      city: normalizedProfileLocation.city,
      state: normalizedProfileLocation.state,
      location: parsed.data.city !== undefined || parsed.data.state !== undefined
        ? normalizedProfileLocation.location
        : parsed.data.location === undefined
          ? current.location
          : normalizeLocation(parsed.data.location),
      avatarUrl: parsed.data.avatarUrl ?? current.avatarUrl,
      coverUrl: parsed.data.coverUrl ?? current.coverUrl,
    };
    const zipCode = userId ? parsed.data.zipCode ?? storedZipCode : "";

    Object.assign(current, next);
    if (userId) {
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: next,
        privateMetadata: { zipCode },
      });
      authenticatedProfiles.set(userId, current);
    } else {
      await saveDemoProfile(current);
    }
    res.json(UpdateCurrentUserResponse.parse({ ...current, zipCode }));
  } catch (error) {
    req.log.error({ err: error }, "Unable to save profile settings");
    res.status(500).json({ error: "Profile settings could not be saved. Please try again." });
  }
});

router.get("/feed", (req, res): void => {
  const parsed = GetFeedQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { page, tab, latitude, longitude, radius } = parsed.data;
  if (tab === "nearby") {
    if (latitude === undefined || longitude === undefined) {
      res.json(GetFeedResponse.parse({
        items: [],
        page,
        hasMore: false,
        radiusMiles: radius,
        locationRequired: true,
      }));
      return;
    }

    const nearbyBlasts = blasts.filter((blast) => {
      const coordinates = blast.target.coordinates;
      if (!coordinates) return false;
      return distanceInMiles(
        latitude,
        longitude,
        coordinates.latitude,
        coordinates.longitude,
      ) <= radius;
    });

    res.json(GetFeedResponse.parse({
      items: nearbyBlasts,
      page,
      hasMore: false,
      radiusMiles: radius,
      locationRequired: false,
    }));
    return;
  }

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

router.get("/users/:username", async (req, res): Promise<void> => {
  const parsed = GetUserProfileParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { userId } = getAuth(req);
  let requestProfile: (typeof users)[number] | undefined;
  try {
    if (userId) {
      const authenticatedProfile = await loadAuthenticatedProfile(userId);
      if (authenticatedProfile.profile.username === parsed.data.username) {
        requestProfile = authenticatedProfile.profile;
      }
    } else if (process.env.NODE_ENV === "development") {
      const demoProfile = await loadDemoProfile();
      if (demoProfile.username === parsed.data.username) {
        requestProfile = demoProfile;
      }
    }
  } catch (error) {
    req.log.warn({ err: error }, "Unable to hydrate profile before public profile response");
  }

  const user = requestProfile ?? [...authenticatedProfiles.values(), ...users]
    .find((item) => item.username === parsed.data.username);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const profileBlasts = blasts.filter((blast) => blast.author.username === user.username);
  res.json(GetUserProfileResponse.parse({ ...user, coverUrl: user.coverUrl || "", blasts: profileBlasts, media: profileBlasts.filter((blast) => blast.mediaUrl) }));
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