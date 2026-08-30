import {
  getGetFeedQueryKey,
  useDeleteBlast,
  useGetAdminOverview,
  useGetFeed,
  useGetAdminClips
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Users, Target, Activity, ArrowUpRight, Trash2, Loader2, Clapperboard, Video, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function Admin() {
  const { data: overview, isLoading } = useGetAdminOverview();
  const { data: feedData, isLoading: isLoadingBlasts } = useGetFeed({ page: 1, tab: "for-you" });
  const { data: adminClips, isLoading: isLoadingClips } = useGetAdminClips({
    request: { headers: { "X-Blasterr-Admin-Action": "true" } }
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteMutation = useDeleteBlast({
    request: {
      headers: { "X-Blasterr-Admin-Action": "true" },
    },
  });

  const deleteBlast = (id: string) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
          toast({ title: "Blast removed by admin." });
        },
        onError: () => {
          toast({ title: "Admin could not delete this Blast.", variant: "destructive" });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48 bg-white/5" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24 bg-white/5" />
          <Skeleton className="h-24 bg-white/5" />
          <Skeleton className="h-24 bg-white/5" />
          <Skeleton className="h-24 bg-white/5" />
        </div>
        <Skeleton className="h-64 bg-white/5" />
      </div>
    );
  }

  if (!overview) return <div className="p-12 text-center">Admin access required</div>;

  return (
    <div className="min-h-screen p-4 md:p-6 bg-background">
      <div className="flex items-center gap-3 mb-8">
        <ShieldAlert className="w-8 h-8 text-destructive" />
        <h1 className="font-display font-bold text-3xl text-white">Command Center</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card border-white/10 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" /> Users Online
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-white">{overview.usersOnline}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-white/10 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Blasts Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-white">{overview.blastsToday}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-white/10 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" /> Trending Targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-white">{overview.trendingCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-white/10 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" /> New Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-display font-bold text-white">{overview.newUsers}</div>
              <span className="text-sm text-green-400 flex items-center mb-1"><ArrowUpRight className="w-3 h-3"/> 12%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-white/10 shadow-none mb-8 border-primary/20 relative overflow-hidden">
        <div className="absolute inset-0 cosmic-noise opacity-20 pointer-events-none"></div>
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2 relative z-10">
            <Clapperboard className="w-5 h-5 text-primary" /> BLASTR Media Center
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          {isLoadingClips ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Skeleton className="h-20 bg-white/5" />
              <Skeleton className="h-20 bg-white/5" />
            </div>
          ) : adminClips ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/50 border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Total Clips</div>
                  <div className="text-2xl font-display font-bold text-white">{adminClips.clipCount}</div>
                </div>
                <div className="bg-black/50 border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Completed</div>
                  <div className="text-2xl font-display font-bold text-green-400">{adminClips.completedCount}</div>
                </div>
                <div className="bg-black/50 border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Active Renders</div>
                  <div className="text-2xl font-display font-bold text-primary">{adminClips.activeRenders}</div>
                </div>
                <div className="bg-black/50 border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Failed</div>
                  <div className="text-2xl font-display font-bold text-destructive">{adminClips.failedCount}</div>
                </div>
              </div>

              {adminClips.clips && adminClips.clips.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <h4 className="text-sm font-bold text-white mb-3">Recent Renders</h4>
                  {adminClips.clips.slice(0, 5).map(clip => (
                    <div key={clip.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-black flex items-center justify-center border border-white/10">
                          {clip.renderStatus === 'FAILED' ? <AlertCircle className="w-4 h-4 text-destructive" /> : <Video className="w-4 h-4 text-primary" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{clip.title || "Untitled"}</p>
                          <p className="text-xs text-muted-foreground">@{clip.creator?.username}</p>
                        </div>
                      </div>
                      <div className="text-xs font-bold px-2 py-1 rounded bg-white/5 border border-white/10 uppercase">
                        {clip.renderStatus}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">Media stats unavailable</div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-white/10 shadow-none mb-8">
        <CardHeader>
          <CardTitle className="text-lg text-white">System Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview.chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }}
                  itemStyle={{ color: 'white' }}
                />
                <Line type="monotone" dataKey="blasts" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: 'hsl(var(--primary))' }} />
                <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-white/10 shadow-none mb-8">
        <CardHeader>
          <CardTitle className="text-lg text-white">Blast Moderation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingBlasts ? (
            <Skeleton className="h-24 w-full bg-white/5" />
          ) : feedData?.items?.length ? (
            feedData.items.map((blast) => (
              <div key={blast.id} className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-white">@{blast.author.username}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{blast.content}</p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteBlast(blast.id)}
                  className="shrink-0"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="ml-2">Delete</span>
                </Button>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-muted-foreground">No Blasts to moderate.</div>
          )}
        </CardContent>
      </Card>
      
      {/* Moderation queue would go here */}
      <Card className="bg-card border-white/10 shadow-none border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg text-destructive flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" /> Moderation Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-muted-foreground">
            No active reports.
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

// Extracting Flame icon since it's not exported from lucide above
import { Flame } from "lucide-react";
