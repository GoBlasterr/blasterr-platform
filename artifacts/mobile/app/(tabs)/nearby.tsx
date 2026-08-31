import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { getGetFeedQueryKey, useGetFeed } from '@workspace/api-client-react';
import { BlastCard } from '@/components/blast-card';
import { CosmicBackground } from '@/components/cosmic-background';
import { EmptyState } from '@/components/empty-state';
import { useColors } from '@/hooks/useColors';

type LocationStatus = 'requesting' | 'ready' | 'denied' | 'unavailable';
type Position = { latitude: number; longitude: number };
const RADII = [5, 10, 20, 50, 100];

export default function NearbyScreen() {
  const colors = useColors();
  const [radius, setRadius] = useState(20);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('requesting');
  const [position, setPosition] = useState<Position | null>(null);
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const permissionRequested = useRef(false);

  const requestLocation = useCallback(async () => {
    setLocationStatus('requesting');
    setPosition(null);
    if (Platform.OS === 'web') {
      if (!navigator.geolocation) {
        setLocationStatus('unavailable');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setPosition({ latitude: coords.latitude, longitude: coords.longitude });
          setLocationStatus('ready');
        },
        ({ code }) => setLocationStatus(code === 1 ? 'denied' : 'unavailable'),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 5 * 60 * 1000 },
      );
      return;
    }
    try {
      const currentPermission = permission?.granted ? permission : await requestPermission();
      if (!currentPermission.granted) {
        setLocationStatus('denied');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPosition({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      setLocationStatus('ready');
    } catch {
      setLocationStatus('unavailable');
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      void requestLocation();
      return;
    }
    if (!permission) return;
    if (permission.granted) {
      void requestLocation();
    } else if (!permission.canAskAgain) {
      setLocationStatus('denied');
    } else if (!permissionRequested.current) {
      permissionRequested.current = true;
      void requestLocation();
    }
  }, [permission, requestLocation]);

  const feedParams = { tab: 'nearby' as const, page: 1, latitude: position?.latitude, longitude: position?.longitude, radius };
  const feed = useGetFeed(feedParams, {
    query: { enabled: locationStatus === 'ready' && position !== null, retry: false, queryKey: getGetFeedQueryKey(feedParams) },
  });

  const retry = () => {
    permissionRequested.current = false;
    void requestLocation();
  };

  const statusPanel = locationStatus !== 'ready' ? (
    <View style={[styles.statusPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={locationStatus === 'requesting' ? 'radio' : 'alert-triangle'} size={32} color={locationStatus === 'requesting' ? colors.primary : colors.destructive} />
      <Text style={[styles.statusTitle, { color: colors.foreground }]}>{locationStatus === 'requesting' ? 'Locating your current sector' : locationStatus === 'denied' ? 'Location access is blocked' : 'Location is unavailable'}</Text>
      <Text style={[styles.statusMessage, { color: colors.mutedForeground }]}>{locationStatus === 'requesting' ? 'Allow location access to scan for Blasts nearby. Your exact coordinates are used only for this request.' : locationStatus === 'denied' ? 'Enable location permission for BLASTERR in your device settings, then try again.' : 'We could not determine your location. Check your device location services and connection.'}</Text>
      {locationStatus !== 'requesting' ? (
        <View style={styles.statusActions}>
          {locationStatus === 'denied' && Platform.OS !== 'web' ? <Pressable onPress={() => { void Linking.openSettings(); }} style={[styles.outlineButton, { borderColor: colors.border }]}><Text style={[styles.outlineButtonText, { color: colors.foreground }]}>Open Settings</Text></Pressable> : null}
          <Pressable onPress={retry} style={[styles.outlineButton, { borderColor: colors.primary }]}><Feather name="navigation" size={16} color={colors.primary} /><Text style={[styles.outlineButtonText, { color: colors.primary }]}>Try Again</Text></Pressable>
        </View>
      ) : <ActivityIndicator style={styles.statusSpinner} color={colors.primary} />}
    </View>
  ) : null;

  const listHeader = (
    <View>
      <View style={styles.heading}>
        <View style={styles.titleRow}><Feather name="map-pin" size={21} color={colors.primary} /><Text style={[styles.title, { color: colors.foreground }]}>Nearby</Text></View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Scan for Blasts around your current location.</Text>
      </View>
      <View style={styles.radiusHeader}>
        <Text style={[styles.radiusLabel, { color: colors.mutedForeground }]}>Scan radius</Text>
        <Text style={[styles.radiusValue, { color: colors.foreground }]}>{radius} miles</Text>
      </View>
      <View style={styles.radiusOptions}>
        {RADII.map((value) => <Pressable key={value} onPress={() => setRadius(value)} accessibilityRole="radio" accessibilityState={{ selected: radius === value }} style={[styles.radiusOption, { borderColor: radius === value ? colors.primary : colors.border, backgroundColor: radius === value ? colors.accent : colors.card }]}><Text style={[styles.radiusOptionText, { color: radius === value ? colors.primary : colors.mutedForeground }]}>{value} mi</Text></Pressable>)}
      </View>
      {statusPanel}
      {locationStatus === 'ready' && (feed.isLoading || feed.isFetching) ? <ActivityIndicator style={styles.feedSpinner} color={colors.primary} /> : null}
      {locationStatus === 'ready' && feed.isError ? <View style={[styles.errorPanel, { borderColor: colors.destructive }]}><Text style={[styles.errorText, { color: colors.destructive }]}>Nearby scan interrupted. Your location was not saved.</Text><Pressable onPress={() => { void feed.refetch(); }}><Text style={[styles.retryText, { color: colors.primary }]}>Retry scan</Text></Pressable></View> : null}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <CosmicBackground />
      <FlatList
        data={feed.data?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BlastCard blast={item} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={locationStatus === 'ready' && !feed.isLoading && !feed.isFetching && !feed.isError ? <EmptyState icon="map-pin" title="No local signals detected" message={`There are no Blasts within ${feed.data?.radiusMiles ?? radius} miles. Try a wider scan radius.`} /> : null}
        refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={() => { void feed.refetch(); }} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingBottom: 28 },
  heading: { paddingHorizontal: 20, paddingTop: 17, paddingBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 7 },
  radiusHeader: { paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  radiusLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  radiusValue: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  radiusOptions: { flexDirection: 'row', gap: 7, paddingHorizontal: 20, paddingVertical: 12 },
  radiusOption: { flex: 1, minHeight: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  radiusOptionText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  statusPanel: { margin: 20, padding: 24, borderRadius: 18, borderWidth: 1, alignItems: 'center' },
  statusTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, textAlign: 'center', marginTop: 12 },
  statusMessage: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  statusSpinner: { marginTop: 18 },
  statusActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 9, marginTop: 18 },
  outlineButton: { minHeight: 38, borderRadius: 19, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7 },
  outlineButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  feedSpinner: { marginVertical: 18 },
  errorPanel: { marginHorizontal: 20, marginBottom: 18, padding: 14, borderWidth: 1, borderRadius: 13, alignItems: 'center' },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 13, textAlign: 'center' },
  retryText: { fontFamily: 'Inter_700Bold', fontSize: 13, marginTop: 9 },
});