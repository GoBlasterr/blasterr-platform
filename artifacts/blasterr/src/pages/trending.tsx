import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useGetTrending } from "@workspace/api-client-react";
import { BlastSkeleton } from "@/components/shared/blast-card";
import {
  BlastConversationList,
  organizeBlastThreads,
  type ThreadBlast,
} from "@/components/shared/blast-conversation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, TrendingUp, Flame } from "lucide-react";
import { Seo, canonicalUrl } from "@/components/seo";

const HOT_TARGETS_PER_PAGE = 12;
const targetImagePreloads = new Map<string, Promise<boolean>>();

function preloadTargetImage(src: string): Promise<boolean> {
  const existing = targetImagePreloads.get(src);
  if (existing) return existing;

  const preload = new Promise<boolean>((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (loaded: boolean) => {
      if (settled) return;
      settled = true;
      if (!loaded) targetImagePreloads.delete(src);
      resolve(loaded);
    };
    const decode = () => {
      void image.decode()
        .then(() => finish(true))
        .catch(() => finish(image.naturalWidth > 0));
    };

    image.decoding = "async";
    image.fetchPriority = "high";
    image.onload = decode;
    image.onerror = () => finish(false);
    image.src = src;

    if (image.complete) {
      if (image.naturalWidth > 0) decode();
      else finish(false);
    }
  });

  targetImagePreloads.set(src, preload);
  return preload;
}

export default function Trending() {
  const [location, setLocation] = useLocation();
  const activeTab: "blasts" | "targets" = location === "/trending/targets" ? "targets" : "blasts";
  
  const { data: trendingData, isLoading } = useGetTrending();
  const { threads, blastsById } = useMemo(
    () => organizeBlastThreads((trendingData?.blasts ?? []) as ThreadBlast[], "popular"),
    [trendingData?.blasts],
  );
  const targetItems = trendingData?.targets ?? [];
  const targetItemsKey = useMemo(
    () => targetItems.map((target: any) => `${target.id}:${target.imageUrl ?? ""}`).join("|"),
    [targetItems],
  );
  const [visibleTargetCount, setVisibleTargetCount] = useState(HOT_TARGETS_PER_PAGE);
  const [readyTargetCount, setReadyTargetCount] = useState(0);
  const [preloadedTargetImages, setPreloadedTargetImages] = useState<Map<string, boolean>>(
    () => new Map(),
  );

  useEffect(() => {
    setVisibleTargetCount(HOT_TARGETS_PER_PAGE);
    setReadyTargetCount(0);
    setPreloadedTargetImages(new Map());
  }, [targetItemsKey]);

  const requestedTargetCount = Math.min(visibleTargetCount, targetItems.length);
  useEffect(() => {
    const batch = targetItems.slice(readyTargetCount, requestedTargetCount);
    if (batch.length === 0) return;

    let cancelled = false;
    void Promise.all(batch.map(async (target: any) => {
      if (!target.imageUrl) return null;
      return [target.imageUrl, await preloadTargetImage(target.imageUrl)] as const;
    })).then((results) => {
      if (cancelled) return;
      setPreloadedTargetImages((current) => {
        const next = new Map(current);
        for (const result of results) {
          if (result) next.set(result[0], result[1]);
        }
        return next;
      });
      setReadyTargetCount(requestedTargetCount);
    });

    return () => {
      cancelled = true;
    };
  }, [readyTargetCount, requestedTargetCount, targetItems, targetItemsKey]);

  const title = activeTab === "targets" ? "Trending Targets | Blasterr" : "Trending Conversations | Blasterr";
  const description = activeTab === "targets"
    ? "Discover the people, places, products, and ideas getting the most attention on Blasterr."
    : "See the conversations and Blasts trending across Blasterr right now.";
  const pageUrl = canonicalUrl(location);
  const isPreparingTargets = readyTargetCount < requestedTargetCount;

  return (
    <>
      <Seo
        title={title}
        description={description}
        canonicalPath={location}
        jsonLd={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              "name": title,
              "description": description,
              "url": pageUrl,
            },
            {
              "@type": "BreadcrumbList",
              "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Blasterr", "item": canonicalUrl("/") },
                { "@type": "ListItem", "position": 2, "name": activeTab === "targets" ? "Trending Targets" : "Trending", "item": pageUrl },
              ],
            },
          ],
        }}
      />
      <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 glass-panel border-b border-white/10 pt-4 px-4 pb-0">
        <h2 className="font-display font-bold text-2xl text-white mb-4 px-2 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" /> Trending
        </h2>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setLocation(v === "targets" ? "/trending/targets" : "/trending")}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-2 bg-transparent p-0 h-auto gap-0 rounded-none border-b border-transparent">
            <TabsTrigger 
              value="blasts" 
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 relative text-muted-foreground hover:text-white data-[state=active]:text-white font-bold"
            >
              Top Blasts
              {activeTab === "blasts" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(229,244,3,0.5)]" />
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="targets" 
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 relative text-muted-foreground hover:text-white data-[state=active]:text-white font-bold"
            >
              Hot Targets
              {activeTab === "targets" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(229,244,3,0.5)]" />
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 pb-24 md:pb-0">
        {isLoading ? (
          <>
            <BlastSkeleton />
            <BlastSkeleton />
            <BlastSkeleton />
          </>
        ) : activeTab === "blasts" ? (
          threads.length > 0 ? (
            <BlastConversationList
              threads={threads}
              blastsById={blastsById}
              showTarget
            />
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              No Blasts are trending right now.
            </div>
          )
        ) : (
          targetItems.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No Hot Targets yet.</div>
          ) : (
            <>
              {readyTargetCount === 0 && isPreparingTargets ? (
                <div aria-label="Preparing Hot Target images">
                  {Array.from(
                    { length: Math.min(HOT_TARGETS_PER_PAGE, targetItems.length) },
                    (_, index) => (
                      <div key={index} className="flex items-center gap-4 border-b border-white/5 p-5">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-1/2" />
                          <Skeleton className="h-4 w-1/4" />
                        </div>
                        <Skeleton className="h-8 w-12" />
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {targetItems.slice(0, readyTargetCount).map((target: any, index: number) => (
                    <div
                      key={target.id}
                      onClick={() => setLocation(`/target/${target.slug}`)}
                      className="group flex cursor-pointer items-center gap-4 p-5 transition-colors hover:bg-white/[0.02]"
                    >
                      <div className="w-8 text-center font-display text-2xl font-bold text-muted-foreground transition-colors group-hover:text-primary">
                        {index + 1}
                      </div>
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        {target.imageUrl && preloadedTargetImages.get(target.imageUrl) ? (
                          <img
                            src={target.imageUrl}
                            alt={target.name}
                            className="h-full w-full object-cover"
                            decoding="async"
                            fetchPriority="high"
                          />
                        ) : (
                          <Target className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="truncate text-lg font-bold text-white">{target.name}</h3>
                          {index < 3 && <Flame className="h-4 w-4 shrink-0 text-orange-500" />}
                        </div>
                        <p className="text-sm capitalize text-muted-foreground">{target.type}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-bold text-white">{target.blastCount}</div>
                        <div className="text-xs text-muted-foreground">Blasts</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isPreparingTargets && readyTargetCount > 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Preparing more Hot Target images…
                </p>
              )}
              {!isPreparingTargets && readyTargetCount < targetItems.length && (
                <div className="flex justify-center p-6">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleTargetCount((count) =>
                      Math.min(count + HOT_TARGETS_PER_PAGE, targetItems.length),
                    )}
                  >
                    Show {Math.min(HOT_TARGETS_PER_PAGE, targetItems.length - readyTargetCount)} more Hot Targets
                  </Button>
                </div>
              )}
            </>
          )
        )}
      </div>
      </div>
    </>
  );
}
