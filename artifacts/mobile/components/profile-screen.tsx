import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { getListOwnedBusinessesQueryKey, useGetCurrentUser, useListOwnedBusinesses } from '@workspace/api-client-react';
import { EmptyState } from '@/components/empty-state';
import { useColors } from '@/hooks/useColors';
import { apiUrl } from '@/lib/api-url';
import { CosmicBackground } from '@/components/cosmic-background';
import { TranslatedText } from '@/components/translated-text';

export default function ProfileScreen() {
  const colors = useColors();
  const user = useGetCurrentUser();
  const businesses = useListOwnedBusinesses({ query: { enabled: !!user.data, queryKey: [...getListOwnedBusinessesQueryKey(), user.data?.id ?? 'guest'] } });
  if (user.isLoading) return <View style={[styles.center, { backgroundColor: colors.background }]}><CosmicBackground /><ActivityIndicator color={colors.primary} accessibilityLabel="Loading profile" /></View>;
  if (user.isError || !user.data) return <View style={[styles.screen, { backgroundColor: colors.background }]}><CosmicBackground /><EmptyState icon="user" title="Profile" message="Sign in to see your profile, saved Blasts, and settings." actionLabel="Sign In" onAction={() => router.replace('/sign-in' as never)} /></View>;
  const profile = user.data;
  const owned = businesses.data;
  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <CosmicBackground />
      <View style={[styles.cover, { backgroundColor: colors.secondary }]}>
        {profile.coverUrl ? <Image source={{ uri: apiUrl(profile.coverUrl) }} style={styles.coverImage} contentFit="cover" accessibilityLabel="Profile banner" /> : <View style={[styles.coverGlow, { backgroundColor: colors.primary }]} />}
      </View>
      <View style={styles.profileTop}>
        {profile.avatarUrl ? <Image source={{ uri: apiUrl(profile.avatarUrl) }} style={[styles.avatar, { borderColor: colors.background }]} contentFit="cover" accessibilityLabel={`${profile.displayName}'s avatar`} /> : <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.accent, borderColor: colors.background }]}><Feather name="user" size={27} color={colors.primary} /></View>}
        <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Open profile settings" style={[styles.edit, { borderColor: colors.border }]}><Feather name="settings" size={16} color={colors.foreground} /><Text style={[styles.editText, { color: colors.foreground }]}>Settings</Text></Pressable>
      </View>
      <Text style={[styles.name, { color: colors.foreground }]}>{profile.displayName}</Text>
      <Text style={[styles.handle, { color: colors.mutedForeground }]}>@{profile.username}</Text>
      <TranslatedText text={profile.bio || 'Making noise about what matters.'} context="bio" textStyle={styles.bio} />
      <View style={[styles.stats, { borderColor: colors.border }]}><Stat value={profile.blastCount} label="Blasts" colors={colors} /><Stat value={profile.followers} label="Followers" colors={colors} /><Stat value={profile.following} label="Following" colors={colors} /></View>

      <View style={styles.businessHeader}>
        <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Business Pages</Text><Text style={[styles.businessCount, { color: colors.mutedForeground }]}>{owned?.items.length ?? 0}/{owned?.limit ?? 5} pages</Text></View>
        {owned?.canCreate !== false && <Pressable onPress={() => router.push('/business/create' as never)} style={[styles.addBusiness, { borderColor: colors.primary }]}><Feather name="plus" size={16} color={colors.primary} /><Text style={[styles.addBusinessText, { color: colors.primary }]}>Create</Text></Pressable>}
      </View>
      {owned?.items.map((business) => (
        <Pressable key={business.id} onPress={() => router.push(`/business/${business.slug}` as never)} accessibilityRole="button" style={[styles.businessRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={[styles.businessAvatar, { backgroundColor: colors.accent }]}>{business.imageUrl ? <Image source={{ uri: apiUrl(business.imageUrl) }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Feather name="briefcase" size={19} color={colors.primary} />}</View>
          <View style={styles.businessCopy}><Text style={[styles.businessTitle, { color: colors.foreground }]} numberOfLines={1}>{business.name}</Text><Text style={[styles.businessSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>{business.category} · {business.location}</Text></View>
          <Feather name="chevron-right" size={19} color={colors.primary} />
        </Pressable>
      ))}
      {!businesses.isLoading && owned?.items.length === 0 && <Text style={[styles.emptyBusinesses, { color: colors.mutedForeground, borderColor: colors.border }]}>Create your first Business Target page to start switching profiles.</Text>}
      {owned?.canCreate === false && <Text style={[styles.limitText, { color: colors.mutedForeground }]}>You have reached the 5-page ownership limit.</Text>}
      <Text style={[styles.section, { color: colors.foreground }]}>Blasts</Text>
      <EmptyState icon="activity" title="No blasts yet." />
    </ScrollView>
  );
}
function Stat({ value, label, colors }: { value: number; label: string; colors: ReturnType<typeof useColors> }) { return <View style={styles.stat}><Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text></View>; }
const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingBottom: 40 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cover: { height: 150, overflow: 'hidden' }, coverImage: { width: '100%', height: '100%' }, coverGlow: { width: 220, height: 220, borderRadius: 110, opacity: 0.15, position: 'absolute', right: -40, top: -80 },
  profileTop: { paddingHorizontal: 20, marginTop: -35, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }, avatar: { width: 76, height: 76, borderRadius: 38, borderWidth: 4 }, avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  edit: { flexDirection: 'row', gap: 7, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, borderWidth: 1 }, editText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  name: { fontFamily: 'Inter_700Bold', fontSize: 24, paddingHorizontal: 20, marginTop: 14 }, handle: { fontFamily: 'Inter_400Regular', fontSize: 13, paddingHorizontal: 20, marginTop: 3 }, bio: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, paddingHorizontal: 20, marginTop: 14 },
  stats: { flexDirection: 'row', marginTop: 20, marginHorizontal: 20, paddingVertical: 15, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth }, stat: { flex: 1, alignItems: 'center' }, statValue: { fontFamily: 'Inter_700Bold', fontSize: 18 }, statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  businessHeader: { marginHorizontal: 20, marginTop: 22, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 }, businessCount: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  addBusiness: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 99, paddingHorizontal: 11, paddingVertical: 7 }, addBusinessText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  businessRow: { marginHorizontal: 20, marginBottom: 8, minHeight: 62, borderWidth: 1, borderRadius: 15, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 11 }, businessAvatar: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, businessCopy: { flex: 1 }, businessTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 }, businessSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  emptyBusinesses: { marginHorizontal: 20, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 14, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 }, limitText: { marginHorizontal: 20, marginTop: 5, fontFamily: 'Inter_500Medium', fontSize: 12 },
  section: { fontFamily: 'Inter_700Bold', fontSize: 16, marginTop: 22, marginHorizontal: 20 },
});