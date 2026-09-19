import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BusinessProfileInputCategory, getListOwnedBusinessesQueryKey, useCreateBusinessProfile, type BusinessProfileInput } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';

const categories = Object.values(BusinessProfileInputCategory);

export default function CreateBusinessScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const mutation = useCreateBusinessProfile();
  const [form, setForm] = useState<BusinessProfileInput>({
    name: '', location: '', category: BusinessProfileInputCategory.Services,
    description: '', website: '', email: '', phone: '',
  });
  const [error, setError] = useState('');

  const submit = () => {
    setError('');
    mutation.mutate({ data: form }, {
      onSuccess: (business) => {
        queryClient.invalidateQueries({ queryKey: getListOwnedBusinessesQueryKey() });
        router.replace(`/business/${business.slug}/center` as never);
      },
      onError: (err) => setError((err as any)?.data?.error || err.message || 'Business profile could not be created.'),
    });
  };

  return (
    <KeyboardAwareScrollViewCompat style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button">
        <Feather name="arrow-left" size={22} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Back</Text>
      </Pressable>
      <Text style={[styles.title, { color: colors.foreground }]}>Create a Business Target</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your personal profile will own this separate business page.</Text>

      <Input label="Business name" value={form.name} onChangeText={(name: string) => setForm({ ...form, name })} colors={colors} />
      <Input label="City or location" value={form.location} onChangeText={(location: string) => setForm({ ...form, location })} colors={colors} />
      <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
      <View style={styles.categories}>
        {categories.map((category) => (
          <Pressable key={category} onPress={() => setForm({ ...form, category })} style={[styles.category, { borderColor: form.category === category ? colors.primary : colors.border, backgroundColor: form.category === category ? colors.accent : colors.card }]}>
            <Text style={{ color: form.category === category ? colors.primary : colors.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}>{category}</Text>
          </Pressable>
        ))}
      </View>
      <Input label="About the business" value={form.description} onChangeText={(description: string) => setForm({ ...form, description })} colors={colors} multiline />
      <Input label="Website (optional)" value={form.website} onChangeText={(website: string) => setForm({ ...form, website })} colors={colors} keyboardType="url" />
      <Input label="Business email (optional)" value={form.email} onChangeText={(email: string) => setForm({ ...form, email })} colors={colors} keyboardType="email-address" />
      <Input label="Phone (optional)" value={form.phone} onChangeText={(phone: string) => setForm({ ...form, phone })} colors={colors} keyboardType="phone-pad" />
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      <Pressable onPress={submit} disabled={mutation.isPending || !form.name.trim() || !form.location.trim() || !form.description.trim()} style={[styles.submit, { backgroundColor: colors.primary, opacity: mutation.isPending ? 0.6 : 1 }]}>
        <Text style={[styles.submitText, { color: colors.primaryForeground }]}>{mutation.isPending ? 'Creating…' : 'Create Business Target'}</Text>
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

function Input({ label, colors, multiline, ...props }: TextInputProps & { label: string; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.field}><Text style={[styles.label, { color: colors.foreground }]}>{label}</Text><TextInput {...props} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.input, multiline && styles.multiline, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} placeholderTextColor={colors.mutedForeground} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 20, paddingBottom: 50 }, back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 },
  backText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 }, title: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 24 },
  field: { marginBottom: 18 }, label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 8 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 15 },
  multiline: { minHeight: 110, paddingTop: 13 }, categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  category: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8 },
  error: { fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: 12 },
  submit: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  submitText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
});