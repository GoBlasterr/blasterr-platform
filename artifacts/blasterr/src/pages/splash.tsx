import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";

const INTRO_VIDEO_URL = "/blasterr-intro-1788235644459.mp4";
const INTRO_VIDEO_WEB_URL = "/blasterr-intro-1788235644459.webm";
const HAS_VISITED_KEY = "blasterr:has-visited:v1";

export default function Splash() {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isLoaded, isSignedIn } = useAuth();
  const [hasFinished, setHasFinished] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    void video.play().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isLoaded || !hasFinished) return;

    const hasVisited = window.localStorage.getItem(HAS_VISITED_KEY) === "true";
    window.localStorage.setItem(HAS_VISITED_KEY, "true");
    setLocation(isSignedIn ? "/home" : hasVisited ? "/sign-in" : "/sign-up");
  }, [hasFinished, isLoaded, isSignedIn, setLocation]);

  const finish = () => {
    setHasFinished(true);
  };

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
        onLoadedData={() => {
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