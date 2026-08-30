import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  Compass, 
  MapPin, 
  Search, 
  Bell, 
  Bookmark, 
  Settings, 
  ShieldAlert,
  PenSquare,
  User,
  LogOut,
  LogIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { data: user } = useGetCurrentUser();

  const navItems = [
    { icon: Home, label: "Home", href: "/home" },
    { icon: Compass, label: "Trending", href: "/trending" },
    { icon: MapPin, label: "Nearby", href: "/nearby" },
    { icon: Search, label: "Search", href: "/search" },
  ];

  if (user) {
    navItems.push(
      { icon: Bell, label: "Notifications", href: "/notifications" },
      { icon: Bookmark, label: "Bookmarks", href: "/bookmarks" },
      { icon: User, label: "Profile", href: `/profile/${user.username}` },
      { icon: Settings, label: "Settings", href: "/settings" }
    );
  }

  // Hide shell on auth pages and landing
  if (location === "/" || location === "/splash" || location === "/sign-in" || location === "/sign-up") {
    return <>{children}</>;
  }

  return (
    <div className={`min-h-[100dvh] bg-background text-foreground flex flex-col md:flex-row relative z-0 ${location === "/home" ? "home-icons-unified" : ""}`}>
      
      <div className="cosmic-noise pointer-events-none fixed inset-0 z-[-1] opacity-30"></div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col justify-between p-6 border-r border-white/5 glass-panel sticky top-0 h-screen">
        <div>
          <Link href="/" className="flex items-center justify-center gap-3 mb-10 hover:opacity-80 transition-opacity" aria-label="Go to BLASTERR home">
            <img src="/sidebar-logo.png" alt="BLASTERR" className="h-16 w-auto object-contain object-left" />
          </Link>

          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive ? 'bg-primary/10 text-primary neon-border' : 'hover:bg-white/5 text-muted-foreground hover:text-white'}`}>
                  <item.icon className={`w-6 h-6 transition-transform group-hover:scale-110 ${isActive ? 'text-primary' : ''}`} />
                  <span className="font-medium text-lg">{item.label}</span>
                </Link>
              );
            })}
            
            {user && (
              <Link href="/admin" className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group mt-4 ${location === '/admin' ? 'bg-destructive/20 text-destructive border border-destructive/30' : 'hover:bg-destructive/10 text-destructive/70 hover:text-destructive'}`}>
                <ShieldAlert className="w-6 h-6" />
                <span className="font-medium text-lg">Command Center</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="flex flex-col gap-4">
          {user ? (
            <>
              <Link href="/create" className="w-full">
                <Button size="lg" className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold text-xl shadow-[0_0_20px_rgba(229,244,3,0.4)] transition-all hover:shadow-[0_0_30px_rgba(229,244,3,0.6)] hover:scale-[1.02]">
                  <PenSquare className="w-5 h-5 mr-2" />
                  BLAST
                </Button>
              </Link>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 mt-4">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.username} className="w-10 h-10 rounded-full border border-primary/50" />
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
      <main className="flex-1 flex justify-center pb-20 md:pb-0">
        <div className="w-full max-w-2xl min-h-screen border-r border-white/5 bg-background/50 backdrop-blur-sm">
          {children}
        </div>
        
        {/* Right Sidebar (Desktop only) */}
        <aside className="hidden xl:block w-[350px] p-6 sticky top-0 h-screen overflow-y-auto custom-scrollbar">
           {/* Add right sidebar content later like "Trending Targets" or "Who to follow" */}
           <div className="glass-panel p-5 rounded-2xl mb-6">
             <h3 className="font-display font-bold text-lg mb-4 text-white">Trending Targets</h3>
             <div className="text-sm text-muted-foreground italic">Connect API to see targets</div>
           </div>
        </aside>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-white/10 z-50 px-6 py-3 flex justify-between items-center safe-area-bottom">
        {navItems.slice(0, 5).map((item) => (
          <Link key={item.href} href={item.href} className={`flex flex-col items-center p-2 rounded-lg ${location === item.href ? 'text-primary' : 'text-muted-foreground'}`}>
            <item.icon className="w-6 h-6" />
          </Link>
        ))}
        {user && (
          <Link href="/create" className="absolute -top-6 left-1/2 -translate-x-1/2">
            <Button size="icon" className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-[0_0_20px_rgba(229,244,3,0.4)]">
              <PenSquare className="w-6 h-6" />
            </Button>
          </Link>
        )}
      </nav>
    </div>
  );
}
