import { useState, useRef, useCallback } from "react";
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
  getGetFeedQueryKey,
  getGetTargetQueryKey,
  getGetUserProfileQueryKey,
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

// --- Components ---

export function BlastCard({ blast, showTarget = true, showMedia = false }: { blast: any, showTarget?: boolean, showMedia?: boolean }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [blastBackText, setBlastBackText] = useState("");
  
  const reactMutation = useReactToBlast();
  const bookmarkMutation = useToggleBookmark();
  const deleteMutation = useDeleteBlast();
  const blastBackMutation = useCreateBlastBack();
  const { data: currentUser } = useCurrentUser();
  const canDelete = currentUser?.id === blast.author?.id;

  const handleReact = (type: ReactionInputType) => {
    reactMutation.mutate(
      { id: blast.id, data: { type } },
      {
        onSuccess: () => {
          // Optimistic update would go here, invalidating for now
          queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
        }
      }
    );
  };

  const handleBookmark = () => {
    bookmarkMutation.mutate(
      { id: blast.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
          toast({ title: blast.isBookmarked ? "Bookmark removed" : "Bookmark saved" });
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
          queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
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
          queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
          setBlastBackText("");
          setIsReplying(false);
          toast({ title: "Blast Back fired" });
        },
        onError: () => toast({ title: "Blast Back failed", variant: "destructive" }),
      },
    );
  };

  // Safe fallback for parsing dates
  const timeAgo = blast.createdAt ? formatDistanceToNow(new Date(blast.createdAt), { addSuffix: true }) : '';

  return (
    <div className="p-5 border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setLocation(`/target/${blast.target.slug}`)}>
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="shrink-0 pt-1" onClick={(e) => { e.stopPropagation(); setLocation(`/profile/${blast.author.username}`); }}>
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
                  onClick={(e) => { e.stopPropagation(); setLocation(`/profile/${blast.author.username}`); }}
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
            {blast.content}
          </p>

          {showMedia && blast.mediaUrl && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-white/10">
              {blast.mediaType === 'video' ? (
                 <div className="aspect-video bg-black flex items-center justify-center text-muted-foreground">
                   [Video Player Placeholder]
                 </div>
              ) : (
                <img src={blast.mediaUrl} alt="Attached media" className="w-full h-auto object-cover max-h-96" />
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

            <Button variant="ghost" size="sm" className="h-8 hover:text-primary gap-1.5" onClick={(e) => { e.stopPropagation(); setIsReplying(true); }}>
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs font-medium">{blast.commentCount || 0}</span>
            </Button>

            <Button variant="ghost" size="sm" className="h-8 hover:text-purple-400 gap-1.5" onClick={(e) => { e.stopPropagation(); }}>
              <Repeat2 className="h-4 w-4" />
              <span className="text-xs font-medium">{blast.shareCount || 0}</span>
            </Button>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-400" onClick={(e) => { e.stopPropagation(); }}>
                <Eye className="h-4 w-4" />
              </Button>
              
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
