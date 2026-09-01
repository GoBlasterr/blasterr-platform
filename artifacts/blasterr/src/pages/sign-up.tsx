import { Link } from "wouter";
import { SignUp as ClerkSignUp } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function SignUp() {
  return (
    <div className="h-[100dvh] min-h-0 bg-background flex flex-col relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] mix-blend-screen pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[80px] mix-blend-screen pointer-events-none"></div>

      <header className="p-6 pt-20 md:pt-24 relative z-10 flex items-center justify-end max-w-7xl mx-auto w-full">
        <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 hover:opacity-80 transition-opacity" aria-label="Go to BLASTERR home">
          <img src="/logo.png" alt="BLASTERR" className="h-16 md:h-20 w-auto object-contain" />
        </Link>
        <Link href="/">
          <Button variant="ghost" className="text-muted-foreground hover:text-white rounded-full">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Base
          </Button>
        </Link>
      </header>

      <main className="flex-1 min-h-0 flex items-center justify-center p-4 md:p-6 relative z-10">
        <div className="w-full max-w-md">
          <div className="glass-panel p-5 md:p-6 rounded-3xl border border-white/10 shadow-2xl">
            <h1 className="font-display font-bold text-3xl text-white mb-1 text-center">Request Clearance</h1>
            <p className="text-muted-foreground mb-3 text-center">Join the network and start targeting.</p>

            <ClerkSignUp
              appearance={{
                elements: {
                  logoBox: { display: "none" },
                  logoImage: { display: "none" },
                  headerTitle: { display: "none" },
                  headerSubtitle: { display: "none" },
                  rootBox: { width: "100%", padding: 0 },
                  card: { width: "100%", padding: 0, boxShadow: "none", background: "transparent" },
                  socialButtons: { gap: "8px" },
                  socialButtonsBlockButton: { minHeight: "40px", padding: "8px 12px" },
                  dividerRow: { margin: "10px 0" },
                  formFieldRow: { marginBottom: "10px" },
                  formFieldInput: { minHeight: "40px", padding: "8px 12px" },
                  formButtonPrimary: { minHeight: "40px", padding: "8px 12px" },
                  footer: { marginTop: "10px" },
                  footerAction: { marginTop: "10px" },
                },
              }}
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
