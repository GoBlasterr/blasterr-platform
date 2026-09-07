import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { adminContentStatuses, adminFeatureFlags, adminSettings, recordAudit, setContentStatusWithAudit } from "../lib/admin-state";
import { canCreateUserContent, canManageOwnedResource, isActiveAdmin } from "../lib/admin-auth";
import { evaluateModeratedText } from "../lib/content-moderation";
import { findTargetMatches } from "../lib/target-resolution";
import { ProfileMediaValidationError, readableProfileMedia, validateProfileMediaUpdate } from "../lib/profile-media";
import { resolveSubmittedProfileMediaReference } from "../lib/profile-media-policy";
import * as social from "../lib/social-repository";
import { blastsTable, db, followsTable, usersTable } from "@workspace/db";
import {
  CreateBlastBackBody, CreateBlastBackParams, CreateBlastBackResponse, CreateBlastBody, CreateBlastResponse,
  CreateCommentBody, CreateCommentParams, CreateCommentResponse, CreateReportBody, CreateReportResponse,
  CreateTargetBody, CreateTargetResponse, DeleteBlastParams, GetAdminOverviewResponse, GetBookmarksResponse,
  GetCurrentUserResponse, GetFeedQueryParams, GetFeedResponse, GetNotificationsResponse, GetTargetParams,
  GetTargetResponse, GetTrendingResponse, GetUserProfileParams, GetUserProfileResponse, ListTargetsQueryParams,
  ListTargetsResponse, ReactToBlastBody, ReactToBlastParams, ReactToBlastResponse, SearchQueryParams, SearchResponse,
  ToggleBlockBody, ToggleBlockResponse, ToggleBookmarkParams, ToggleBookmarkResponse, ToggleFollowParams,
  ToggleFollowResponse, UpdateBlastBody, UpdateBlastParams, UpdateBlastResponse, UpdateCurrentUserBody, UpdateCurrentUserResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const stateAbbreviations: Record<string, string> = { alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY", "district of columbia": "DC" };
const validStates = new Set(Object.values(stateAbbreviations));
function title(value: string) { return value.toLowerCase().replace(/\b([a-z])/g, x => x.toUpperCase()); }
function normalizeState(value: string) { return stateAbbreviations[value.trim().toLowerCase()] ?? (validStates.has(value.trim().toUpperCase()) ? value.trim().toUpperCase() : title(value.trim())); }
function normalizeLocation(value: string) { const p = value.trim().replace(/\s+/g, " ").split(",").map(x => x.trim()); return p.length > 1 ? `${title(p.slice(0, -1).join(" "))}, ${normalizeState(p.at(-1)!)}` : title(value.trim()); }
async function viewer(req: Parameters<typeof getAuth>[0]) { const { userId } = getAuth(req); return userId ? social.userByAuth(userId) : process.env.NODE_ENV === "development" ? social.devViewer() : undefined; }
async function authenticatedProfile(authId: string) {
  const clerk = await clerkClient.users.getUser(authId); const meta = clerk.publicMetadata as Record<string, unknown>;
  const email = clerk.emailAddresses[0]?.emailAddress ?? `${authId}@clerk.invalid`;
  const rawAvatarUrl = typeof meta.avatarUrl === "string" ? meta.avatarUrl : clerk.imageUrl ?? "";
  const rawCoverUrl = typeof meta.coverUrl === "string" ? meta.coverUrl : "";
  return social.syncClerkUser({ authId, username: typeof meta.username === "string" ? meta.username : clerk.username ?? `user_${authId.replace(/\W/g, "").slice(-20)}`, displayName: typeof meta.displayName === "string" ? meta.displayName : clerk.fullName ?? clerk.username ?? "BLASTERR user", email, bio: typeof meta.bio === "string" ? meta.bio : "", avatarUrl: rawAvatarUrl, coverUrl: rawCoverUrl, location: typeof meta.location === "string" ? normalizeLocation(meta.location) : "", city: typeof meta.city === "string" ? title(meta.city) : "", state: typeof meta.state === "string" ? normalizeState(meta.state) : "", zipCode: typeof clerk.privateMetadata.zipCode === "string" ? clerk.privateMetadata.zipCode : "" });
}
async function current(req: Parameters<typeof getAuth>[0]) { const { userId } = getAuth(req); return userId ? authenticatedProfile(userId) : viewer(req); }
async function isAdmin(userId: string | null) { if (!userId) return false; try { return isActiveAdmin((await clerkClient.users.getUser(userId)).publicMetadata as Record<string, unknown>); } catch { return false; } }
const enabled = (key: string) => adminFeatureFlags.find(x => x.key === key)?.enabled ?? false;
const published = async (id?: string) => (await social.blasts(id)).filter(x => (adminContentStatuses.get(x.id) ?? "published") === "published");

router.get("/me", async (req, res) => { res.set("Cache-Control", "private, no-store, max-age=0").set("Vary", "Cookie, Authorization"); try { const { userId } = getAuth(req); const p = await current(req); if (!p) return void res.status(401).json({ error: "Sign in is required to view profile settings." }); const meta = userId ? (await clerkClient.users.getUser(userId)).publicMetadata as Record<string, unknown> : {}; const profile = await social.profile(p, p.id); const onboardingComplete = meta.onboardingComplete === true || Boolean(profile.displayName && profile.username && profile.city && profile.state); res.json(GetCurrentUserResponse.parse({ ...profile, onboardingComplete })); } catch (error) { if (error instanceof social.DuplicateAccountEmailError) return void res.status(409).json({ error: error.message }); req.log.error({ err: error }, "Unable to load profile settings"); res.status(500).json({ error: "Profile settings could not be loaded. Please try again." }); } });
router.patch("/me", async (req, res) => { res.set("Cache-Control", "private, no-store, max-age=0").set("Vary", "Cookie, Authorization"); const data = UpdateCurrentUserBody.safeParse(req.body); if (!data.success) return void res.status(400).json({ error: "Enter valid profile information before saving." }); try { const { userId } = getAuth(req); const old = await current(req); if (!old) return void res.status(401).json({ error: "Sign in is required to save profile settings." }); const clerk = userId ? await clerkClient.users.getUser(userId) : null; const mediaOwnerId = userId ?? "demo-preview-user"; const [avatarUrl, coverUrl] = await Promise.all([resolveSubmittedProfileMediaReference(data.data.avatarUrl, old.avatarUrl, value => validateProfileMediaUpdate({ value, currentValue: old.avatarUrl, ownerId: mediaOwnerId, purpose: "avatar", trustedExternalUrl: clerk?.imageUrl })), resolveSubmittedProfileMediaReference(data.data.coverUrl, old.coverUrl, value => validateProfileMediaUpdate({ value, currentValue: old.coverUrl, ownerId: mediaOwnerId, purpose: "banner" }))]); const city = title(data.data.city ?? old.city), state = normalizeState(data.data.state ?? old.state); if (!city || !validStates.has(state)) return void res.status(400).json({ error: "Enter a valid city and U.S. state." }); const next = { username: data.data.username ?? old.username, displayName: data.data.displayName ?? old.displayName, bio: data.data.bio ?? old.bio, avatarUrl, coverUrl, city, state, location: data.data.location === undefined ? `${city}, ${state}` : normalizeLocation(data.data.location), zipCode: data.data.zipCode ?? old.zipCode }; const onboardingComplete = data.data.onboardingComplete === true || Boolean(next.displayName && next.username && next.city && next.state); if (userId) await clerkClient.users.updateUserMetadata(userId, { publicMetadata: { ...next, onboardingComplete }, privateMetadata: { zipCode: next.zipCode } }); const row = userId ? await social.syncClerkUser({ authId: userId, email: clerk?.emailAddresses[0]?.emailAddress ?? `${userId}@clerk.invalid`, ...next }) : await social.syncClerkUser({ authId: "development-preview", email: "kinamin@development.invalid", ...next }); res.json(UpdateCurrentUserResponse.parse({ ...await social.profile(row, row.id), onboardingComplete })); } catch (error) { if (error instanceof ProfileMediaValidationError) return void res.status(409).json({ error: error.message }); req.log.error({ err: error }, "Unable to save profile settings"); res.status(500).json({ error: "Profile settings could not be saved. Please try again." }); } });
router.get("/feed", async (req, res): Promise<void> => {
  const parsed = GetFeedQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const viewerProfile = await viewer(req);
  if (parsed.data.tab === "nearby") {
    if (parsed.data.latitude === undefined || parsed.data.longitude === undefined) {
      res.json(GetFeedResponse.parse({
        items: [], page: parsed.data.page, hasMore: false,
        radiusMiles: parsed.data.radius, locationRequired: true,
      }));
      return;
    }
    const items = (await social.nearbyBlasts(
      viewerProfile?.id,
      parsed.data.latitude,
      parsed.data.longitude,
      parsed.data.radius,
    )).filter((blast) => (adminContentStatuses.get(blast.id) ?? "published") === "published");
    res.json(GetFeedResponse.parse({
      items,
      page: parsed.data.page,
      hasMore: false,
      radiusMiles: parsed.data.radius,
      locationRequired: false,
    }));
    return;
  }
  let items = await published(viewerProfile?.id);
  if (parsed.data.tab === "following" && viewerProfile) {
    const follows = await db.select().from(followsTable)
      .where(eq(followsTable.followerId, viewerProfile.id));
    const followedIds = new Set(follows.map((follow) => follow.followingId));
    items = items.filter((blast) => followedIds.has(blast.author.id));
  }
  res.json(GetFeedResponse.parse({ items, page: parsed.data.page, hasMore: false }));
});
router.get("/trending", async (req, res) => res.json(GetTrendingResponse.parse({ blasts: (await published((await viewer(req))?.id)).sort((a,b) => b.viewCount-a.viewCount), targets: (await social.targets()).filter(target => !target.isPreloaded || target.preloadStatus === "active") })));
router.get("/search", async (req, res) => { const q = SearchQueryParams.safeParse(req.query); if (!q.success) return void res.status(400).json({ error: q.error.message }); const all = (await social.targets()).filter(target => !target.isPreloaded || target.preloadStatus === "active"), term = q.data.q.toLowerCase(); const people = await Promise.all((await db.select().from(usersTable)).filter(x => `${x.username} ${x.displayName} ${x.bio}`.toLowerCase().includes(term)).map(x => social.profile(x))); res.json(SearchResponse.parse({ people, blasts: (await published((await viewer(req))?.id)).filter(x => x.content.toLowerCase().includes(term)), targets: findTargetMatches(all, { name: q.data.q }).map(x => ({ ...x.target, matchKind: x.matchKind, matchScore: x.matchScore, matchReason: x.matchReason })) })); });
router.get("/targets", async (req,res) => { const q=ListTargetsQueryParams.safeParse(req.query); if(!q.success)return void res.status(400).json({error:q.error.message}); const t=(await social.targets()).filter(x=>(!x.isPreloaded||x.preloadStatus==="active")&&(!q.data.type||x.type===q.data.type)); res.json(ListTargetsResponse.parse(q.data.q?.trim()?findTargetMatches(t,{name:q.data.q,type:q.data.type}).map(x=>({...x.target,matchKind:x.matchKind,matchScore:x.matchScore,matchReason:x.matchReason})):t)); });
router.post("/targets", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return void res.status(401).json({ error: "Sign in is required to create a Target." });
  if (!enabled("new_target_requests")) return void res.status(403).json({ error: "New Target requests are currently disabled." });

  const parsed = CreateTargetBody.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid Target details" });

  const name = parsed.data.name.trim();
  const location = parsed.data.location.trim();
  if ((parsed.data.type === "business" || parsed.data.type === "place") && !location) {
    return void res.status(400).json({ error: "A city or location is required for businesses and places." });
  }

  const matches = findTargetMatches(await social.targets(), {
    name,
    type: parsed.data.type,
    location,
  }).filter(match =>
    match.isHardDuplicate ||
    match.matchKind === "same-name-different-location" ||
    match.matchScore >= .76
  );
  const hardDuplicate = matches.some(match => match.isHardDuplicate);
  if (matches.length && (hardDuplicate || !parsed.data.confirmDistinct)) {
    return void res.status(409).json({
      error: "target_resolution_required",
      message: hardDuplicate
        ? "This Target already appears to exist. Select the existing Target to continue."
        : "Possible existing Targets were found. Choose one or confirm this is a different entity.",
      canCreateNew: !hardDuplicate,
      candidates: matches.map(match => ({
        ...match.target,
        matchKind: match.matchKind,
        matchScore: match.matchScore,
        matchReason: match.matchReason,
      })),
    });
  }

  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "target"}-${randomUUID().slice(0, 8)}`;
  try {
    const target = await social.createTarget({
      id: `target-${randomUUID()}`,
      name,
      slug,
      type: parsed.data.type,
      location,
      imageUrl: parsed.data.imageUrl?.trim() ?? "",
      description: parsed.data.description.trim(),
    });
    res.status(201).json(CreateTargetResponse.parse(target));
  } catch (error) {
    if (error instanceof Error && error.name === "DuplicateTargetError") {
      const candidates = findTargetMatches(await social.targets(), {
        name,
        type: parsed.data.type,
        location,
      }).filter(match => match.isHardDuplicate);
      return void res.status(409).json({
        error: "target_resolution_required",
        message: "This Target already appears to exist. Select the existing Target to continue.",
        canCreateNew: false,
        candidates: candidates.map(match => ({
          ...match.target,
          matchKind: match.matchKind,
          matchScore: match.matchScore,
          matchReason: match.matchReason,
        })),
      });
    }
    req.log.error({ err: error, targetType: parsed.data.type }, "Unable to create Target");
    res.status(500).json({ error: "Target could not be created. Please try again." });
  }
});
router.get("/targets/:slug", async(req,res)=>{const p=GetTargetParams.safeParse(req.params);if(!p.success)return void res.status(400).json({error:p.error.message});const t=await social.targetSlug(p.data.slug);if(!t||(t.isPreloaded&&t.preloadStatus!=="active"))return void res.status(404).json({error:"Target not found"});const b=(await published((await viewer(req))?.id)).filter(x=>x.target.id===t.id);res.json(GetTargetResponse.parse({target:(await social.targets()).find(x=>x.id===t.id),blasts:b,stats:{positiveReactions:b.reduce((s,x)=>s+x.reactions.blast+x.reactions.facts,0),negativeReactions:b.reduce((s,x)=>s+x.reactions.cap,0),engagement:b.reduce((s,x)=>s+x.commentCount+x.shareCount,0),activity:24}}));});
router.get("/users/:username", async(req,res)=>{const p=GetUserProfileParams.safeParse(req.params);if(!p.success)return void res.status(400).json({error:p.error.message});const u=await social.userByUsername(p.data.username);if(!u)return void res.status(404).json({error:"User not found"});const b=(await published((await viewer(req))?.id)).filter(x=>x.author.id===u.id);res.json(GetUserProfileResponse.parse({...await social.profile(u,(await viewer(req))?.id),blasts:b,media:b.filter(x=>x.mediaUrl)}));});
router.post("/users/:username/follow", async(req,res)=>{const p=ToggleFollowParams.safeParse(req.params);if(!p.success)return void res.status(400).json({error:p.error.message});const v=await current(req),u=await social.userByUsername(p.data.username);if(!u)return void res.status(404).json({error:"User not found"});if(!v)return void res.status(401).json({error:"Sign in is required."});if(v.id===u.id)return void res.status(400).json({error:"You cannot follow yourself."});const yes=await social.toggleFollow(v.id,u.id);res.json(ToggleFollowResponse.parse({isFollowing:yes,followerCount:(await social.profile(u,v.id)).followers}));});
async function create(req: Request, res: Response, back = false): Promise<void> { const body=(back?CreateBlastBackBody:CreateBlastBody).safeParse(req.body), params=back?CreateBlastBackParams.safeParse(req.params):null; if(!body.success||params&&!params.success)return void res.status(400).json({error:back?"Invalid Blast Back":"Invalid Blast"}); if(back&&!enabled("blast_back"))return void res.status(403).json({error:"Blast Back is currently disabled."}); const moderation=await evaluateModeratedText(body.data.content); if(moderation?.action==="block")return void res.status(400).json({error:"This Blast contains a term that is not allowed."}); const v=await current(req), target=await social.target(body.data.targetId); if(!v||!canCreateUserContent(getAuth(req).userId))return void res.status(401).json({error:"Sign in is required to create a Blast."}); if(!target)return void res.status(back?404:400).json({error:back?"Blast or Target not found":"Target is required"}); if(target.isPreloaded&&target.preloadStatus!=="active")return void res.status(409).json({error:"This curated Target is currently unavailable for new Blasts."}); if(back&&!await db.select().from(blastsTable).where(eq(blastsTable.id,params!.data.id)).then(x=>x[0]))return void res.status(404).json({error:"Blast or Target not found"}); const row=await social.createBlast({userId:v.id,targetId:target.id,content:body.data.content,location:body.data.location??v.location,mediaUrl:body.data.mediaUrl,mediaType:body.data.mediaType,originalBlastId:back?params!.data.id:undefined}); if(adminSettings.contentReviewMode||moderation?.action==="flag")await setContentStatusWithAudit(row.id,"hidden",{action:"content_hidden_for_review",entityType:"blast",entityId:row.id,actorId:"system",details:moderation?.action==="flag"?`An active moderation term flagged this Blast (${moderation.termId}).`:"Content review mode hid a newly created Blast."}); const blast=(await social.blasts(v.id)).find(x=>x.id===row.id);res.status(201).json((back?CreateBlastBackResponse:CreateBlastResponse).parse(blast)); }
router.post("/blasts", (req,res)=>void create(req,res)); router.post("/blasts/:id/back",(req,res)=>void create(req,res,true));
router.patch("/blasts/:id",async(req,res)=>{const p=UpdateBlastParams.safeParse(req.params),b=UpdateBlastBody.safeParse(req.body);if(!p.success||!b.success)return void res.status(400).json({error:"Invalid Blast update"});const moderation=b.data.content===undefined?null:await evaluateModeratedText(b.data.content);if(moderation?.action==="block")return void res.status(400).json({error:"This Blast contains a term that is not allowed."});const row=(await db.select().from(blastsTable).where(eq(blastsTable.id,p.data.id)))[0],v=await current(req);if(!row)return void res.status(404).json({error:"Blast not found"});const dev=!getAuth(req).userId&&process.env.NODE_ENV==="development"&&req.get("x-blasterr-admin-action")==="true";if(!v)return void res.status(401).json({error:"Sign in is required to edit this Blast."});if(!canManageOwnedResource({actorId:v.id,ownerId:row.userId,isAdmin:await isAdmin(getAuth(req).userId),isDevelopmentAdminAction:dev}))return void res.status(403).json({error:"Only the Blast creator or an admin can edit this Blast."});await db.update(blastsTable).set({content:b.data.content??row.content,location:b.data.location??row.location,updatedAt:new Date()}).where(eq(blastsTable.id,row.id));if(moderation?.action==="flag")await setContentStatusWithAudit(row.id,"hidden",{action:"content_hidden_for_review",entityType:"blast",entityId:row.id,actorId:"system",details:`An active moderation term flagged this Blast (${moderation.termId}).`});res.json(UpdateBlastResponse.parse((await social.blasts(v.id)).find(x=>x.id===row.id)));});
router.delete("/blasts/:id",async(req,res)=>{const p=DeleteBlastParams.safeParse(req.params);if(!p.success)return void res.status(400).json({error:p.error.message});const row=(await db.select().from(blastsTable).where(eq(blastsTable.id,p.data.id)))[0],v=await current(req);if(!row)return void res.status(404).json({error:"Blast not found"});const dev=!getAuth(req).userId&&process.env.NODE_ENV==="development"&&req.get("x-blasterr-admin-action")==="true";if(!v||!canManageOwnedResource({actorId:v?.id??null,ownerId:row.userId,isAdmin:await isAdmin(getAuth(req).userId),isDevelopmentAdminAction:dev}))return void res.status(403).json({error:"Only the Blast creator or an admin can delete this Blast."});await db.delete(blastsTable).where(eq(blastsTable.id,row.id));res.sendStatus(204);});
router.post("/blasts/:id/reactions",async(req,res)=>{const p=ReactToBlastParams.safeParse(req.params),b=ReactToBlastBody.safeParse(req.body);if(!p.success||!b.success)return void res.status(400).json({error:"Invalid reaction"});if(!(await social.blasts()).some(x=>x.id===p.data.id))return void res.status(404).json({error:"Blast not found"});const v=await current(req);if(!v)return void res.status(401).json({error:"Sign in is required."});res.json(ReactToBlastResponse.parse(await social.toggleReaction(v.id,p.data.id,b.data.type)));});
router.post("/blasts/:id/comments",async(req,res)=>{const p=CreateCommentParams.safeParse(req.params),b=CreateCommentBody.safeParse(req.body);if(!p.success||!b.success)return void res.status(400).json({error:"Invalid comment"});const v=await current(req);if(!v)return void res.status(401).json({error:"Sign in is required."});if(!(await social.blasts()).some(x=>x.id===p.data.id))return void res.status(404).json({error:"Blast not found"});const c=await social.addComment(v.id,p.data.id,b.data.content);res.status(201).json(CreateCommentResponse.parse({id:c!.id,content:c!.content,createdAt:c!.createdAt.toISOString(),author:await social.profile(v,v.id),likes:0,replyCount:0}));});
router.post("/blasts/:id/bookmark",async(req,res)=>{const p=ToggleBookmarkParams.safeParse(req.params);if(!p.success)return void res.status(400).json({error:p.error.message});const v=await current(req);if(!v)return void res.status(401).json({error:"Sign in is required."});if(!(await social.blasts()).some(x=>x.id===p.data.id))return void res.status(404).json({error:"Blast not found"});res.json(ToggleBookmarkResponse.parse({isBookmarked:await social.toggleBookmark(v.id,p.data.id)}));});
router.get("/notifications",async(req,res)=>{const v=await current(req);res.json(GetNotificationsResponse.parse(v?await social.notifications(v.id):[]));});
router.get("/bookmarks",async(req,res)=>{const v=await current(req);res.json(GetBookmarksResponse.parse(v?(await published(v.id)).filter(x=>x.isBookmarked):[]));});
router.post("/reports",async(req,res)=>{const b=CreateReportBody.safeParse(req.body),v=await current(req);if(!v)return void res.status(401).json({error:"Sign in is required to submit a report."});if(!b.success)return void res.status(400).json({error:b.error.message});const x=await social.createReport({reporterId:v.id,...b.data,description:b.data.description??""});res.status(201).json(CreateReportResponse.parse({id:x.id,status:x.status}));});
router.post("/blocks",async(req,res)=>{const b=ToggleBlockBody.safeParse(req.body),v=await current(req);if(!b.success)return void res.status(400).json({error:b.error.message});if(!v)return void res.status(401).json({error:"Sign in is required."});res.json(ToggleBlockResponse.parse({isBlocked:await social.toggleBlock(v.id,b.data.userId)}));});
router.get("/admin/overview",async(req,res)=>{const id=getAuth(req).userId;if(!id)return void res.status(401).json({error:"Authentication required."});if(!await isAdmin(id))return void res.status(403).json({error:"Admin access required."});res.json(GetAdminOverviewResponse.parse({usersOnline:2543,blastsToday:12842,trendingCount:78,newUsers:1231,engagement:24,chart:[{label:"Mon",users:640,blasts:3100,engagement:58},{label:"Tue",users:720,blasts:4200,engagement:63},{label:"Wed",users:880,blasts:5100,engagement:69},{label:"Thu",users:1120,blasts:7300,engagement:74},{label:"Fri",users:1360,blasts:9200,engagement:81},{label:"Sat",users:1820,blasts:12842,engagement:89}]}));});
export default router;