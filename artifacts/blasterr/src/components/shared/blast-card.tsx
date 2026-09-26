import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { 
  useGetFeed, 
  useCreateBlast,
  useReactToBlast,
  useToggleBookmark,
  useCreateBlastBack,
  useDeleteBlast,
  useRecordBlastView,
  useShareBlast,
  getGetFeedQueryKey,
  getGetTrendingQueryKey,
  getGetBookmarksQueryKey,
  getGetBusinessQueryKey,
  getGetTargetQueryKey,
  getGetUserProfileQueryKey,
  getSearchQueryKey,
  ReactionInputType
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { TranslatedText } from "@/components/shared/translated-text";
import { preloadProfileMedia } from "@/components/shared/profile-media-image";

import { 
  MessageSquare, 
  Repeat2, 
  Eye, 
  Bookmark, 
  MoreHorizontal, 
  Trash2, 
  Flag,
  CheckCircle2, // Facts
  AlertOctagon, // Cap
  Laugh, // Funny
  Eye as EyeIcon, // Watching
  Film
} from "lucide-react";

// --- Types & Constants ---
// We import types from generated schema indirectly via components, but define simple local schemas for forms.

const blastSchema = z.object({
  content: z.string().min(1, "Blast cannot be empty").max(1000, "Maximum 1000 characters"),
});

const viewedBlastIds = new Set<string>();

function patchBlastCollections(data: unknown, blastId: string, patch: Record<string, unknown>): unknown {
  const patchList = (items: unknown[]) => items.map((item) => {
    if (!item || typeof item !== "object" || !("id" in item) || item.id !== blastId) return item;
    return { ...item, ...patch };
  });

  if (Array.isArray(data)) return patchList(data);
  if (!data || typeof data !== "object") return data;

  const record = data as Record<string, unknown>;
  let changed = false;
  const next = { ...record };
  for (const key of ["items", "blasts"]) {
    if (Array.isArray(record[key])) {
      next[key] = patchList(record[key]);
      changed = true;
    }
  }
  return changed ? next : data;
}

// --- Components ---

export function BlastCard({ blast, showTarget = true, showMedia = false, isThreadReply = false, isThreadRoot = false, threadContext }: { blast: any, showTarget?: boolean, showMedia?: boolean, isThreadReply?: boolean, isThreadRoot?: boolean, threadContext?: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [blastBackText, setBlastBackText] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const reactMutation = useReactToBlast();
  const bookmarkMutation = useToggleBookmark();
  const deleteMutation = useDeleteBlast();
  const blastBackMutation = useCreateBlastBack();
  const viewMutation = useRecordBlastView();
  const shareMutation = useShareBlast();
  const { data: currentUser } = useCurrentUser();
  const canDelete = currentUser?.id === blast.author?.id;
  const blastQueryKeys = [
    getGetFeedQueryKey(),
    getGetTrendingQueryKey(),
    getGetBookmarksQueryKey(),
    getSearchQueryKey(),
    ...(blast.target?.slug
      ? [getGetTargetQueryKey(blast.target.slug), getGetBusinessQueryKey(blast.target.slug)]
      : []),
    ...(blast.author?.username ? [getGetUserProfileQueryKey(blast.author.username)] : []),
  ];
  const patchBlastCaches = (patch: Record<string, unknown>) => {
    for (const queryKey of blastQueryKeys) {
      queryClient.setQueriesData(
        { queryKey },
        (data: unknown) => patchBlastCollections(data, blast.id, patch),
      );
    }
  };
  const refreshBlastQueries = () => Promise.all(
    blastQueryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showMedia || blast.mediaType !== "video") return;

    video.muted = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          video.muted = true;
          void video.play().catch(() => {
            // Autoplay can still be blocked by a browser policy.
          });
        } else {
          video.pause();
        }
      },
      { threshold: [0, 0.6] },
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [blast.mediaType, blast.mediaUrl, showMedia]);

  useEffect(() => {
    const card = cardRef.current;
    if (
      !card
      || !blast.id
      || viewedBlastIds.has(blast.id)
      || typeof IntersectionObserver === "undefined"
    ) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.5 || viewedBlastIds.has(blast.id)) return;
      viewedBlastIds.add(blast.id);
      viewMutation.mutate(
        { id: blast.id },
        {
          onSuccess: ({ viewCount }) => {
            patchBlastCaches({ viewCount });
            observer.disconnect();
          },
          onError: () => viewedBlastIds.delete(blast.id),
        },
      );
    }, { threshold: [0, 0.5] });

    observer.observe(card);
    return () => observer.disconnect();
  }, [blast.id]);

  const handleReact = (type: ReactionInputType) => {
    reactMutation.mutate(
      { id: blast.id, data: { type } },
      {
        onSuccess: (reactions) => {
          patchBlastCaches({ reactions });
          if (blast.target?.slug) {
            void queryClient.invalidateQueries({ queryKey: getGetTargetQueryKey(blast.target.slug) });
          }
        },
        onError: () => toast({
          title: "Reaction not saved",
          description: "Sign in and try again.",
          variant: "destructive",
        }),
      }
    );
  };

  const handleBookmark = () => {
    bookmarkMutation.mutate(
      { id: blast.id },
      {
        onSuccess: ({ isBookmarked }) => {
          patchBlastCaches({ isBookmarked });
          void queryClient.invalidateQueries({ queryKey: getGetBookmarksQueryKey() });
          toast({ title: isBookmarked ? "Bookmark saved" : "Bookmark removed" });
        }
      }
    );
  };

  const handleDelete = () => {
    setIsDeleting(true);
    deleteMutation.mutate(
      { id: blast.id },
      {
        onSuccess: () => {
          void refreshBlastQueries();
          toast({ title: "Blast deleted" });
          setIsDeleting(false);
        },
        onError: () => setIsDeleting(false)
      }
    );
  };

  const handleBlastBack = () => {
    const content = blastBackText.trim();
    if (!content) return;
    blastBackMutation.mutate(
      { id: blast.id, data: { content, targetId: blast.target.id } },
      {
        onSuccess: () => {
          void refreshBlastQueries();
          setBlastBackText("");
          setIsReplying(false);
          toast({ title: "Blast Back fired" });
        },
        onError: () => toast({ title: "Blast Back failed", variant: "destructive" }),
      },
    );
  };

  const handleShare = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const url = new URL(`/target/${blast.target.slug}#blast-${blast.id}`, window.location.origin).toString();

    try {
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: `BLASTERR — ${blast.target.name}`,
            text: blast.content,
            url,
          });
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          await navigator.clipboard.writeText(url);
          toast({ title: "Share link copied" });
        }
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Share link copied" });
      }

      shareMutation.mutate(
        { id: blast.id },
        {
          onSuccess: ({ shareCount }) => {
            patchBlastCaches({ shareCount });
            if (blast.target?.slug) {
              void queryClient.invalidateQueries({ queryKey: getGetTargetQueryKey(blast.target.slug) });
            }
          },
          onError: () => toast({ title: "Share count could not be saved", variant: "destructive" }),
        },
      );
    } catch {
      toast({
        title: "Could not share this Blast",
        description: "Your browser could not open sharing or copy the link.",
        variant: "destructive",
      });
    }
  };

  // Safe fallback for parsing dates
  const timeAgo = blast.createdAt ? formatDistanceToNow(new Date(blast.createdAt), { addSuffix: true }) : '';
  const warmProfileMedia = () => preloadProfileMedia(blast.author?.coverUrl);

  return (
    <div
      id={`blast-${blast.id}`}
      ref={cardRef}
      className={isThreadReply
        ? "mb-2 cursor-pointer rounded-xl border border-white/10 bg-card/80 p-3 transition-colors hover:bg-white/[0.04] sm:p-4"
        : isThreadRoot
          ? "m-3 cursor-pointer rounded-xl border-2 border-primary bg-card p-5 shadow-[0_0_18px_rgba(229,244,3,0.24)] transition-colors hover:bg-primary/[0.04]"
          : "cursor-pointer border-b border-white/5 p-5 transition-colors hover:bg-white/[0.02]"}
      onClick={() => setLocation(`/target/${blast.target.slug}`)}
    >
      {threadContext && (
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          {threadContext}
        </div>
      )}
      <div className="flex gap-4">
        {/* Avatar */}
        <div
          className="shrink-0 pt-1"
          onMouseEnter={warmProfileMedia}
          onPointerDown={warmProfileMedia}
          onClick={(e) => { e.stopPropagation(); warmProfileMedia(); setLocation(`/profile/${blast.author.username}`); }}
        >
          <Avatar className="w-12 h-12 border border-white/10 hover:border-primary/50 transition-colors">
            <AvatarImage src={blast.author.avatarUrl || undefined} alt={blast.author.username} />
            <AvatarFallback className="bg-white/5 text-primary">{blast.author.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                <span 
                  className="font-bold text-white hover:underline truncate"
                  onMouseEnter={warmProfileMedia}
                  onPointerDown={warmProfileMedia}
                  onClick={(e) => { e.stopPropagation(); warmProfileMedia(); setLocation(`/profile/${blast.author.username}`); }}
                >
                  {blast.author.displayName}
                </span>
                <span className="text-muted-foreground truncate">@{blast.author.username}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{timeAgo}</span>
              </div>

              {showTarget && blast.target && (
                <span 
                  className="mt-2 inline-flex max-w-full text-primary hover:underline font-medium text-xs border border-primary/20 bg-primary/5 px-2 py-0.5 rounded-full truncate"
                  onClick={(e) => { e.stopPropagation(); setLocation(`/target/${blast.target.slug}`); }}
                >
                  Target: {blast.target.name}
                </span>
              )}
            </div>

            <DropdownMenu>
              <div className="flex items-center gap-1">
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:text-primary"
                    onClick={(e) => { e.stopPropagation(); setLocation(`/clips/create/${blast.id}`); }}
                  >
                    <Film className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-xs font-bold tracking-wide">CLIP</span>
                  </Button>
                )}
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white shrink-0" onClick={e => e.stopPropagation()}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </div>
              <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-xl border-white/10">
                 {canDelete && (
                   <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDelete(); }}>
                     <Trash2 className="h-4 w-4 mr-2" /> Delete Blast
                   </DropdownMenuItem>
                 )}
                <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); }}>
                  <Flag className="h-4 w-4 mr-2" /> Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="mt-2 text-[15px] leading-relaxed text-white whitespace-pre-wrap break-words">
            <TranslatedText text={blast.content} context="blast" />
          </p>

          {showMedia && blast.mediaUrl && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-white/10">
              {blast.mediaType === 'video' ? (
                <video
                  ref={videoRef}
                  src={blast.mediaUrl}
                  aria-label="Video attached to Blast"
                  className="aspect-video w-full bg-black object-contain"
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  onClick={(event) => event.stopPropagation()}
                >
                  Your browser does not support video playback.
                </video>
              ) : (
                <img
                  src={blast.mediaUrl}
                  alt="Attached media"
                  className="w-full h-auto object-cover max-h-96"
                  onClick={(event) => event.stopPropagation()}
                />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex max-w-md flex-wrap items-center gap-x-1 gap-y-2 text-muted-foreground sm:flex-nowrap sm:justify-between">
            
            {/* Reactions group */}
            <div className="flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/5" onClick={e => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 px-2 rounded-full hover:bg-white/10 hover:text-green-400 gap-1.5 ${blast.reactions?.currentUserReaction === 'facts' ? 'text-green-400 bg-green-400/10' : ''}`}
                onClick={() => handleReact('facts')}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">{blast.reactions?.facts || 0}</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 px-2 rounded-full hover:bg-white/10 hover:text-red-400 gap-1.5 ${blast.reactions?.currentUserReaction === 'cap' ? 'text-red-400 bg-red-400/10' : ''}`}
                onClick={() => handleReact('cap')}
              >
                <AlertOctagon className="h-4 w-4" />
                <span className="text-xs font-medium">{blast.reactions?.cap || 0}</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 px-2 rounded-full hover:bg-white/10 hover:text-yellow-400 gap-1.5 ${blast.reactions?.currentUserReaction === 'funny' ? 'text-yellow-400 bg-yellow-400/10' : ''}`}
                onClick={() => handleReact('funny')}
              >
                <Laugh className="h-4 w-4" />
                <span className="text-xs font-medium">{blast.reactions?.funny || 0}</span>
              </Button>
            </div>

            <Button variant="ghost" size="sm" className="h-8 hover:text-primary gap-1.5" aria-label={`Blast Back (${blast.blastBackCount || 0})`} onClick={(e) => { e.stopPropagation(); setIsReplying(true); }}>
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs font-medium">{blast.blastBackCount || 0}</span>
            </Button>

            <Button variant="ghost" size="sm" className="h-8 hover:text-purple-400 gap-1.5" aria-label={`Share Blast (${blast.shareCount || 0})`} onClick={handleShare}>
              <Repeat2 className="h-4 w-4" />
              <span className="text-xs font-medium">{blast.shareCount || 0}</span>
            </Button>

            <div className="flex items-center gap-1">
              <div className="flex h-8 items-center gap-1 px-2 text-xs" aria-label={`${blast.viewCount || 0} views`}>
                <Eye className="h-4 w-4" />
                <span className="font-medium">{blast.viewCount || 0}</span>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-8 w-8 hover:text-primary ${blast.isBookmarked ? 'text-primary' : ''}`} 
                onClick={(e) => { e.stopPropagation(); handleBookmark(); }}
              >
                <Bookmark className="h-4 w-4" fill={blast.isBookmarked ? "currentColor" : "none"} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Reply Dialog */}
      <Dialog open={isReplying} onOpenChange={setIsReplying}>
        <DialogContent className="sm:max-w-[500px] bg-card border-white/10" onClick={e => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Blast Back to @{blast.author.username}</DialogTitle>
          </DialogHeader>
          <div className="pt-4">
             <Textarea
               value={blastBackText}
               onChange={(event) => setBlastBackText(event.target.value)}
               placeholder="Add your take..."
               className="min-h-[100px] bg-background/50 border-white/10 text-white resize-none"
             />
             <div className="flex justify-end mt-4">
               <Button
                 className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6"
                 disabled={!blastBackText.trim() || blastBackMutation.isPending}
                 onClick={handleBlastBack}
               >
                 {blastBackMutation.isPending ? "Firing..." : "Blast Back"}
               </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function BlastSkeleton() {
  return (
    <div className="p-5 border-b border-white/5 flex gap-4">
      <Skeleton className="w-12 h-12 rounded-full shrink-0 bg-white/5" />
      <div className="flex-1 space-y-3 pt-1">
        <Skeleton className="h-4 w-1/3 bg-white/5" />
        <Skeleton className="h-4 w-full bg-white/5" />
        <Skeleton className="h-4 w-2/3 bg-white/5" />
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-8 w-24 rounded-full bg-white/5" />
          <Skeleton className="h-8 w-12 rounded-full bg-white/5" />
          <Skeleton className="h-8 w-12 rounded-full bg-white/5" />
        </div>
      </div>
    </div>
  );
}
