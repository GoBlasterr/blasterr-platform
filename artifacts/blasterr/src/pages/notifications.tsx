import { useGetNotifications } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { 
  Heart, 
  MessageSquare, 
  UserPlus, 
  Repeat2, 
  Target,
  AtSign,
  TrendingUp,
  Flame,
  Star
} from "lucide-react";
import { useLocation } from "wouter";
import { TranslatedText } from "@/components/shared/translated-text";

export default function Notifications() {
  const [, setLocation] = useLocation();
  const { data: notifications, isLoading } = useGetNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case 'follow': return <UserPlus className="w-5 h-5 text-blue-400" />;
      case 'reaction': return <Star className="w-5 h-5 text-yellow-400" />;
      case 'comment': return <MessageSquare className="w-5 h-5 text-green-400" />;
      case 'reply': return <MessageSquare className="w-5 h-5 text-green-400" />;
      case 'blast-back': return <Repeat2 className="w-5 h-5 text-purple-400" />;
      case 'mention': return <AtSign className="w-5 h-5 text-primary" />;
      case 'trending': return <Flame className="w-5 h-5 text-orange-500" />;
      case 'target': return <Target className="w-5 h-5 text-pink-400" />;
      default: return <Star className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const handleNavigate = (notification: any) => {
    // In a real app, logic depends on notification type and ids attached
    if (notification.type === 'follow') {
      setLocation(`/profile/${notification.actor.username}`);
    } else {
      // Default to home or specific blast
      setLocation('/home');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-20 glass-panel border-b border-white/10 p-4">
        <h2 className="font-display font-bold text-2xl text-white">Notifications</h2>
      </div>

      <div className="flex-1 pb-24 md:pb-0 divide-y divide-white/5">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Loading comms...</div>
        ) : notifications?.length ? (
          notifications.map((notif: any) => (
            <div 
              key={notif.id} 
              className={`p-4 flex gap-4 cursor-pointer transition-colors ${notif.read ? 'hover:bg-white/[0.02]' : 'bg-primary/5 hover:bg-primary/10'}`}
              onClick={() => handleNavigate(notif)}
            >
              <div className="pt-1 shrink-0">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <Avatar className="w-8 h-8 mb-2 border border-white/10">
                  <AvatarImage src={notif.actor.avatarUrl || undefined} />
                  <AvatarFallback>{notif.actor.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="text-[15px] text-white/90">
                  <span className="font-bold text-white mr-1">{notif.actor.displayName}</span>
                  <TranslatedText text={notif.message} context="notification" />
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            No notifications yet.
          </div>
        )}
      </div>
    </div>
  );
}
