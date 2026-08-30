import { useState, Fragment, useRef } from "react";
import { Link, useLocation } from "wouter";
import { 
  useGetFeed,
  getGetFeedQueryKey
} from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { BlastCard, BlastSkeleton } from "@/components/shared/blast-card";
import { FeedAdPlacement } from "@/components/shared/sponsored-blast-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Home as HomeIcon, PenSquare } from "lucide-react";

export default function Home() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"for-you" | "following">("for-you");
  const isStandaloneFeed = location === "/";

  const adIndexRef = useRef<Record<string, number>>({});

  // Type assertion since the OpenAPI schema type isn't matching perfectly in this mockup context
  const { data: feedData, isLoading } = useGetFeed({ tab: activeTab as any, page: 1 });
  const { data: user } = useCurrentUser();
  const welcomeName = user?.displayName?.trim() || user?.username || "User";

  if (feedData?.items?.length && adIndexRef.current[activeTab] === undefined) {
    adIndexRef.current[activeTab] = feedData.items.length >= 2 ? 1 : 0;
  }
  const currentAdIndex = adIndexRef.current[activeTab];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Mobile Header */}
      <header className={`md:hidden sticky top-0 z-30 glass-panel border-b border-white/10 px-4 py-3 flex items-center ${isStandaloneFeed ? "justify-end" : "justify-center"}`}>
        {isStandaloneFeed && (
          <Link
            href="/home"
            className="absolute left-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-primary/15 hover:text-primary"
            aria-label="Open Home Feed with navigation"
          >
            <ArrowLeft className="h-4 w-4" />
            <HomeIcon className="h-4 w-4" />
            <span>Home Feed</span>
          </Link>
        )}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" aria-label="Go to BLASTERR home">
            <img src="/word-logo.png" alt="BLASTERR" className="relative top-4 h-16 w-auto" />
        </Link>
      </header>

      {/* Desktop Header / Tabs */}
      <div className="sticky top-0 md:top-0 z-20 glass-panel border-b border-white/10 pt-4 px-4 pb-0">
        <div className="relative flex h-10 items-center justify-center mb-3">
          {isStandaloneFeed && (
            <Link
              href="/home"
              className="hidden md:inline-flex absolute left-0 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-primary/15 hover:text-primary"
              aria-label="Open Home Feed with navigation"
            >
              <ArrowLeft className="h-4 w-4" />
              <HomeIcon className="h-4 w-4" />
              <span>Home Feed</span>
            </Link>
          )}
          <h2 className={`hidden md:block absolute max-w-[calc(100%-12rem)] truncate font-display font-bold text-2xl text-white ${isStandaloneFeed ? "left-1/2 -translate-x-1/2" : "left-2"}`}>
            Welcome, {welcomeName}
          </h2>
        </div>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-transparent p-0 h-auto gap-0 rounded-none border-b border-transparent">
            <TabsTrigger 
              value="for-you" 
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 relative text-muted-foreground hover:text-white data-[state=active]:text-white font-bold"
            >
              For You
              {activeTab === "for-you" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(229,244,3,0.5)]" />
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="following" 
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 relative text-muted-foreground hover:text-white data-[state=active]:text-white font-bold"
            >
              Following
              {activeTab === "following" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(229,244,3,0.5)]" />
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Quick compose hint (desktop) */}
      <div 
        className="hidden md:flex items-center gap-4 p-5 border-b border-white/5 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setLocation("/create")}
      >
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
          <PenSquare className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 text-muted-foreground text-lg">
          Lock onto a target and start blasting...
        </div>
        <div className="px-4 py-2 bg-primary/20 text-primary font-bold rounded-full text-sm border border-primary/30">
          Create
        </div>
      </div>

      {/* Feed Content */}
      <div className="flex-1 pb-24 md:pb-0">
        {isLoading ? (
          <>
            <BlastSkeleton />
            <BlastSkeleton />
            <BlastSkeleton />
            <BlastSkeleton />
          </>
        ) : feedData?.items?.length ? (
          feedData.items.map((blast: any, index: number) => {
            const isAfterTarget = index === currentAdIndex;
            return (
              <Fragment key={blast.id}>
                <BlastCard blast={blast} />
                {isAfterTarget && (
                  <FeedAdPlacement key={`ad-${activeTab}`} placement={activeTab === "for-you" ? "home_feed" : "following_feed"} />
                )}
              </Fragment>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <PenSquare className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No blasts found</h3>
            <p className="max-w-xs">Your feed is empty. Start following people or targets to see content here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
