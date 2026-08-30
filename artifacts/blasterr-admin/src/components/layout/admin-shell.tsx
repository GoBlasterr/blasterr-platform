import { ReactNode, useState } from "react";
import { useClerk, useUser } from "@clerk/react";
import { Sidebar } from "./sidebar";
import { Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut } = useClerk();
  const { user } = useUser();
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ")
    || user?.username
    || user?.primaryEmailAddress?.emailAddress
    || "Staff user";
  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join("")
    || displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex w-full">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar - Desktop & Mobile */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform duration-200 ease-in-out`}>
        <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col w-full lg:pl-64 min-h-[100dvh]">
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10 shrink-0">
          <div className="flex items-center flex-1 gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden shrink-0" 
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Global search — backend required"
                disabled
                className="w-full bg-muted/50 border-transparent rounded-sm pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-colors font-mono placeholder:font-sans"
                data-testid="input-global-search"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              disabled
              className="relative"
              data-testid="button-alerts"
              aria-label="Notifications require backend integration"
            >
              <Bell className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3 pl-2 lg:pl-4 border-l">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold leading-none">{displayName}</p>
                <p className="text-xs text-muted-foreground mt-1">Server-authorized staff</p>
              </div>
              <div className="w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-sm flex items-center justify-center font-bold font-mono text-xs shrink-0">
                {initials}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-sm font-mono text-[10px] uppercase tracking-wider"
                onClick={() => void signOut({ redirectUrl: import.meta.env.BASE_URL.replace(/\/$/, '') || "/" })}
                data-testid="button-sign-out"
              >
                Sign out
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
