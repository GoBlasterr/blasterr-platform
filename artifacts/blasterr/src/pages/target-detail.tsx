import { useLocation, useParams } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { useGetTarget } from "@workspace/api-client-react";
import { BlastCard, BlastSkeleton } from "@/components/shared/blast-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target as TargetIcon, MapPin, Activity, ThumbsUp, ThumbsDown, PenSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Seo, absoluteUrl, canonicalUrl } from "@/components/seo";

type ThreadBlast = {
  id: string;
  originalBlastId?: string | null;
  createdAt?: string;
  [key: string]: any;
};

type BlastThreadGroup = {
  root: ThreadBlast;
  replies: ThreadBlast[];
};

const CONVERSATIONS_PER_PAGE = 12;
const REPLIES_PER_PAGE = 10;

function organizeBlastThreads(blasts: ThreadBlast[]) {
  const blastsById = new Map(blasts.map((blast) => [blast.id, blast]));
  const originalOrder = new Map(blasts.map((blast, index) => [blast.id, index]));
  const rootByBlastId = new Map<string, string>();

  const findRootId = (startId: string) => {
    const path: string[] = [];
    const pathIndex = new Map<string, number>();
    let currentId = startId;
    let rootId: string;

    while (true) {
      const cachedRoot = rootByBlastId.get(currentId);
      if (cachedRoot) {
        rootId = cachedRoot;
        break;
      }

      const cycleStart = pathIndex.get(currentId);
      if (cycleStart !== undefined) {
        rootId = currentId;
        for (const cycleId of path.slice(cycleStart)) {
          rootByBlastId.set(cycleId, rootId);
        }
        break;
      }

      pathIndex.set(currentId, path.length);
      path.push(currentId);
      const currentBlast = blastsById.get(currentId);
      const parentId = currentBlast?.originalBlastId;
      if (!parentId || parentId === currentId || !blastsById.has(parentId)) {
        rootId = currentId;
        break;
      }
      currentId = parentId;
    }

    for (const blastId of path) {
      if (!rootByBlastId.has(blastId)) rootByBlastId.set(blastId, rootId);
    }
    return rootId;
  };

  const groupsByRootId = new Map<string, BlastThreadGroup>();
  for (const blast of blasts) {
    const rootId = findRootId(blast.id);
    let group = groupsByRootId.get(rootId);
    if (!group) {
      group = { root: blastsById.get(rootId) ?? blast, replies: [] };
      groupsByRootId.set(rootId, group);
    }
    if (blast.id !== rootId) group.replies.push(blast);
  }

  const timeOf = (blast: ThreadBlast) => Date.parse(blast.createdAt ?? "");
  const compareByOriginalOrder = (a: ThreadBlast, b: ThreadBlast) =>
    (originalOrder.get(a.id) ?? 0) - (originalOrder.get(b.id) ?? 0);
  const compareRepliesOldestFirst = (a: ThreadBlast, b: ThreadBlast) => {
    const aTime = timeOf(a);
    const bTime = timeOf(b);
    if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
      return aTime - bTime;
    }
    return compareByOriginalOrder(a, b);
  };
  const compareRootsNewestFirst = (a: BlastThreadGroup, b: BlastThreadGroup) => {
    const aTime = timeOf(a.root);
    const bTime = timeOf(b.root);
    if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
      return bTime - aTime;
    }
    return compareByOriginalOrder(a.root, b.root);
  };

  const threads = [...groupsByRootId.values()];
  for (const thread of threads) thread.replies.sort(compareRepliesOldestFirst);
  threads.sort(compareRootsNewestFirst);
  return { threads, blastsById };
}

function BlastThread({
  thread,
  blastsById,
}: {
  thread: BlastThreadGroup;
  blastsById: Map<string, ThreadBlast>;
}) {
  const [visibleReplyCount, setVisibleReplyCount] = useState(REPLIES_PER_PAGE);
  const visibleReplies = thread.replies.slice(0, visibleReplyCount);
  const remainingReplies = thread.replies.length - visibleReplies.length;

  return (
    <section
      className="border-b border-white/10"
      aria-label={`Conversation started by @${thread.root.author.username}`}
    >
      <BlastCard blast={thread.root} showTarget={false} showMedia isThreadRoot />
      {thread.replies.length > 0 && (
        <div className="mb-5 ml-3 border-l-2 border-primary/30 pl-3 sm:ml-6 sm:pl-4">
          <div className="pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {thread.replies.length} {thread.replies.length === 1 ? "Blast Back" : "Blast Backs"} · oldest first
          </div>
          <div className="space-y-2">
            {visibleReplies.map((reply) => {
              const parentBlast = reply.originalBlastId
                ? blastsById.get(reply.originalBlastId)
                : undefined;
              const threadContext = parentBlast && parentBlast.id !== thread.root.id
                ? `Blast Back in this conversation · replying to @${parentBlast.author.username}`
                : `Blast Back to @${thread.root.author.username}`;

              return (
                <BlastCard
                  key={reply.id}
                  blast={reply}
                  showTarget={false}
                  showMedia
                  isThreadReply
                  threadContext={threadContext}
                />
              );
            })}
          </div>
          {remainingReplies > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-primary hover:text-primary"
              onClick={() => setVisibleReplyCount((count) => count + REPLIES_PER_PAGE)}
            >
              Show {Math.min(REPLIES_PER_PAGE, remainingReplies)} more replies
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

export default function TargetDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const slug = params.slug || "";
  
  const { data: detailData, isLoading } = useGetTarget(slug);
  const [visibleThreadCount, setVisibleThreadCount] = useState(CONVERSATIONS_PER_PAGE);
  const { threads, blastsById } = useMemo(
    () => organizeBlastThreads((detailData?.blasts ?? []) as ThreadBlast[]),
    [detailData?.blasts],
  );
  useEffect(() => {
    setVisibleThreadCount(CONVERSATIONS_PER_PAGE);
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="h-64 bg-card animate-pulse border-b border-white/5"></div>
        <div className="p-6">
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <BlastSkeleton />
        <BlastSkeleton />
      </div>
    );
  }

  if (!detailData) {
    return <div className="p-12 text-center">Target not found</div>;
  }

  const { target, stats, blasts } = detailData;
  const pageTitle = `${target.name} | Blasterr`;
  const pageDescription = target.description ||
    `Explore Blasts and join the conversation about ${target.name} on Blasterr.`;
  const pageUrl = canonicalUrl(`/target/${target.slug}`);
  const targetSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "DiscussionForumPosting",
        "headline": `Blasts about ${target.name}`,
        "description": pageDescription,
        "url": pageUrl,
        "mainEntityOfPage": pageUrl,
        "about": {
          "@type": target.type === "person" ? "Person" : "Thing",
          "name": target.name,
          ...(target.imageUrl ? { "image": absoluteUrl(target.imageUrl) } : {}),
        },
        "interactionStatistic": {
          "@type": "InteractionCounter",
          "interactionType": "https://schema.org/CommentAction",
          "userInteractionCount": blasts.length,
        },
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Blasterr", "item": canonicalUrl("/") },
          { "@type": "ListItem", "position": 2, "name": target.name, "item": pageUrl },
        ],
      },
    ],
  };

  return (
    <>
      <Seo
        title={pageTitle}
        description={pageDescription}
        canonicalPath={`/target/${target.slug}`}
        image={target.imageUrl}
        type="article"
        jsonLd={targetSchema}
      />
      <div className="flex flex-col min-h-screen">
      {/* Header / Cover */}
      <div className="relative">
        {/* Back Button */}
        <button
          type="button"
          aria-label="Go back"
          onClick={() => window.history.back()} 
          className="absolute left-4 top-4 z-20 flex h-10 w-10 shrink-0 items-center justify-center overflow-visible rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5 shrink-0 overflow-visible" strokeWidth={2.25} />
        </button>

        {/* Cover Image / Gradient */}
        <div className="h-48 md:h-64 w-full bg-gradient-to-br from-card to-background relative overflow-hidden">
          {(target.bannerImageUrl || target.imageUrl) && <img src={target.bannerImageUrl || target.imageUrl} alt={target.name} className={`h-full w-full object-cover opacity-75 ${target.type === "person" ? "object-[center_25%]" : "object-center"}`} />}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent"></div>
        </div>

        {/* Target Info */}
        <div className="px-6 relative -mt-16 sm:-mt-20 z-10 pb-6 border-b border-white/10">
           <div className="mb-4 flex items-end justify-between gap-4">
            <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-card shadow-2xl ${target.type === "sports" ? "h-28 w-48 sm:h-36 sm:w-64" : "h-24 w-36 sm:h-32 sm:w-48"}`}>
               {target.imageUrl ? (
                 <img src={target.imageUrl} alt={target.name} className={`h-full w-full object-contain ${target.type === "sports" ? "p-4" : "p-2"}`} />
               ) : (
                 <TargetIcon className="w-12 h-12 text-muted-foreground" />
               )}
            </div>
            
             <Button className="rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 px-6 shadow-[0_0_15px_rgba(229,244,3,0.3)]" onClick={() => setLocation(`/create?target=${encodeURIComponent(target.slug)}`)}>
              <PenSquare className="w-4 h-4 mr-2" /> Blast
            </Button>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight mb-1">{target.name}</h1>
          
          <div className="flex items-center gap-3 text-muted-foreground text-sm mb-4">
            <span className="capitalize font-medium border border-white/10 px-2 py-0.5 rounded bg-white/5">{target.type}</span>
            {target.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" /> {target.location}
              </span>
            )}
          </div>
          
          {target.description && (
            <p className="text-white/80 leading-relaxed mb-6 max-w-2xl">{target.description}</p>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card p-3 rounded-xl border border-white/5 flex flex-col">
              <span className="text-xs text-muted-foreground font-medium mb-1">Total Blasts</span>
              <span className="text-xl font-display font-bold text-white">{target.blastCount}</span>
            </div>
            <div className="bg-card p-3 rounded-xl border border-white/5 flex flex-col">
              <span className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1"><ThumbsUp className="w-3 h-3 text-green-400"/> Positive</span>
              <span className="text-xl font-display font-bold text-green-400">{stats.positiveReactions}%</span>
            </div>
            <div className="bg-card p-3 rounded-xl border border-white/5 flex flex-col">
               <span className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1"><ThumbsDown className="w-3 h-3 text-red-400"/> Negative</span>
              <span className="text-xl font-display font-bold text-red-400">{stats.negativeReactions}%</span>
            </div>
            <div className="bg-card p-3 rounded-xl border border-white/5 flex flex-col">
              <span className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1"><Activity className="w-3 h-3 text-primary"/> Activity</span>
              <span className="text-xl font-display font-bold text-white">{stats.activity}/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 pb-24 md:pb-0">
        <div className="sticky top-0 z-10 glass-panel border-b border-white/10 px-6 py-3 font-bold text-white">
          Blasts about {target.name}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {threads.length} {threads.length === 1 ? "conversation" : "conversations"}
          </span>
        </div>
        
        {threads.length ? (
          <>
            {threads.slice(0, visibleThreadCount).map((thread) => (
              <BlastThread
                key={thread.root.id}
                thread={thread}
                blastsById={blastsById}
              />
            ))}
            {visibleThreadCount < threads.length && (
              <div className="flex flex-col items-center gap-2 p-6">
                <p className="text-xs text-muted-foreground">
                  Showing {Math.min(visibleThreadCount, threads.length)} of {threads.length} conversations
                </p>
                <Button
                  variant="outline"
                  onClick={() => setVisibleThreadCount((count) => count + CONVERSATIONS_PER_PAGE)}
                >
                  Show {Math.min(CONVERSATIONS_PER_PAGE, threads.length - visibleThreadCount)} more conversations
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            No blasts yet. Be the first to start the conversation!
          </div>
        )}
      </div>
      </div>
    </>
  );
}
