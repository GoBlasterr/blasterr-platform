import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useAssets } from 'expo-asset';
import { useAuth, useUser } from '@clerk/expo';
import { type Href, useRouter } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { CosmicBackground } from '@/components/cosmic-background';
import { hasVisitedApp, markAppVisited } from '@/lib/onboarding';

const introVideo = require('@/assets/videos/blasterr-intro.mp4');
const introVideoWeb = require('@/assets/videos/blasterr-intro.webm');
const SPLASH_DURATION_MS = 3_000;

export default function SplashScreen() {
  return Platform.OS === 'web' ? <WebSplash /> : <NativeSplash />;
}

function useSplashCompletion() {
  const router = useRouter();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setEnded(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ended || !isLoaded) return;
    let active = true;
    void hasVisitedApp().then((hasVisited) => {
      if (!active) return;
      void markAppVisited();
      const meta = user?.publicMetadata as Record<string, unknown> | undefined;
      const profileComplete = meta?.onboardingComplete === true || Boolean(meta?.displayName && meta?.username && meta?.city && meta?.state);
      if (isSignedIn) router.replace(profileComplete ? '/home' : '/settings?onboarding=1');
      else router.replace((hasVisited ? '/sign-in' : '/sign-up') as Href);
    });
    return () => { active = false; };
  }, [ended, isLoaded, isSignedIn, router, user, userId]);

}

function WebSplash() {
  useSplashCompletion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [assets] = useAssets([introVideoWeb]);
  const source = assets?.[0]?.localUri ?? assets?.[0]?.uri;

  useEffect(() => {
    if (!source) return;

    const video = videoRef.current;
    if (!video) return;

    const enableSound = () => {
      video.muted = false;
      video.defaultMuted = false;
      video.removeAttribute('muted');
      if (video.paused) {
        void video.play().catch(() => undefined);
      }
    };

    const startPlayback = async () => {
      enableSound();
      try {
        await video.play();
      } catch {
        // Browsers can reject audible autoplay until the first user gesture.
        video.muted = true;
        video.defaultMuted = true;
        video.setAttribute('muted', '');
        await video.play().catch(() => undefined);
      }
    };

    void startPlayback();
    window.addEventListener('pointerdown', enableSound, { once: true });
    window.addEventListener('keydown', enableSound, { once: true });

    return () => {
      window.removeEventListener('pointerdown', enableSound);
      window.removeEventListener('keydown', enableSound);
    };
  }, [source]);

  return (
    <View style={styles.screen}>
      <CosmicBackground />
      {source ? (
        <video
          ref={videoRef}
          src={source}
          autoPlay
          playsInline
          controls={false}
          disablePictureInPicture
          controlsList="nodownload nofullscreen noplaybackrate"
          style={webVideoStyle}
        />
      ) : null}
    </View>
  );
}

function NativeSplash() {
  useSplashCompletion();
  const player = useVideoPlayer(introVideo, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.muted = false;
  });

  useEffect(() => {
    const statusSubscription = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') player.play();
    });
    player.muted = false;
    player.play();
    return () => {
      statusSubscription.remove();
    };
  }, [player]);

  return (
    <View style={styles.screen}>
      <CosmicBackground />
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false}
        requiresLinearPlayback
        allowsPictureInPicture={false}
      />
    </View>
  );
}

const webVideoStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  video: { ...StyleSheet.absoluteFillObject },
});