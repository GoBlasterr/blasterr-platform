import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getSearchQueryKey, useGetTrending, useSearch } from '@workspace/api-client-react';
import { BlastCard } from '@/components/blast-card';
import { EmptyState } from '@/components/empty-state';
import { useColors } from '@/hooks/useColors';

export default function ExploreScreen() {
  const colors = useColors();
  const [query, setQuery] = useState('');
  const trending = useGetTrending();
  const searchParams = { q: query, type: 'all' as const };
  const search = useSearch(searchParams, { query: { enabled: query.trim().length > 1, queryKey: getSearchQueryKey(searchParams) } });
  const searching = query.trim().length > 1;
  const blasts = searching ? search.data?.blasts ?? [] : trending.data?.blasts ?? [];
  const targets = searching ? search.data?.targets ?? [] : trending.data?.targets ?? [];
  return <View style={[styles.screen, { backgroundColor: colors.background }]}><View style={[styles.searchWrap, { borderBottomColor: colors.border }]}><View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="search" size={18} color={colors.mutedForeground} /><TextInput value={query} onChangeText={setQuery} placeholder="Search Targets, people, or Blasts" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} returnKeyType="search" testID="explore-search" />{query ? <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search"><Feather name="x-circle" size={17} color={colors.mutedForeground} /></Pressable> : null}</View></View><FlatList data={blasts} keyExtractor={(item) => item.id} renderItem={({ item }) => <BlastCard blast={item} />} ListHeaderComponent={<View>{!searching ? <View style={styles.heading}><Text style={[styles.eyebrow, { color: colors.primary }]}>DISCOVER</Text><Text style={[styles.title, { color: colors.foreground }]}>Trending now</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Find the conversations shaping the moment.</Text></View> : <View style={styles.heading}><Text style={[styles.eyebrow, { color: colors.primary }]}>SEARCH RESULTS</Text><Text style={[styles.title, { color: colors.foreground }]}>{query.trim()}</Text></View>}{targets.length ? <View style={styles.targets}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Targets</Text>{targets.slice(0, 4).map((target) => <View key={target.id} style={[styles.target, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.targetIcon, { backgroundColor: colors.accent }]}><Feather name="crosshair" size={16} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.targetName, { color: colors.foreground }]}>{target.name}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{target.type} · {target.blastCount} Blasts</Text></View><Feather name="chevron-right" size={17} color={colors.mutedForeground} /></View>)}</View> : null}{(search.isLoading || trending.isLoading) ? <ActivityIndicator style={styles.spinner} color={colors.primary} /> : null}<Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 18 }]}>{searching ? 'Blasts' : 'Latest heat'}</Text></View>} ListEmptyComponent={!search.isLoading && !trending.isLoading ? <EmptyState icon="search" title="No Blasts found" message="Try another phrase or explore a different Target." /> : null} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  searchBox: { minHeight: 48, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14 },
  list: { paddingTop: 17, paddingBottom: 26 },
  heading: { paddingHorizontal: 20, paddingBottom: 14 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, marginTop: 4 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, marginTop: 5 },
  targets: { paddingHorizontal: 16, gap: 8, marginBottom: 6 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 10, paddingHorizontal: 20 },
  target: { minHeight: 60, borderRadius: 14, borderWidth: 1, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  targetIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  targetName: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
  spinner: { marginVertical: 18 },
});