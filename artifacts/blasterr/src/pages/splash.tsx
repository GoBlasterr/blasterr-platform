import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";

const assetUrl = (fileName: string) => `${import.meta.env.BASE_URL}${fileName}`;
const INTRO_VIDEO_URL = assetUrl("blasterr-intro-1788235644459.mp4");
const INTRO_VIDEO_WEB_URL = assetUrl("blasterr-intro-1788235644459.webm");
const HAS_VISITED_KEY = "blasterr:has-visited:v1";
const MOBILE_BROWSER_KEY = "blasterr:continue-in-browser:v1";
const MOBILE_APP_URL = "blasterr://";

function detectMobileBrowser() {
  return (
    typeof window !== "undefined" &&
    (window.matchMedia("(max-width: 767px)").matches ||
      /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent))
  );
}

export default function Splash() {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const finishTimerRef = useRef<number | null>(null);
  const { isLoaded, isSignedIn } = useAuth();
  const [hasFinished, setHasFinished] = useState(false);
  const [isMobileBrowser] = useState(detectMobileBrowser);
  const [continueInBrowser, setContinueInBrowser] = useState(() =>
    typeof window !== "undefined" &&
    window.sessionStorage.getItem(MOBILE_BROWSER_KEY) === "true"
  );

  useEffect(() => {
    if (isMobileBrowser && !continueInBrowser) return;
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("muted", "");
    void video.play().catch(() => undefined);

    return () => {
      if (finishTimerRef.current !== null) {
        window.clearTimeout(finishTimerRef.current);
      }
    };
  }, [continueInBrowser, isMobileBrowser]);

  useEffect(() => {
    if (!isLoaded || !hasFinished) return;

    const hasVisited = window.localStorage.getItem(HAS_VISITED_KEY) === "true";
    window.localStorage.setItem(HAS_VISITED_KEY, "true");
    setLocation(isSignedIn ? "/home" : hasVisited ? "/sign-in" : "/sign-up");
  }, [hasFinished, isLoaded, isSignedIn, setLocation]);

  const finish = () => {
    if (finishTimerRef.current !== null) return;
    finishTimerRef.current = window.setTimeout(() => {
      setHasFinished(true);
    }, 2000);
  };

  if (isMobileBrowser && !continueInBrowser) {
    return (
      <main className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-black px-6 text-center">
        <div className="site-stars pointer-events-none fixed inset-0 opacity-70" aria-hidden="true" />
        <div className="relative z-10 flex max-w-sm flex-col items-center">
          <img
            src={assetUrl("blasterr-mobile-logo.png")}
            alt="BLASTERR"
            className="mb-8 h-20 w-auto object-contain"
          />
          <h1 className="font-display text-3xl font-bold text-white">
            Mobile app coming soon
          </h1>
          <p className="mt-3 text-muted-foreground">
            The BLASTERR mobile app is not published yet. We’ll add App Store and
            Google Play download links here when it launches.
          </p>
          <button
            type="button"
            onClick={() => {
              window.sessionStorage.removeItem(MOBILE_BROWSER_KEY);
              window.location.href = MOBILE_APP_URL;
            }}
            className="mt-8 h-11 rounded-full bg-primary px-7 font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Open BLASTERR app
          </button>
          <button
            type="button"
            onClick={() => {
              window.sessionStorage.setItem(MOBILE_BROWSER_KEY, "true");
              setContinueInBrowser(true);
            }}
            className="mt-4 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-white hover:underline"
          >
            Continue in browser
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-contain"
        autoPlay
        muted
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        controlsList="nodownload nofullscreen noplaybackrate"
        onCanPlay={() => {
          videoRef.current?.play().catch(() => undefined);
        }}
        onEnded={finish}
        onError={finish}
        aria-label="BLASTERR introduction"
      >
        <source src={INTRO_VIDEO_WEB_URL} type="video/webm" />
        <source src={INTRO_VIDEO_URL} type="video/mp4" />
      </video>
    </main>
  );
}