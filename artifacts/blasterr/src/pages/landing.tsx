import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Globe, Zap, Users, Crosshair } from "lucide-react";
import { useGetCurrentUser } from "@workspace/api-client-react";

export default function Landing() {
  const { data: user, isLoading } = useGetCurrentUser();

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden flex flex-col">
      {/* Animated deep space background elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] mix-blend-screen animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] mix-blend-screen animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[40%] left-[60%] w-[20%] h-[20%] bg-purple-600/10 rounded-full blur-[100px] mix-blend-screen animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-3 hover:opacity-80 transition-opacity" aria-label="Go to BLASTERR home">
          <img src="/word-logo.png" alt="BLASTERR" className="h-12 md:h-20 w-auto" />
        </Link>
        <div className="ml-auto flex items-center gap-4">
          {isLoading ? null : user ? (
            <Link href="/splash" className="flex items-center">
              <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full px-3 md:px-6 text-sm md:text-base">
                Go to App
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="hidden md:block text-muted-foreground hover:text-white font-medium transition-colors">
                Sign In
              </Link>
              <Link href="/sign-up">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-3 md:px-6 text-sm md:text-base shadow-[0_0_15px_rgba(229,244,3,0.3)]">
                  Join Now
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-6 text-center max-w-5xl mx-auto">
        <div className="relative top-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-8">
          <Zap className="w-4 h-4" />
          <span>The New Social Command Center</span>
        </div>
        
        <h1 className="font-display text-5xl md:text-7xl font-black text-white leading-[1.1] mb-6 tracking-tight">
          Target <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-400">Everything.</span><br />
          Start the Conversation.
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mb-12 font-light">
          A sophisticated digital universe where every person, place, business, product, event, or idea becomes a Target for public discussion.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={user ? "/splash" : "/sign-up"}>
            <Button size="lg" className="h-12 rounded-full px-8 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_rgba(229,244,3,0.4)] transition-transform hover:scale-105">
              Launch Comm Link
            </Button>
          </Link>
        </div>
      </main>

      {/* Feature Grid */}
      <section className="relative z-10 bg-black/40 border-t border-white/5 py-12 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-panel p-8 rounded-3xl flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
              <Crosshair className="w-14 h-14 text-primary" />
            </div>
            <h3 className="font-display text-2xl font-bold text-white mb-3">Lock On Targets</h3>
            <p className="text-muted-foreground leading-relaxed">
              Create a Target for anything. A local coffee shop, a new tech gadget, or a global event. If it exists, you can Blast about it.
            </p>
          </div>
          
          <div className="glass-panel p-8 rounded-3xl flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
              <Globe className="w-14 h-14 text-primary" />
            </div>
            <h3 className="font-display text-2xl font-bold text-white mb-3">Global & Nearby</h3>
            <p className="text-muted-foreground leading-relaxed">
              Discover what the universe is talking about right now. Filter by global trends or dial into your exact coordinates.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-3xl flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
              <Users className="w-14 h-14 text-primary" />
            </div>
            <h3 className="font-display text-2xl font-bold text-white mb-3">Blast Back</h3>
            <p className="text-muted-foreground leading-relaxed">
              Don't just reply—quote, remix, and amplify with Blast Backs. React with Facts, Cap, Funny, or Watching to gauge sentiment.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-muted-foreground text-sm">
        <p>© {new Date().getFullYear()} BLASTERR Universe. All systems operational.</p>
      </footer>
    </div>
  );
}
