import {
  adApprovalRecordsTable,
  advertisementsTable,
  advertisersTable,
  campaignsTable,
  db,
} from "@workspace/db";

export function shouldSeedDevelopmentState(nodeEnv = process.env.NODE_ENV): boolean {
  return nodeEnv === "development";
}

const developmentAdvertisingFixtures = {
  advertiser: {
    id: "advertiser-development-preview",
    name: "BLASTERR Sample Partner",
    status: "active",
    contactEmail: "preview@blasterr.social",
    metadata: { source: "development_preview", sample: true },
  },
  campaign: {
    id: "campaign-development-right-rail",
    advertiserId: "advertiser-development-preview",
    name: "Development Preview Right Rail",
    status: "active",
    placements: ["right_rail"],
    targeting: {},
    dailyBudget: null,
    totalBudget: null,
    startsAt: new Date("2026-01-01T00:00:00.000Z"),
    endsAt: null,
  },
  advertisement: {
    id: "advertisement-development-right-rail",
    campaignId: "campaign-development-right-rail",
    name: "Development Preview Right Rail Creative",
    status: "active",
    placement: "right_rail",
    headline: "Make your next idea impossible to ignore",
    body: "A clearly labeled sample ad demonstrates how approved partner messages appear in the BLASTERR desktop rail.",
    mediaUrl: null,
    destinationUrl: "https://blasterr.social/",
    targeting: {},
    frequencyCap: null,
  },
  approval: {
    id: "approval-development-right-rail",
    advertisementId: "advertisement-development-right-rail",
    action: "approve",
    reason: "Development preview fixture approved for local demonstration.",
    reviewerClerkId: "development-preview",
  },
} as const;

export async function seedDevelopmentAdvertising(): Promise<void> {
  if (!shouldSeedDevelopmentState()) return;

  await db.transaction(async (tx) => {
    await tx.insert(advertisersTable)
      .values(developmentAdvertisingFixtures.advertiser)
      .onConflictDoNothing();
    await tx.insert(campaignsTable)
      .values(developmentAdvertisingFixtures.campaign)
      .onConflictDoNothing();
    await tx.insert(advertisementsTable)
      .values(developmentAdvertisingFixtures.advertisement)
      .onConflictDoNothing();
    await tx.insert(adApprovalRecordsTable)
      .values(developmentAdvertisingFixtures.approval)
      .onConflictDoNothing();
  });
}