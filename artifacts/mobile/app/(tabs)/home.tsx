import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useGetFeed } from '@workspace/api-client-react';
import { BrandHeader } from '@/components/brand-header';
import { BlastCard } from '@/components/blast-card';
import { EmptyState } from '@/components/empty-state';
import { useColors } from '@/hooks/useColors';
import { CosmicBackground } from '@/components/cosmic-background';

export default function HomeScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');
  const feed = useGetFeed({ tab: activeTab, page: 1 });
  const refresh = useCallback(() => { void feed.refetch(); }, [feed]);
  return <View style={[styles.screen, { backgroundColor: colors.background }]}><CosmicBackground /><BrandHeader /><FlatList data={feed.data?.items ?? []} keyExtractor={(item) => item.id} renderItem={({ item }) => <BlastCard blast={item} />} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={refresh} tintColor={colors.primary} />} ListHeaderComponent={<View style={[styles.tabBar, { borderBottomColor: colors.border }]}><Pressable onPress={() => setActiveTab('for-you')} accessibilityRole="tab" accessibilityState={{ selected: activeTab === 'for-you' }} testID="home-feed-tab-for-you" style={styles.tab}><Text style={[styles.tabText, { color: activeTab === 'for-you' ? colors.foreground : colors.mutedForeground }]}>For You</Text>{activeTab === 'for-you' ? <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} /> : null}</Pressable><Pressable onPress={() => setActiveTab('following')} accessibilityRole="tab" accessibilityState={{ selected: activeTab === 'following' }} testID="home-feed-tab-following" style={styles.tab}><Text style={[styles.tabText, { color: activeTab === 'following' ? colors.foreground : colors.mutedForeground }]}>Following</Text>{activeTab === 'following' ? <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} /> : null}</Pressable></View>} ListEmptyComponent={feed.isLoading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View> : <EmptyState icon="radio" title="No blasts found" message="Your feed is empty. Start following people or targets to see content here." />} showsVerticalScrollIndicator={false} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingBottom: 24 },
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  activeIndicator: { position: 'absolute', left: 20, right: 20, bottom: -1, height: 3, borderRadius: 2 },
  loading: { paddingTop: 80, alignItems: 'center' },
});