import { useState } from "react";
import { BlastCard } from "@/components/shared/blast-card";
import { Button } from "@/components/ui/button";

export type ThreadBlast = {
  id: string;
  originalBlastId?: string | null;
  createdAt?: string;
  viewCount?: number;
  [key: string]: any;
};

export type BlastThreadGroup = {
  root: ThreadBlast;
  replies: ThreadBlast[];
};

const CONVERSATIONS_PER_PAGE = 12;
const REPLIES_PER_PAGE = 10;

export function organizeBlastThreads(
  blasts: ThreadBlast[],
  sortBy: "newest" | "popular" = "newest",
) {
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

  if (sortBy === "popular") {
    const conversationViews = (thread: BlastThreadGroup) =>
      Math.max(0, thread.root.viewCount ?? 0, ...thread.replies.map((reply) => reply.viewCount ?? 0));
    threads.sort((a, b) =>
      conversationViews(b) - conversationViews(a) || compareRootsNewestFirst(a, b),
    );
  } else {
    threads.sort(compareRootsNewestFirst);
  }

  return { threads, blastsById };
}

export function BlastConversation({
  thread,
  blastsById,
  showTarget = false,
}: {
  thread: BlastThreadGroup;
  blastsById: Map<string, ThreadBlast>;
  showTarget?: boolean;
}) {
  const [visibleReplyCount, setVisibleReplyCount] = useState(REPLIES_PER_PAGE);
  const visibleReplies = thread.replies.slice(0, visibleReplyCount);
  const remainingReplies = thread.replies.length - visibleReplies.length;

  return (
    <section
      className="border-b border-white/10"
      aria-label={`Conversation started by @${thread.root.author.username}`}
    >
      <BlastCard blast={thread.root} showTarget={showTarget} showMedia isThreadRoot />
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
              const replyTarget = parentBlast ?? thread.root;
              const replyTargetType = replyTarget.id === thread.root.id
                ? "initial Blast"
                : "Blast Back";
              const threadContext =
                `Blast Back · replying to @${replyTarget.author.username}'s ${replyTargetType}`;

              return (
                <BlastCard
                  key={reply.id}
                  blast={reply}
                  showTarget={showTarget}
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

export function BlastConversationList({
  threads,
  blastsById,
  showTarget = false,
}: {
  threads: BlastThreadGroup[];
  blastsById: Map<string, ThreadBlast>;
  showTarget?: boolean;
}) {
  const [visibleThreadCount, setVisibleThreadCount] = useState(CONVERSATIONS_PER_PAGE);
  const remainingThreads = threads.length - visibleThreadCount;

  return (
    <>
      {threads.slice(0, visibleThreadCount).map((thread) => (
        <BlastConversation
          key={thread.root.id}
          thread={thread}
          blastsById={blastsById}
          showTarget={showTarget}
        />
      ))}
      {remainingThreads > 0 && (
        <div className="flex flex-col items-center gap-2 p-6">
          <p className="text-xs text-muted-foreground">
            Showing {Math.min(visibleThreadCount, threads.length)} of {threads.length} conversations
          </p>
          <Button
            variant="outline"
            onClick={() => setVisibleThreadCount((count) => count + CONVERSATIONS_PER_PAGE)}
          >
            Show {Math.min(CONVERSATIONS_PER_PAGE, remainingThreads)} more conversations
          </Button>
        </div>
      )}
    </>
  );
}