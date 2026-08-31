import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useAssets } from 'expo-asset';
import { useRouter } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { CosmicBackground } from '@/components/cosmic-background';

const introVideo = require('@/assets/videos/blasterr-intro.mp4');
const introVideoWeb = require('@/assets/videos/blasterr-intro.webm');

export default function SplashScreen() {
  return Platform.OS === 'web' ? <WebSplash /> : <NativeSplash />;
}

function WebSplash() {
  const router = useRouter();
  const finish = useCallback(() => router.replace('/home'), [router]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [assets] = useAssets([introVideoWeb]);
  const source = assets?.[0]?.localUri ?? assets?.[0]?.uri;

  useEffect(() => {
    if (!source) return;
    videoRef.current?.play().catch(() => undefined);
  }, [source]);

  return (
    <View style={styles.screen}>
      <CosmicBackground />
      {source ? (
        <video
          ref={videoRef}
          src={source}
          autoPlay
          muted={muted}
          playsInline
          controls={false}
          disablePictureInPicture
          controlsList="nodownload nofullscreen noplaybackrate"
          onEnded={finish}
          onClick={() => setMuted(false)}
          style={webVideoStyle}
        />
      ) : null}
    </View>
  );
}

function NativeSplash() {
  const router = useRouter();
  const finish = useCallback(() => router.replace('/home'), [router]);
  const player = useVideoPlayer(introVideo, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.muted = false;
  });

  useEffect(() => {
    const endSubscription = player.addListener('playToEnd', () => {
      finish();
    });
    const statusSubscription = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') player.play();
    });
    player.muted = false;
    player.play();
    return () => {
      endSubscription.remove();
      statusSubscription.remove();
    };
  }, [finish, player]);

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