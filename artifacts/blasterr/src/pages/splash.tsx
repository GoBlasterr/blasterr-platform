import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Splash() {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasError, setHasError] = useState(false);

  const attemptPlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    void video.play()
      .then(() => {
        setHasStarted(true);
        setNeedsInteraction(false);
      })
      .catch(() => {
        // Browsers commonly block autoplay with sound until the user interacts.
        setNeedsInteraction(true);
      });
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.readyState >= 2) {
      attemptPlayback();
    }
  }, []);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-black text-white">
      <video
        ref={videoRef}
        className="absolute left-1/2 top-1/2 h-auto max-h-[72dvh] w-[88vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-primary/20 object-contain shadow-[0_0_80px_rgba(229,244,3,0.12)]"
        autoPlay
        playsInline
        preload="auto"
        onCanPlay={attemptPlayback}
        onPlay={() => setHasStarted(true)}
        onEnded={() => setLocation("/home")}
        onError={() => setHasError(true)}
        aria-label="BLASTERR introduction"
      >
        <source src="/blasterr-intro.webm" type="video/webm" />
        <source src="/blasterr-intro.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/80" />

      <div className="relative z-10 flex min-h-[100dvh] flex-col justify-between p-6 sm:p-10">
        <Link href="/" className="w-fit hover:opacity-80 transition-opacity" aria-label="Return to BLASTERR home">
          <img src="/word-logo.png" alt="BLASTERR" className="h-16 w-auto sm:h-24" />
        </Link>

        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 text-center">
          {hasError ? (
            <div className="rounded-2xl border border-primary/30 bg-black/70 px-6 py-5 backdrop-blur-md">
              <p className="mb-4 text-sm text-white/80">The intro transmission could not be loaded.</p>
              <Button className="rounded-full bg-primary text-primary-foreground" onClick={() => setLocation("/home")}>
                Continue to BLASTERR <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : needsInteraction ? (
            <div className="flex flex-col items-center gap-3">
              <Button
                onClick={attemptPlayback}
                className="h-14 rounded-full bg-primary px-7 text-base font-bold text-primary-foreground shadow-[0_0_30px_rgba(229,244,3,0.45)] hover:bg-primary/90"
              >
                <Volume2 className="mr-2 h-5 w-5" />
                Enable sound & play intro
              </Button>
              <p className="text-xs text-white/65">Sound is part of the BLASTERR transmission.</p>
            </div>
          ) : (
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/70">
              {hasStarted ? "Transmission in progress" : "Connecting to transmission"}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between gap-4 text-xs uppercase tracking-[0.2em] text-white/55">
          <span>BLASTERR // INTRO</span>
          <span>Stand by</span>
        </div>
      </div>
    </main>
  );
}