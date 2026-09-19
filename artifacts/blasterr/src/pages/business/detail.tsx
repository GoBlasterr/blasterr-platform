import { useLocation, useParams } from "wouter";
import { useGetBusiness, useToggleBusinessFollow, useGetBusinessCenter, getGetBusinessQueryKey, getGetBusinessCenterQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { BlastCard, BlastSkeleton } from "@/components/shared/blast-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, MapPin, Globe, Phone, Mail, ShieldCheck, PenSquare, UserPlus, UserRound, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Seo, absoluteUrl, canonicalUrl } from "@/components/seo";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";

export default function BusinessDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const slug = params.slug || "";
  const { data: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: business, isLoading } = useGetBusiness(slug);
  
  const { data: centerData } = useGetBusinessCenter(business?.id || "", {
    query: {
      enabled: !!business?.id && !!currentUser,
      retry: false,
      queryKey: [...getGetBusinessCenterQueryKey(business?.id || ""), currentUser?.id ?? "guest"]
    }
  });

  const toggleFollowMutation = useToggleBusinessFollow();

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

  if (!business) {
    return <div className="p-12 text-center">Business not found</div>;
  }

  const isOwner = !!centerData;
  const canClaim = business.verificationStatus !== "verified" && !isOwner;
  // TODO: The schema says business.followerCount exists, and BusinessFollowResult has following.
  // Wait, does BusinessDetail include isFollowing? Let's check schema.
  // Schema for BusinessDetail does not have isFollowing. How do we know if we're following?
  // We'll rely on the server returning it or we can't tell perfectly without another endpoint.
  // Actually, we can use toggleFollowMutation and local state to guess, or if the API doesn't return it, we just show "Follow" and toggle it.
  
  const handleFollow = () => {
    if (!currentUser) {
      setLocation("/sign-in");
      return;
    }
    toggleFollowMutation.mutate({ targetId: business.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBusinessQueryKey(slug) });
        toast({ title: "Follow status updated." });
      }
    });
  };

  const pageTitle = `${business.name} | BLASTERR Business`;
  const pageDescription = business.description || `Check out ${business.name} on BLASTERR.`;
  const pageUrl = canonicalUrl(`/business/${business.slug}`);

  return (
    <>
      <Seo
        title={pageTitle}
        description={pageDescription}
        canonicalPath={`/business/${business.slug}`}
        image={business.imageUrl}
        type="profile"
      />
      <div className="flex flex-col min-h-[100dvh] bg-background">
        <div className="relative">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => window.history.back()} 
            className="absolute left-4 top-4 z-20 flex h-10 w-10 shrink-0 items-center justify-center overflow-visible rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5 shrink-0 overflow-visible" strokeWidth={2.25} />
          </button>

          <div className="h-48 md:h-64 w-full bg-gradient-to-br from-card to-background relative overflow-hidden">
            {(business.bannerImageUrl || business.imageUrl) && (
              <img src={business.bannerImageUrl || business.imageUrl} alt={business.name} className="h-full w-full object-cover opacity-75 object-center" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent"></div>
          </div>

          <div className="px-6 relative -mt-16 sm:-mt-20 z-10 pb-6 border-b border-white/10">
             <div className="mb-4 flex items-end justify-between gap-4">
              <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-card shadow-2xl h-24 w-24 sm:h-32 sm:w-32">
                 {business.imageUrl ? (
                   <img src={business.imageUrl} alt={business.name} className="h-full w-full object-cover" />
                 ) : (
                   <Briefcase className="w-12 h-12 text-muted-foreground" />
                 )}
              </div>
              
              <div className="flex items-center gap-2">
                 {isOwner && currentUser && (
                   <Button variant="outline" className="rounded-full border-primary/30 text-primary hover:bg-primary/10" onClick={() => setLocation(`/profile/${currentUser.username}`)}>
                     <UserRound className="mr-2 h-4 w-4" /> Personal Profile
                   </Button>
                 )}
                <Button variant="outline" className="rounded-full border-white/10 hover:bg-white/10" onClick={handleFollow} disabled={toggleFollowMutation.isPending}>
                   <UserPlus className="w-4 h-4 mr-2" /> Follow
                </Button>
                <Button className="rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 px-6 shadow-[0_0_15px_rgba(229,244,3,0.3)]" onClick={() => setLocation(`/create?target=${encodeURIComponent(business.slug)}`)}>
                  <PenSquare className="w-4 h-4 mr-2" /> Blast
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">{business.name}</h1>
              {business.verified && <ShieldCheck className="w-6 h-6 text-primary shrink-0" />}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm mb-4">
              <span className="uppercase font-bold tracking-wider text-primary/80 border border-primary/20 px-2 py-0.5 rounded bg-primary/10">{business.category}</span>
              {business.subcategory && <span className="border border-white/10 px-2 py-0.5 rounded bg-white/5">{business.subcategory}</span>}
              {business.city && business.state && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> {business.city}, {business.state}
                </span>
              )}
            </div>
            
            {business.description && (
              <p className="text-white/80 leading-relaxed mb-6 max-w-2xl">{business.description}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {business.website && (
                <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline bg-primary/10 p-3 rounded-xl border border-primary/20">
                  <Globe className="w-4 h-4" /> {business.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {business.phone && (
                <div className="flex items-center justify-center gap-2 text-center text-sm text-primary bg-primary/10 p-3 rounded-xl border border-primary/20">
                  <Phone className="w-4 h-4" /> {business.phone}
                </div>
              )}
              {business.email && (
                <a href={`mailto:${business.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline bg-primary/10 p-3 rounded-xl border border-primary/20">
                  <Mail className="w-4 h-4" /> {business.email}
                </a>
              )}
            </div>

            <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-white/5">
              <div className="flex gap-6 text-center sm:text-left">
                <div>
                  <span className="block text-xl font-display font-bold text-white">{business.blastCount}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Blasts</span>
                </div>
                <div>
                  <span className="block text-xl font-display font-bold text-white">{business.followerCount}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Followers</span>
                </div>
                <div>
                  <span className="block text-xl font-display font-bold text-white">{business.viewCount}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Views</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {isOwner ? (
                  <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10" onClick={() => setLocation(`/business/${business.id}/center`)}>
                    <Settings className="w-4 h-4 mr-2" /> Manage Business
                  </Button>
                ) : canClaim ? (
                  <Button variant="ghost" className="text-muted-foreground hover:text-white" onClick={() => setLocation(`/business/${business.slug}/claim`)}>
                    Claim this business
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 pb-24 md:pb-0">
          <div className="sticky top-0 z-10 glass-panel border-b border-white/10 px-6 py-3 font-bold text-white uppercase tracking-wider text-sm">
            Activity about {business.name}
          </div>
          
          {business.blasts?.length ? (
            business.blasts.map((blast: any) => (
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
