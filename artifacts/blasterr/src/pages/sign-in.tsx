import { useState, type FormEvent } from "react";
import { AuthenticateWithRedirectCallback } from "@clerk/react";
import { useSignIn } from "@clerk/react/legacy";
import { Link } from "wouter";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function messageFromError(cause: unknown): string {
  const error = cause as {
    errors?: Array<{ longMessage?: string; message?: string }>;
    message?: string;
  };

  return (
    error.errors?.[0]?.longMessage ||
    error.errors?.[0]?.message ||
    error.message ||
    "Unable to sign in with those credentials."
  );
}

export default function SignIn() {
  if (window.location.pathname.endsWith("/sso-callback")) {
    return <AuthenticateWithRedirectCallback />;
  }

  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !email.trim() || !password || isSubmitting || isGoogleSubmitting) return;

    setError("");
    setIsSubmitting(true);
    try {
      const firstFactor = await signIn.create({ identifier: email.trim() });
      if (firstFactor.status !== "needs_first_factor") {
        throw new Error("This account requires a different sign-in method.");
      }

      const result = await signIn.attemptFirstFactor({
        strategy: "password",
        password,
      });
      if (result.status !== "complete" || !result.createdSessionId) {
        throw new Error("Additional verification is required to finish signing in.");
      }

      await setActive({ session: result.createdSessionId });
      window.location.assign(`${basePath}/home`);
    } catch (cause) {
      setError(messageFromError(cause));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function continueWithGoogle() {
    if (!isLoaded || isSubmitting || isGoogleSubmitting) return;

    setError("");
    setIsGoogleSubmitting(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${basePath}/sign-in/sso-callback`,
        redirectUrlComplete: `${basePath}/home`,
      });
    } catch (cause) {
      setError(messageFromError(cause));
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <div className="h-[100dvh] min-h-0 bg-background flex flex-col relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />

      <header className="p-4 pt-10 md:p-6 md:pt-12 relative z-10 flex items-center justify-end max-w-7xl mx-auto w-full">
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-label="Go to BLASTERR home"
        >
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
          <section className="glass-panel p-4 md:p-5 rounded-3xl border border-white/10 shadow-2xl">
            <h1 className="font-display font-bold text-2xl text-white mb-1 text-center">Access Comm Link</h1>
            <p className="text-muted-foreground mb-3 text-center">Enter credentials to resume your session.</p>

            <button
              type="button"
              onClick={() => void continueWithGoogle()}
              disabled={!isLoaded || isSubmitting || isGoogleSubmitting}
              className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGoogleSubmitting ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" aria-label="Connecting to Google" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.51 5.51 0 0 1-2.39 3.62v3.01h3.87c2.27-2.09 3.56-5.17 3.56-8.66Z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3.01c-1.07.72-2.43 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24Z" />
                    <path fill="#FBBC05" d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28v-3.1H1.28A12 12 0 0 0 0 12c0 1.93.46 3.75 1.28 5.38l4-3.1Z" />
                    <path fill="#EA4335" d="M12 4.77c1.77 0 3.36.61 4.6 1.81l3.45-3.45C17.95 1.12 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4 3.1c.95-2.84 3.6-4.95 6.72-4.95Z" />
                  </svg>
                  Continue with Google
                </span>
              )}
            </button>

            <div className="my-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-white/10" />
              <span>or</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <form className="space-y-3" onSubmit={submit}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white" htmlFor="sign-in-email">Email address</label>
                <Input
                  id="sign-in-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email address"
                  className="h-9 border-white/10 bg-black/60 text-sm text-white placeholder:text-muted-foreground focus-visible:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white" htmlFor="sign-in-password">Password</label>
                <div className="relative">
                  <Input
                    id="sign-in-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="h-9 border-white/10 bg-black/60 pr-10 text-sm text-white placeholder:text-muted-foreground focus-visible:ring-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-2.5 text-muted-foreground transition-colors hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-red-400" role="alert">{error}</p>}

              <button
                type="submit"
                disabled={!isLoaded || isSubmitting || isGoogleSubmitting || !email.trim() || !password}
                className="h-9 w-full rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className="font-medium text-primary hover:underline">Sign up</Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}