import {
  clipAnalyticsTable, clipAssetsTable, clipDistributionTable, clipSettingsTable,
  clipsTable, db, usersTable,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import * as social from "./social-repository";

export type ClipStatus = "DRAFT" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "SHARED";
export type ClipStyle = "BREAKING" | "FUNNY" | "DRAMATIC" | "RECEIPTS" | "DEBATE" | "STORY";
export type ClipSettings = { captionStyle: string; captionPosition: string; captionAnimation: string; background: string; brandingStyle: string; ctaText: string };
export type ClipBlast = Awaited<ReturnType<typeof social.blasts>>[number];
export type PersistedClip = {
  id: string; blastId: string; creatorId: string; style: ClipStyle; title: string; description: string;
  duration: number; aspectRatio: "9:16"; renderStatus: ClipStatus; videoUrl: string | null; thumbnailUrl: string | null;
  errorMessage: string | null; createdAt: string; updatedAt: string; blast: ClipBlast; creator: social.SocialUser; settings: ClipSettings;
};

const query = () => db.select({ clip: clipsTable, settings: clipSettingsTable, creator: usersTable })
  .from(clipsTable).innerJoin(clipSettingsTable, eq(clipSettingsTable.clipId, clipsTable.id))
  .innerJoin(usersTable, eq(usersTable.id, clipsTable.creatorId));

async function hydrate(row: { clip: typeof clipsTable.$inferSelect; settings: typeof clipSettingsTable.$inferSelect; creator: typeof usersTable.$inferSelect }): Promise<PersistedClip> {
  const [blast, creator] = await Promise.all([
    social.blasts(row.creator.id).then((items) => items.find((item) => item.id === row.clip.blastId)),
    social.profile(row.creator, row.creator.id),
  ]);
  if (!blast) throw new Error("Clip references a missing Blast");
  return {
    id: row.clip.id, blastId: row.clip.blastId, creatorId: row.creator.id, style: row.clip.style as ClipStyle,
    title: row.clip.title, description: row.clip.description, duration: row.clip.duration, aspectRatio: "9:16",
    renderStatus: row.clip.renderStatus as ClipStatus, videoUrl: row.clip.videoUrl, thumbnailUrl: row.clip.thumbnailUrl,
    errorMessage: row.clip.errorMessage, createdAt: row.clip.createdAt.toISOString(), updatedAt: row.clip.updatedAt.toISOString(),
    blast, creator, settings: {
      captionStyle: row.settings.captionStyle, captionPosition: row.settings.captionPosition,
      captionAnimation: row.settings.captionAnimation, background: row.settings.background,
      brandingStyle: row.settings.brandingStyle, ctaText: row.settings.ctaText,
    },
  };
}

export async function getClip(id: string): Promise<PersistedClip | null> {
  await social.ensureSocialBootstrap();
  const [row] = await query().where(eq(clipsTable.id, id));
  return row ? hydrate(row) : null;
}
export async function listClips(creatorId?: string, status?: ClipStatus): Promise<PersistedClip[]> {
  await social.ensureSocialBootstrap();
  const conditions = [creatorId ? eq(clipsTable.creatorId, creatorId) : undefined, status ? eq(clipsTable.renderStatus, status) : undefined];
  const rows = await query().where(and(...conditions)).orderBy(desc(clipsTable.createdAt));
  return Promise.all(rows.map(hydrate));
}
export async function createClip(input: Omit<PersistedClip, "createdAt" | "updatedAt" | "blast" | "creator">): Promise<PersistedClip> {
  await social.ensureSocialBootstrap();
  const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, input.creatorId));
  if (!creator) throw new Error("Clip creator does not exist");
  await db.transaction(async (tx) => {
    await tx.insert(clipsTable).values({ id: input.id, blastId: input.blastId, creatorId: creator.id, style: input.style, title: input.title,
      description: input.description, duration: input.duration, aspectRatio: input.aspectRatio, renderStatus: input.renderStatus,
      videoUrl: input.videoUrl, thumbnailUrl: input.thumbnailUrl, errorMessage: input.errorMessage });
    await tx.insert(clipSettingsTable).values({ clipId: input.id, ...input.settings, duration: input.duration });
  });
  const clip = await getClip(input.id); if (!clip) throw new Error("Unable to load created clip"); return clip;
}
export async function updateClip(id: string, update: Partial<Pick<PersistedClip, "title" | "description" | "duration" | "renderStatus" | "videoUrl" | "thumbnailUrl" | "errorMessage">> & { settings?: Partial<ClipSettings> }): Promise<PersistedClip | null> {
  await db.transaction(async (tx) => {
    const { settings, ...clip } = update;
    if (Object.keys(clip).length) await tx.update(clipsTable).set({ ...clip, updatedAt: new Date() }).where(eq(clipsTable.id, id));
    if (settings && Object.keys(settings).length) await tx.update(clipSettingsTable).set(settings).where(eq(clipSettingsTable.clipId, id));
  });
  return getClip(id);
}
export async function deleteClip(id: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.delete(clipAnalyticsTable).where(eq(clipAnalyticsTable.clipId, id));
    await tx.delete(clipDistributionTable).where(eq(clipDistributionTable.clipId, id));
    await tx.delete(clipAssetsTable).where(eq(clipAssetsTable.clipId, id));
    await tx.delete(clipSettingsTable).where(eq(clipSettingsTable.clipId, id));
    return (await tx.delete(clipsTable).where(eq(clipsTable.id, id)).returning({ id: clipsTable.id })).length > 0;
  });
}
export async function findBlast(id: string): Promise<ClipBlast | null> {
  await social.ensureSocialBootstrap();
  return (await social.blasts()).find((blast) => blast.id === id) ?? null;
}