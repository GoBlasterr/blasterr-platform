import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { getSearchQueryKey, useSearch } from '@workspace/api-client-react';
import type { SearchType, Target, User } from '@workspace/api-client-react';
import { BlastCard } from '@/components/blast-card';
import { CosmicBackground } from '@/components/cosmic-background';
import { EmptyState } from '@/components/empty-state';
import { useColors } from '@/hooks/useColors';
import { apiUrl } from '@/lib/api-url';

const SEARCH_TABS: SearchType[] = ['all', 'targets', 'people', 'blasts'];

export default function SearchScreen() {
  const colors = useColors();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchType>('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const searchParams = { q: debouncedQuery, type: activeTab };
  const search = useSearch(searchParams, {
    query: { enabled: debouncedQuery.length > 1, queryKey: getSearchQueryKey(searchParams) },
  });
  const targets = search.data?.targets ?? [];
  const people = search.data?.people ?? [];
  const blasts = search.data?.blasts ?? [];
  const showTargets = activeTab === 'all' || activeTab === 'targets';
  const showPeople = activeTab === 'all' || activeTab === 'people';
  const showBlasts = activeTab === 'all' || activeTab === 'blasts';
  const hasResults = (showTargets && targets.length > 0) || (showPeople && people.length > 0) || (showBlasts && blasts.length > 0);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <CosmicBackground />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}><View style={styles.titleRow}><Feather name="search" size={21} color={colors.primary} /><Text style={[styles.title, { color: colors.foreground }]}>Search</Text></View><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Find targets, people, and Blasts across the universe.</Text></View>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="search" size={18} color={colors.mutedForeground} /><TextInput value={query} onChangeText={setQuery} placeholder="Search targets, people, or blasts..." placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} returnKeyType="search" testID="search-page-input" />{query ? <Text onPress={() => setQuery('')} style={[styles.clear, { color: colors.mutedForeground }]}>Clear</Text> : null}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabs, { borderBottomColor: colors.border }]} contentContainerStyle={styles.tabsContent}>
          {SEARCH_TABS.map((tab) => <Text key={tab} onPress={() => setActiveTab(tab)} accessibilityRole="tab" accessibilityState={{ selected: activeTab === tab }} testID={`search-tab-${tab}`} style={[styles.tab, { color: activeTab === tab ? colors.foreground : colors.mutedForeground }]}>{tab === 'all' ? 'All' : tab[0].toUpperCase() + tab.slice(1)}{activeTab === tab ? <Text style={[styles.tabUnderline, { color: colors.primary }]}> ━</Text> : null}</Text>)}
        </ScrollView>
        {!debouncedQuery ? <EmptyState icon="search" title="Enter a query to search the universe" message="" /> : search.isLoading ? <ActivityIndicator style={styles.spinner} color={colors.primary} /> : !hasResults ? <EmptyState icon="search" title={`No results found for "${debouncedQuery}"`} message="" /> : <View style={styles.results}>{showTargets && targets.length > 0 ? <ResultSection title={activeTab === 'all' ? 'Targets' : undefined} colors={colors}>{targets.map((target) => <TargetRow key={target.id} target={target} colors={colors} />)}</ResultSection> : null}{showPeople && people.length > 0 ? <ResultSection title={activeTab === 'all' ? 'People' : undefined} colors={colors}>{people.map((person) => <PersonRow key={person.id} person={person} colors={colors} />)}</ResultSection> : null}{showBlasts && blasts.length > 0 ? <ResultSection title={activeTab === 'all' ? 'Blasts' : undefined} colors={colors}>{blasts.map((blast) => <BlastCard key={blast.id} blast={blast} />)}</ResultSection> : null}</View>}
      </ScrollView>
    </View>
  );
}

function ResultSection({ title, colors, children }: { title?: string; colors: ReturnType<typeof useColors>; children: React.ReactNode }) {
  return <View style={[styles.section, { borderBottomColor: colors.border }]}>{title ? <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text> : null}{children}</View>;
}

function TargetRow({ target, colors }: { target: Target; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.resultRow, { borderBottomColor: colors.border }]}><View style={[styles.resultImage, { backgroundColor: colors.secondary, borderColor: colors.border }]}>{target.imageUrl ? <Image source={{ uri: apiUrl(target.imageUrl) }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Feather name="crosshair" size={23} color={colors.mutedForeground} />}</View><View style={styles.resultCopy}><Text style={[styles.resultName, { color: colors.foreground }]} numberOfLines={1}>{target.name}</Text><Text style={[styles.resultMeta, { color: colors.mutedForeground }]}>{target.type} · {target.blastCount} Blasts</Text></View></View>;
}

function PersonRow({ person, colors }: { person: User; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.resultRow, { borderBottomColor: colors.border }]}><View style={[styles.resultImage, styles.personImage, { backgroundColor: colors.secondary, borderColor: colors.border }]}>{person.avatarUrl ? <Image source={{ uri: apiUrl(person.avatarUrl) }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Feather name="user" size={22} color={colors.mutedForeground} />}</View><View style={styles.resultCopy}><Text style={[styles.resultName, { color: colors.foreground }]} numberOfLines={1}>{person.displayName}</Text><Text style={[styles.resultMeta, { color: colors.mutedForeground }]}>@{person.username}</Text></View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 30 },
  heading: { paddingHorizontal: 20, paddingTop: 17, paddingBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 7 },
  searchBox: { minHeight: 48, marginHorizontal: 16, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14 },
  clear: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  tabs: { marginTop: 17, borderBottomWidth: StyleSheet.hairlineWidth },
  tabsContent: { paddingHorizontal: 16, gap: 24 },
  tab: { fontFamily: 'Inter_600SemiBold', fontSize: 14, paddingBottom: 12 },
  tabUnderline: { fontSize: 16 },
  spinner: { marginTop: 55 },
  results: { marginTop: 2 },
  section: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 6 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 20, paddingVertical: 9 },
  resultRow: { minHeight: 74, paddingHorizontal: 20, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  resultImage: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  personImage: { borderRadius: 24 },
  resultCopy: { flex: 1, minWidth: 0 },
  resultName: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  resultMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4, textTransform: 'capitalize' },
});