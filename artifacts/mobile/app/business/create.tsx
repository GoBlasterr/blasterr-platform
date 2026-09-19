import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BusinessProfileInputCategory, getListOwnedBusinessesQueryKey, useCreateBusinessProfile, type BusinessProfileInput } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/expo';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { apiUrl } from '@/lib/api-url';

const categories = Object.values(BusinessProfileInputCategory);
type ImageAsset = { uri: string; name: string; contentType: string; size: number };
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
async function uploadImage(image: ImageAsset, purpose: 'target-image' | 'banner', token: string) {
  const blob = await (await fetch(image.uri)).blob();
  const request = await fetch(apiUrl('/api/storage/uploads/request-url'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: image.name, size: image.size || blob.size, contentType: image.contentType, purpose }) });
  const details = await request.json() as { uploadURL?: string; objectPath?: string; assetId?: string; error?: string };
  if (!request.ok || !details.uploadURL || !details.objectPath || !details.assetId) throw new Error(details.error || `Could not prepare the ${purpose} upload.`);
  if (!(await fetch(details.uploadURL, { method: 'PUT', headers: { 'Content-Type': image.contentType }, body: blob })).ok) throw new Error(`Could not upload the ${purpose} image.`);
  if (!(await fetch(apiUrl(`/api/storage/uploads/${details.assetId}/complete`), { method: 'POST', headers: { Authorization: `Bearer ${token}` } })).ok) throw new Error(`Could not verify the ${purpose} image upload.`);
  return `/api/storage${details.objectPath}`;
}

export default function CreateBusinessScreen() {
  const colors = useColors();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const mutation = useCreateBusinessProfile();
  const [form, setForm] = useState<BusinessProfileInput>({
    name: '', location: '', category: BusinessProfileInputCategory.Services,
    description: '', website: '', email: '', phone: '',
  });
  const [error, setError] = useState('');
  const [logo, setLogo] = useState<ImageAsset | null>(null);
  const [banner, setBanner] = useState<ImageAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  const chooseImage = async (purpose: 'avatar' | 'banner') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Allow photo library access to choose an image.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    const contentType = asset.mimeType ?? 'image/jpeg';
    if (!allowedTypes.includes(contentType)) { setError('Choose a JPG, PNG, WebP, or GIF image.'); return; }
    if ((asset.fileSize ?? 0) > 10 * 1024 * 1024) { setError('Images must be 10 MB or smaller.'); return; }
    const image = { uri: asset.uri, name: asset.fileName ?? `${purpose}-${Date.now()}.jpg`, contentType, size: asset.fileSize ?? 0 };
    if (purpose === 'avatar') setLogo(image); else setBanner(image);
  };

  const submit = async () => {
    setError('');
    setUploading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Your session is not ready. Please sign in again.');
      const [imageUrl, bannerImageUrl] = await Promise.all([logo ? uploadImage(logo, 'target-image', token) : undefined, banner ? uploadImage(banner, 'banner', token) : undefined]);
      const business = await mutation.mutateAsync({ data: { ...form, imageUrl, bannerImageUrl } });
        queryClient.invalidateQueries({ queryKey: getListOwnedBusinessesQueryKey() });
        router.replace(`/business/${business.slug}/center` as never);
    } catch (err) { setError((err as any)?.data?.error || (err as Error).message || 'Business profile could not be created.'); } finally { setUploading(false); }
  };

  return (
    <KeyboardAwareScrollViewCompat style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button">
        <Feather name="arrow-left" size={22} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Back</Text>
      </Pressable>
      <Text style={[styles.title, { color: colors.foreground }]}>Create a Business Target</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your personal profile will own this separate business page.</Text>
      <Text style={[styles.label, { color: colors.foreground }]}>Business images</Text>
      <View style={styles.images}>
        <Pressable onPress={() => { void chooseImage('avatar'); }} style={[styles.logoPicker, { borderColor: colors.border, backgroundColor: colors.card }]} accessibilityLabel="Choose business logo">
          {logo ? <Image source={{ uri: logo.uri }} style={styles.logoImage} contentFit="cover" /> : <><Feather name="briefcase" size={24} color={colors.primary} /><Text style={[styles.imageText, { color: colors.mutedForeground }]}>Logo</Text></>}
        </Pressable>
        <Pressable onPress={() => { void chooseImage('banner'); }} style={[styles.bannerPicker, { borderColor: colors.border, backgroundColor: colors.card }]} accessibilityLabel="Choose business banner">
          {banner ? <Image source={{ uri: banner.uri }} style={styles.bannerImage} contentFit="cover" /> : <><Feather name="image" size={24} color={colors.primary} /><Text style={[styles.imageText, { color: colors.mutedForeground }]}>Banner</Text></>}
        </Pressable>
      </View>
      <Text style={[styles.help, { color: colors.mutedForeground }]}>JPG, PNG, WebP, or GIF · maximum 10 MB each</Text>

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
      <Pressable onPress={() => { void submit(); }} disabled={mutation.isPending || uploading || !form.name.trim() || !form.location.trim() || !form.description.trim()} style={[styles.submit, { backgroundColor: colors.primary, opacity: mutation.isPending || uploading ? 0.6 : 1 }]}>
        <Text style={[styles.submitText, { color: colors.primaryForeground }]}>{mutation.isPending || uploading ? 'Creating…' : 'Create Business Target'}</Text>
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
  images: { flexDirection: 'row', gap: 12, marginBottom: 6 }, logoPicker: { width: 86, height: 86, borderRadius: 43, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, logoImage: { width: '100%', height: '100%' }, bannerPicker: { flex: 1, height: 86, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, bannerImage: { width: '100%', height: '100%' }, imageText: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 4 }, help: { fontFamily: 'Inter_400Regular', fontSize: 12, marginBottom: 18 },
  error: { fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: 12 },
  submit: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  submitText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
});