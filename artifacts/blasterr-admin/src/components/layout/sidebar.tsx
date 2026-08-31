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
  Video,
  Target,
  Briefcase,
  Megaphone as CampaignIcon,
  CheckCircle,
  Clock,
  PauseCircle,
  XCircle,
  PlayCircle,
  Globe2
} from "lucide-react";
import { useHealthCheck } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";

const NAVIGATION_GROUPS = [
  {
    label: "CORE",
    items: [
      { label: "Overview", href: "/overview", icon: BarChart },
      { label: "Media", href: "/media", icon: Video },
      { label: "Website CMS", href: "/cms", icon: Globe2 },
      { label: "Users", href: "/users", icon: Users },
      { label: "Content", href: "/content", icon: MessageSquare },
      { label: "Reports", href: "/reports", icon: Flag },
      { label: "Moderation", href: "/moderation", icon: ShieldAlert },
    ]
  },
  {
    label: "ADVERTISING",
    items: [
      { label: "Ads Overview", href: "/advertising", icon: Target },
      { label: "Advertisers", href: "/advertising/advertisers", icon: Briefcase },
      { label: "Campaigns", href: "/advertising/campaigns", icon: CampaignIcon },
      { label: "Ad Groups", href: "/advertising/ad-groups", icon: Sliders },
      { label: "Advertisements", href: "/advertising/advertisements", icon: Megaphone },
      { label: "Ad Creatives", href: "/advertising/creatives", icon: Video },
      { label: "Approvals", href: "/advertising/approvals", icon: CheckCircle },
      { label: "Live Ads", href: "/advertising/live", icon: PlayCircle },
      { label: "Scheduled Ads", href: "/advertising/scheduled", icon: Clock },
      { label: "Paused Ads", href: "/advertising/paused", icon: PauseCircle },
      { label: "Rejected Ads", href: "/advertising/rejected", icon: XCircle },
      { label: "Boosted Content", href: "/advertising/boosted", icon: TrendingUp },
      { label: "Sponsored Content", href: "/advertising/sponsored", icon: Megaphone },
      { label: "Sponsored Trends", href: "/advertising/trends", icon: TrendingUp },
      { label: "Sponsored Hashtags", href: "/advertising/hashtags", icon: Target },
      { label: "Featured Promotions", href: "/advertising/promotions", icon: CheckCircle },
      { label: "Targeting", href: "/advertising/targeting", icon: Target },
      { label: "Budgets", href: "/advertising/budgets", icon: DollarSign },
      { label: "Billing & Payments", href: "/advertising/billing", icon: DollarSign },
      { label: "Transactions", href: "/advertising/transactions", icon: FileText },
      { label: "Ad Revenue", href: "/advertising/revenue", icon: Activity },
      { label: "Advertising Analytics", href: "/advertising/analytics", icon: BarChart },
      { label: "Ad Reports", href: "/advertising/reports", icon: Flag },
      { label: "Fraud & Abuse", href: "/advertising/fraud", icon: ShieldAlert },
      { label: "Ad Settings", href: "/advertising/settings", icon: Settings },
      { label: "Ad Audit Log", href: "/advertising/audit", icon: FileText },
    ]
  },
  {
    label: "MANAGEMENT",
    items: [
      { label: "Analytics", href: "/analytics", icon: Activity },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "System", href: "/system", icon: Server },
      { label: "Audit Log", href: "/audit-log", icon: FileText },
      { label: "Admins", href: "/admins", icon: UserCog },
      { label: "Revenue", href: "/revenue", icon: DollarSign },
    ]
  },
  {
    label: "OPERATIONS",
    items: [
      { label: "Announcements", href: "/announcements", icon: Megaphone },
      { label: "Feature Controls", href: "/feature-controls", icon: Sliders },
      { label: "Blocked Words", href: "/blocked-words", icon: FileWarning },
      { label: "Appeals", href: "/appeals", icon: Scale },
      { label: "Trending", href: "/trending", icon: TrendingUp },
      { label: "Notifications", href: "/notifications", icon: Bell },
    ]
  }
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
      <div className="px-5 py-4 border-b flex items-center shrink-0 sticky top-0 bg-card z-10">
        <img
          src={`${import.meta.env.BASE_URL}blasterr-logo.png`}
          alt="Blasterr"
          className="w-full max-w-[208px] h-auto object-contain object-left"
          data-testid="img-blasterr-logo"
        />
      </div>
      
      <div className="flex-1 py-4 overflow-y-auto">
        {NAVIGATION_GROUPS.map((group, i) => (
          <div key={group.label} className={cn("mb-6", i === 0 ? "" : "")}>
            <div className="px-4 mb-2 text-xs font-mono font-bold text-muted-foreground tracking-wider">
              {group.label}
            </div>
            <nav className="space-y-0.5 px-2">
              {group.items.map((item) => {
                const isActive = location === item.href || (location === "/" && item.href === "/overview");
                return (
                  <Link key={item.href} href={item.href} className="block" onClick={handleLinkClick} data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
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
        ))}
      </div>

      <div className="p-4 border-t mt-auto shrink-0 bg-muted/30 sticky bottom-0">
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
