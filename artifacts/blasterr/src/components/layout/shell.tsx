import { ReactNode, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  Compass, 
  MapPin, 
  Search, 
  Bell, 
  Bookmark, 
  Settings, 
  User,
  Users,
  LogOut,
  LogIn,
  Film,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClerk } from "@clerk/react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { FeedAdPlacement } from "@/components/shared/sponsored-blast-card";
import { AnnouncementsSurface } from "@/components/shared/announcements";
import { ProfileMediaImage } from "@/components/shared/profile-media-image";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [location] = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const { signOut } = useClerk();
  const { data: user } = useCurrentUser();

  const navItems = [
    { icon: Home, label: "Home", href: "/home" },
    { icon: Compass, label: "Trending", href: "/trending" },
    { icon: Briefcase, label: "Business", href: "/business" },
    { icon: MapPin, label: "Nearby", href: "/nearby" },
    { icon: Search, label: "Search", href: "/search" },
  ];
  const followingNavItem = { icon: Users, label: "Pages you follow", href: "/following" };

  if (user) {
    navItems.splice(1, 0, { icon: User, label: "Profile", href: `/profile/${user.username}` });
    navItems.push(
      { icon: Bell, label: "Notifications", href: "/notifications" },
      { icon: Bookmark, label: "Bookmarks", href: "/bookmarks" },
      { icon: Film, label: "My Clips", href: "/clips" },
      { icon: Settings, label: "Settings", href: "/settings" }
    );
  }

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);

  // Hide shell on auth pages and landing
  if (location === "/" || location === "/splash" || location === "/sign-in" || location === "/sign-up" || location === "/privacy" || location === "/terms" || location === "/disclaimer") {
    return <>{children}</>;
  }

  return (
    <div className={`h-[100dvh] overflow-hidden bg-background text-foreground flex flex-col md:flex-row relative z-0 ${location === "/home" ? "home-icons-unified" : ""}`}>
      
      <div className="cosmic-noise pointer-events-none fixed inset-0 z-[-1] opacity-30"></div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 min-h-0 flex-col justify-between overflow-y-auto custom-scrollbar p-6 border-r border-white/5 glass-panel sticky top-0 h-screen">
        <div>
          <Link href="/" className="flex items-center justify-center gap-3 mb-10 hover:opacity-80 transition-opacity" aria-label="Go to BLASTERR home">
            <img src="/sidebar-logo.png" alt="BLASTERR" className="relative top-4 h-20 w-auto object-contain object-left" />
          </Link>

          <nav className="flex flex-col gap-2" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive = location === item.href ||
                (item.href === "/trending" && location === "/trending/targets");
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive ? 'bg-primary/10 text-primary neon-border' : 'hover:bg-white/5 text-muted-foreground hover:text-white'}`}>
                  <item.icon className={`w-6 h-6 transition-transform group-hover:scale-110 ${isActive ? 'text-primary' : ''}`} />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              );
            })}
            {user && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                  Following
                </p>
                <Link
                  href={followingNavItem.href}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-200 group ${location === followingNavItem.href ? 'bg-primary/10 text-primary neon-border' : 'text-muted-foreground hover:bg-white/5 hover:text-white'}`}
                >
                  <followingNavItem.icon className={`h-6 w-6 transition-transform group-hover:scale-110 ${location === followingNavItem.href ? 'text-primary' : ''}`} />
                  <span className="font-medium text-sm">{followingNavItem.label}</span>
                </Link>
              </div>
            )}
          </nav>
        </div>

        <div className="flex flex-col gap-4">
          {user ? (
            <>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 mt-4">
                {user.avatarUrl ? (
                  <ProfileMediaImage
                    src={user.avatarUrl}
                    alt={user.username}
                    className="w-10 h-10 rounded-full border border-primary/50 object-cover"
                    fallback={
                      <div className="w-10 h-10 rounded-full border border-primary/50 bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {user.displayName.slice(0, 1)}
                      </div>
                    }
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full border border-primary/50 bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {user.displayName.slice(0, 1)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Sign out"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => signOut({ redirectUrl: basePath || "/" })}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-center text-muted-foreground mb-2">Join the conversation</p>
              <Link href="/sign-in" className="w-full">
                <Button variant="outline" className="w-full border-primary/50 text-primary hover:bg-primary/10">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up" className="w-full">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  Create Account
                </Button>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main ref={mainRef} className="min-h-0 flex-1 flex justify-center md:justify-start overflow-y-auto overscroll-contain pb-20 md:pb-0">
        <div className="w-full max-w-none min-h-screen border-r border-white/5 bg-background/50 backdrop-blur-sm">
          <AnnouncementsSurface />
          {children}
        </div>
        
        <aside className="hidden xl:block w-[350px] shrink-0 p-6 sticky top-0 h-screen overflow-y-auto custom-scrollbar">
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Paid advertisements</p>
              <p className="mt-1 text-xs text-muted-foreground">Sponsored content from approved partners</p>
            </div>
            <FeedAdPlacement placement="right_rail" />
          </div>
        </aside>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-white/10 z-50 px-4 py-3 flex justify-between items-center safe-area-bottom overflow-x-auto gap-2 no-scrollbar">
        {(user ? [navItems[0], navItems[1], followingNavItem, ...navItems.slice(2)] : navItems).map((item) => (
          <Link key={item.href} href={item.href} className={`flex flex-col items-center p-2 rounded-lg shrink-0 ${location === item.href || (item.href === '/business' && location.startsWith('/business')) ? 'text-primary' : 'text-muted-foreground'}`}>
            <item.icon className="w-6 h-6" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
