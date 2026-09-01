import { useLocation } from "wouter";
import { useGetTrending } from "@workspace/api-client-react";
import { BlastCard, BlastSkeleton } from "@/components/shared/blast-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, TrendingUp, Flame } from "lucide-react";
import { Seo, canonicalUrl } from "@/components/seo";

export default function Trending() {
  const [location, setLocation] = useLocation();
  const activeTab: "blasts" | "targets" = location === "/trending/targets" ? "targets" : "blasts";
  
  const { data: trendingData, isLoading } = useGetTrending();
  const title = activeTab === "targets" ? "Trending Targets | Blasterr" : "Trending Conversations | Blasterr";
  const description = activeTab === "targets"
    ? "Discover the people, places, products, and ideas getting the most attention on Blasterr."
    : "See the conversations and Blasts trending across Blasterr right now.";
  const pageUrl = canonicalUrl(location);

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
          trendingData?.blasts?.map((blast: any) => (
            <BlastCard key={blast.id} blast={blast} />
          ))
        ) : (
          <div className="divide-y divide-white/5">
            {trendingData?.targets?.map((target: any, index: number) => (
              <div 
                key={target.id}
                onClick={() => setLocation(`/target/${target.slug}`)}
                className="p-5 flex items-center gap-4 hover:bg-white/[0.02] cursor-pointer transition-colors group"
              >
                <div className="w-8 text-center font-display font-bold text-2xl text-muted-foreground group-hover:text-primary transition-colors">
                  {index + 1}
                </div>
                <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {target.imageUrl ? (
                    <img src={target.imageUrl} alt={target.name} className="w-full h-full object-cover" />
                  ) : (
                    <Target className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg text-white truncate">{target.name}</h3>
                    {index < 3 && <Flame className="w-4 h-4 text-orange-500 shrink-0" />}
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">{target.type}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-white">{target.blastCount}</div>
                  <div className="text-xs text-muted-foreground">Blasts</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </>
  );
}
