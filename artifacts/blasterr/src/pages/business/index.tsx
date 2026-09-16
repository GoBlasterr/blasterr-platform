import { useState } from "react";
import { useLocation } from "wouter";
import { useListBusinesses, getListBusinessesQueryKey } from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/seo";
import { Search, Briefcase, MapPin, Activity, ShieldCheck, Flame, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = ["All", "Tech", "Retail", "Food", "Entertainment", "Services", "Health", "Other"];

export default function BusinessList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [category, setCategory] = useState("All");

  const queryParams: any = { limit: 20 };
  if (debouncedSearch) queryParams.q = debouncedSearch;
  if (category !== "All") queryParams.category = category;

  const { data, isLoading } = useListBusinesses(queryParams, {
    query: {
      queryKey: getListBusinessesQueryKey(queryParams) as any
    }
  });

  return (
    <>
      <Seo 
        title="Business Directory | BLASTERR" 
        description="Discover which businesses are being talked about powered by real Blasts." 
      />
      <div className="flex flex-col min-h-[100dvh] pb-24 md:pb-12 bg-background/50 backdrop-blur-sm">
        <header className="sticky top-0 z-30 glass-panel border-b border-white/10 px-6 py-8 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(229,244,3,0.2)]">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-black text-3xl text-white tracking-tight">Business</h1>
              <p className="text-sm text-muted-foreground mt-1">Discover who's getting blasted in the ecosystem.</p>
            </div>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search businesses..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 bg-black/40 border-white/10 h-14 rounded-2xl text-lg focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all shadow-inner"
            />
          </div>

          <div className="flex overflow-x-auto gap-2 no-scrollbar pb-2">
            {CATEGORIES.map(cat => (
              <Button
                key={cat}
                variant="ghost"
                size="sm"
                onClick={() => setCategory(cat)}
                className={`rounded-full shrink-0 border transition-all ${
                  category === cat 
                    ? "bg-primary/20 text-primary border-primary/50 shadow-[0_0_10px_rgba(229,244,3,0.1)]" 
                    : "bg-white/5 text-muted-foreground border-white/10 hover:text-white hover:bg-white/10"
                }`}
              >
                {cat}
              </Button>
            ))}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-4 max-w-4xl mx-auto w-full">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-panel p-5 rounded-3xl border border-white/5 flex gap-5">
                <Skeleton className="w-20 h-20 rounded-2xl bg-white/5 shrink-0" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-1/3 bg-white/5" />
                  <Skeleton className="h-4 w-1/4 bg-white/5" />
                  <Skeleton className="h-4 w-1/2 bg-white/5" />
                </div>
              </div>
            ))
          ) : !data?.items?.length ? (
            <div className="text-center py-20 px-6">
              <Briefcase className="w-16 h-16 text-white/10 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white">No businesses found</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Expand your search or check back later as more businesses enter the conversation.
              </p>
            </div>
          ) : (
            data.items.map(business => {
              const isTrending = business.blastCount > 100 && business.viewCount > 1000;
              const isRising = business.blastCount > 0 && business.blastCount <= 100;

              return (
                <div 
                  key={business.id} 
                  onClick={() => setLocation(`/business/${business.slug}`)}
                  className="group relative glass-panel p-5 rounded-3xl border border-white/5 hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  
                  <div className="relative z-10 flex items-start gap-4 md:gap-6">
                    <div className="w-16 h-16 md:w-24 md:h-24 shrink-0 rounded-2xl bg-black/60 border border-white/10 overflow-hidden flex items-center justify-center">
                      {business.imageUrl ? (
                        <img src={business.imageUrl} alt={business.name} className="w-full h-full object-cover" />
                      ) : (
                        <Briefcase className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl md:text-2xl font-bold text-white truncate group-hover:text-primary transition-colors">
                              {business.name}
                            </h2>
                            {business.verified && (
                              <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-muted-foreground mt-1">
                            <span className="uppercase tracking-wider font-bold text-primary/70 bg-primary/10 px-2 py-0.5 rounded">
                              {business.category}
                            </span>
                            {business.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" /> {business.location}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="hidden md:flex flex-col items-end gap-1">
                          {business.featured && (
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-purple-400 bg-purple-400/10 px-2 py-1 rounded-full">
                              <Zap className="w-3 h-3" /> Promoted
                            </span>
                          )}
                          {isTrending && !business.featured && (
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-orange-400 bg-orange-400/10 px-2 py-1 rounded-full">
                              <Flame className="w-3 h-3" /> Trending
                            </span>
                          )}
                          {isRising && !isTrending && !business.featured && (
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
                              <Activity className="w-3 h-3" /> Rising
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {business.description && (
                        <p className="mt-3 text-sm text-white/70 line-clamp-2 leading-relaxed">
                          {business.description}
                        </p>
                      )}
                      
                      <div className="mt-4 flex items-center gap-4 text-sm font-medium">
                        <div className="flex items-center gap-1.5 text-white/90">
                          <span className="text-primary">{business.blastCount}</span> 
                          <span className="text-muted-foreground text-xs uppercase tracking-wider">Blasts</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <div className="flex items-center gap-1.5 text-white/90">
                          <span className="text-primary">{business.followerCount}</span> 
                          <span className="text-muted-foreground text-xs uppercase tracking-wider">Followers</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </main>
      </div>
    </>
  );
}