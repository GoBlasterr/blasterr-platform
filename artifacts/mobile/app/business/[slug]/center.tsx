import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetBusiness, useGetBusinessCenter, useGetBusinessAnalytics, useGetBusinessAnalyticsByPeriod, useGetCurrentUser, getGetBusinessQueryKey, getGetBusinessCenterQueryKey, getGetBusinessAnalyticsQueryKey, getGetBusinessAnalyticsByPeriodQueryKey, useListBusinessProTeam, getListBusinessProTeamQueryKey } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { CosmicBackground } from '@/components/cosmic-background';

export default function BusinessCenterScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const currentUser = useGetCurrentUser();
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

  const { data: business, isLoading: loadingBusiness, isError: errorBusiness } = useGetBusiness(slug, {
    query: { enabled: !!slug, queryKey: getGetBusinessQueryKey(slug) }
  });

  const { data: center, isLoading: loadingCenter, isError: errorCenter } = useGetBusinessCenter(business?.id ?? '', {
    query: { enabled: !!business?.id && !!currentUser.data, retry: false, queryKey: [...getGetBusinessCenterQueryKey(business?.id ?? ''), currentUser.data?.id ?? 'guest'] }
  });

  const { data: overviewAnalytics } = useGetBusinessAnalytics(business?.id ?? '', {
    query: { enabled: !!business?.id && !!currentUser.data && !center?.businessPro?.hasAccess, retry: false, queryKey: [...getGetBusinessAnalyticsQueryKey(business?.id ?? ''), currentUser.data?.id ?? 'guest'] }
  });
  const { data: premiumAnalytics, isLoading: loadingPremiumAnalytics } = useGetBusinessAnalyticsByPeriod(business?.id ?? '', analyticsPeriod, {
    query: { enabled: !!business?.id && !!currentUser.data && !!center?.businessPro?.hasAccess, retry: false, queryKey: [...getGetBusinessAnalyticsByPeriodQueryKey(business?.id ?? '', analyticsPeriod), currentUser.data?.id ?? 'guest'] }
  });
  const analytics = premiumAnalytics ?? overviewAnalytics;
  const loadingAnalytics = loadingPremiumAnalytics || (!center?.businessPro?.hasAccess && !overviewAnalytics);
  const { data: team } = useListBusinessProTeam(business?.id ?? '', {
    query: { enabled: !!business?.id && !!currentUser.data && !!center?.businessPro?.hasAccess, retry: false, queryKey: [...getListBusinessProTeamQueryKey(business?.id ?? ''), currentUser.data?.id ?? 'guest'] }
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

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Analytics Overview</Text>
          <View style={styles.periodPicker}>
            {(['7d', '30d', '90d', '12m'] as const).map((period) => (
              <Pressable key={period} onPress={() => setAnalyticsPeriod(period)} style={[styles.periodButton, { backgroundColor: analyticsPeriod === period ? colors.primary : colors.card, borderColor: colors.border }]}>
                <Text style={{ color: analyticsPeriod === period ? colors.primaryForeground : colors.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 11 }}>{period}</Text>
              </Pressable>
            ))}
          </View>
        </View>
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
        {center.businessPro?.hasAccess ? (
          <View style={[styles.premiumStats, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '35' }]}>
            <Text style={[styles.periodLabel, { color: colors.primary }]}>{analytics?.period ?? analyticsPeriod} recorded activity</Text>
            <View style={styles.periodGrid}>
              <Text style={[styles.periodValue, { color: colors.foreground }]}>{analytics?.periodBlastCount ?? 0} <Text style={styles.periodName}>Blasts</Text></Text>
              <Text style={[styles.periodValue, { color: colors.foreground }]}>{analytics?.periodCommentCount ?? 0} <Text style={styles.periodName}>Comments</Text></Text>
              <Text style={[styles.periodValue, { color: colors.foreground }]}>{analytics?.periodReactionCount ?? 0} <Text style={styles.periodName}>Reactions</Text></Text>
              <Text style={[styles.periodValue, { color: colors.foreground }]}>{analytics?.newFollowerCount ?? 0} <Text style={styles.periodName}>Followers</Text></Text>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => router.push(`/business/${slug}/pro` as never)} style={[styles.premiumCta, { backgroundColor: colors.card, borderColor: colors.primary + '45' }]}>
            <Feather name="lock" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.foreground }]}>Unlock Business Pro analytics</Text>
              <Text style={[styles.featureCopy, { color: colors.mutedForeground }]}>Get period activity, alerts, announcements, clips, and team access.</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.primary} />
          </Pressable>
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
          <Pressable onPress={() => center.businessPro?.hasAccess ? undefined : router.push(`/business/${slug}/pro` as never)} style={[styles.menuItem, { backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 0 }]}>
            <Feather name="trending-up" size={20} color={colors.foreground} />
            <Text style={[styles.menuText, { color: colors.foreground }]}>{center.businessPro?.hasAccess ? 'Promote Business' : 'Promote Business · Pro required'}</Text>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} style={{ marginLeft: 'auto' }} />
          </Pressable>
        </View>
        {center.businessPro?.hasAccess && (
          <View style={[styles.teamCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.teamHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Team access</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{team?.members.length ?? 0}/3 seats</Text>
            </View>
            {team?.members.map((member) => (
              <View key={member.userId} style={[styles.teamRow, { borderTopColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuText, { color: colors.foreground }]}>{member.displayName}</Text>
                  <Text style={[styles.featureCopy, { color: colors.mutedForeground }]}>{member.email}</Text>
                </View>
                <Text style={[styles.roleText, { color: colors.primary }]}>{member.role.replace('_', ' ')}</Text>
              </View>
            ))}
          </View>
        )}
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  periodPicker: { flexDirection: 'row', gap: 4 },
  periodButton: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  premiumStats: { marginTop: 16, padding: 16, borderRadius: 16, borderWidth: 1 },
  periodLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  periodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  periodValue: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  periodName: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9ca3af' },
  premiumCta: { marginTop: 16, padding: 16, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '48%', padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  
  menu: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'transparent' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  menuText: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  featureCopy: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 3 },
  teamCard: { marginTop: 28, borderRadius: 16, borderWidth: 1, padding: 16 },
  teamHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
