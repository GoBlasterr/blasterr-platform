import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  BarChart, 
  Users, 
  MessageSquare, 
  Flag, 
  ShieldAlert, 
  Activity, 
  Settings, 
  Server,
  FileText,
  UserCog,
  DollarSign,
  Megaphone,
  Sliders,
  FileWarning,
  Scale,
  TrendingUp,
  Bell,
  Video
} from "lucide-react";
import { useHealthCheck } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";

const NAVIGATION = [
  { label: "Overview", href: "/overview", icon: BarChart },
  { label: "Media", href: "/media", icon: Video },
  { label: "Users", href: "/users", icon: Users },
  { label: "Content", href: "/content", icon: MessageSquare },
  { label: "Reports", href: "/reports", icon: Flag },
  { label: "Moderation", href: "/moderation", icon: ShieldAlert },
  { label: "Analytics", href: "/analytics", icon: Activity },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "System", href: "/system", icon: Server },
  { label: "Audit Log", href: "/audit-log", icon: FileText },
  { label: "Admins", href: "/admins", icon: UserCog },
  { label: "Revenue", href: "/revenue", icon: DollarSign },
  { label: "Announcements", href: "/announcements", icon: Megaphone },
  { label: "Feature Controls", href: "/feature-controls", icon: Sliders },
  { label: "Blocked Words", href: "/blocked-words", icon: FileWarning },
  { label: "Appeals", href: "/appeals", icon: Scale },
  { label: "Trending", href: "/trending", icon: TrendingUp },
  { label: "Notifications", href: "/notifications", icon: Bell },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const { data: health, isError } = useHealthCheck();

  const handleLinkClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <aside className="w-64 bg-card border-r flex flex-col h-[100dvh] overflow-y-auto">
      <div className="px-5 py-4 border-b flex items-center shrink-0">
        <img
          src={`${import.meta.env.BASE_URL}blasterr-logo.png`}
          alt="Blasterr"
          className="w-full max-w-[208px] h-auto object-contain object-left"
          data-testid="img-blasterr-logo"
        />
      </div>
      
      <div className="flex-1 py-4 overflow-y-auto">
        <div className="px-4 mb-2 text-xs font-mono font-bold text-muted-foreground tracking-wider">
          CORE
        </div>
        <nav className="space-y-0.5 px-2">
          {NAVIGATION.slice(0, 6).map((item) => {
            const isActive = location === item.href || (location === "/" && item.href === "/overview");
            return (
              <Link key={item.href} href={item.href} className="block" onClick={handleLinkClick} data-testid={`nav-${item.label.toLowerCase()}`}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 mt-6 mb-2 text-xs font-mono font-bold text-muted-foreground tracking-wider">
          MANAGEMENT
        </div>
        <nav className="space-y-0.5 px-2">
          {NAVIGATION.slice(6, 12).map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="block" onClick={handleLinkClick} data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 mt-6 mb-2 text-xs font-mono font-bold text-muted-foreground tracking-wider">
          OPERATIONS
        </div>
        <nav className="space-y-0.5 px-2">
          {NAVIGATION.slice(12).map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="block" onClick={handleLinkClick} data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t mt-auto shrink-0 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isError ? "bg-destructive animate-pulse" : health?.status === "ok" ? "bg-emerald-500" : "bg-muted"
            )} />
            <span className="text-xs font-mono font-medium text-muted-foreground">
              {isError ? "SYS_ERR" : health?.status === "ok" ? "SYS_OK" : "SYS_CHK"}
            </span>
          </div>
          <Badge variant={isError ? "destructive" : "outline"} className="text-[10px] uppercase font-mono rounded-none">
            API
          </Badge>
        </div>
      </div>
    </aside>
  );
}
