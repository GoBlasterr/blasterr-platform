import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetBusiness, useSubmitBusinessClaim, getGetBusinessQueryKey } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { CosmicBackground } from '@/components/cosmic-background';

const METHODS = [
  { id: 'business_email', label: 'Business Email', icon: 'mail' },
  { id: 'website', label: 'Website Match', icon: 'globe' },
  { id: 'documentation', label: 'Upload Documentation', icon: 'file-text' },
  { id: 'admin_review', label: 'Manual Admin Review', icon: 'shield' },
] as const;

export default function ClaimBusinessScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  
  const [method, setMethod] = useState<typeof METHODS[number]['id']>('business_email');
  const [evidence, setEvidence] = useState('');
  
  const { data: business, isLoading: loadingBusiness } = useGetBusiness(slug, {
    query: { enabled: !!slug, queryKey: getGetBusinessQueryKey(slug) }
  });
  
  const claim = useSubmitBusinessClaim({
    mutation: {
      onSuccess: () => {
        router.back();
      }
    }
  });

  const handleSubmit = () => {
    if (!business?.id) return;
    claim.mutate({
      targetId: business.id,
      data: {
        verificationMethod: method,
        evidence: evidence.trim() ? evidence.trim() : undefined,
      }
    });
  };

  if (loadingBusiness) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: colors.background }]}>
        <CosmicBackground />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: colors.background }]}>
        <CosmicBackground />
        <Text style={[styles.errorText, { color: colors.foreground }]}>Business not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <CosmicBackground />
      <View style={[styles.nav, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.navButton}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Claim Business</Text>
        <View style={styles.navButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>{business.name}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Verify your ownership to manage this business profile, analytics, and settings.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Verification Method</Text>
        <View style={styles.methods}>
          {METHODS.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => setMethod(m.id)}
              style={[
                styles.methodCard,
                { backgroundColor: colors.card, borderColor: method === m.id ? colors.primary : colors.border }
              ]}
            >
              <Feather name={m.icon as any} size={20} color={method === m.id ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.methodLabel, { color: method === m.id ? colors.primary : colors.foreground }]}>{m.label}</Text>
              {method === m.id && <Feather name="check-circle" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />}
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Evidence / Notes (Optional)</Text>
        <TextInput
          value={evidence}
          onChangeText={setEvidence}
          multiline
          placeholder="Provide any additional info or links to verify your claim..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
        />

        {claim.isError && (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + '20', borderColor: colors.destructive }]}>
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              Failed to submit claim. Please try again.
            </Text>
          </View>
        )}
        
        {claim.isSuccess && (
          <View style={[styles.successBox, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
            <Text style={[styles.successText, { color: colors.primary }]}>
              Claim submitted successfully! You will be notified once reviewed.
            </Text>
          </View>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={claim.isPending || claim.isSuccess}
          style={[
            styles.submitBtn,
            { backgroundColor: colors.primary, opacity: claim.isPending || claim.isSuccess ? 0.5 : 1 }
          ]}
        >
          {claim.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
              Submit Claim
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 10 },
  navButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 22, marginBottom: 8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
  
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, marginBottom: 12, marginTop: 24 },
  methods: { gap: 12 },
  methodCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  methodLabel: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  
  input: { minHeight: 120, borderRadius: 12, borderWidth: 1, padding: 16, fontFamily: 'Inter_400Regular', fontSize: 15, textAlignVertical: 'top' },
  
  submitBtn: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  submitBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  
  errorBox: { padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 24 },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 14, textAlign: 'center' },
  
  successBox: { padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 24 },
  successText: { fontFamily: 'Inter_500Medium', fontSize: 14, textAlign: 'center' },
});
