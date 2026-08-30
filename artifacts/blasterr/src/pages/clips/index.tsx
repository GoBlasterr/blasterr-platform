import { useState, useMemo } from "react";
import { Link } from "wouter";
import { 
  useGetMyClips, 
  useDeleteClip, 
  useRetryClip, 
  useShareClip, 
  GetMyClipsStatus,
  getGetMyClipsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Film, Play, AlertCircle, Loader2, Download, Share2, 
  Copy, Trash2, RotateCcw, Clapperboard, ExternalLink 
} from "lucide-react";

export default function ClipsLibrary() {
  const [statusFilter, setStatusFilter] = useState<GetMyClipsStatus>("all");
  
  const params = useMemo(() => {
    return statusFilter === "all" ? {} : { status: statusFilter };
  }, [statusFilter]);
  
  const { data: clips, isLoading } = useGetMyClips(params, {
    query: {
      queryKey: getGetMyClipsQueryKey(params),
      refetchInterval: (query) => {
        const data = query.state.data;
        if (Array.isArray(data) && data.some((c: any) => c.renderStatus === "QUEUED" || c.renderStatus === "PROCESSING")) {
          return 3000;
        }
        return false;
      }
    }
  });

  const deleteMutation = useDeleteClip();
  const retryMutation = useRetryClip();
  const shareMutation = useShareClip();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleShare = async (clip: any) => {
    if (!clip.videoUrl) return;
    try {
      const share = await shareMutation.mutateAsync({ id: clip.id });
      const artifactBase = import.meta.env.BASE_URL.replace(/\/$/, "");
      const sharePath = share.url.startsWith("/api/") ? share.url : `${artifactBase}${share.url}`;
      const shareUrl = new URL(sharePath, window.location.origin).href;
      if (navigator.share) {
        await navigator.share({
          title: clip.title || "My BLASTR Clip",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: "Approved share link copied" });
      }
      queryClient.invalidateQueries({ queryKey: getGetMyClipsQueryKey() });
    } catch {
      toast({ title: "This clip could not be shared", variant: "destructive" });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Clip deleted" });
        queryClient.invalidateQueries({ queryKey: getGetMyClipsQueryKey() });
      }
    });
  };

  const handleRetry = (id: string) => {
    retryMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Render queued for retry" });
        queryClient.invalidateQueries({ queryKey: getGetMyClipsQueryKey() });
      }
    });
  };

  const handleDownload = (clip: any) => {
    if (!clip.videoUrl) return;
    const a = document.createElement("a");
    a.href = clip.videoUrl;
    a.download = `${clip.title || 'blastr-clip'}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filters: { label: string, value: GetMyClipsStatus }[] = [
    { label: "All", value: "all" },
    { label: "Processing", value: "PROCESSING" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Failed", value: "FAILED" },
  ];

  return (
    <div className="min-h-screen p-4 md:p-6 pb-24 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Clapperboard className="w-8 h-8 text-primary" />
          <h1 className="font-display font-bold text-3xl text-white">Clip Library</h1>
        </div>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 custom-scrollbar">
        {filters.map(filter => (
          <Button
            key={filter.value}
            variant={statusFilter === filter.value ? "default" : "outline"}
            className={`rounded-full shrink-0 ${statusFilter === filter.value ? "bg-primary text-primary-foreground neon-border" : "border-white/10 text-muted-foreground hover:text-white"}`}
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="aspect-[9/16] rounded-xl bg-white/5" />
          ))}
        </div>
      ) : clips && clips.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {clips.map((clip: any) => (
            <Card key={clip.id} className="bg-card/60 backdrop-blur border-white/10 overflow-hidden group hover:border-primary/50 transition-colors">
              <div className="aspect-[9/16] bg-black relative flex flex-col justify-between">
                {clip.thumbnailUrl ? (
                  <img src={clip.thumbnailUrl} alt={clip.title} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="absolute inset-0 cosmic-noise opacity-40 mix-blend-screen"></div>
                )}
                
                {/* Status Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  {clip.renderStatus === "QUEUED" || clip.renderStatus === "PROCESSING" ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <span className="text-xs font-bold text-primary tracking-widest">{clip.renderStatus}</span>
                    </div>
                  ) : clip.renderStatus === "FAILED" ? (
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-destructive" />
                      <span className="text-xs font-bold text-destructive">FAILED</span>
                    </div>
                  ) : clip.renderStatus === "COMPLETED" || clip.renderStatus === "SHARED" ? (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 absolute inset-0 flex items-center justify-center">
                      <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full bg-primary/20 text-primary hover:bg-primary/40 hover:scale-110 transition-transform" onClick={() => clip.videoUrl && window.open(clip.videoUrl, '_blank')}>
                        <Play className="w-5 h-5 ml-1" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                  <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10 uppercase">
                    {clip.style}
                  </div>
                  {clip.renderStatus === "FAILED" && (
                    <Button variant="ghost" size="icon" className="w-7 h-7 bg-black/60 rounded-full text-white hover:text-primary" onClick={() => handleRetry(clip.id)}>
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent">
                  <h3 className="text-sm font-bold text-white line-clamp-1">{clip.title || "Untitled Clip"}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(clip.createdAt), { addSuffix: true })}</p>
                </div>
              </div>
              
              <CardContent className="p-2 bg-card border-t border-white/5">
                <div className="flex justify-between items-center">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" disabled={!clip.videoUrl} onClick={() => handleDownload(clip)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" disabled={!clip.videoUrl} onClick={() => handleShare(clip)}>
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(clip.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 px-4 rounded-2xl border border-white/5 bg-white/[0.02]">
          <Clapperboard className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-white mb-2">No clips found</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            You haven't generated any vertical video clips yet. Find one of your Blasts and hit "Create Clip" to get started.
          </p>
        </div>
      )}
    </div>
  );
}
