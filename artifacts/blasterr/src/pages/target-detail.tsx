import { useLocation, useParams } from "wouter";
import { useGetTarget } from "@workspace/api-client-react";
import { BlastCard, BlastSkeleton } from "@/components/shared/blast-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target as TargetIcon, MapPin, Activity, ThumbsUp, ThumbsDown, PenSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Seo, absoluteUrl, canonicalUrl } from "@/components/seo";

export default function TargetDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const slug = params.slug || "";
  
  const { data: detailData, isLoading } = useGetTarget(slug);

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
          {target.imageUrl && <img src={target.imageUrl} alt={target.name} className="h-full w-full object-cover opacity-85" />}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
        </div>

        {/* Target Info */}
        <div className="px-6 relative -mt-16 sm:-mt-20 z-10 pb-6 border-b border-white/10">
          <div className="flex justify-between items-end mb-4">
            <div className="flex h-24 w-36 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-card shadow-2xl sm:h-32 sm:w-48">
               {target.imageUrl ? (
                 <img src={target.imageUrl} alt={target.name} className="h-full w-full object-contain p-2" />
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
        </div>
        
        {blasts?.length ? (
          blasts.map((blast: any) => (
            <BlastCard key={blast.id} blast={blast} showTarget={false} showMedia />
          ))
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
