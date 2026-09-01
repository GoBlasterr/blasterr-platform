import { Link } from "wouter";
import { SignIn as ClerkSignIn } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function SignIn() {
  return (
    <div className="h-[100dvh] min-h-0 bg-background flex flex-col relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] mix-blend-screen pointer-events-none"></div>

      <header className="p-4 pt-10 md:p-6 md:pt-12 relative z-10 flex items-center justify-end max-w-7xl mx-auto w-full">
        <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 hover:opacity-80 transition-opacity" aria-label="Go to BLASTERR home">
          <img src="/logo.png" alt="BLASTERR" className="h-14 md:h-18 w-auto object-contain" />
        </Link>
        <Link href="/">
          <Button variant="ghost" className="text-muted-foreground hover:text-white rounded-full">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Base
          </Button>
        </Link>
      </header>

      <main className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto p-3 md:p-6 relative z-10">
        <div className="w-full max-w-md">
          <div className="glass-panel p-3 md:p-5 rounded-3xl border border-white/10 shadow-2xl">
            <h1 className="font-display font-bold text-2xl text-white mb-1 text-center">Access Comm Link</h1>
            <p className="text-muted-foreground mb-2 text-center">Enter credentials to resume your session.</p>

            <ClerkSignIn
              appearance={{
                elements: {
                  logoBox: { display: "none" },
                  logoImage: { display: "none" },
                  headerTitle: { display: "none" },
                  headerSubtitle: { display: "none" },
                  rootBox: { width: "100%", padding: 0 },
                  card: { width: "100%", padding: 0, boxShadow: "none", background: "transparent" },
                  main: { gap: "4px" },
                  content: { gap: "4px" },
                  form: { gap: "6px" },
                  socialButtons: { gap: "4px" },
                  socialButtonsBlockButton: { height: "34px", minHeight: "34px", padding: "4px 8px" },
                  dividerRow: { margin: "4px 0" },
                  formFieldRow: { marginBottom: "6px" },
                  formFieldInput: { height: "36px", minHeight: "36px", padding: "6px 10px" },
                  formButtonPrimary: { height: "36px", minHeight: "36px", padding: "6px 10px" },
                  footer: { marginTop: "6px" },
                  footerAction: { marginTop: "6px" },
                },
              }}
              routing="path"
              path={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/sign-in`}
              signUpUrl={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/sign-up`}
              forceRedirectUrl={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/home`}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
