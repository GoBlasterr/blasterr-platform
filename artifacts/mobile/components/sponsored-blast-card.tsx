import { useEffect, useRef } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useGetAdPlacement, useRecordAdEvent } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { apiUrl } from '@/lib/api-url';

export function SponsoredBlastCard({ placement }: { placement: 'home_feed' | 'following_feed' }) {
  const colors = useColors();
  const sessionId = useRef(`mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`).current;
  const recordedToken = useRef<string | null>(null);
  const placementQuery = useGetAdPlacement({ placement, sessionId, device: 'mobile' });
  const recordEvent = useRecordAdEvent();
  const ad = placementQuery.data?.ad;

  useEffect(() => {
    if (!ad || recordedToken.current === ad.deliveryToken) return;
    recordedToken.current = ad.deliveryToken;
    recordEvent.mutate({
      data: {
        advertisementId: ad.id,
        eventType: 'impression',
        placement,
        sessionId,
        deliveryToken: ad.deliveryToken,
      },
    });
  }, [ad, placement, recordEvent, sessionId]);

  if (!ad) return null;

  const openDestination = async () => {
    if (!ad.destinationUrl) return;
    recordEvent.mutate({
      data: {
        advertisementId: ad.id,
        eventType: 'click',
        placement,
        sessionId,
        deliveryToken: ad.deliveryToken,
      },
    });
    if (await Linking.canOpenURL(ad.destinationUrl)) await Linking.openURL(ad.destinationUrl);
  };

  return (
    <Pressable
      onPress={() => { void openDestination(); }}
      disabled={!ad.destinationUrl}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary }]}
      accessibilityLabel={`Sponsored Blast from ${ad.advertiserName}`}
    >
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: colors.secondary }]}>
          <Feather name="zap" size={16} color={colors.primary} />
        </View>
        <View style={styles.heading}>
          <Text style={[styles.headline, { color: colors.foreground }]}>{ad.headline}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>Ad by {ad.advertiserName}</Text>
        </View>
        <Text style={[styles.label, { color: colors.primary }]}>{ad.paidLabel}</Text>
      </View>
      {ad.body !== ad.headline ? <Text style={[styles.body, { color: colors.foreground }]}>{ad.body}</Text> : null}
      {ad.mediaUrl ? <Image source={{ uri: apiUrl(ad.mediaUrl) }} style={styles.media} contentFit="cover" transition={180} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 18, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1 },
  headline: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  label: { fontFamily: 'Inter_700Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.7 },
  body: { fontFamily: 'Inter_500Medium', fontSize: 16, lineHeight: 24, marginTop: 15 },
  media: { width: '100%', height: 190, borderRadius: 13, marginTop: 14 },
});