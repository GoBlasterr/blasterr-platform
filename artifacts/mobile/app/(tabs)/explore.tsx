import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { getSearchQueryKey, useGetTrending, useSearch } from '@workspace/api-client-react';
import type { Target } from '@workspace/api-client-react';
import { BlastCard } from '@/components/blast-card';
import { CosmicBackground } from '@/components/cosmic-background';
import { EmptyState } from '@/components/empty-state';
import { useColors } from '@/hooks/useColors';
import { apiUrl } from '@/lib/api-url';

type TrendingSection = 'blasts' | 'targets';

export default function ExploreScreen() {
  const colors = useColors();
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState<TrendingSection>('blasts');
  const trending = useGetTrending();
  const searchParams = { q: query, type: 'all' as const };
  const search = useSearch(searchParams, { query: { enabled: query.trim().length > 1, queryKey: getSearchQueryKey(searchParams) } });
  const searching = query.trim().length > 1;
  const blasts = searching ? search.data?.blasts ?? [] : trending.data?.blasts ?? [];
  const targets = searching ? search.data?.targets ?? [] : trending.data?.targets ?? [];
  const loading = searching ? search.isLoading : trending.isLoading;

  const sectionTabs = (
    <View style={[styles.sectionTabs, { borderBottomColor: colors.border }]} accessibilityRole="tablist">
      <Pressable
        onPress={() => setActiveSection('blasts')}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeSection === 'blasts' }}
        testID="trending-tab-blasts"
        style={styles.sectionTab}
      >
        <Text style={[styles.sectionTabText, { color: activeSection === 'blasts' ? colors.foreground : colors.mutedForeground }]}>Top Blasts</Text>
        {activeSection === 'blasts' ? <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} /> : null}
      </Pressable>
      <Pressable
        onPress={() => setActiveSection('targets')}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeSection === 'targets' }}
        testID="trending-tab-targets"
        style={styles.sectionTab}
      >
        <Text style={[styles.sectionTabText, { color: activeSection === 'targets' ? colors.foreground : colors.mutedForeground }]}>Hot Targets</Text>
        {activeSection === 'targets' ? <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} /> : null}
      </Pressable>
    </View>
  );

  const listHeader = (
    <View>
      <View style={styles.heading}>
        <View style={styles.titleRow}>
          <Feather name="trending-up" size={21} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>Trending</Text>
        </View>
      </View>
      {sectionTabs}
      {loading ? <ActivityIndicator style={styles.spinner} color={colors.primary} /> : null}
    </View>
  );

  const emptyState = !loading ? (
    <EmptyState
      icon={activeSection === 'targets' ? 'crosshair' : 'search'}
      title={searching ? `No ${activeSection === 'targets' ? 'targets' : 'blasts'} found for "${query}"` : activeSection === 'targets' ? 'No hot targets yet.' : 'No top blasts yet.'}
      message=""
    />
  ) : null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <CosmicBackground />
      <View style={[styles.searchWrap, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search targets, people, or blasts..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground }]}
            returnKeyType="search"
            testID="explore-search"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search">
              <Feather name="x-circle" size={17} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {activeSection === 'blasts' ? (
        <FlatList
          data={blasts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BlastCard blast={item} />}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={emptyState}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={targets}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <HotTargetRow target={item} index={index} colors={colors} />}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={emptyState}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function HotTargetRow({ target, index, colors }: { target: Target; index: number; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.target, { borderBottomColor: colors.border }]}>
      <Text style={[styles.rank, { color: colors.mutedForeground }]}>{index + 1}</Text>
      <View style={[styles.targetImage, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        {target.imageUrl ? (
          <Image source={{ uri: apiUrl(target.imageUrl) }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Feather name="crosshair" size={27} color={colors.mutedForeground} />
        )}
      </View>
      <View style={styles.targetCopy}>
        <View style={styles.targetNameRow}>
          <Text style={[styles.targetName, { color: colors.foreground }]} numberOfLines={1}>{target.name}</Text>
          {index < 3 ? <Feather name="zap" size={15} color={colors.primary} /> : null}
        </View>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>{target.type}</Text>
      </View>
      <View style={styles.targetCount}>
        <Text style={[styles.count, { color: colors.foreground }]}>{target.blastCount}</Text>
        <Text style={[styles.countLabel, { color: colors.mutedForeground }]}>Blasts</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  searchBox: { minHeight: 48, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14 },
  list: { paddingTop: 17, paddingBottom: 26 },
  heading: { paddingHorizontal: 20, paddingBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, marginTop: 4 },
  sectionTabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 17 },
  sectionTab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  sectionTabText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  activeIndicator: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  spinner: { marginVertical: 18 },
  target: { minHeight: 88, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rank: { width: 25, textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 22 },
  targetImage: { width: 56, height: 56, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  targetCopy: { flex: 1, minWidth: 0 },
  targetNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  targetName: { flexShrink: 1, fontFamily: 'Inter_700Bold', fontSize: 16 },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 4, textTransform: 'capitalize' },
  targetCount: { minWidth: 45, alignItems: 'flex-end' },
  count: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  countLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
});