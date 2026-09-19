import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetBusiness, useGetBusinessCenter, useGetBusinessAnalytics, useGetCurrentUser, getGetBusinessQueryKey, getGetBusinessCenterQueryKey, getGetBusinessAnalyticsQueryKey } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { CosmicBackground } from '@/components/cosmic-background';

export default function BusinessCenterScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const currentUser = useGetCurrentUser();

  const { data: business, isLoading: loadingBusiness, isError: errorBusiness } = useGetBusiness(slug, {
    query: { enabled: !!slug, queryKey: getGetBusinessQueryKey(slug) }
  });

  const { data: center, isLoading: loadingCenter, isError: errorCenter } = useGetBusinessCenter(business?.id ?? '', {
    query: { enabled: !!business?.id && !!currentUser.data, retry: false, queryKey: [...getGetBusinessCenterQueryKey(business?.id ?? ''), currentUser.data?.id ?? 'guest'] }
  });

  const { data: analytics, isLoading: loadingAnalytics } = useGetBusinessAnalytics(business?.id ?? '', {
    query: { enabled: !!business?.id && !!currentUser.data, retry: false, queryKey: [...getGetBusinessAnalyticsQueryKey(business?.id ?? ''), currentUser.data?.id ?? 'guest'] }
  });

  if (loadingBusiness || loadingCenter || loadingAnalytics) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: colors.background }]}>
        <CosmicBackground />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (errorBusiness || errorCenter || !center) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: colors.background }]}>
        <CosmicBackground />
        <Feather name="lock" size={48} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>Access Denied</Text>
        <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
          You are not authorized to manage this business.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.primary }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <CosmicBackground />
      <View style={[styles.nav, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.navButton}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Business Center</Text>
        <View style={styles.navButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>{center.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.roleText, { color: colors.primary }]}>{center.membershipRole} Access</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Analytics Overview</Text>
        {analytics ? (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="zap" size={18} color={colors.mutedForeground} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{analytics.blastCount}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Blasts</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="users" size={18} color={colors.mutedForeground} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{analytics.followerCount}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Followers</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="eye" size={18} color={colors.mutedForeground} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{analytics.viewCount}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Views</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="activity" size={18} color={colors.mutedForeground} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{(analytics.engagementRate * 100).toFixed(1)}%</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Engagement</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, width: '100%' }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Analytics not available</Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 32 }]}>Management</Text>
        <View style={styles.menu}>
          {center.membershipRole === 'owner' && <Pressable onPress={() => router.push(`/business/${slug}/edit` as never)} accessibilityRole="button" style={[styles.menuItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Feather name="edit-3" size={20} color={colors.foreground} />
            <Text style={[styles.menuText, { color: colors.foreground }]}>Edit Profile Details</Text>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} style={{ marginLeft: 'auto' }} />
          </Pressable>}
          {center.membershipRole === 'owner' && <Pressable onPress={() => router.push(`/business/${slug}/edit` as never)} accessibilityRole="button" style={[styles.menuItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Feather name="image" size={20} color={colors.foreground} />
            <Text style={[styles.menuText, { color: colors.foreground }]}>Manage Photos</Text>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} style={{ marginLeft: 'auto' }} />
          </Pressable>}
          <Pressable style={[styles.menuItem, { backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 0 }]}>
            <Feather name="trending-up" size={20} color={colors.foreground} />
            <Text style={[styles.menuText, { color: colors.foreground }]}>Promote Business</Text>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} style={{ marginLeft: 'auto' }} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 10 },
  navButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  
  errorText: { fontFamily: 'Inter_700Bold', fontSize: 20, marginBottom: 8 },
  errorSub: { fontFamily: 'Inter_400Regular', fontSize: 15, textAlign: 'center', marginBottom: 24 },
  backButton: { padding: 12 },
  backText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  
  content: { padding: 20 },
  header: { marginBottom: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, flex: 1 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, textTransform: 'uppercase' },
  
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '48%', padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  
  menu: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'transparent' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  menuText: { fontFamily: 'Inter_500Medium', fontSize: 15 },
});
