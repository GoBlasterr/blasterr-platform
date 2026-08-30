import { useLocation, useParams } from "wouter";
import { useGetUserProfile, useToggleFollow, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { BlastCard, BlastSkeleton } from "@/components/shared/blast-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Calendar, Link as LinkIcon, UserPlus, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function Profile() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const username = params.username || "";
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"blasts" | "media">("blasts");
  
  const { data: profile, isLoading } = useGetUserProfile(username);
  const followMutation = useToggleFollow();

  const handleFollow = () => {
    followMutation.mutate(
      { username },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey(username) });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="h-48 bg-card animate-pulse"></div>
        <div className="px-6 relative -mt-16">
           <div className="w-32 h-32 rounded-full bg-background border-4 border-background animate-pulse"></div>
        </div>
        <div className="p-6">
          <BlastSkeleton />
          <BlastSkeleton />
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="p-12 text-center text-muted-foreground">Profile not found</div>;
  }

  const joinDate = profile.joinedAt ? format(new Date(profile.joinedAt), 'MMMM yyyy') : '';

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 glass-panel border-b border-white/10 px-4 py-3 flex items-center gap-6">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full hover:bg-white/10">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="font-bold text-xl text-white leading-tight">{profile.displayName}</h2>
          <p className="text-xs text-muted-foreground">{profile.blastCount} Blasts</p>
        </div>
      </div>

      {/* Cover */}
      <div className="h-32 sm:h-48 w-full bg-card relative">
        {profile.coverUrl && (
          <img
            src={profile.coverUrl}
            alt={`${profile.displayName} profile banner`}
            className="w-full h-full object-cover opacity-80"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        )}
      </div>

      {/* Profile Info */}
      <div className="px-4 sm:px-6 relative -mt-16 z-10 pb-4 border-b border-white/10">
        <div className="flex justify-between items-start mb-4">
          <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-background">
            <AvatarImage src={profile.avatarUrl || undefined} />
            <AvatarFallback className="text-3xl">{profile.displayName[0]}</AvatarFallback>
          </Avatar>
          
          <div className="pt-16 sm:pt-20">
            {/* Logic to hide button if it's current user goes here in a real app */}
            <Button 
              variant={profile.isFollowing ? "outline" : "default"}
              className={`rounded-full px-6 font-bold ${!profile.isFollowing ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border-white/20 text-white hover:bg-white/5'}`}
              onClick={handleFollow}
              disabled={followMutation.isPending}
            >
              {profile.isFollowing ? <><UserMinus className="w-4 h-4 mr-2"/> Unfollow</> : <><UserPlus className="w-4 h-4 mr-2"/> Follow</>}
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <h1 className="font-display font-bold text-2xl text-white">{profile.displayName}</h1>
          <p className="text-muted-foreground text-[15px]">@{profile.username}</p>
        </div>

        {profile.bio && <p className="text-white/90 text-[15px] mb-4 leading-relaxed">{profile.bio}</p>}

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4">
          {profile.location && (
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {profile.location}</span>
          )}
          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Joined {joinDate}</span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="cursor-pointer hover:underline">
            <span className="font-bold text-white">{profile.following}</span> <span className="text-muted-foreground">Following</span>
          </div>
          <div className="cursor-pointer hover:underline">
            <span className="font-bold text-white">{profile.followers}</span> <span className="text-muted-foreground">Followers</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="border-b border-white/5 px-4">
          <TabsList className="bg-transparent p-0 h-12 gap-8 rounded-none">
            <TabsTrigger 
              value="blasts" 
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 relative text-muted-foreground hover:text-white data-[state=active]:text-white font-bold text-[15px]"
            >
              Blasts
              {activeTab === "blasts" && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(229,244,3,0.5)]" />}
            </TabsTrigger>
            <TabsTrigger 
              value="media" 
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 relative text-muted-foreground hover:text-white data-[state=active]:text-white font-bold text-[15px]"
            >
              Media
              {activeTab === "media" && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(229,244,3,0.5)]" />}
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* Feed */}
      <div className="flex-1 pb-24 md:pb-0">
        {activeTab === "blasts" ? (
          profile.blasts?.length ? (
            profile.blasts.map((blast: any) => (
              <BlastCard key={blast.id} blast={blast} />
            ))
          ) : (
            <div className="p-12 text-center text-muted-foreground">No blasts yet.</div>
          )
        ) : (
           profile.media?.length ? (
            profile.media.map((blast: any) => (
              <BlastCard key={blast.id} blast={blast} />
            ))
          ) : (
            <div className="p-12 text-center text-muted-foreground">No media posted yet.</div>
          )
        )}
      </div>
    </div>
  );
}
