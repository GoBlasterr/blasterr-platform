import { Link } from "wouter";
import { SignUp as ClerkSignUp } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

export default function SignUp() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] mix-blend-screen pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[80px] mix-blend-screen pointer-events-none"></div>

      <header className="p-6 relative z-10 flex items-center justify-end max-w-7xl mx-auto w-full">
        <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 hover:opacity-80 transition-opacity" aria-label="Go to BLASTERR home">
          <img src="/logo.png" alt="BLASTERR" className="h-16 md:h-20 w-auto object-contain" />
        </Link>
        <Link href="/">
          <Button variant="ghost" className="text-muted-foreground hover:text-white rounded-full">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Base
          </Button>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md -translate-y-8 md:-translate-y-14">
          <div className="glass-panel p-8 md:p-10 rounded-3xl border border-white/10 shadow-2xl">
            <h1 className="font-display font-bold text-3xl text-white mb-2 text-center">Request Clearance</h1>
            <p className="text-muted-foreground mb-8 text-center">Join the network and start targeting.</p>

            <ClerkSignUp
              routing="path"
              path={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/sign-up`}
              signInUrl={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/sign-in`}
              forceRedirectUrl={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/home`}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
