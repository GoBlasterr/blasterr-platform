import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

const INTRO_VIDEO_URL = "/blasterr-intro-1788235644459.mp4";
const INTRO_VIDEO_WEB_URL = "/blasterr-intro-1788235644459.webm";

export default function Splash() {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    void video.play().catch(() => undefined);
  }, []);

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
        onEnded={() => setLocation("/home")}
        onError={() => setLocation("/home")}
        aria-label="BLASTERR introduction"
      >
        <source src={INTRO_VIDEO_WEB_URL} type="video/webm" />
        <source src={INTRO_VIDEO_URL} type="video/mp4" />
      </video>
    </main>
  );
}