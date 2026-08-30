import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  useGetFeed,
  getGetFeedQueryKey
} from "@workspace/api-client-react";
import { BlastCard, BlastSkeleton } from "@/components/shared/blast-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PenSquare } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"for-you" | "following">("for-you");

  // Type assertion since the OpenAPI schema type isn't matching perfectly in this mockup context
  const { data: feedData, isLoading } = useGetFeed({ tab: activeTab as any, page: 1 });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-30 glass-panel border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" aria-label="Go to BLASTERR home">
          <img src="/logo.png" alt="BLASTERR" className="h-12 w-auto" />
        </Link>
      </header>

      {/* Desktop Header / Tabs */}
      <div className="sticky top-0 md:top-0 z-20 glass-panel border-b border-white/10 pt-4 px-4 pb-0">
        <h2 className="hidden md:block font-display font-bold text-2xl text-white mb-4 px-2">Home</h2>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-transparent p-0 h-auto gap-0 rounded-none border-b border-transparent">
            <TabsTrigger 
              value="for-you" 
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 relative text-muted-foreground hover:text-white data-[state=active]:text-white font-bold"
            >
              For You
              {activeTab === "for-you" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(204,255,0,0.5)]" />
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="following" 
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 relative text-muted-foreground hover:text-white data-[state=active]:text-white font-bold"
            >
              Following
              {activeTab === "following" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(204,255,0,0.5)]" />
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
          feedData.items.map((blast: any) => (
            <BlastCard key={blast.id} blast={blast} />
          ))
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
