import { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useGetFeed } from '@workspace/api-client-react';
import { BrandHeader } from '@/components/brand-header';
import { BlastCard } from '@/components/blast-card';
import { EmptyState } from '@/components/empty-state';
import { useColors } from '@/hooks/useColors';

export default function HomeScreen() {
  const colors = useColors();
  const feed = useGetFeed({ tab: 'for-you', page: 1 });
  const refresh = useCallback(() => { void feed.refetch(); }, [feed]);
  return <View style={[styles.screen, { backgroundColor: colors.background }]}><BrandHeader /><FlatList data={feed.data?.items ?? []} keyExtractor={(item) => item.id} renderItem={({ item }) => <BlastCard blast={item} />} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={refresh} tintColor={colors.primary} />} ListHeaderComponent={<View style={styles.heading}><View><Text style={[styles.eyebrow, { color: colors.primary }]}>LIVE FROM THE COMMUNITY</Text><Text style={[styles.title, { color: colors.foreground }]}>What’s blasting</Text></View><View style={[styles.liveDot, { backgroundColor: colors.primary }]} /></View>} ListEmptyComponent={feed.isLoading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Tuning into the feed…</Text></View> : <EmptyState icon="radio" title="Nothing here yet" message="Your feed is ready for its first Blast. Discover a Target or share what you know." />} showsVerticalScrollIndicator={false} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingTop: 16, paddingBottom: 24 },
  heading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 18 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5, marginTop: 4 },
  liveDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 8, shadowColor: '#e5f403', shadowOpacity: 0.8, shadowRadius: 8 },
  loading: { paddingTop: 80, alignItems: 'center', gap: 12 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
});
