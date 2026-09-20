import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Feather } from '@expo/vector-icons';
import { useGetBusiness, useGetCurrentUser, useStartBusinessProCheckout } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { CosmicBackground } from '@/components/cosmic-background';

const features = [
  ['activity', 'Advanced analytics', 'Understand real Business Target activity.'],
  ['eye', 'Blast monitoring', 'See conversations connected to your business.'],
  ['message-square', 'Verified responses', 'Respond publicly as the verified business.'],
  ['bell', 'Business alerts', 'Stay informed about important interactions.'],
  ['trending-up', 'Promote foundations', 'Prepare campaigns with advertising spend kept separate.'],
  ['edit-3', 'Announcements', 'Publish official business updates through BLASTERR.'],
  ['film', 'BLASTR Clips', 'Turn eligible business content into promotional clips.'],
  ['users', 'Team access', 'Extend controlled access to your business team.'],
] as const;

export default function BusinessProScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const user = useGetCurrentUser();
  const businessQuery = useGetBusiness(slug, { query: { enabled: !!slug, queryKey: ['business-pro-detail', slug] } });
  const checkout = useStartBusinessProCheckout();
  const business = businessQuery.data;

  const startCheckout = () => {
    if (!user.data) {
      router.push('/sign-in');
      return;
    }
    if (business?.businessPro?.hasAccess) {
      router.push(`/business/${slug}/center`);
      return;
    }
    if (!business) return;
    checkout.mutate({ targetId: business.id }, {
      onSuccess: ({ url }) => { void WebBrowser.openBrowserAsync(url); },
    });
  };

  if (businessQuery.isLoading || !business) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: colors.background }]}>
        <CosmicBackground />
        {businessQuery.isLoading ? <ActivityIndicator size="large" color={colors.primary} /> : <Text style={{ color: colors.foreground }}>Business not found.</Text>}
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
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Business Pro</Text>
        <View style={styles.navButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.primary + '40' }]}>
          <Text style={[styles.kicker, { color: colors.primary }]}>◆ BLASTERR BUSINESS PRO</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Turn your Business Target into a growth center.</Text>
          <Text style={[styles.copy, { color: colors.mutedForeground }]}>Advanced tools for verified business owners who want to understand conversations, respond officially, and manage their BLASTERR presence.</Text>
          <Text style={[styles.price, { color: colors.foreground }]}>$49<Text style={[styles.per, { color: colors.mutedForeground }]}>/month</Text></Text>
          <Text style={[styles.note, { color: colors.mutedForeground }]}>Month-to-month · cancel anytime · advertising spend is separate</Text>
          <Pressable onPress={startCheckout} disabled={checkout.isPending} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
            <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>{checkout.isPending ? 'Opening checkout…' : business.businessPro?.hasAccess ? 'Open Business Center' : 'Start Business Pro'}</Text>
            <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
          </Pressable>
          {checkout.isError && <Text style={[styles.error, { color: colors.destructive }]}>Checkout could not be started. Please try again.</Text>}
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Included with Business Pro</Text>
        <View style={styles.featureGrid}>
          {features.map(([icon, name, description]) => (
            <View key={name} style={[styles.feature, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name={icon as never} size={20} color={colors.primary} />
              <Text style={[styles.featureName, { color: colors.foreground }]}>{name}</Text>
              <Text style={[styles.featureCopy, { color: colors.mutedForeground }]}>{description}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  navButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  content: { padding: 20, paddingBottom: 40 },
  hero: { padding: 20, borderWidth: 1, borderRadius: 24 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.5 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, lineHeight: 34, marginTop: 12 },
  copy: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, marginTop: 12 },
  price: { fontFamily: 'Inter_700Bold', fontSize: 32, marginTop: 18 },
  per: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  note: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  primaryButton: { minHeight: 48, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  error: { fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 10 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, marginTop: 28, marginBottom: 12 },
  featureGrid: { gap: 10 },
  feature: { padding: 16, borderRadius: 18, borderWidth: 1 },
  featureName: { fontFamily: 'Inter_700Bold', fontSize: 15, marginTop: 10 },
  featureCopy: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, marginTop: 4 },
});