import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useListBusinesses, getListBusinessesQueryKey } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { CosmicBackground } from '@/components/cosmic-background';
import { EmptyState } from '@/components/empty-state';
import { apiUrl } from '@/lib/api-url';
import type { BusinessSummary } from '@workspace/api-client-react';

export default function BusinessesScreen() {
  const colors = useColors();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const params = { q: debouncedQuery, limit: 50 };
  const { data, isLoading, isError } = useListBusinesses(params, {
    query: {
      queryKey: getListBusinessesQueryKey(params),
    }
  });

  const businesses = data?.items ?? [];

  const renderItem = ({ item }: { item: BusinessSummary }) => (
    <Pressable
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/business/${item.slug}`)}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.avatarContainer, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          {item.imageUrl ? (
            <Image source={{ uri: apiUrl(item.imageUrl) }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Feather name="briefcase" size={24} color={colors.mutedForeground} />
          )}
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
            {item.verified && <Feather name="check-circle" size={14} color={colors.primary} />}
          </View>
          <Text style={[styles.category, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.category} • {item.location}
          </Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{item.blastCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Blasts</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{item.followerCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Followers</Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <CosmicBackground />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Business</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Discover businesses by real conversations.</Text>
      </View>
      
      <View style={[styles.searchWrap, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search businesses..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground }]}
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search">
              <Feather name="x-circle" size={17} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.spinner} color={colors.primary} />
      ) : isError ? (
        <EmptyState icon="alert-circle" title="Error loading businesses" message="Please try again later." />
      ) : businesses.length === 0 ? (
        <EmptyState icon="briefcase" title={`No businesses found${debouncedQuery ? ` for "${debouncedQuery}"` : ''}`} message="" />
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 4 },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  searchBox: { minHeight: 48, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14 },
  spinner: { marginTop: 40 },
  list: { padding: 16, gap: 16, paddingBottom: 100 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarContainer: { width: 56, height: 56, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: 'Inter_700Bold', fontSize: 16, flexShrink: 1 },
  category: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 4 },
  statsRow: { flexDirection: 'row', marginTop: 16, gap: 24 },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 12 },
});
