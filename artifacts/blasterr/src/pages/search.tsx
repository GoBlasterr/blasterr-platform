import { useState } from "react";
import { useLocation } from "wouter";
import { getSearchQueryKey, useSearch, SearchType } from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/use-debounce";
import { BlastCard, BlastSkeleton } from "@/components/shared/blast-card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search as SearchIcon, Users, Target, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Seo } from "@/components/seo";

export default function Search() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchType>("all");
  
  const debouncedQuery = useDebounce(query, 250);
  const searchParams = { q: debouncedQuery, type: activeTab };
  const { data: searchResults, isLoading } = useSearch(searchParams, {
    query: {
      enabled: debouncedQuery.length > 1,
      queryKey: getSearchQueryKey(searchParams),
    },
  });
  const targets = searchResults?.targets ?? [];
  const people = searchResults?.people ?? [];
  const blasts = searchResults?.blasts ?? [];
  const searchTitle = query.trim() ? `Search results for ${query.trim()} | Blasterr` : "Search Blasterr";
  const searchDescription = query.trim()
    ? `Explore people, targets, and Blasts matching “${query.trim()}” on Blasterr.`
    : "Search Blasterr for people, places, products, ideas, and trending conversations.";

  return (
    <>
      <Seo
        title={searchTitle}
        description={searchDescription}
        canonicalPath="/search"
        noIndex={Boolean(query.trim())}
      />
      <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 glass-panel border-b border-white/10 p-4">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="Search targets, people, or blasts..." 
            className="pl-12 h-12 bg-card border-white/10 rounded-full text-base"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SearchType)} className="w-full">
        <div className="border-b border-white/5 px-2">
          <TabsList className="bg-transparent p-0 h-12 gap-6 rounded-none">
            {["all", "targets", "people", "blasts"].map((tab) => (
              <TabsTrigger 
                key={tab}
                value={tab} 
                className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 relative text-muted-foreground hover:text-white data-[state=active]:text-white font-medium capitalize h-full"
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(229,244,3,0.5)]" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {/* Content */}
      <div className="flex-1 pb-24 md:pb-0 bg-background">
        {!query ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground h-64">
            <SearchIcon className="w-12 h-12 mb-4 opacity-20" />
            <p>Enter a query to search the universe</p>
          </div>
        ) : isLoading ? (
          <div className="p-4 space-y-4">
             <BlastSkeleton />
             <BlastSkeleton />
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {/* Targets Section */}
            {(activeTab === "all" || activeTab === "targets") && targets.length > 0 && (
              <div className="py-2">
                {activeTab === "all" && <h3 className="px-4 py-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">Targets</h3>}
                {targets.map((target) => (
                  <div 
                    key={target.id}
                    onClick={() => setLocation(`/target/${target.slug}`)}
                    className="p-4 flex items-center gap-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                      {target.imageUrl ? <img src={target.imageUrl} className="w-full h-full object-cover" /> : <Target className="w-6 h-6 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate text-lg">{target.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{target.type} · {target.blastCount} blasts</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* People Section */}
            {(activeTab === "all" || activeTab === "people") && people.length > 0 && (
              <div className="py-2">
                {activeTab === "all" && <h3 className="px-4 py-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">People</h3>}
                {people.map((person) => (
                  <div 
                    key={person.id}
                    onClick={() => setLocation(`/profile/${person.username}`)}
                    className="p-4 flex items-center gap-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <Avatar className="w-12 h-12 border border-white/10 shrink-0">
                      <AvatarImage src={person.avatarUrl || undefined} />
                      <AvatarFallback>{person.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{person.displayName}</p>
                      <p className="text-sm text-muted-foreground">@{person.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Blasts Section */}
            {(activeTab === "all" || activeTab === "blasts") && blasts.length > 0 && (
              <div className="py-2">
                {activeTab === "all" && <h3 className="px-4 py-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">Blasts</h3>}
                {blasts.map((blast) => (
                  <BlastCard key={blast.id} blast={blast} />
                ))}
              </div>
            )}

            {/* Empty State */}
            {searchResults && 
             targets.length === 0 &&
             people.length === 0 &&
             blasts.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                No results found for "{query}"
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </>
  );
}
