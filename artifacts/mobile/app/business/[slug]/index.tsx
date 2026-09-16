import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useGetBusiness, getGetBusinessQueryKey, useToggleBusinessFollow, useGetBusinessCenter, getGetBusinessCenterQueryKey, Blast } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { CosmicBackground } from '@/components/cosmic-background';
import { BlastCard } from '@/components/blast-card';
import { apiUrl } from '@/lib/api-url';

import { useQueryClient } from '@tanstack/react-query';

export default function BusinessDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const queryClient = useQueryClient();

  const { data: business, isLoading, isError } = useGetBusiness(slug, {
    query: {
      queryKey: getGetBusinessQueryKey(slug),
      enabled: !!slug
    }
  });

  const centerQuery = useGetBusinessCenter(business?.id ?? '', {
    query: {
      enabled: !!business?.id && business.verificationStatus === 'verified',
      retry: false,
      queryKey: getGetBusinessCenterQueryKey(business?.id ?? '')
    }
  });

  const toggleFollow = useToggleBusinessFollow({
    mutation: {
      onSuccess: (result) => {
        if (business) {
          queryClient.setQueryData(getGetBusinessQueryKey(slug), {
            ...business,
            followerCount: result.followerCount,
          });
        }
      }
    }
  });
  const isOwner = !!centerQuery.data;

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: colors.background }]}>
        <CosmicBackground />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !business) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: colors.background }]}>
        <CosmicBackground />
        <Feather name="alert-circle" size={48} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>Could not load business.</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.primary }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const handleFollow = () => {
    toggleFollow.mutate({ targetId: business.id });
  };

  const handleBlast = () => {
    router.push({
      pathname: '/create',
      params: { targetId: business.id, targetName: business.name, targetType: 'business' }
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <CosmicBackground />
      
      {/* Header */}
      <View style={[styles.nav, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.navButton}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]} numberOfLines={1}>{business.name}</Text>
        <View style={styles.navButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: colors.secondary }]}>
          {business.bannerImageUrl && (
            <Image source={{ uri: apiUrl(business.bannerImageUrl) }} style={StyleSheet.absoluteFill} contentFit="cover" />
          )}
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={[styles.avatarWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {business.imageUrl ? (
              <Image source={{ uri: apiUrl(business.imageUrl) }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Feather name="briefcase" size={32} color={colors.mutedForeground} />
            )}
          </View>
          
          <View style={styles.actionsRow}>
            {isOwner && (
              <Pressable 
                onPress={() => router.push(`/business/${business.slug}/center`)}
                style={[styles.actionBtn, { borderColor: colors.border }]}
              >
                <Feather name="settings" size={16} color={colors.foreground} />
                <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Manage</Text>
              </Pressable>
            )}
            
            {business.verificationStatus !== 'verified' && (
              <Pressable 
                onPress={() => router.push(`/business/${business.slug}/claim`)}
                style={[styles.actionBtn, { borderColor: colors.border }]}
              >
                <Feather name="shield" size={16} color={colors.foreground} />
                <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Claim</Text>
              </Pressable>
            )}

            <Pressable 
              onPress={handleFollow}
              disabled={toggleFollow.isPending}
              style={[styles.actionBtn, { borderColor: colors.border }]}
            >
              <Feather name="bookmark" size={16} color={colors.foreground} />
              <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Follow</Text>
            </Pressable>

            <Pressable 
              onPress={handleBlast}
              style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
            >
              <Feather name="zap" size={16} color={colors.primaryForeground} />
              <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Blast</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.infoBlock}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground }]}>{business.name}</Text>
            {business.verified && <Feather name="check-circle" size={18} color={colors.primary} />}
          </View>
          <Text style={[styles.handle, { color: colors.mutedForeground }]}>
            {business.category} {business.subcategory ? `• ${business.subcategory}` : ''}
          </Text>
          {business.description ? (
            <Text style={[styles.bio, { color: colors.foreground }]}>{business.description}</Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={14} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {business.city}, {business.state}
              </Text>
            </View>
            {business.website ? (
              <View style={styles.metaItem}>
                <Feather name="link" size={14} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.primary }]} numberOfLines={1}>{business.website}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{business.followerCount}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Followers</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{business.blastCount}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Blasts</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{business.viewCount}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Views</Text>
            </View>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        
        <View style={styles.feedHeader}>
          <Text style={[styles.feedTitle, { color: colors.foreground }]}>Recent Blasts</Text>
        </View>

        <View style={styles.feed}>
          {business.blasts && business.blasts.length > 0 ? (
            (business.blasts as unknown as Blast[]).map((blast) => (
              <BlastCard key={blast.id} blast={blast} />
            ))
          ) : (
            <View style={styles.emptyFeed}>
              <Feather name="message-square" size={32} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyFeedText, { color: colors.mutedForeground }]}>No blasts yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, marginBottom: 12 },
  backButton: { padding: 12 },
  backText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 10 },
  navButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, flex: 1, textAlign: 'center' },

  content: { paddingBottom: 40 },
  banner: { height: 120, width: '100%' },
  
  profileSection: { paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -32, marginBottom: 12 },
  avatarWrapper: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  actionsRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: 36, borderRadius: 18, borderWidth: 1 },
  actionBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  
  infoBlock: { paddingHorizontal: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  handle: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 2 },
  bio: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, marginTop: 12 },
  
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  
  statsRow: { flexDirection: 'row', gap: 20, marginTop: 16 },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 20 },
  
  feedHeader: { paddingHorizontal: 16, paddingBottom: 12 },
  feedTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  feed: { gap: 12 },
  emptyFeed: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyFeedText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
});
