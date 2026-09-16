import { useLocation, useParams } from "wouter";
import { useGetBusinessCenter, useGetBusinessAnalytics, getGetBusinessCenterQueryKey, getGetBusinessAnalyticsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { BlastCard, BlastSkeleton } from "@/components/shared/blast-card";
import { Seo } from "@/components/seo";
import { ArrowLeft, Settings, Activity, Users, MessageSquare, Megaphone, Target, ExternalLink, ThumbsUp, Eye, Rocket } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessCenter() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const targetId = params.targetId || "";

  const { data: center, isLoading: isCenterLoading, isError: isCenterError } = useGetBusinessCenter(targetId, {
    query: { retry: false, queryKey: getGetBusinessCenterQueryKey(targetId) }
  });
  
  const { data: analytics, isLoading: isAnalyticsLoading } = useGetBusinessAnalytics(targetId, {
    query: { enabled: !!center, queryKey: getGetBusinessAnalyticsQueryKey(targetId) }
  });

  if (isCenterLoading) {
    return (
      <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-12 w-1/4 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isCenterError || !center) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 text-center bg-background">
        <Target className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">You do not have permission to view this Business Center.</p>
        <Button onClick={() => setLocation("/business")} variant="outline">
          Return to Directory
        </Button>
      </div>
    );
  }

  return (
    <>
      <Seo title={`${center.name} - Business Center | BLASTERR`} description="Manage your business presence on BLASTERR." />
      
      <div className="flex flex-col min-h-[100dvh] bg-background">
        <header className="sticky top-0 z-30 glass-panel border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/business/${center.slug}`)}
              className="rounded-full hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <span className="font-display font-bold text-lg text-white leading-none block">{center.name}</span>
              <span className="text-[10px] uppercase tracking-wider text-primary font-bold">Business Center</span>
            </div>
          </div>
          
          <Button variant="ghost" size="sm" className="hidden md:flex text-muted-foreground hover:text-white">
            <Settings className="w-4 h-4 mr-2" /> Settings
          </Button>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6 md:space-y-8 pb-24 md:pb-12">
          {/* Welcome & Quick Actions */}
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-card p-6 rounded-3xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            
            <div className="relative z-10 flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black/60 border border-white/10 shrink-0">
                {center.imageUrl ? (
                  <img src={center.imageUrl} alt={center.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Target className="w-6 h-6 text-muted-foreground" /></div>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Overview</h2>
                <p className="text-sm text-muted-foreground mt-1">Role: <span className="capitalize text-white/80">{center.membershipRole}</span></p>
              </div>
            </div>
            
            <div className="relative z-10 flex gap-3 w-full md:w-auto">
              <Button onClick={() => setLocation(`/business/${center.slug}`)} variant="outline" className="flex-1 md:flex-none border-white/10">
                <ExternalLink className="w-4 h-4 mr-2" /> View Public
              </Button>
              <Button disabled className="flex-1 md:flex-none bg-purple-500/20 text-purple-300 hover:bg-purple-500/20 border-purple-500/30">
                <Rocket className="w-4 h-4 mr-2" /> Promote (Soon)
              </Button>
            </div>
          </div>

          {/* Analytics Grid */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Performance Analytics
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {isAnalyticsLoading || !analytics ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-card border border-white/5" />)
              ) : (
                <>
                  <div className="bg-card p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Megaphone className="w-3.5 h-3.5" /> Blasts</span>
                    <span className="text-3xl font-display font-bold text-white">{analytics.blastCount}</span>
                  </div>
                  <div className="bg-card p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Views</span>
                    <span className="text-3xl font-display font-bold text-white">{analytics.viewCount}</span>
                  </div>
                  <div className="bg-card p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Followers</span>
                    <span className="text-3xl font-display font-bold text-white">{analytics.followerCount}</span>
                  </div>
                  <div className="bg-card p-5 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col justify-between shadow-[inset_0_0_20px_rgba(229,244,3,0.05)]">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Engagement</span>
                    <span className="text-3xl font-display font-bold text-primary">{(analytics.engagementRate * 100).toFixed(1)}%</span>
                  </div>
                </>
              )}
            </div>
            
            {analytics && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-card p-4 rounded-xl border border-white/5 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Comments</span>
                  <span className="font-bold text-white">{analytics.commentCount}</span>
                </div>
                <div className="bg-card p-4 rounded-xl border border-white/5 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2"><ThumbsUp className="w-4 h-4" /> Reactions</span>
                  <span className="font-bold text-white">{analytics.reactionCount}</span>
                </div>
              </div>
            )}
          </div>

          {/* Respond Guidance / Activity */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" /> Recent Conversations
              </h3>
              <span className="text-xs text-muted-foreground">Jump into the discussion</span>
            </div>
            
            <div className="bg-card border border-white/5 rounded-3xl overflow-hidden">
              {center.blasts?.length ? (
                <div className="divide-y divide-white/5">
                  {center.blasts.map((blast: any) => (
                    <BlastCard key={blast.id} blast={blast} showTarget={false} showMedia />
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <MessageSquare className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white font-medium">No activity yet</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                    When users blast about your business, they'll appear here so you can read, react, and reply.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
